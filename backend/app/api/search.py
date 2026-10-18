from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Subject, Document, DocumentChunk
from app.schemas.schemas import SearchResponse, SearchResultItem
from app.ml.vector_store import vector_store

router = APIRouter(prefix="/search", tags=["Semantic Search"])

@router.get("", response_model=SearchResponse)
def academic_search(
    q: str = Query(..., min_length=2, description="Academic search query"),
    subject_id: Optional[int] = Query(None, description="Filter search strictly to specific subject"),
    search_mode: str = Query("HYBRID", pattern="^(HYBRID|SEMANTIC|KEYWORD)$", description="Search algorithm mode: HYBRID, SEMANTIC, or KEYWORD"),
    top_k: int = Query(6, ge=1, le=20),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # 1. Resolve and verify user & subject ownership
    subject_name = None
    if subject_id is not None:
        sub = db.query(Subject).filter(Subject.id == subject_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")
        if sub.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Subject belongs to another student")
        subject_name = sub.name
        valid_doc_ids = set(d.id for d in db.query(Document.id).filter(
            Document.subject_id == subject_id,
            Document.user_id == current_user.id
        ).all())
    else:
        # Explicit all-subject search across authenticated student's subjects
        user_subs = db.query(Subject).filter(Subject.user_id == current_user.id).all()
        user_sub_ids = [s.id for s in user_subs]
        subject_name = "All Subjects"
        if not user_sub_ids:
            valid_doc_ids = set()
        else:
            valid_doc_ids = set(d.id for d in db.query(Document.id).filter(
                Document.user_id == current_user.id,
                Document.subject_id.in_(user_sub_ids)
            ).all())

    # Honest empty state if user has no valid documents
    if not valid_doc_ids:
        return {
            "query": q,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "search_mode": search_mode,
            "total_results": 0,
            "results": []
        }

    # 2. Self-healing hydration if vector store is missing chunks for requested valid documents
    known_doc_ids = {m.get("document_id") for m in vector_store.metadata}
    missing_doc_ids = valid_doc_ids - known_doc_ids
    if missing_doc_ids:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(missing_doc_ids)).all()
        if chunks:
            chunk_items = []
            for c in chunks:
                doc = db.query(Document).filter(Document.id == c.document_id).first()
                chunk_items.append({
                    "id": c.id,
                    "content": c.content,
                    "document_id": c.document_id,
                    "subject_id": doc.subject_id if doc else None,
                    "user_id": doc.user_id if doc else current_user.id,
                    "document_name": doc.filename if doc else "Academic Doc",
                    "page_number": c.page_number,
                    "doc_category": doc.doc_category if doc else "LECTURE_NOTES",
                    "topic": c.metadata_json.get("topic", "General") if c.metadata_json else "General"
                })
            vector_store.add_chunks(chunk_items)

    # 3. Synchronize in-memory metadata with active database ownership to prevent boundary leaks
    doc_meta_map = {d.id: (d.subject_id, d.user_id) for d in db.query(Document.id, Document.subject_id, Document.user_id).filter(Document.id.in_(valid_doc_ids)).all()}
    for meta in vector_store.metadata:
        d_id = meta.get("document_id")
        if d_id in doc_meta_map:
            meta["subject_id"] = doc_meta_map[d_id][0]
            meta["user_id"] = doc_meta_map[d_id][1]

    # 4. Execute Retrieval using the specified search mode with strict boundaries
    raw_results = vector_store.search(
        query=q,
        top_k=top_k,
        subject_id=subject_id,
        user_id=current_user.id,
        valid_doc_ids=valid_doc_ids,
        search_mode=search_mode
    )

    # 5. Populate Subject Names
    all_subs = db.query(Subject.id, Subject.name).filter(Subject.user_id == current_user.id).all()
    sub_name_map = {s.id: s.name for s in all_subs}
    for r in raw_results:
        if not r.get("subject_name"):
            r["subject_name"] = sub_name_map.get(r.get("subject_id"), subject_name)

    items = [SearchResultItem(**r) for r in raw_results]
    return {
        "query": q,
        "subject_id": subject_id,
        "subject_name": subject_name,
        "search_mode": search_mode,
        "total_results": len(items),
        "results": items
    }
