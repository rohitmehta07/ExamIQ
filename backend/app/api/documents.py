import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Document, DocumentChunk, Subject
from app.schemas.schemas import DocumentResponse
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Academic Documents"])

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """List documents strictly belonging to the current user and specified subject."""
    user_sub_ids = [s.id for s in db.query(Subject.id).filter(Subject.user_id == current_user.id).all()]

    if subject_id is not None:
        if subject_id not in user_sub_ids:
            return []
        query = db.query(Document).filter(
            Document.subject_id == subject_id,
            Document.user_id == current_user.id
        )
        return query.order_by(Document.created_at.desc()).all()

    if not user_sub_ids:
        return []

    query = db.query(Document).filter(
        Document.subject_id.in_(user_sub_ids),
        Document.user_id == current_user.id
    )
    return query.order_by(Document.created_at.desc()).all()

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Retrieve document details, validating ownership."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    user_sub = db.query(Subject).filter(Subject.id == doc.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    return doc

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: int = Form(...),
    doc_category: str = Form("AUTO_DETECT"),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Upload academic document into a subject owned by current user."""
    # Verify subject ownership
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Subject not found or access denied")

    # Validate extension
    allowed = ["pdf", "docx", "pptx", "png", "jpg", "jpeg", "txt"]
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed)}"
        )

    doc = document_service.handle_upload(
        db=db,
        file=file,
        subject_id=subject_id,
        user_id=current_user.id,
        doc_category=doc_category
    )

    # Automatically process in background
    def run_process_job(d_id: int):
        from app.core.database import SessionLocal
        bg_db = SessionLocal()
        try:
            document_service.process_document(bg_db, d_id)
        finally:
            bg_db.close()

    background_tasks.add_task(run_process_job, doc.id)
    return doc

@router.post("/{doc_id}/process")
def process_document_endpoint(
    doc_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    user_sub = db.query(Subject).filter(Subject.id == doc.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    try:
        res = document_service.process_document(db, doc_id)
        return {"status": "success", "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    user_sub = db.query(Subject).filter(Subject.id == doc.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document")

    # Clean up file on disk if exists in uploads
    if os.path.exists(doc.file_path) and "uploads" in doc.file_path:
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # Invalidate and remove chunks from vector store
    from app.ml.vector_store import vector_store
    vector_store.remove_document(doc.id)

    # Clean up derived questions from this document
    from app.models.database_models import Question
    db.query(Question).filter(Question.source_document_id == doc.id).delete()

    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
