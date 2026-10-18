import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.database_models import StudyPlan, StudyTask, Topic, StudentProfile

class StudyPlanService:
    def generate_plan(
        self,
        db: Session,
        user_id: int,
        subject_id: int,
        exam_date_str: str,
        available_hours_per_day: float = 3.0
    ) -> StudyPlan:
        # Delete any existing active study plans for this user and subject
        existing = db.query(StudyPlan).filter(
            StudyPlan.user_id == user_id,
            StudyPlan.subject_id == subject_id
        ).all()
        for p in existing:
            db.delete(p)
        db.commit()

        # Calculate days until exam
        try:
            target_date = datetime.date.fromisoformat(exam_date_str)
        except Exception:
            target_date = datetime.date.today() + datetime.timedelta(days=14)

        today = datetime.date.today()
        days_diff = (target_date - today).days
        total_days = max(3, min(30, days_diff if days_diff > 0 else 14))
        total_hours = total_days * available_hours_per_day

        new_plan = StudyPlan(
            user_id=user_id,
            subject_id=subject_id,
            exam_date=exam_date_str,
            total_days=total_days,
            total_hours=total_hours,
            status="ACTIVE"
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)

        # Retrieve topics ordered by preparation priority score descending
        topics = db.query(Topic).filter(Topic.subject_id == subject_id).order_by(Topic.priority_score.desc()).all()
        if not topics:
            return new_plan

        # Retrieve profile for weak topics prioritization
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        weak_names = set(profile.weak_topics or []) if profile else set()

        # Separate topics: weak & high priority first
        high_pri_topics = [t for t in topics if t.preparation_priority == "HIGH" or t.name in weak_names]
        med_pri_topics = [t for t in topics if t.preparation_priority == "MEDIUM" and t.name not in weak_names]
        low_pri_topics = [t for t in topics if t.preparation_priority == "LOW" and t.name not in weak_names]

        ordered_pool = high_pri_topics + med_pri_topics + low_pri_topics
        if not ordered_pool:
            ordered_pool = list(topics)

        # Build daily task schedule
        tasks = []
        topic_idx = 0
        pool_len = len(ordered_pool)

        for day in range(1, total_days + 1):
            scheduled_date = (today + datetime.timedelta(days=day)).isoformat()
            
            # Final days are reserved for full revision and mock exam
            if day == total_days:
                # Day of / before exam: Comprehensive Mock Test
                task = StudyTask(
                    study_plan_id=new_plan.id,
                    day_number=day,
                    topic_id=ordered_pool[0].id if ordered_pool else None,
                    task_type="MOCK_TEST",
                    title="Comprehensive Mid-Sem Exam Simulation (Timed 90 min)",
                    description="Simulate complete exam conditions covering all high-frequency topics under time constraint.",
                    duration_minutes=int(min(available_hours_per_day * 60, 90)),
                    priority="HIGH",
                    status="PENDING",
                    scheduled_date=scheduled_date,
                    practice_question_ids=[1, 4, 5, 6, 8, 9],
                    resources=["Semester 5 Mid-Sem Exam Paper", "Standard Rubrics"]
                )
                tasks.append(task)
            elif day == total_days - 1:
                # Formula & Diagram Rapid Revision
                task = StudyTask(
                    study_plan_id=new_plan.id,
                    day_number=day,
                    topic_id=ordered_pool[0].id if ordered_pool else None,
                    task_type="REVISE",
                    title="Formula & Diagram Intensive Recall Session",
                    description="Review all cryptographic formulas, Galois division, DES Feistel structure, and LWE dimensions.",
                    duration_minutes=int(available_hours_per_day * 60),
                    priority="HIGH",
                    status="PENDING",
                    scheduled_date=scheduled_date,
                    practice_question_ids=[4, 6],
                    resources=["Formula Cheatsheet", "Lecture Architecture Slides"]
                )
                tasks.append(task)
            else:
                curr_topic = ordered_pool[topic_idx % pool_len]
                topic_idx += 1

                # Task 1: Learn Core Concepts
                dur1 = int(min(60, available_hours_per_day * 60 * 0.6))
                t1 = StudyTask(
                    study_plan_id=new_plan.id,
                    day_number=day,
                    topic_id=curr_topic.id,
                    task_type="LEARN",
                    title=f"Core Concepts: {curr_topic.name}",
                    description=f"Study essential mechanisms, mathematical formulations, and terminology for {curr_topic.name}.",
                    duration_minutes=dur1,
                    priority=curr_topic.preparation_priority,
                    status="PENDING",
                    scheduled_date=scheduled_date,
                    practice_question_ids=[],
                    resources=[f"Lecture Notes on {curr_topic.name}"]
                )
                tasks.append(t1)

                # Task 2: Practice Exam Questions
                dur2 = int(max(30, available_hours_per_day * 60 - dur1))
                t2 = StudyTask(
                    study_plan_id=new_plan.id,
                    day_number=day,
                    topic_id=curr_topic.id,
                    task_type="PRACTICE",
                    title=f"Exam Question Practice: {curr_topic.name}",
                    description=f"Solve authentic university questions and check answer structure against marking criteria.",
                    duration_minutes=dur2,
                    priority=curr_topic.preparation_priority,
                    status="PENDING",
                    scheduled_date=scheduled_date,
                    practice_question_ids=[curr_topic.id],
                    resources=["Historical PYQ Bank", "Answer Coach"]
                )
                tasks.append(t2)

        db.add_all(tasks)
        db.commit()
        db.refresh(new_plan)
        return new_plan

study_plan_service = StudyPlanService()
