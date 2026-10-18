import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import StudyPlan, StudyTask

client = TestClient(app)

def test_1_new_student_clean_empty_state():
    """TEST 1 — New student: Register a new account. Expected: no unrelated demo subjects, marks, exams, or progress."""
    email = f"new_student_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "New Student Alice"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify no subjects
    sub_res = client.get("/api/subjects", headers=headers)
    assert sub_res.status_code == 200
    assert sub_res.json() == []

    # Verify overview is empty
    overview_res = client.get("/api/subjects/overview", headers=headers)
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["summary"]["total_subjects"] == 0
    assert overview["summary"]["upcoming_exams"] == 0
    assert overview["summary"]["completed_tasks"] == 0
    assert overview["summary"]["overall_progress"] is None
    assert overview["subjects"] == []

    # Verify no leaked documents
    doc_res = client.get("/api/documents", headers=headers)
    assert doc_res.status_code == 200
    assert doc_res.json() == []

    # Verify no leaked study plans
    plan_res = client.get("/api/study-plan", headers=headers)
    assert plan_res.status_code == 200
    assert plan_res.json() is None

def test_2_add_subject():
    """TEST 2 — Add subject: Add 'Distributed Systems'. Expected: subject appears in My Subjects and Dashboard."""
    email = f"student_add_sub_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Bob Builder"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add subject
    create_res = client.post("/api/subjects", json={
        "name": "Distributed Systems",
        "code": "CS502",
        "semester": "Semester 6",
        "exam_date": "2026-12-10",
        "target_marks": 90.0,
        "study_hours_per_day": 3.5,
        "description": "Consensus, Raft, Paxos, and distributed storage."
    }, headers=headers)
    assert create_res.status_code == 201
    created_sub = create_res.json()
    assert created_sub["name"] == "Distributed Systems"
    assert created_sub["code"] == "CS502"
    assert created_sub["exam_date"] == "2026-12-10"

    # Verify in list
    list_res = client.get("/api/subjects", headers=headers)
    assert list_res.status_code == 200
    sub_list = list_res.json()
    assert len(sub_list) == 1
    assert sub_list[0]["id"] == created_sub["id"]

    # Verify in overview
    overview_res = client.get("/api/subjects/overview", headers=headers)
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["summary"]["total_subjects"] == 1
    assert len(overview["subjects"]) == 1
    assert overview["subjects"][0]["subject_name"] == "Distributed Systems"

def test_3_persistence():
    """TEST 3 — Persistence: Log out and log back in. Expected: subject remains available."""
    email = f"student_persist_{int(time.time() * 1000)}@examiq.edu"
    pwd = "SecurePassword123!"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "Charlie Chaplin"
    })
    headers1 = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Add subject
    client.post("/api/subjects", json={
        "name": "Operating Systems",
        "code": "CS301",
        "exam_date": "2026-11-28"
    }, headers=headers1)

    # Re-login (new token)
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": pwd
    })
    assert login_res.status_code == 200
    headers2 = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Fetch subjects with fresh login
    sub_res = client.get("/api/subjects", headers=headers2)
    assert sub_res.status_code == 200
    subjects = sub_res.json()
    assert len(subjects) == 1
    assert subjects[0]["name"] == "Operating Systems"

def test_4_and_5_account_isolation_and_authorization():
    """
    TEST 4 — Account isolation: Register Account A and Account B. Add a different subject to each. Neither sees the other.
    TEST 5 — Authorization: Attempt to access another account's subject by ID. Access is denied (403).
    """
    ts = int(time.time() * 1000)
    email_a = f"user_a_{ts}@examiq.edu"
    email_b = f"user_b_{ts}@examiq.edu"

    res_a = client.post("/api/auth/register", json={"email": email_a, "password": "PasswordA123!", "full_name": "Student A"})
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = client.post("/api/auth/register", json={"email": email_b, "password": "PasswordB123!", "full_name": "Student B"})
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # A adds "Compiler Design"
    sub_a_res = client.post("/api/subjects", json={"name": "Compiler Design", "code": "CS601"}, headers=headers_a)
    assert sub_a_res.status_code == 201
    id_a = sub_a_res.json()["id"]

    # B adds "Computer Networks"
    sub_b_res = client.post("/api/subjects", json={"name": "Computer Networks", "code": "CS602"}, headers=headers_b)
    assert sub_b_res.status_code == 201
    id_b = sub_b_res.json()["id"]

    # Verify A only sees Compiler Design
    list_a = client.get("/api/subjects", headers=headers_a).json()
    assert len(list_a) == 1
    assert list_a[0]["name"] == "Compiler Design"

    # Verify B only sees Computer Networks
    list_b = client.get("/api/subjects", headers=headers_b).json()
    assert len(list_b) == 1
    assert list_b[0]["name"] == "Computer Networks"

    # TEST 5: Authorization test: Account B attempts to read, update, delete Account A's subject
    forbidden_get = client.get(f"/api/subjects/{id_a}", headers=headers_b)
    assert forbidden_get.status_code == 403

    forbidden_prog = client.get(f"/api/subjects/{id_a}/progress", headers=headers_b)
    assert forbidden_prog.status_code == 403

    forbidden_put = client.put(f"/api/subjects/{id_a}", json={"name": "Hacked Name"}, headers=headers_b)
    assert forbidden_put.status_code == 403

    forbidden_del = client.delete(f"/api/subjects/{id_a}", headers=headers_b)
    assert forbidden_del.status_code == 403

    # Account A attempts to read Account B's subject
    forbidden_get_a = client.get(f"/api/subjects/{id_b}", headers=headers_a)
    assert forbidden_get_a.status_code == 403

