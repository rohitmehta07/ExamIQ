import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import Topic, Question, QuestionTopic, Document, Subject, User

client = TestClient(app)

def create_test_user(name: str):
    ts = int(time.time() * 1000)
    email = f"{name.lower().replace(' ', '_')}_{ts}@examiq.edu"
    pwd = "TestPassword123!"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": name
    })
    assert res.status_code == 200, res.text
    data = res.json()
    token = data["access_token"]
    user_id = data["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, email, headers

def create_test_subject(headers, name: str, code: str):
    res = client.post("/api/subjects", json={
        "name": name,
        "code": code,
        "semester": "Semester 5",
        "exam_date": "2026-12-15"
    }, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_two_users_and_two_subjects_question_isolation():
    """
    Test that questions are strictly isolated:
    - User 1 has two subjects (Subject 1A and Subject 1B).
    - User 2 has one subject (Subject 2A).
    - Querying Subject 1A returns only Subject 1A questions.
    - Querying Subject 1B returns only Subject 1B questions.
    - User 2 querying Subject 2A returns only Subject 2A questions.
    - User 1 attempting to query Subject 2A receives 403 Forbidden.
    - User 2 attempting to query Subject 1A receives 403 Forbidden.
    """
    u1_id, _, u1_headers = create_test_user("Alice QuestionBank")
    u2_id, _, u2_headers = create_test_user("Bob QuestionBank")

    # User 1 creates 2 subjects
    sub1a_id = create_test_subject(u1_headers, "Operating Systems", "CS501")
    sub1b_id = create_test_subject(u1_headers, "Computer Networks", "CS502")

    # User 2 creates 1 subject
    sub2a_id = create_test_subject(u2_headers, "Distributed Systems", "CS601")

    # User 1 adds question to Subject 1A
    q1a_res = client.post("/api/questions", json={
        "subject_id": sub1a_id,
        "question_number": "1",
        "text": "Explain process synchronization and semaphores with suitable examples.",
        "marks": 5.0,
        "academic_year": 2024
    }, headers=u1_headers)
    assert q1a_res.status_code == 201
    q1a_id = q1a_res.json()["id"]

    # User 1 adds question to Subject 1B
    q1b_res = client.post("/api/questions", json={
        "subject_id": sub1b_id,
        "question_number": "1",
        "text": "Explain TCP 3-way handshake and describe how SYN flood attack operates.",
        "marks": 5.0,
        "academic_year": 2024
    }, headers=u1_headers)
    assert q1b_res.status_code == 201
    q1b_id = q1b_res.json()["id"]

    # User 2 adds question to Subject 2A
    q2a_res = client.post("/api/questions", json={
        "subject_id": sub2a_id,
        "question_number": "1",
        "text": "Describe the Raft consensus algorithm leader election and log replication.",
        "marks": 10.0,
        "academic_year": 2025
    }, headers=u2_headers)
    assert q2a_res.status_code == 201
    q2a_id = q2a_res.json()["id"]

    # Verify User 1 queries Subject 1A: contains only Q1A
    res_1a = client.get(f"/api/questions?subject_id={sub1a_id}", headers=u1_headers)
    assert res_1a.status_code == 200
    ids_1a = [q["id"] for q in res_1a.json()]
    assert q1a_id in ids_1a
    assert q1b_id not in ids_1a
    assert q2a_id not in ids_1a

    # Verify User 1 queries Subject 1B: contains only Q1B
    res_1b = client.get(f"/api/questions?subject_id={sub1b_id}", headers=u1_headers)
    assert res_1b.status_code == 200
    ids_1b = [q["id"] for q in res_1b.json()]
    assert q1b_id in ids_1b
    assert q1a_id not in ids_1b
    assert q2a_id not in ids_1b

    # Verify User 2 queries Subject 2A: contains only Q2A
    res_2a = client.get(f"/api/questions?subject_id={sub2a_id}", headers=u2_headers)
    assert res_2a.status_code == 200
    ids_2a = [q["id"] for q in res_2a.json()]
    assert q2a_id in ids_2a
    assert q1a_id not in ids_2a
    assert q1b_id not in ids_2a

    # Cross-User Authorization Checks
    # User 1 queries User 2's subject -> 403 Forbidden
    forbidden_res1 = client.get(f"/api/questions?subject_id={sub2a_id}", headers=u1_headers)
    assert forbidden_res1.status_code == 403

    # User 2 queries User 1's subject -> 403 Forbidden
    forbidden_res2 = client.get(f"/api/questions?subject_id={sub1a_id}", headers=u2_headers)
    assert forbidden_res2.status_code == 403

    # User 2 tries to get User 1's question by ID -> 403 Forbidden
    forbidden_get = client.get(f"/api/questions/{q1a_id}", headers=u2_headers)
    assert forbidden_get.status_code == 403


def test_question_extraction_from_pyq_document_with_metadata():
    """
    Test uploading a previous-year paper (PYQ) document:
    - Extracts structured examination questions.
    - Stores source document ID, document filename, page numbers, marks, and academic year.
    - Classifies difficulty and requirements (requires_algorithm, requires_diagram).
    """
    u_id, _, headers = create_test_user("Charlie PYQ")
    sub_id = create_test_subject(headers, "Operating Systems 2024", "OS2024")

    # Document text containing distinct questions with marks
    pyq_content = (
        "Mid-Sem Examination 2024 - Operating Systems (OS2024). Total Marks: 20.\n\n"
        "Question 1: Explain the Banker's Algorithm for deadlock avoidance and describe safety test steps. [5 Marks]\n\n"
        "Question 2: Differentiate between paging and segmentation with an illustrative memory diagram. [5 Marks]\n\n"
        "Question 3: Calculate the average waiting time using Round Robin scheduling with time quantum q = 2. [5 Marks]\n"
    )

    files = {"file": ("OS_MidSem_2024.txt", io.BytesIO(pyq_content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "QUESTION_PAPER"}, files=files, headers=headers)
    assert up_res.status_code == 200
    doc_id = up_res.json()["id"]

    # Process document
    proc_res = client.post(f"/api/documents/{doc_id}/process", headers=headers)
    assert proc_res.status_code == 200

    # Query questions for this subject
    q_res = client.get(f"/api/questions?subject_id={sub_id}", headers=headers)
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) >= 3

    # Verify Question 1 (Banker's Algorithm)
    q1 = next((q for q in questions if "Banker" in q["text"]), None)
    assert q1 is not None
    assert q1["marks"] == 5.0
    assert q1["academic_year"] == 2024
    assert q1["source_document_id"] == doc_id
    assert q1["source_document_name"] == "OS_MidSem_2024.txt"
    assert q1["requires_algorithm"] is True


    # Verify Question 2 (Paging Diagram)
    q2 = next((q for q in questions if "paging and segmentation" in q["text"].lower()), None)
    assert q2 is not None
    assert q2["marks"] == 5.0
    assert q2["requires_diagram"] is True

    # Verify Question 3 (Round Robin Calculation)
    q3 = next((q for q in questions if "Round Robin" in q["text"]), None)
    assert q3 is not None
    assert q3["requires_calculation"] is True


def test_question_search_and_advanced_filters():
    """
    Test filtering questions by text search, difficulty, marks, year, and requirements.
    Test filter metadata endpoint (/questions/filters/meta).
    """
    u_id, _, headers = create_test_user("Diana Search")
    sub_id = create_test_subject(headers, "Database Systems", "CS403")

    # Add 3 questions with different attributes
    client.post("/api/questions", json={
        "subject_id": sub_id,
        "question_number": "1",
        "text": "Explain Two-Phase Locking (2PL) protocol for concurrency control.",
        "marks": 5.0,
        "academic_year": 2023,
        "estimated_difficulty": "MEDIUM",
        "requires_algorithm": True
    }, headers=headers)

    client.post("/api/questions", json={
        "subject_id": sub_id,
        "question_number": "2",
        "text": "Draw the B+ Tree insertion diagram for keys [10, 20, 30, 40].",
        "marks": 10.0,
        "academic_year": 2024,
        "estimated_difficulty": "HARD",
        "requires_diagram": True
    }, headers=headers)

    client.post("/api/questions", json={
        "subject_id": sub_id,
        "question_number": "3",
        "text": "Define ACID properties of a database transaction.",
        "marks": 2.0,
        "academic_year": 2024,
        "estimated_difficulty": "EASY"
    }, headers=headers)

    # 1. Search filter: "Two-Phase"
    res_search = client.get(f"/api/questions?subject_id={sub_id}&search=Two-Phase", headers=headers)
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert len(data_search) == 1
    assert "Two-Phase" in data_search[0]["text"]

    # 2. Difficulty filter: "HARD"
    res_diff = client.get(f"/api/questions?subject_id={sub_id}&difficulty=HARD", headers=headers)
    assert res_diff.status_code == 200
    data_diff = res_diff.json()
    assert len(data_diff) == 1
    assert data_diff[0]["estimated_difficulty"] == "HARD"
    assert data_diff[0]["marks"] == 10.0

    # 3. Marks filter: min_marks = 5.0
    res_marks = client.get(f"/api/questions?subject_id={sub_id}&min_marks=5.0", headers=headers)
    assert res_marks.status_code == 200
    assert len(res_marks.json()) == 2

    # 4. Year filter: year = 2024
    res_year = client.get(f"/api/questions?subject_id={sub_id}&year=2024", headers=headers)
    assert res_year.status_code == 200
    assert len(res_year.json()) == 2

    # 5. Diagram requirement filter: requires_diagram = True
    res_diag = client.get(f"/api/questions?subject_id={sub_id}&requires_diagram=true", headers=headers)
    assert res_diag.status_code == 200
    assert len(res_diag.json()) == 1
    assert res_diag.json()[0]["requires_diagram"] is True

    # 6. Sorting: sort_by = marks_desc
    res_sort = client.get(f"/api/questions?subject_id={sub_id}&sort_by=marks_desc", headers=headers)
    assert res_sort.status_code == 200
    sorted_marks = [q["marks"] for q in res_sort.json()]
    assert sorted_marks == [10.0, 5.0, 2.0]

    # 7. Filter Metadata endpoint
    meta_res = client.get(f"/api/questions/filters/meta?subject_id={sub_id}", headers=headers)
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["total_questions"] == 3
    assert 2024 in meta["available_years"]
    assert 2023 in meta["available_years"]
    assert "HARD" in meta["available_difficulties"]
    assert meta["marks_range"]["min"] == 2.0
    assert meta["marks_range"]["max"] == 10.0


def test_honest_empty_state_and_no_data_fabrication():
    """
    Ensure that a new subject with no questions returns strictly an empty list [].
    Ensure no questions are leaked from other subjects or hardcoded.
    """
    u_id, _, headers = create_test_user("Evan EmptyState")
    empty_sub_id = create_test_subject(headers, "Quantum Machine Learning", "QML901")

    # Fetch questions
    res = client.get(f"/api/questions?subject_id={empty_sub_id}", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    # Fetch filter meta for empty subject
    meta_res = client.get(f"/api/questions/filters/meta?subject_id={empty_sub_id}", headers=headers)
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["total_questions"] == 0
    assert meta["available_topics"] == []
    assert meta["available_years"] == []


def test_student_manual_add_edit_and_topic_mapping():
    """
    Test student manual operations:
    1. Add custom question via POST /questions.
    2. Create topic and map question to topic via PATCH /questions/{id}/map-topic.
    3. Update question via PUT /questions/{id}.
    4. Delete question via DELETE /questions/{id}.
    5. Verify unauthorized user cannot edit or delete.
    """
    u1_id, _, u1_headers = create_test_user("Fiona ManualQ")
    u2_id, _, u2_headers = create_test_user("George Hacker")

    sub_id = create_test_subject(u1_headers, "Cloud Computing", "CC701")

    # 1. Create Topic in this subject
    top_res = client.post("/api/topics", json={
        "subject_id": sub_id,
        "name": "Serverless & Microservices",
        "category": "Cloud Architecture",
        "syllabus_weight": 0.85
    }, headers=u1_headers)
    assert top_res.status_code == 201
    topic_id = top_res.json()["id"]

    # 2. Add custom question with topic
    q_create = client.post("/api/questions", json={
        "subject_id": sub_id,
        "question_number": "1",
        "text": "Compare monolithic and microservices architectures in enterprise deployments.",
        "marks": 5.0,
        "topic_id": topic_id,
        "academic_year": 2025,
        "estimated_difficulty": "MEDIUM"
    }, headers=u1_headers)
    assert q_create.status_code == 201
    q_data = q_create.json()
    q_id = q_data["id"]
    assert q_data["topic_name"] == "Serverless & Microservices"
    assert q_data["is_user_corrected"] is True

    # 3. Update question
    q_update = client.put(f"/api/questions/{q_id}", json={
        "text": "Compare monolithic vs microservices architectures with latency and fault tolerance tradeoffs.",
        "marks": 7.5,
        "estimated_difficulty": "HARD"
    }, headers=u1_headers)
    assert q_update.status_code == 200
    updated = q_update.json()
    assert updated["marks"] == 7.5
    assert updated["estimated_difficulty"] == "HARD"
    assert "latency and fault tolerance" in updated["text"]

    # 4. Unauthorized User 2 attempts to edit -> 403 Forbidden
    unauth_edit = client.put(f"/api/questions/{q_id}", json={
        "text": "Malicious edit attempt"
    }, headers=u2_headers)
    assert unauth_edit.status_code == 403

    # 5. Unauthorized User 2 attempts to delete -> 403 Forbidden
    unauth_del = client.delete(f"/api/questions/{q_id}", headers=u2_headers)
    assert unauth_del.status_code == 403

    # 6. Authorized User 1 deletes question -> 200 OK
    del_res = client.delete(f"/api/questions/{q_id}", headers=u1_headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_id"] == q_id

    # Verify question is deleted
    get_del = client.get(f"/api/questions/{q_id}", headers=u1_headers)
    assert get_del.status_code == 404
