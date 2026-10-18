from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, StudentProfile, StudentPerformance, Topic, Subject
from app.schemas.schemas import (
    StudentProfileResponse, StudentProfileUpdate,
    StudentPerformanceCreate, StudentPerformanceResponse
)

router = APIRouter(prefix="/student", tags=["Student Profile"])

@router.get("/profile", response_model=StudentProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            subject_id=None,
            target_marks=85.0,
            available_hours_per_day=3.0,
            exam_date=None,
            completed_topics=[],
            weak_topics=[],
            strong_topics=[],
            previous_marks=0.0,
            overall_readiness=0.0
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    elif profile.subject_id:
        # Strictly verify that profile.subject_id belongs to this user
        sub = db.query(Subject).filter(Subject.id == profile.subject_id, Subject.user_id == current_user.id).first()
        if not sub:
            # Check if user has any other subjects they own
            first_user_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()
            profile.subject_id = first_user_sub.id if first_user_sub else None
            profile.exam_date = first_user_sub.exam_date if first_user_sub else None
            db.commit()
            db.refresh(profile)

    return profile

@router.post("/active-subject/{subject_id}", response_model=StudentProfileResponse)
def set_active_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Switch the student's active subject workspace, verifying ownership."""
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=403, detail="Subject not found or access denied")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)

    profile.subject_id = sub.id
    if sub.exam_date:
        profile.exam_date = sub.exam_date
    if sub.target_marks:
        profile.target_marks = sub.target_marks
    if sub.study_hours_per_day:
        profile.available_hours_per_day = sub.study_hours_per_day

    db.commit()
    db.refresh(profile)
    return profile

@router.put("/profile", response_model=StudentProfileResponse)
def update_profile(
    update_data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if update_data.subject_id is not None:
        if update_data.subject_id > 0:
            sub = db.query(Subject).filter(Subject.id == update_data.subject_id, Subject.user_id == current_user.id).first()
            if not sub:
                raise HTTPException(status_code=403, detail="Subject not found or access denied")
            profile.subject_id = sub.id
            if sub.exam_date:
                profile.exam_date = sub.exam_date
        else:
            profile.subject_id = None

    if update_data.target_marks is not None:
        profile.target_marks = update_data.target_marks
    if update_data.available_hours_per_day is not None:
        profile.available_hours_per_day = update_data.available_hours_per_day
    if update_data.exam_date is not None:
        profile.exam_date = update_data.exam_date
    if update_data.completed_topics is not None:
        profile.completed_topics = update_data.completed_topics
    if update_data.weak_topics is not None:
        profile.weak_topics = update_data.weak_topics
    if update_data.strong_topics is not None:
        profile.strong_topics = update_data.strong_topics
    if update_data.previous_marks is not None:
        profile.previous_marks = update_data.previous_marks

    # Recompute readiness percentage based on completed and strong topics
    completed_len = len(profile.completed_topics or [])
    weak_len = len(profile.weak_topics or [])
    strong_len = len(profile.strong_topics or [])
    if completed_len == 0 and strong_len == 0 and (profile.previous_marks or 0.0) == 0.0:
        profile.overall_readiness = 0.0
    else:
        base_readiness = (completed_len * 12.0) + (strong_len * 8.0) - (weak_len * 4.0) + ((profile.previous_marks or 0.0) * 0.3)
        readiness = min(98.0, max(0.0, base_readiness))
        profile.overall_readiness = round(readiness, 1)

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/performance", response_model=List[StudentPerformanceResponse])
def get_performance(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    records = db.query(StudentPerformance).filter(StudentPerformance.user_id == current_user.id).all()
    results = []
    for r in records:
        topic = db.query(Topic).filter(Topic.id == r.topic_id).first()
        results.append({
            "id": r.id,
            "topic_id": r.topic_id,
            "topic_name": topic.name if topic else f"Topic {r.topic_id}",
            "score": r.score,
            "max_score": r.max_score,
            "confidence_level": r.confidence_level,
            "notes": r.notes
        })
    return results

@router.post("/performance", response_model=StudentPerformanceResponse)
def add_performance(
    perf_in: StudentPerformanceCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    existing = db.query(StudentPerformance).filter(
        StudentPerformance.user_id == current_user.id,
        StudentPerformance.topic_id == perf_in.topic_id
    ).first()

    if existing:
        existing.score = perf_in.score
        existing.max_score = perf_in.max_score
        existing.confidence_level = perf_in.confidence_level
        existing.notes = perf_in.notes
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        target = StudentPerformance(
            user_id=current_user.id,
            topic_id=perf_in.topic_id,
            score=perf_in.score,
            max_score=perf_in.max_score,
            confidence_level=perf_in.confidence_level,
            notes=perf_in.notes
        )
        db.add(target)
        db.commit()
        db.refresh(target)

    # Check if topic should be updated in weak / strong lists
    topic = db.query(Topic).filter(Topic.id == perf_in.topic_id).first()
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if topic and profile:
        pct = (perf_in.score / max(1.0, perf_in.max_score)) * 100.0
        weak_set = set(profile.weak_topics or [])
        strong_set = set(profile.strong_topics or [])
        if pct < 50.0:
            weak_set.add(topic.name)
            strong_set.discard(topic.name)
        elif pct >= 75.0:
            strong_set.add(topic.name)
            weak_set.discard(topic.name)
        profile.weak_topics = list(weak_set)
        profile.strong_topics = list(strong_set)
        db.commit()

    return {
        "id": target.id,
        "topic_id": target.topic_id,
        "topic_name": topic.name if topic else f"Topic {target.topic_id}",
        "score": target.score,
        "max_score": target.max_score,
        "confidence_level": target.confidence_level,
        "notes": target.notes
    }
