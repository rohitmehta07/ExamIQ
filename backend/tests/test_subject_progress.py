import time
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import User, Subject, Document, Topic, Question, StudyPlan, StudyTask

client = TestClient(app)

def create_user_and_headers(tag: str):
    email = f"user_{tag}_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"User {tag}"
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    user_id = res.json()["user_id"]
    return user_id, {"Authorization": f"Bearer {token}"}

def test_two_subjects_have_independently_calculated_progress():
    """
    TEST 1: Proves two distinct subjects under the same user have independently calculated progress.
    Subject 1 has documents, topics, questions, and 3/4 tasks completed (75%).
    Subject 2 has different documents, topics, questions, and 0/2 tasks completed (0%).
    Verify no data or metrics bleed between Subject 1 and Subject 2.
    """
    user_id, headers = create_user_and_headers("two_subs")

    # 1. Create Subject 1: Computer Networks
    sub1_res = client.post("/api/subjects", json={
        "name": "Computer Networks",
        "code": "CS601",
        "semester": "Semester 6",
        "exam_date": "2026-11-15",
        "target_marks": 90.0,
        "study_hours_per_day": 3.0
    }, headers=headers)
    assert sub1_res.status_code == 201
    sub1_id = sub1_res.json()["id"]

    # 2. Create Subject 2: Operating Systems
    sub2_res = client.post("/api/subjects", json={
        "name": "Operating Systems",
        "code": "CS502",
        "semester": "Semester 5",
        "exam_date": "2026-12-01",
        "target_marks": 80.0,
        "study_hours_per_day": 2.0
    }, headers=headers)
    assert sub2_res.status_code == 201
    sub2_id = sub2_res.json()["id"]

    # Seed data directly into DB for Subject 1
    db = SessionLocal()
    try:
        # Subject 1 Documents
        d1 = Document(subject_id=sub1_id, user_id=user_id, filename="CN_Lecture_Notes.pdf", file_path="uploads/CN_Lecture_Notes.pdf", file_type="pdf", doc_category="LECTURE_NOTES", status="READY")
        d2 = Document(subject_id=sub1_id, user_id=user_id, filename="CN_PYQ_2024.pdf", file_path="uploads/CN_PYQ_2024.pdf", file_type="pdf", doc_category="QUESTION_PAPER", status="READY")
        db.add_all([d1, d2])
        db.commit()

        # Subject 1 Topics (3 topics: 2 High priority, 1 manually marked)
        t1 = Topic(subject_id=sub1_id, name="TCP Congestion Control", category="Transport", preparation_priority="HIGH", pyq_appearances=3, syllabus_weight=0.9, is_manually_marked=False)
        t2 = Topic(subject_id=sub1_id, name="BGP Routing Protocol", category="Network Layer", preparation_priority="HIGH", pyq_appearances=2, syllabus_weight=0.85, is_manually_marked=True)
        t3 = Topic(subject_id=sub1_id, name="DNS Resolution", category="Application", preparation_priority="LOW", pyq_appearances=0, syllabus_weight=0.5, is_manually_marked=False)
        db.add_all([t1, t2, t3])
        db.commit()

        # Subject 1 Questions (4 questions: 2 PYQ, 2 AI Generated)
        q1 = Question(subject_id=sub1_id, text="Explain TCP Slow Start mechanism", origin="PYQ", is_pyq=True, marks=5.0)
        q2 = Question(subject_id=sub1_id, text="Differentiate BGP and OSPF", origin="PYQ", is_pyq=True, marks=5.0)
        q3 = Question(subject_id=sub1_id, text="Calculate TCP window size with RTT 50ms", origin="AI_GENERATED", is_pyq=False, marks=4.0)
        q4 = Question(subject_id=sub1_id, text="Describe DNS root server hierarchy", origin="AI_GENERATED", is_pyq=False, marks=3.0)
        db.add_all([q1, q2, q3, q4])
        db.commit()

        # Subject 1 Study Plan: 4 tasks (3 completed, 1 pending) -> 75%
        plan1 = StudyPlan(user_id=user_id, subject_id=sub1_id, exam_date="2026-11-15", status="ACTIVE", total_days=4, total_hours=12.0)
        db.add(plan1)
        db.commit()
        db.refresh(plan1)

        task1_1 = StudyTask(study_plan_id=plan1.id, day_number=1, task_type="LEARN", title="Study TCP Flow Control", duration_minutes=60, status="COMPLETED")
        task1_2 = StudyTask(study_plan_id=plan1.id, day_number=2, task_type="PRACTICE", title="Solve BGP Scenarios", duration_minutes=60, status="COMPLETED")
        task1_3 = StudyTask(study_plan_id=plan1.id, day_number=3, task_type="REVISE", title="Review DNS & Transport", duration_minutes=60, status="COMPLETED")
        task1_4 = StudyTask(study_plan_id=plan1.id, day_number=4, task_type="MOCK_TEST", title="CN Full Mock", duration_minutes=90, status="PENDING")
        db.add_all([task1_1, task1_2, task1_3, task1_4])
        db.commit()

        # Seed data for Subject 2 (different metrics)
        # Subject 2 Documents: 1 syllabus
        d3 = Document(subject_id=sub2_id, user_id=user_id, filename="OS_Syllabus.pdf", file_path="uploads/OS_Syllabus.pdf", file_type="pdf", doc_category="SYLLABUS", status="READY")
        db.add(d3)
        db.commit()

        # Subject 2 Topics: 1 topic (Medium priority, not marked)
        t4 = Topic(subject_id=sub2_id, name="Virtual Memory Paging", category="Memory", preparation_priority="MEDIUM", pyq_appearances=1, syllabus_weight=0.7, is_manually_marked=False)
        db.add(t4)
        db.commit()

        # Subject 2 Questions: 1 question (PYQ)
        q5 = Question(subject_id=sub2_id, text="Explain page fault handling routine", origin="PYQ", is_pyq=True, marks=6.0)
        db.add(q5)
        db.commit()

        # Subject 2 Study Plan: 2 tasks (0 completed, 2 pending) -> 0%
        plan2 = StudyPlan(user_id=user_id, subject_id=sub2_id, exam_date="2026-12-01", status="ACTIVE", total_days=2, total_hours=4.0)
        db.add(plan2)
        db.commit()
        db.refresh(plan2)

        task2_1 = StudyTask(study_plan_id=plan2.id, day_number=1, task_type="LEARN", title="Read Paging Notes", duration_minutes=60, status="PENDING")
        task2_2 = StudyTask(study_plan_id=plan2.id, day_number=2, task_type="PRACTICE", title="Practice Page Replacement", duration_minutes=60, status="PENDING")
        db.add_all([task2_1, task2_2])
        db.commit()

    finally:
        db.close()

    # Query Progress for Subject 1
    prog1 = client.get(f"/api/subjects/{sub1_id}/progress", headers=headers).json()
    assert prog1["subject_id"] == sub1_id
    assert prog1["subject_name"] == "Computer Networks"
    assert prog1["subject_code"] == "CS601"
    assert prog1["documents_count"] == 2
    assert prog1["notes_documents_count"] == 1
    assert prog1["pyq_documents_count"] == 1
    assert prog1["syllabus_documents_count"] == 0
    assert prog1["topics_count"] == 3
    assert prog1["extracted_topics_count"] == 3
    assert prog1["important_topics_count"] == 2
    assert prog1["high_priority_topics_count"] == 2
    assert prog1["manually_marked_topics_count"] == 1
    assert prog1["questions_count"] == 4
    assert prog1["pyq_questions_count"] == 2
    assert prog1["generated_questions_count"] == 2
    assert prog1["tasks_total"] == 4
    assert prog1["tasks_completed"] == 3
    assert prog1["tasks_pending"] == 1
    assert prog1["task_completion_percentage"] == 75.0
    assert prog1["preparation_progress"] == 75.0
    assert prog1["progress_status"] == "In progress"
    assert prog1["exam_date"] == "2026-11-15"
    assert prog1["days_remaining"] is not None
    assert prog1["target_marks"] == 90.0
    assert prog1["study_hours_per_day"] == 3.0

    # Query Progress for Subject 2
    prog2 = client.get(f"/api/subjects/{sub2_id}/progress", headers=headers).json()
    assert prog2["subject_id"] == sub2_id
    assert prog2["subject_name"] == "Operating Systems"
    assert prog2["subject_code"] == "CS502"
    assert prog2["documents_count"] == 1
    assert prog2["notes_documents_count"] == 0
    assert prog2["pyq_documents_count"] == 0
    assert prog2["syllabus_documents_count"] == 1
    assert prog2["topics_count"] == 1
    assert prog2["extracted_topics_count"] == 1
    assert prog2["important_topics_count"] == 0
    assert prog2["high_priority_topics_count"] == 0
    assert prog2["manually_marked_topics_count"] == 0
    assert prog2["questions_count"] == 1
    assert prog2["pyq_questions_count"] == 1
    assert prog2["generated_questions_count"] == 0
    assert prog2["tasks_total"] == 2
    assert prog2["tasks_completed"] == 0
    assert prog2["tasks_pending"] == 2
    assert prog2["task_completion_percentage"] == 0.0
    assert prog2["preparation_progress"] == 0.0
    assert prog2["progress_status"] == "In progress"
    assert prog2["exam_date"] == "2026-12-01"
    assert prog2["days_remaining"] is not None
    assert prog2["target_marks"] == 80.0
    assert prog2["study_hours_per_day"] == 2.0

    # Independent calculations confirmed: Sub1 has 75%, Sub2 has 0%.
    assert prog1["task_completion_percentage"] != prog2["task_completion_percentage"]
    assert prog1["documents_count"] != prog2["documents_count"]
    assert prog1["topics_count"] != prog2["topics_count"]
    assert prog1["questions_count"] != prog2["questions_count"]

