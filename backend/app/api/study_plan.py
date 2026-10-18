from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, StudyPlan, StudyTask, StudentProfile, Topic, Subject
from app.schemas.schemas import StudyPlanResponse, StudyTaskResponse, StudyPlanGenerateRequest
from app.services.study_plan_service import study_plan_service

router = APIRouter(prefix="/study-plan", tags=["Personalized Study Plan"])

@router.get("", response_model=Optional[StudyPlanResponse])
def get_study_plan(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    query = db.query(StudyPlan).filter(
        StudyPlan.user_id == current_user.id,
        StudyPlan.status == "ACTIVE"
    )

    if subject_id is not None:
        # Verify ownership of subject
        sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
        if not sub:
            return None
        query = query.filter(StudyPlan.subject_id == subject_id)
    else:
        # Try active subject from profile
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile and profile.subject_id:
            sub = db.query(Subject).filter(Subject.id == profile.subject_id, Subject.user_id == current_user.id).first()
            if sub:
                query = query.filter(StudyPlan.subject_id == sub.id)

    plan = query.first()
    if not plan:
        return None

    # Load tasks and attach topic names
    tasks = db.query(StudyTask).filter(StudyTask.study_plan_id == plan.id).order_by(StudyTask.day_number.asc(), StudyTask.id.asc()).all()
    task_responses = []
    for t in tasks:
        topic_name = None
        if t.topic_id:
            top = db.query(Topic).filter(Topic.id == t.topic_id).first()
            if top:
                topic_name = top.name

        task_responses.append({
            "id": t.id,
            "day_number": t.day_number,
            "topic_id": t.topic_id,
            "topic_name": topic_name,
            "task_type": t.task_type,
            "title": t.title,
            "description": t.description,
            "duration_minutes": t.duration_minutes,
            "priority": t.priority,
            "status": t.status,
            "scheduled_date": t.scheduled_date,
            "practice_question_ids": t.practice_question_ids or [],
            "resources": t.resources or []
        })

    return {
        "id": plan.id,
        "subject_id": plan.subject_id,
        "exam_date": plan.exam_date,
        "total_days": plan.total_days,
        "total_hours": plan.total_hours,
        "status": plan.status,
        "tasks": task_responses
    }

@router.post("/generate", response_model=StudyPlanResponse)
def generate_study_plan(
    req: StudyPlanGenerateRequest,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # Verify subject ownership
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Subject not found or access denied")

    plan = study_plan_service.generate_plan(
        db=db,
        user_id=current_user.id,
        subject_id=req.subject_id,
        exam_date_str=req.exam_date,
        available_hours_per_day=req.available_hours_per_day
    )
    
    tasks = db.query(StudyTask).filter(StudyTask.study_plan_id == plan.id).order_by(StudyTask.day_number.asc()).all()
    task_responses = []
    for t in tasks:
        top = db.query(Topic).filter(Topic.id == t.topic_id).first() if t.topic_id else None
        task_responses.append({
            "id": t.id,
            "day_number": t.day_number,
            "topic_id": t.topic_id,
            "topic_name": top.name if top else None,
            "task_type": t.task_type,
            "title": t.title,
            "description": t.description,
            "duration_minutes": t.duration_minutes,
            "priority": t.priority,
            "status": t.status,
            "scheduled_date": t.scheduled_date,
            "practice_question_ids": t.practice_question_ids or [],
            "resources": t.resources or []
        })

    return {
        "id": plan.id,
        "subject_id": plan.subject_id,
        "exam_date": plan.exam_date,
        "total_days": plan.total_days,
        "total_hours": plan.total_hours,
        "status": plan.status,
        "tasks": task_responses
    }

@router.put("/tasks/{task_id}")
def update_task_status(
    task_id: int,
    status: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    plan = db.query(StudyPlan).filter(StudyPlan.id == task.study_plan_id).first()
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this task")

    task.status = status.upper()
    db.commit()

    # Update student profile completed topics if applicable
    if task.status == "COMPLETED" and task.topic_id:
        top = db.query(Topic).filter(Topic.id == task.topic_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if top and profile:
            comp = set(profile.completed_topics or [])
            comp.add(top.name)
            profile.completed_topics = list(comp)
            db.commit()

    return {"status": "success", "task_id": task.id, "new_status": task.status}

@router.put("/tasks/{task_id}/reschedule")
def reschedule_task(
    task_id: int,
    new_day: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    plan = db.query(StudyPlan).filter(StudyPlan.id == task.study_plan_id).first()
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this task")

    task.day_number = new_day
    db.commit()
    return {"status": "success", "task_id": task.id, "day_number": task.day_number}
