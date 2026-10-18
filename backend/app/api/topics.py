from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Topic, StudentProfile, Subject, Question, QuestionTopic
from app.schemas.schemas import TopicResponse, TopicCreate, TopicUpdate, TopicMarkImportant
from app.ml.priority_engine import priority_engine
from app.services.topic_service import topic_service

router = APIRouter(prefix="/topics", tags=["Topics & Priority"])

def resolve_user_subject_id(subject_id: Optional[int], current_user: User, db: Session) -> Optional[int]:
    """Resolve and verify subject ownership for current student."""
    if subject_id is not None:
        sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
        return sub.id if sub else None

    # Check student active profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile and profile.subject_id:
        sub = db.query(Subject).filter(Subject.id == profile.subject_id, Subject.user_id == current_user.id).first()
        if sub:
            return sub.id

    # Fallback to first subject owned by user
    first_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()
    return first_sub.id if first_sub else None

@router.get("", response_model=List[TopicResponse])
def get_topics(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Retrieve topics for the user's subject, ensuring no cross-user data leakage."""
    target_sub_id = resolve_user_subject_id(subject_id, current_user, db)
    if not target_sub_id:
        return []

    return db.query(Topic).filter(Topic.subject_id == target_sub_id).order_by(Topic.priority_score.desc()).all()

@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Get single topic, verifying subject ownership."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    user_sub = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=403, detail="You do not have access to this topic")

    return topic

@router.post("", response_model=TopicResponse, status_code=201)
def create_topic(
    payload: TopicCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Allow students to manually add a curriculum topic to their subject."""
    subject = db.query(Subject).filter(Subject.id == payload.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Subject not found or access denied")

    prio_res = priority_engine.calculate_priority(
        historical_freq=0,
        max_possible_freq=1,
        avg_marks=0.0,
        last_observed_year=2024,
        syllabus_weight=payload.syllabus_weight or 0.8,
        question_types_count=1,
        is_weak_topic=False
    )

    topic = Topic(
        subject_id=payload.subject_id,
        name=payload.name.strip(),
        category=payload.category or "Core Concept",
        description=payload.description or "",
        syllabus_weight=payload.syllabus_weight or 0.8,
        historical_frequency=0,
        avg_marks=0.0,
        preparation_priority=prio_res["priority_level"],
        priority_score=prio_res["composite_score"],
        priority_breakdown=prio_res["breakdown"],
        keywords=[payload.name.strip()],
        algorithms=[],
        formulas=[],
        recommended_study_minutes=prio_res["recommended_study_minutes"],
        is_manually_marked=bool(payload.is_manually_marked),
        personal_notes=payload.personal_notes,
        importance_reason="Manually added curriculum topic." if payload.is_manually_marked else prio_res["rationale"],
        pyq_appearances=0,
        pyq_sources=[]
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    # Attempt to map any existing unmapped questions in this subject
    topic_service.map_questions_to_topics(db, payload.subject_id)
    topic_service.recalculate_topic_frequencies_and_ranks(db, payload.subject_id, user_id=current_user.id)
    db.refresh(topic)

    return topic

@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Allow students to edit an existing topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    user_sub = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this topic")

    if payload.name is not None:
        topic.name = payload.name.strip()
    if payload.category is not None:
        topic.category = payload.category.strip()
    if payload.description is not None:
        topic.description = payload.description.strip()
    if payload.is_manually_marked is not None:
        topic.is_manually_marked = payload.is_manually_marked
    if payload.personal_notes is not None:
        topic.personal_notes = payload.personal_notes
    if payload.preparation_priority is not None:
        topic.preparation_priority = payload.preparation_priority

    db.commit()
    db.refresh(topic)
    return topic

@router.patch("/{topic_id}/mark-important", response_model=TopicResponse)
def mark_topic_important(
    topic_id: int,
    payload: TopicMarkImportant,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Allow students to manually mark or unmark a topic as important and add personal notes.
    Keeps manual selection strictly separate from AI priority.
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    user_sub = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this topic")

    topic.is_manually_marked = payload.is_manually_marked
    if payload.personal_notes is not None:
        topic.personal_notes = payload.personal_notes

    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/{topic_id}")
def delete_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Allow students to delete a topic from their subject."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    user_sub = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this topic")

    subject_id = topic.subject_id

    # Unlink mapped questions
    db.query(Question).filter(Question.topic_id == topic_id).update({Question.topic_id: None})
    db.query(QuestionTopic).filter(QuestionTopic.topic_id == topic_id).delete()

    db.delete(topic)
    db.commit()

    # Recalculate remaining topics
    topic_service.recalculate_topic_frequencies_and_ranks(db, subject_id, user_id=current_user.id)

    return {"message": "Topic deleted successfully", "topic_id": topic_id}

@router.post("/sync", response_model=List[TopicResponse])
def sync_topics_from_evidence(
    subject_id: int = Query(..., description="Subject to sync and recalculate evidence for"),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Scans subject documents and PYQs, maps questions to topics, and recalculates
    topic frequencies and evidence-based AI priority rankings without fabrication.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Subject not found or access denied")

    topic_service.map_questions_to_topics(db, subject_id)
    topic_service.recalculate_topic_frequencies_and_ranks(db, subject_id, user_id=current_user.id)

    return db.query(Topic).filter(Topic.subject_id == subject_id).order_by(Topic.priority_score.desc()).all()

@router.get("/priority/overview")
def get_priority_overview(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Get pedagogical priority overview strictly scoped to current user's subject."""
    target_sub_id = resolve_user_subject_id(subject_id, current_user, db)
    if not target_sub_id:
        return {
            "high_priority": [],
            "medium_priority": [],
            "low_priority": [],
            "total_topics": 0,
            "disclaimer": "Preparation Priority is a pedagogical ranking model based on syllabus weight, exam frequency, marks, and student weaknesses. Add a subject and course materials to view topic priorities."
        }

    topics = db.query(Topic).filter(Topic.subject_id == target_sub_id).order_by(Topic.priority_score.desc()).all()

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    weak_topics = set(profile.weak_topics or []) if profile else set()

    high_p = []
    med_p = []
    low_p = []

    for t in topics:
        is_weak = t.name in weak_topics
        item = {
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "priority": t.preparation_priority,
            "priority_score": t.priority_score,
            "historical_frequency": t.historical_frequency,
            "avg_marks": t.avg_marks,
            "recommended_study_minutes": t.recommended_study_minutes,
            "is_student_weakness": is_weak,
            "is_manually_marked": t.is_manually_marked,
            "personal_notes": t.personal_notes,
            "source_document_id": t.source_document_id,
            "source_document_name": t.source_document_name,
            "source_page_number": t.source_page_number,
            "pyq_appearances": t.pyq_appearances,
            "pyq_sources": t.pyq_sources,
            "priority_breakdown": t.priority_breakdown,
            "keywords": t.keywords,
            "algorithms": t.algorithms,
            "formulas": t.formulas,
            "reason": t.importance_reason or (f"Historical appearances: {t.historical_frequency}, Avg marks: {t.avg_marks}M" + (", Marked as student weak area" if is_weak else ""))
        }

        if t.preparation_priority == "HIGH":
            high_p.append(item)
        elif t.preparation_priority == "MEDIUM":
            med_p.append(item)
        else:
            low_p.append(item)

    return {
        "high_priority": high_p,
        "medium_priority": med_p,
        "low_priority": low_p,
        "total_topics": len(topics),
        "disclaimer": "Preparation Priority is a pedagogical ranking model based on syllabus weight, exam frequency, marks, and student weaknesses. It does not predict guaranteed exam questions."
    }
