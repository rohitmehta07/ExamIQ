import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Subject, Exam, Document, Topic, StudyPlan, StudyTask, StudentProfile, Question
from app.schemas.schemas import (
    SubjectResponse, SubjectCreate, SubjectUpdate,
    SubjectProgressResponse, SubjectOverviewResponse, SubjectOverviewSummary
)

router = APIRouter(prefix="/subjects", tags=["Subjects"])

def parse_days_remaining(exam_date_str: Optional[str]) -> Optional[int]:
    if not exam_date_str or not exam_date_str.strip():
        return None
    clean = exam_date_str.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %B %Y", "%B %d, %Y"):
        try:
            exam_dt = datetime.datetime.strptime(clean, fmt).date()
            today = datetime.date.today()
            return (exam_dt - today).days
        except Exception:
            continue
    return None

def compute_subject_progress(subject: Subject, user_id: int, db: Session) -> SubjectProgressResponse:
    # 1. Upcoming exam info & urgency
    days_rem = parse_days_remaining(subject.exam_date)
    if days_rem is None:
        exam_urgency = "NOT_SCHEDULED"
    elif days_rem < 0:
        exam_urgency = "OVERDUE"
    elif days_rem <= 7:
        exam_urgency = "CRITICAL"
    elif days_rem <= 30:
        exam_urgency = "UPCOMING"
    else:
        exam_urgency = "SCHEDULED"

    # 2. Study Plan and Tasks (Mastery is measured ONLY by completed study tasks, never merely by uploading files)
    active_plan = db.query(StudyPlan).filter(
        StudyPlan.user_id == user_id,
        StudyPlan.subject_id == subject.id,
        StudyPlan.status == "ACTIVE"
    ).first()

    tasks_total = 0
    tasks_completed = 0
    tasks_pending = 0
    prep_progress = None
    progress_status = "Not started"
    next_action = None

    if active_plan:
        all_tasks = db.query(StudyTask).filter(
            StudyTask.study_plan_id == active_plan.id
        ).order_by(StudyTask.day_number.asc(), StudyTask.id.asc()).all()

        eligible_tasks = [t for t in all_tasks if (t.status or "").upper() != "CANCELLED"]
        tasks_total = len(eligible_tasks)
        tasks_completed = len([t for t in eligible_tasks if (t.status or "").upper() == "COMPLETED"])
        tasks_pending = len([t for t in eligible_tasks if (t.status or "").upper() == "PENDING"])

        if tasks_total > 0:
            prep_progress = round((tasks_completed / tasks_total) * 100.0, 1)
            if tasks_completed == tasks_total:
                progress_status = "Completed"
            elif tasks_completed > 0:
                progress_status = "In progress"
            else:
                progress_status = "In progress"

            # Find next incomplete task for recommended action
            pending_task = next((t for t in eligible_tasks if (t.status or "").upper() == "PENDING"), None)
            if pending_task:
                next_action = f"{pending_task.task_type.title()}: {pending_task.title}"
        else:
            progress_status = "Not enough data"
    else:
        progress_status = "Not started"

    # 3. Documents count (strictly scoped to this subject and user; inventory only, NOT proof of mastery)
    docs_count = db.query(Document).filter(
        Document.subject_id == subject.id,
        Document.user_id == user_id,
        Document.status != "FAILED"
    ).count()

    notes_documents_count = db.query(Document).filter(
        Document.subject_id == subject.id,
        Document.user_id == user_id,
        Document.status != "FAILED",
        Document.doc_category == "LECTURE_NOTES"
    ).count()

    pyq_documents_count = db.query(Document).filter(
        Document.subject_id == subject.id,
        Document.user_id == user_id,
        Document.status != "FAILED",
        Document.doc_category.in_(["QUESTION_PAPER", "PYQ"])
    ).count()

    syllabus_documents_count = db.query(Document).filter(
        Document.subject_id == subject.id,
        Document.user_id == user_id,
        Document.status != "FAILED",
        Document.doc_category == "SYLLABUS"
    ).count()

    # 4. Topics count & Important Topics
    topics = db.query(Topic).filter(Topic.subject_id == subject.id).all()
    topics_count = len(topics)
    extracted_topics_count = topics_count
    high_priority_topics_count = len([t for t in topics if (t.preparation_priority or "").upper() == "HIGH"])
    manually_marked_topics_count = len([t for t in topics if t.is_manually_marked])
    important_topics_count = len([t for t in topics if (t.preparation_priority or "").upper() == "HIGH" or t.is_manually_marked])

    # 5. Topics completed
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    completed_names = set(profile.completed_topics or []) if profile else set()
    completed_task_topic_ids = {t.topic_id for t in (eligible_tasks if active_plan else []) if (t.status or "").upper() == "COMPLETED" and t.topic_id}
    topics_completed = len([t for t in topics if t.name in completed_names or t.id in completed_task_topic_ids])

    # 6. Question counts
    questions = db.query(Question).filter(Question.subject_id == subject.id).all()
    questions_count = len(questions)
    pyq_questions_count = len([q for q in questions if q.is_pyq or (q.origin or "").upper() == "PYQ"])
    generated_questions_count = len([q for q in questions if (q.origin or "").upper() == "AI_GENERATED"])

    # Formula breakdown documentation
    formula_info = {
        "formula": "task_completion_percentage = (tasks_completed / tasks_total) * 100.0 if tasks_total > 0 else None",
        "tasks_completed": tasks_completed,
        "tasks_pending": tasks_pending,
        "tasks_total": tasks_total,
        "completion_percentage": prep_progress,
        "mastery_policy": "Uploaded documents are study materials, not proof of mastery. Progress is derived strictly from verified study tasks completed."
    }

    # If no pending task found but high-priority topics exist, suggest top priority topic
    if not next_action:
        if topics:
            high_p = [t for t in topics if (t.preparation_priority or "").upper() == "HIGH" or t.is_manually_marked]
            top_t = high_p[0] if high_p else topics[0]
            next_action = f"Revise {top_t.name}"
        elif docs_count == 0:
            next_action = "Upload syllabus or lecture notes to extract topics"
        else:
            next_action = "Generate study schedule"

    return SubjectProgressResponse(
        subject_id=subject.id,
        subject_name=subject.name,
        subject_code=subject.code,
        semester=subject.semester,
        exam_date=subject.exam_date,
        days_remaining=days_rem,
        target_marks=subject.target_marks,
        study_hours_per_day=subject.study_hours_per_day,
        preparation_progress=prep_progress,
        task_completion_percentage=prep_progress,
        progress_status=progress_status,
        tasks_completed=tasks_completed,
        tasks_pending=tasks_pending,
        tasks_total=tasks_total,
        documents_count=docs_count,
        notes_documents_count=notes_documents_count,
        pyq_documents_count=pyq_documents_count,
        syllabus_documents_count=syllabus_documents_count,
        topics_count=topics_count,
        extracted_topics_count=extracted_topics_count,
        topics_completed=topics_completed,
        important_topics_count=important_topics_count,
        high_priority_topics_count=high_priority_topics_count,
        manually_marked_topics_count=manually_marked_topics_count,
        questions_count=questions_count,
        pyq_questions_count=pyq_questions_count,
        generated_questions_count=generated_questions_count,
        exam_urgency=exam_urgency,
        next_recommended_action=next_action,
        formula_info=formula_info
    )

