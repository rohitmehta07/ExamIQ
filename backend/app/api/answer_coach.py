from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Subject, Question, Document, DocumentChunk, Topic, AnswerSubmission, StudentProfile
from app.schemas.schemas import (
    AnswerStrategyRequest, AnswerStrategyResponse,
    AnswerEvaluateRequest, AnswerEvaluateResponse
)
from app.ml.answer_strategy_engine import answer_strategy_engine
from app.ml.answer_evaluator import answer_evaluator
from app.ml.vector_store import vector_store

router = APIRouter(prefix="/answer", tags=["Answer Strategy & Coach"])

@router.post("/strategy", response_model=AnswerStrategyResponse)
def get_answer_strategy(
    req: AnswerStrategyRequest,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    question_text = req.question_text or ""
    marks = req.marks or 5.0
    q_types = [req.question_type or "Explanation"]
    topic_name = None
    rubric = None
    source = None
    subject_id = req.subject_id

    # 1. Ownership & Authorization Verification
    if req.question_id:
        q = db.query(Question).filter(Question.id == req.question_id).first()
        if not q:
            raise HTTPException(status_code=404, detail="Question not found")
        # Ensure question belongs to the authenticated user
        if q.subject and q.subject.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Question belongs to another student")
        if req.subject_id and q.subject_id != req.subject_id:
            raise HTTPException(status_code=400, detail="Question does not belong to the selected subject")
        
        subject_id = q.subject_id
        question_text = q.text
        marks = q.marks
        q_types = q.question_types or ["Explanation"]
        rubric = q.marking_rubric
        source = q.source_name
        topic_name = q.topic_name or (q.topics[0].topic.name if q.topics else (q.subject.name if q.subject else None))
    elif subject_id:
        sub = db.query(Subject).filter(Subject.id == subject_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")
        if sub.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Subject belongs to another student")
    else:
        # Fall back to student's active subject or first subject
        prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if prof and prof.subject_id:
            subject_id = prof.subject_id
        else:
            first_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()
            subject_id = first_sub.id if first_sub else None

    if not question_text:
        raise HTTPException(status_code=400, detail="Must provide question_id or question_text")

    # 2. Retrieve Subject-Specific Study Material (strictly isolated)
    subject = None
    subject_code = None
    subject_name = None
    retrieved_chunks = []
    subject_topics = []
    related_pyqs = []

    if subject_id:
        subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
        if subject:
            subject_code = subject.code
            subject_name = subject.name

            # Documents belonging to this subject and this user
            docs = db.query(Document).filter(
                Document.subject_id == subject_id,
                Document.user_id == current_user.id
            ).all()
            valid_doc_ids = {d.id for d in docs}

            # Retrieve Grounded Chunks from Vector Store
            if valid_doc_ids:
                # Self-healing hydration if vector store is missing chunks for requested valid documents
                known_doc_ids = {m.get("document_id") for m in vector_store.metadata}
                missing_doc_ids = valid_doc_ids - known_doc_ids
                if missing_doc_ids:
                    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(missing_doc_ids)).all()
                    chunk_items = []
                    for c in chunks:
                        d_obj = next((d for d in docs if d.id == c.document_id), None)
                        chunk_items.append({
                            "id": c.id,
                            "content": c.content,
                            "document_id": c.document_id,
                            "subject_id": subject_id,
                            "user_id": current_user.id,
                            "document_name": d_obj.filename if d_obj else "Course Material",
                            "page_number": c.page_number,
                            "doc_category": d_obj.doc_category if d_obj else "LECTURE_NOTES",
                            "topic": "General"
                        })
                    vector_store.add_chunks(chunk_items)

                raw_results = vector_store.search(
                    query=question_text,
                    top_k=8,
                    subject_id=subject_id,
                    user_id=current_user.id,
                    valid_doc_ids=valid_doc_ids
                )
                retrieved_chunks = [r for r in raw_results if r.get("document_id") in valid_doc_ids][:4]

                # DB fallback if vector store produced 0 matches
                if not retrieved_chunks:
                    db_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(valid_doc_ids)).limit(4).all()
                    for c in db_chunks:
                        d_obj = next((d for d in docs if d.id == c.document_id), None)
                        retrieved_chunks.append({
                            "document_id": c.document_id,
                            "document_name": d_obj.filename if d_obj else "Course Notes",
                            "page_number": c.page_number,
                            "doc_category": d_obj.doc_category if d_obj else "LECTURE_NOTES",
                            "content": c.content
                        })

            # Retrieve Topics for this subject
            subject_topics = db.query(Topic).filter(Topic.subject_id == subject_id).all()

            # Retrieve Related PYQs for this subject
            all_subject_pyqs = db.query(Question).filter(
                Question.subject_id == subject_id,
                Question.is_pyq == True
            ).all()

            # If user selected an existing question, exclude itself from related PYQs
            related_pyqs = [p for p in all_subject_pyqs if req.question_id is None or p.id != req.question_id]

            # If question has no explicit rubric, check if an identical or matching PYQ has one
            if not rubric and all_subject_pyqs:
                for pyq in all_subject_pyqs:
                    if pyq.marking_rubric and pyq.marking_rubric.get("criteria"):
                        if (topic_name and pyq.topic_name == topic_name) or any(w in pyq.text.lower() for w in question_text.lower().split() if len(w) > 4):
                            rubric = pyq.marking_rubric
                            break

    strategy = answer_strategy_engine.generate_strategy(
        question_text=question_text,
        marks=marks,
        question_types=q_types,
        topic_name=topic_name or subject_name or "Academic Subject",
        subject_id=subject_id,
        subject_code=subject_code,
        subject_name=subject_name,
        marking_rubric=rubric,
        source_evidence=source,
        retrieved_chunks=retrieved_chunks,
        subject_topics=subject_topics,
        related_pyqs=related_pyqs
    )
    return strategy

