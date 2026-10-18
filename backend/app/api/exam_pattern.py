from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Subject, StudentProfile
from app.schemas.schemas import ExamPatternResponse
from app.services.exam_pattern_service import exam_pattern_service

router = APIRouter(prefix="/exam-pattern", tags=["Exam Pattern Analysis"])

@router.get("", response_model=ExamPatternResponse)
def get_exam_pattern(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    target_sub = None
    if subject_id is not None:
        target_sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    else:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile and profile.subject_id:
            target_sub = db.query(Subject).filter(Subject.id == profile.subject_id, Subject.user_id == current_user.id).first()
        if not target_sub:
            target_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()

    if not target_sub:
        return {
            "total_papers_analyzed": 0,
            "total_questions": 0,
            "marks_distribution": {},
            "question_type_distribution": {},
            "topic_patterns": [],
            "evidence_disclaimer": "No exam question papers or course documents found for this account. Add a subject and upload past question papers to compute empirical patterns."
        }

    return exam_pattern_service.get_pattern_analysis(db=db, subject_id=target_sub.id)