def test_uploaded_documents_not_treated_as_mastery():
    """
    TEST 2: Verifies uploaded documents represent inventory and are NOT treated as proof of mastery.
    A subject with 3 uploaded documents but 0 tasks must return null / Not started progress.
    """
    user_id, headers = create_user_and_headers("doc_mastery_check")

    sub_res = client.post("/api/subjects", json={"name": "Compiler Design", "code": "CS701"}, headers=headers)
    sub_id = sub_res.json()["id"]

    db = SessionLocal()
    try:
        # Upload 3 documents
        d1 = Document(subject_id=sub_id, user_id=user_id, filename="Lexical_Analysis.pdf", file_path="uploads/Lexical_Analysis.pdf", file_type="pdf", doc_category="LECTURE_NOTES", status="READY")
        d2 = Document(subject_id=sub_id, user_id=user_id, filename="Syntax_Parsing.pdf", file_path="uploads/Syntax_Parsing.pdf", file_type="pdf", doc_category="LECTURE_NOTES", status="READY")
        d3 = Document(subject_id=sub_id, user_id=user_id, filename="Semantic_Rules.pdf", file_path="uploads/Semantic_Rules.pdf", file_type="pdf", doc_category="LECTURE_NOTES", status="READY")
        db.add_all([d1, d2, d3])
        db.commit()
    finally:
        db.close()

    prog = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog["documents_count"] == 3
    assert prog["tasks_total"] == 0
    assert prog["tasks_completed"] == 0
    assert prog["tasks_pending"] == 0
    # Mastery is NOT given for document uploads alone
    assert prog["task_completion_percentage"] is None
    assert prog["preparation_progress"] is None
    assert prog["progress_status"] == "Not started"
    assert "mastery_policy" in prog["formula_info"]