def test_6_empty_state_contract():
    """TEST 6 — Empty state: Student with no subjects returns valid null progress and empty arrays."""
    email = f"empty_student_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={"email": email, "password": "Password123!", "full_name": "Empty Student"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    overview = client.get("/api/subjects/overview", headers=headers).json()
    assert overview["summary"]["total_subjects"] == 0
    assert overview["summary"]["overall_progress"] is None
    assert overview["subjects"] == []

def test_7_and_8_progress_calculations():
    """
    TEST 7 — Progress: Create subject with 4 eligible tasks, complete 2. Expected: preparation progress is 50.0%.
    TEST 8 — No task data: Create a subject with no study plan. Expected: progress_status: 'Not started', progress: null.
    """
    email = f"prog_student_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={"email": email, "password": "Password123!", "full_name": "Progress Tester"})
    user_id = res.json()["user_id"]
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add subject
    sub_res = client.post("/api/subjects", json={"name": "Database Systems", "code": "CS202"}, headers=headers)
    sub_id = sub_res.json()["id"]

    # TEST 8: Before any study plan exists
    prog_before = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog_before["progress_status"] == "Not started"
    assert prog_before["preparation_progress"] is None
    assert prog_before["tasks_completed"] == 0
    assert prog_before["tasks_total"] == 0

    # TEST 7: Insert a study plan with 4 tasks (2 completed, 2 pending)
    db = SessionLocal()
    try:
        plan = StudyPlan(user_id=user_id, subject_id=sub_id, exam_date="2026-11-20", status="ACTIVE", total_days=4, total_hours=8.0)
        db.add(plan)
        db.commit()
        db.refresh(plan)

        t1 = StudyTask(study_plan_id=plan.id, day_number=1, task_type="LEARN", title="Relational Algebra", duration_minutes=60, status="COMPLETED")
        t2 = StudyTask(study_plan_id=plan.id, day_number=2, task_type="PRACTICE", title="SQL Joins", duration_minutes=60, status="COMPLETED")
        t3 = StudyTask(study_plan_id=plan.id, day_number=3, task_type="LEARN", title="B+ Trees", duration_minutes=60, status="PENDING")
        t4 = StudyTask(study_plan_id=plan.id, day_number=4, task_type="MOCK_TEST", title="Normalization", duration_minutes=60, status="PENDING")
        db.add_all([t1, t2, t3, t4])
        db.commit()
    finally:
        db.close()

    # Now verify calculated progress is exactly 50%
    prog_after = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog_after["progress_status"] == "In progress"
    assert prog_after["preparation_progress"] == 50.0
    assert prog_after["tasks_completed"] == 2
    assert prog_after["tasks_total"] == 4

    # Verify overview summary also reflects 50%
    overview = client.get("/api/subjects/overview", headers=headers).json()
    assert overview["summary"]["overall_progress"] == 50.0
    assert overview["summary"]["completed_tasks"] == 2

def test_9_subject_editing():
    """TEST 9 — Subject editing: Change the exam date. Expected: dashboard and subject card update."""
    email = f"edit_student_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={"email": email, "password": "Password123!", "full_name": "Editor Dave"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    sub_res = client.post("/api/subjects", json={"name": "Software Engineering", "exam_date": "2026-11-01"}, headers=headers)
    sub_id = sub_res.json()["id"]

    # Update exam date to Nov 20, 2026
    put_res = client.put(f"/api/subjects/{sub_id}", json={"exam_date": "2026-11-20"}, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["exam_date"] == "2026-11-20"

    # Verify progress card has updated date and days remaining
    prog = client.get(f"/api/subjects/{sub_id}/progress", headers=headers).json()
    assert prog["exam_date"] == "2026-11-20"
    assert prog["days_remaining"] is not None

def test_10_demo_isolation():
    """TEST 10 — Demo isolation: Demo Student data belongs exclusively to demo account; regular accounts never see it."""
    # 1. Login as demo student
    demo_login = client.post("/api/auth/login", json={"email": "demo@examiq.edu", "password": "DemoStudent123!"})
    demo_headers = {"Authorization": f"Bearer {demo_login.json()['access_token']}"}

    demo_subs = client.get("/api/subjects", headers=demo_headers).json()
    assert len(demo_subs) >= 1
    assert any(s["code"] == "BT14503" for s in demo_subs)

    # 2. Login as regular user
    regular_email = f"regular_user_{int(time.time() * 1000)}@examiq.edu"
    reg_res = client.post("/api/auth/register", json={"email": regular_email, "password": "Password123!", "full_name": "Regular User"})
    regular_headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    reg_subs = client.get("/api/subjects", headers=regular_headers).json()
    assert reg_subs == []  # MUST NOT see CNS

    # Regular user cannot read CNS documents
    cns_sub_id = demo_subs[0]["id"]
    reg_docs = client.get(f"/api/documents?subject_id={cns_sub_id}", headers=regular_headers).json()
    assert reg_docs == []
