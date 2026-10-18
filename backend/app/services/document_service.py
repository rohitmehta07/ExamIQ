import os
import shutil
import time
import uuid
from typing import Dict, Any, List
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.database_models import Document, DocumentChunk, ProcessingJob, Topic, Question, QuestionTopic
from app.ml.text_extractor import text_extractor
from app.ml.document_classifier import document_classifier
from app.ml.topic_extractor import topic_extractor
from app.ml.question_extractor import question_extractor
from app.ml.question_classifier import question_classifier
from app.ml.vector_store import vector_store
from app.services.topic_service import topic_service

class DocumentService:
    def handle_upload(
        self,
        db: Session,
        file: UploadFile,
        subject_id: int,
        user_id: int,
        doc_category: str = "AUTO_DETECT"
    ) -> Document:
        # Secure filename and unique disk path
        clean_name = os.path.basename(file.filename)
        dest_dir = os.path.join(settings.DATA_DIR, "uploads")
        os.makedirs(dest_dir, exist_ok=True)
        disk_filename = f"u{user_id}_s{subject_id}_{int(time.time())}_{uuid.uuid4().hex[:6]}_{clean_name}"
        file_path = os.path.join(dest_dir, disk_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create Document record
        doc = Document(
            subject_id=subject_id,
            user_id=user_id,
            filename=clean_name,
            file_path=file_path,
            file_type=clean_name.split(".")[-1].lower() if "." in clean_name else "pdf",
            doc_category=doc_category if doc_category != "AUTO_DETECT" else "LECTURE_NOTES",
            page_count=1,
            status="PENDING",
            classification_confidence=0.85,
            classification_method="pending_analysis",
            ocr_used=False,
            ocr_confidence=1.0,
            is_handwritten=False,
            metadata_json={"original_name": file.filename}
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Create ProcessingJob record
        job = ProcessingJob(
            document_id=doc.id,
            status="PENDING",
            progress_pct=0,
            message="Document uploaded. Ready for processing."
        )
        db.add(job)
        db.commit()

        return doc

    def process_document(self, db: Session, doc_id: int) -> Dict[str, Any]:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise ValueError("Document not found")

        job = db.query(ProcessingJob).filter(ProcessingJob.document_id == doc.id).first()
        if not job:
            job = ProcessingJob(document_id=doc.id)
            db.add(job)

        doc.status = "PROCESSING"
        job.status = "PROCESSING"
        job.progress_pct = 20
        job.message = "Extracting text and running selective OCR..."
        db.commit()

        try:
            # 1. Text & OCR Extraction
            extracted = text_extractor.extract_document(doc.file_path)
            doc.page_count = extracted["page_count"]
            doc.ocr_used = extracted["ocr_used"]
            doc.ocr_confidence = extracted["mean_confidence"]
            doc.is_handwritten = extracted["is_handwritten"]

            job.progress_pct = 50
            job.message = "Classifying document type and structure..."
            db.commit()

            # 2. Document Classification
            cls_result = document_classifier.classify(
                filename=doc.filename,
                full_text=extracted["full_text"],
                is_handwritten=doc.is_handwritten,
                ocr_used=doc.ocr_used,
                mean_ocr_conf=doc.ocr_confidence
            )
            doc.doc_category = cls_result["document_type"]
            doc.classification_confidence = cls_result["confidence"]
            doc.classification_method = cls_result["classification_method"]

            job.progress_pct = 70
            job.message = "Chunking and indexing semantic vectors..."
            db.commit()

            # 3. Chunking & Vector Indexing
            # Remove existing chunks if reprocessed
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
            db.commit()

            chunks_to_index = []
            for p in extracted["pages"]:
                text_content = p["text"].strip()
                if not text_content:
                    continue

                # Split page into logical paragraphs / chunks
                paragraphs = [par.strip() for par in text_content.split("\n\n") if len(par.strip()) > 30]
                if not paragraphs:
                    paragraphs = [text_content]

                for c_idx, par in enumerate(paragraphs, 1):
                    chunk = DocumentChunk(
                        document_id=doc.id,
                        page_number=p["page_number"],
                        chunk_index=c_idx,
                        content=par,
                        chunk_type="handwritten" if p.get("is_handwritten") else "text",
                        metadata_json={"page": p["page_number"]}
                    )
                    db.add(chunk)
                    db.commit()
                    db.refresh(chunk)

                    chunks_to_index.append({
                        "id": chunk.id,
                        "content": par,
                        "document_id": doc.id,
                        "subject_id": doc.subject_id,
                        "user_id": doc.user_id,
                        "document_name": doc.filename,
                        "page_number": p["page_number"],
                        "doc_category": doc.doc_category,
                        "topic": "General"
                    })

            # Add to vector store
            vector_store.add_chunks(chunks_to_index)

            # 4. Topic Extraction from Course Material
            if doc.doc_category not in ["QUESTION_PAPER", "PYQ"]:
                topic_service.extract_and_persist_topics_from_document(db, doc, extracted["pages"])

            # 5. Question Extraction if Question Paper
            if doc.doc_category in ["QUESTION_PAPER", "PYQ"]:
                # Clean up existing questions from this document if reprocessed
                existing_q_ids = [r[0] for r in db.query(Question.id).filter(Question.source_document_id == doc.id).all()]
                if existing_q_ids:
                    db.query(QuestionTopic).filter(QuestionTopic.question_id.in_(existing_q_ids)).delete(synchronize_session=False)
                    db.query(Question).filter(Question.source_document_id == doc.id).delete(synchronize_session=False)
                    db.commit()

                extracted_questions = question_extractor.extract_questions_from_pages(extracted["pages"], source_doc_name=doc.filename)
                for q_item in extracted_questions:
                    types, diff, conf = question_classifier.classify_question(q_item["text"], q_item["marks"])
                    q = Question(
                        subject_id=doc.subject_id,
                        source_document_id=doc.id,
                        page_number=q_item.get("page_number", 1),
                        question_number=q_item["question_number"],
                        text=q_item["text"],
                        marks=q_item["marks"],
                        question_types=types,
                        estimated_difficulty=diff,
                        difficulty_confidence=conf,
                        requires_diagram=q_item["requires_diagram"],
                        requires_calculation=q_item["requires_calculation"],
                        requires_algorithm=q_item["requires_algorithm"],
                        academic_year=q_item.get("academic_year", 2025),
                        source_name=doc.filename,
                        is_pyq=True,
                        key_concepts=[]
                    )
                    db.add(q)
                db.commit()

            # 6. Map Questions to Topics and Recalculate Frequencies & Priority Ranks from Evidence
            topic_service.map_questions_to_topics(db, doc.subject_id)
            topic_service.recalculate_topic_frequencies_and_ranks(db, doc.subject_id, user_id=doc.user_id)

            doc.status = "PROCESSED"
            doc.indexing_status = "INDEXED"
            job.status = "PROCESSED"
            job.progress_pct = 100
            job.message = "Document processing complete."
            db.commit()

            return {
                "document_id": doc.id,
                "status": "PROCESSED",
                "indexing_status": "INDEXED",
                "page_count": doc.page_count,
                "doc_category": doc.doc_category,
                "confidence": doc.classification_confidence,
                "ocr_used": doc.ocr_used,
                "is_handwritten": doc.is_handwritten,
                "chunks_created": len(chunks_to_index)
            }

        except Exception as e:
            doc.status = "FAILED"
            doc.indexing_status = "FAILED"
            job.status = "FAILED"
            job.error_details = str(e)
            job.message = f"Processing failed: {e}"
            db.commit()
            raise e

document_service = DocumentService()