@router.post("/evaluate", response_model=AnswerEvaluateResponse)
def evaluate_student_answer(
    req: AnswerEvaluateRequest,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    if not req.student_answer.strip():
        raise HTTPException(status_code=400, detail="Student answer cannot be empty")

    expected_kw = None
    rubric = None
    subject_id = req.subject_id

    # 1. Ownership & Authorization Verification
    if req.question_id:
        q = db.query(Question).filter(Question.id == req.question_id).first()
        if not q:
            raise HTTPException(status_code=404, detail="Question not found")
        if q.subject and q.subject.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Question belongs to another student")
        
        subject_id = q.subject_id
        req.question_text = q.text
        req.marks = q.marks
        expected_kw = q.key_concepts
        rubric = q.marking_rubric
    elif subject_id:
        sub = db.query(Subject).filter(Subject.id == subject_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")
        if sub.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Subject belongs to another student")
    else:
        prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if prof and prof.subject_id:
            subject_id = prof.subject_id
        else:
            first_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()
            subject_id = first_sub.id if first_sub else None

    # 2. Retrieve Subject Context for Evaluation
    subject = None
    subject_code = None
    subject_name = None
    retrieved_chunks = []

    if subject_id:
        subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
        if subject:
            subject_code = subject.code
            subject_name = subject.name

            docs = db.query(Document).filter(
                Document.subject_id == subject_id,
                Document.user_id == current_user.id
            ).all()
            valid_doc_ids = {d.id for d in docs}

            if valid_doc_ids:
                known_doc_ids = {m.get("document_id") for m in vector_store.metadata}
                missing_doc_ids = valid_doc_ids - known_doc_ids
                if missing_doc_ids:
                    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(missing_doc_ids)).all()
                    chunk_items = []
                    for c in chunks:
                        d_obj = next((d for d in docs if d.id == c.document_id), None)
                        chunk_items.append({
                            "id": c.id,
                            "content": c.content,
                            "document_id": c.document_id,
                            "subject_id": subject_id,
                            "user_id": current_user.id,
                            "document_name": d_obj.filename if d_obj else "Course Material",
                            "page_number": c.page_number,
                            "doc_category": d_obj.doc_category if d_obj else "LECTURE_NOTES",
                            "topic": "General"
                        })
                    vector_store.add_chunks(chunk_items)

                raw_results = vector_store.search(
                    query=req.question_text,
                    top_k=6,
                    subject_id=subject_id,
                    user_id=current_user.id,
                    valid_doc_ids=valid_doc_ids
                )
                retrieved_chunks = [r for r in raw_results if r.get("document_id") in valid_doc_ids][:3]
                if not retrieved_chunks:
                    db_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(valid_doc_ids)).limit(3).all()
                    for c in db_chunks:
                        d_obj = next((d for d in docs if d.id == c.document_id), None)
                        retrieved_chunks.append({
                            "document_id": c.document_id,
                            "document_name": d_obj.filename if d_obj else "Course Notes",
                            "page_number": c.page_number,
                            "doc_category": d_obj.doc_category if d_obj else "LECTURE_NOTES",
                            "content": c.content
                        })

    eval_result = answer_evaluator.evaluate_answer(
        question_text=req.question_text,
        student_text=req.student_answer,
        marks=req.marks,
        expected_keywords=expected_kw,
        subject_id=subject_id,
        subject_name=subject_name,
        subject_code=subject_code,
        retrieved_chunks=retrieved_chunks,
        marking_rubric=rubric
    )

    # 3. Store Submission in Database (with user & subject isolation)
    target_q_id = req.question_id
    if not target_q_id and subject_id:
        first_q = db.query(Question).filter(Question.subject_id == subject_id).first()
        if first_q:
            target_q_id = first_q.id
        else:
            new_q = Question(
                subject_id=subject_id,
                question_number="Coach-Practice",
                text=req.question_text,
                marks=req.marks,
                source_name="Answer Coach",
                is_pyq=False,
                origin="MANUAL"
            )
            db.add(new_q)
            db.flush()
            target_q_id = new_q.id
    elif not target_q_id:
        user_q = db.query(Question).join(Subject).filter(Subject.user_id == current_user.id).first()
        target_q_id = user_q.id if user_q else 1

    sub = AnswerSubmission(
        user_id=current_user.id,
        question_id=target_q_id,
        student_text=req.student_answer,
        content_score=eval_result["content_score"],
        structure_rating=eval_result["structure_rating"],
        presentation_feedback=eval_result["presentation_feedback"],
        missing_concepts=eval_result["missing_concepts"],
        key_terms_present=eval_result["key_terms_present"],
        key_terms_missing=eval_result["key_terms_missing"],
        rubric_alignment=eval_result["rubric_alignment"],
        overall_feedback="; ".join(eval_result["actionable_improvements"])
    )
    db.add(sub)
    db.commit()

    return eval_result