@router.get("", response_model=List[SubjectResponse])
def get_subjects(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Retrieve all subjects strictly owned by the authenticated student."""
    return db.query(Subject).filter(Subject.user_id == current_user.id).order_by(Subject.created_at.desc()).all()

@router.get("/overview", response_model=SubjectOverviewResponse)
def get_subjects_overview(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Return aggregated metrics and individual card progress for all subjects belonging to current student."""
    user_subjects = db.query(Subject).filter(Subject.user_id == current_user.id).order_by(Subject.created_at.asc()).all()

    subject_cards = [compute_subject_progress(sub, current_user.id, db) for sub in user_subjects]

    total_subjects = len(subject_cards)
    upcoming_exams = len([c for c in subject_cards if c.days_remaining is not None and c.days_remaining >= 0])
    total_completed_tasks = sum(c.tasks_completed for c in subject_cards)
    total_eligible_tasks = sum(c.tasks_total for c in subject_cards)

    overall_progress = None
    if total_eligible_tasks > 0:
        overall_progress = round((total_completed_tasks / total_eligible_tasks) * 100.0, 1)

    summary = SubjectOverviewSummary(
        total_subjects=total_subjects,
        upcoming_exams=upcoming_exams,
        completed_tasks=total_completed_tasks,
        overall_progress=overall_progress
    )

    return SubjectOverviewResponse(
        summary=summary,
        subjects=subject_cards
    )

@router.get("/{subject_id}/progress", response_model=SubjectProgressResponse)
def get_subject_progress(
    subject_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Return detailed progress calculation for a specific subject owned by the authenticated user."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this subject")

    return compute_subject_progress(subject, current_user.id, db)

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject_by_id(
    subject_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single subject, enforcing ownership."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this subject")

    return subject

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    sub_in: SubjectCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Create a new subject associated automatically with the authenticated user."""
    name_clean = sub_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Subject name cannot be empty")

    if sub_in.code and sub_in.code.strip():
        code_clean = sub_in.code.strip().upper()
    else:
        abbr = "".join(w[0] for w in name_clean.split() if w[0].isalnum()).upper()
        if not abbr:
            abbr = "".join(c for c in name_clean if c.isalnum())[:3].upper() or "SUB"
        code_clean = f"{abbr[:4]}-{current_user.id}"

    # Duplicate prevention for current user
    duplicate_query = db.query(Subject).filter(
        Subject.user_id == current_user.id,
        Subject.name.ilike(name_clean)
    )
    existing_by_name = duplicate_query.first()
    if existing_by_name:
        raise HTTPException(
            status_code=400,
            detail=f"You already have a subject named '{name_clean}'. Would you like to open it instead?"
        )

    if sub_in.code and sub_in.code.strip():
        existing_by_code = db.query(Subject).filter(
            Subject.user_id == current_user.id,
            Subject.code.ilike(code_clean)
        ).first()
        if existing_by_code:
            raise HTTPException(
                status_code=400,
                detail=f"You already have a subject with code '{code_clean}' ({existing_by_code.name})."
            )

    subject = Subject(
        user_id=current_user.id,
        name=name_clean,
        code=code_clean,
        semester=sub_in.semester.strip() if sub_in.semester else None,
        exam_date=sub_in.exam_date.strip() if sub_in.exam_date else None,
        target_marks=sub_in.target_marks if sub_in.target_marks is not None else 85.0,
        study_hours_per_day=sub_in.study_hours_per_day if sub_in.study_hours_per_day is not None else 3.0,
        description=sub_in.description.strip() if sub_in.description else None,
        syllabus_text=sub_in.syllabus_text.strip() if sub_in.syllabus_text else None
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)

    # If exam_date provided, create an Exam entry
    if subject.exam_date:
        exam = Exam(
            subject_id=subject.id,
            user_id=current_user.id,
            name=f"{subject.name} Examination",
            date=subject.exam_date,
            total_marks=subject.target_marks or 85.0,
            duration_minutes=90,
            academic_year=subject.semester or "2025-2026",
            term="Final/Mid-Sem"
        )
        db.add(exam)
        db.commit()

    # If student's profile has no active subject, set this new subject as active
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile and (profile.subject_id is None):
        profile.subject_id = subject.id
        if subject.exam_date:
            profile.exam_date = subject.exam_date
        db.commit()

    return subject

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    sub_update: SubjectUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Update subject details, validating ownership."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this subject")

    if sub_update.name is not None:
        name_clean = sub_update.name.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Subject name cannot be empty")
        # Check duplicate name for same user
        dup = db.query(Subject).filter(
            Subject.user_id == current_user.id,
            Subject.id != subject_id,
            Subject.name.ilike(name_clean)
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Another subject with this name already exists")
        subject.name = name_clean

    if sub_update.code is not None:
        code_clean = sub_update.code.strip() if sub_update.code.strip() else None
        if code_clean:
            dup_code = db.query(Subject).filter(
                Subject.user_id == current_user.id,
                Subject.id != subject_id,
                Subject.code.ilike(code_clean)
            ).first()
            if dup_code:
                raise HTTPException(status_code=400, detail=f"Another subject with code '{code_clean}' already exists")
        subject.code = code_clean

    if sub_update.semester is not None:
        subject.semester = sub_update.semester.strip() if sub_update.semester else None
    if sub_update.exam_date is not None:
        subject.exam_date = sub_update.exam_date.strip() if sub_update.exam_date else None
        # Also sync with exam
        exam = db.query(Exam).filter(Exam.subject_id == subject.id).first()
        if exam:
            exam.date = subject.exam_date or "TBD"
        elif subject.exam_date:
            db.add(Exam(
                subject_id=subject.id,
                user_id=current_user.id,
                name=f"{subject.name} Examination",
                date=subject.exam_date,
                total_marks=subject.target_marks or 85.0
            ))
        # Sync with profile if active subject
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile and profile.subject_id == subject.id:
            profile.exam_date = subject.exam_date

    if sub_update.target_marks is not None:
        subject.target_marks = sub_update.target_marks
    if sub_update.study_hours_per_day is not None:
        subject.study_hours_per_day = sub_update.study_hours_per_day
    if sub_update.description is not None:
        subject.description = sub_update.description
    if sub_update.syllabus_text is not None:
        subject.syllabus_text = sub_update.syllabus_text

    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Delete a subject owned by current user and cascade cleanups."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this subject")

    # If student's profile points to this subject, clear it or pick another owned subject
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile and profile.subject_id == subject_id:
        other_sub = db.query(Subject).filter(
            Subject.user_id == current_user.id,
            Subject.id != subject_id
        ).first()
        profile.subject_id = other_sub.id if other_sub else None
        profile.exam_date = other_sub.exam_date if other_sub else None

    # Delete study plans for this subject
    plans = db.query(StudyPlan).filter(StudyPlan.subject_id == subject_id).all()
    for p in plans:
        db.query(StudyTask).filter(StudyTask.study_plan_id == p.id).delete()
        db.delete(p)

    # Invalidate and purge subject chunks from vector store
    from app.ml.vector_store import vector_store
    vector_store.remove_subject(subject_id)

    db.delete(subject)
    db.commit()

    return {"message": f"Subject '{subject.name}' deleted successfully", "deleted_id": subject_id}