def test_empty_subject_handles_division_by_zero_safely():
    """
    TEST 3: Verifies empty subject with 0 documents, 0 topics, 0 questions, and 0 tasks
    returns clean 200 without zero-division error.
    """
    user_id, headers = create_user_and_headers("empty_sub")

    sub_res = client.post("/api/subjects", json={"name": "Empty Subject", "code": "EMP101"}, headers=headers)
    sub_id = sub_res.json()["id"]

    prog = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog["subject_id"] == sub_id
    assert prog["documents_count"] == 0
    assert prog["topics_count"] == 0
    assert prog["questions_count"] == 0
    assert prog["tasks_total"] == 0
    assert prog["tasks_completed"] == 0
    assert prog["tasks_pending"] == 0
    assert prog["task_completion_percentage"] is None
    assert prog["progress_status"] == "Not started"

def test_progress_refresh_and_persistence_after_task_toggle():
    """
    TEST 4: Verifies live recalculation and persistence of task completion percentage
    when tasks are marked completed.
    """
    user_id, headers = create_user_and_headers("task_toggle")

    sub_res = client.post("/api/subjects", json={"name": "Cloud Computing", "code": "CS803"}, headers=headers)
    sub_id = sub_res.json()["id"]

    db = SessionLocal()
    try:
        plan = StudyPlan(user_id=user_id, subject_id=sub_id, exam_date="2026-11-30", status="ACTIVE", total_days=2, total_hours=4.0)
        db.add(plan)
        db.commit()
        db.refresh(plan)

        t1 = StudyTask(study_plan_id=plan.id, day_number=1, task_type="LEARN", title="AWS Fundamentals", duration_minutes=60, status="PENDING")
        t2 = StudyTask(study_plan_id=plan.id, day_number=2, task_type="PRACTICE", title="Docker & Kubernetes", duration_minutes=60, status="PENDING")
        db.add_all([t1, t2])
        db.commit()
        db.refresh(t1)
        db.refresh(t2)
        t1_id = t1.id
        t2_id = t2.id
    finally:
        db.close()

    # Initial progress: 0/2 completed = 0%
    prog0 = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog0["tasks_completed"] == 0
    assert prog0["tasks_pending"] == 2
    assert prog0["task_completion_percentage"] == 0.0

    # Complete Task 1
    up1 = client.put(f"/api/study-plan/tasks/{t1_id}", json={"status": "COMPLETED"}, headers=headers)
    assert up1.status_code == 200

    # Query progress: 1/2 completed = 50%
    prog1 = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog1["tasks_completed"] == 1
    assert prog1["tasks_pending"] == 1
    assert prog1["task_completion_percentage"] == 50.0
    assert prog1["progress_status"] == "In progress"

    # Complete Task 2
    up2 = client.put(f"/api/study-plan/tasks/{t2_id}", json={"status": "COMPLETED"}, headers=headers)
    assert up2.status_code == 200

    # Query progress: 2/2 completed = 100%
    prog2 = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog2["tasks_completed"] == 2
    assert prog2["tasks_pending"] == 0
    assert prog2["task_completion_percentage"] == 100.0
    assert prog2["progress_status"] == "Completed"

    # Verify persistence after reload
    prog2_reload = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog2_reload["tasks_completed"] == 2
    assert prog2_reload["task_completion_percentage"] == 100.0

def test_user_isolation_and_authorization():
    """
    TEST 5: Verifies strict user authorization and security isolation.
    Student B cannot access Student A's subject progress.
    """
    user_a_id, headers_a = create_user_and_headers("student_a")
    user_b_id, headers_b = create_user_and_headers("student_b")

    sub_res = client.post("/api/subjects", json={"name": "Confidential Security", "code": "SEC999"}, headers=headers_a)
    sub_a_id = sub_res.json()["id"]

    # Student B attempts to query Student A's progress -> 403 Forbidden
    forbidden_res = client.get(f"/api/subjects/{sub_a_id}/progress", headers=headers_b)
    assert forbidden_res.status_code == 403

    # Query non-existent subject -> 404 Not Found
    not_found_res = client.get("/api/subjects/999999/progress", headers=headers_a)
    assert not_found_res.status_code == 404
