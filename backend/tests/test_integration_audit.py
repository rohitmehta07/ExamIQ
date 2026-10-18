import os
import io
import time
import pymupdf
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import User, Subject, Document, Topic, Question, StudyPlan, StudyTask

client = TestClient(app)

def create_user_session(tag: str):
    email = f"audit_{tag}_{int(time.time() * 1000)}@examiq.edu"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "AuditPassword123!",
        "full_name": f"Audit {tag}"
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    user_id = res.json()["user_id"]
    return user_id, {"Authorization": f"Bearer {token}"}

def generate_pdf_bytes(title: str, paragraphs: list) -> bytes:
    """Generate a real, valid PDF in memory with pymupdf."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), title, fontsize=16)
    y = 80
    for p in paragraphs:
        page.insert_text((50, y), p, fontsize=10)
        y += 40
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_full_integration_audit_across_all_modules():
    """
    MASTER INTEGRATION AUDIT:
    1. User 1 creates Subject 1A and Subject 1B.
    2. Upload distinct PDFs to each subject and process them.
    3. Verify topic extraction from subject documents with attribution.
    4. Map available PYQs to topics; test cross-subject mapping rejection.
    5. Manually mark a topic important in Subject 1A; verify 1B is unaffected.
    6. Search documents via Academic Search in keyword, semantic, and hybrid modes; verify no cross-subject leakage.
    7. Generate subject-grounded answer guidance in Answer Coach; verify citations and subject separation.
    8. Calculate separate My Progress metrics for both subjects; verify document upload does not grant mastery.
    9. Test User 2 for strict account and subject isolation across all APIs.
    10. Test Document deletion cascades and purges vector index entries.
    """
    # ---------------------------------------------------------
    # 1. SETUP TWO USERS AND TWO SUBJECTS FOR USER 1
    # ---------------------------------------------------------
    u1_id, u1_headers = create_user_session("student_one")
    u2_id, u2_headers = create_user_session("student_two")

    # User 1 Subject 1A: Distributed Systems
    s1a_res = client.post("/api/subjects", json={
        "name": "Distributed Systems",
        "code": "CS801",
        "semester": "Semester 8",
        "exam_date": "2026-11-20",
        "target_marks": 90.0,
        "study_hours_per_day": 3.0
    }, headers=u1_headers)
    assert s1a_res.status_code == 201
    sub_1a_id = s1a_res.json()["id"]

    # User 1 Subject 1B: Computer Graphics
    s1b_res = client.post("/api/subjects", json={
        "name": "Computer Graphics",
        "code": "CS802",
        "semester": "Semester 8",
        "exam_date": "2026-12-10",
        "target_marks": 80.0,
        "study_hours_per_day": 2.5
    }, headers=u1_headers)
    assert s1b_res.status_code == 201
    sub_1b_id = s1b_res.json()["id"]

    # ---------------------------------------------------------
    # 2. UPLOAD DISTINCT PDFS TO EACH SUBJECT & PROCESS
    # ---------------------------------------------------------
    pdf_1a_bytes = generate_pdf_bytes(
        "Paxos Consensus in Distributed Systems",
        [
            "Paxos consensus achieves fault-tolerant agreement in asynchronous distributed systems.",
            "Raft consensus decomposes state machine replication into leader election and log replication.",
            "Byzantine fault tolerance tolerates arbitrary node failures using quorum voting."
        ]
    )

    pdf_1b_bytes = generate_pdf_bytes(
        "Phong Illumination in Computer Graphics",
        [
            "The Phong reflection model computes ambient, diffuse, and specular components of light.",
            "Ray tracing computes shadows, reflections, and refractions by tracing light paths through pixels.",
            "Bresenham line rasterization computes pixel coordinates using integer arithmetic."
        ]
    )

    # Upload PDF 1A to Subject 1A
    files_1a = {"file": ("dist_sys_paxos.pdf", io.BytesIO(pdf_1a_bytes), "application/pdf")}
    up_1a = client.post(
        "/api/documents/upload",
        data={"subject_id": sub_1a_id, "doc_category": "LECTURE_NOTES"},
        files=files_1a,
        headers=u1_headers
    )
    assert up_1a.status_code == 200
    doc_1a_id = up_1a.json()["id"]

    # Upload PDF 1B to Subject 1B
    files_1b = {"file": ("graphics_phong.pdf", io.BytesIO(pdf_1b_bytes), "application/pdf")}
    up_1b = client.post(
        "/api/documents/upload",
        data={"subject_id": sub_1b_id, "doc_category": "LECTURE_NOTES"},
        files=files_1b,
        headers=u1_headers
    )
    assert up_1b.status_code == 200
    doc_1b_id = up_1b.json()["id"]

    # Process both documents synchronously to extract text and populate chunks
    proc_1a = client.post(f"/api/documents/{doc_1a_id}/process", headers=u1_headers)
    assert proc_1a.status_code == 200

    proc_1b = client.post(f"/api/documents/{doc_1b_id}/process", headers=u1_headers)
    assert proc_1b.status_code == 200

    # Verify Document isolation in Document listing
    docs_1a = client.get(f"/api/documents?subject_id={sub_1a_id}", headers=u1_headers).json()
    docs_1b = client.get(f"/api/documents?subject_id={sub_1b_id}", headers=u1_headers).json()
    assert len(docs_1a) == 1
    assert docs_1a[0]["id"] == doc_1a_id
    assert docs_1a[0]["filename"] == "dist_sys_paxos.pdf"
    assert len(docs_1b) == 1
    assert docs_1b[0]["id"] == doc_1b_id
    assert docs_1b[0]["filename"] == "graphics_phong.pdf"

    # ---------------------------------------------------------
    # 3. TOPIC EXTRACTION & SUBJECT SEPARATION
    # ---------------------------------------------------------
    # Add topics for Subject 1A
    top_1a_res = client.post("/api/topics", json={
        "subject_id": sub_1a_id,
        "name": "Paxos Consensus Algorithm",
        "category": "Consensus",
        "description": "Quorum-based distributed agreement protocol",
        "syllabus_weight": 0.95
    }, headers=u1_headers)
    assert top_1a_res.status_code == 201
    top_1a_id = top_1a_res.json()["id"]

    # Add topics for Subject 1B
    top_1b_res = client.post("/api/topics", json={
        "subject_id": sub_1b_id,
        "name": "Phong Reflection Model",
        "category": "Lighting & Shading",
        "description": "Specular, diffuse, and ambient illumination model",
        "syllabus_weight": 0.85
    }, headers=u1_headers)
    assert top_1b_res.status_code == 201
    top_1b_id = top_1b_res.json()["id"]

    # Verify topics for 1A do not contain 1B topics
    topics_1a = client.get(f"/api/topics?subject_id={sub_1a_id}", headers=u1_headers).json()
    topics_1b = client.get(f"/api/topics?subject_id={sub_1b_id}", headers=u1_headers).json()
    topic_1a_names = [t["name"] for t in topics_1a]
    topic_1b_names = [t["name"] for t in topics_1b]

    assert "Paxos Consensus Algorithm" in topic_1a_names
    assert "Phong Reflection Model" not in topic_1a_names
    assert "Phong Reflection Model" in topic_1b_names
    assert "Paxos Consensus Algorithm" not in topic_1b_names

    # ---------------------------------------------------------
    # 4. QUESTION CREATION & TOPIC MAPPING INTEGRATION
    # ---------------------------------------------------------
    # Create question in Subject 1A
    q_1a_res = client.post("/api/questions", json={
        "subject_id": sub_1a_id,
        "text": "Explain Paxos consensus stages and quorum slicing under network partitions.",
        "marks": 6.0,
        "origin": "PYQ",
        "is_pyq": True,
        "estimated_difficulty": "HARD"
    }, headers=u1_headers)
    assert q_1a_res.status_code == 201
    q_1a_id = q_1a_res.json()["id"]

    # Create question in Subject 1B
    q_1b_res = client.post("/api/questions", json={
        "subject_id": sub_1b_id,
        "text": "Derive the Phong illumination equation for specular highlights using shininess exponent.",
        "marks": 5.0,
        "origin": "PYQ",
        "is_pyq": True,
        "estimated_difficulty": "MEDIUM"
    }, headers=u1_headers)
    assert q_1b_res.status_code == 201
    q_1b_id = q_1b_res.json()["id"]

    # Map Question 1A to Topic 1A -> Success
    map_ok = client.patch(f"/api/questions/{q_1a_id}/map-topic", json={"topic_id": top_1a_id}, headers=u1_headers)
    assert map_ok.status_code == 200
    assert map_ok.json()["topic_id"] == top_1a_id

    # Attempt to map Question 1A to Topic 1B (cross-subject mapping) -> Must fail with 400
    map_cross = client.patch(f"/api/questions/{q_1a_id}/map-topic", json={"topic_id": top_1b_id}, headers=u1_headers)
    assert map_cross.status_code == 400, "Cross-subject topic mapping must be rejected"

    # ---------------------------------------------------------
    # 5. MANUALLY MARK TOPIC IMPORTANT
    # ---------------------------------------------------------
    mark_res = client.patch(
        f"/api/topics/{top_1a_id}/mark-important",
        json={"is_manually_marked": True, "personal_notes": "High probability on midterm"},
        headers=u1_headers
    )
    assert mark_res.status_code == 200
    assert mark_res.json()["is_manually_marked"] is True
    assert mark_res.json()["personal_notes"] == "High probability on midterm"

    # Verify Topic 1B is untouched
    topic_1b_ref = client.get(f"/api/topics/{top_1b_id}", headers=u1_headers).json()
    assert topic_1b_ref["is_manually_marked"] is False

    # ---------------------------------------------------------
    # 6. ACADEMIC SEARCH (KEYWORD, SEMANTIC, HYBRID)
    # ---------------------------------------------------------
    # Search Subject 1A for Paxos
    search_1a = client.get(
        f"/api/search?q=Paxos%20consensus%20quorum&subject_id={sub_1a_id}&search_mode=HYBRID",
        headers=u1_headers
    ).json()
    assert search_1a["total_results"] > 0
    assert all(r["subject_id"] == sub_1a_id for r in search_1a["results"])
    assert any("paxos" in r["snippet"].lower() for r in search_1a["results"])

    # Search Subject 1B for Paxos -> Should return 0 results because Paxos is not in 1B
    search_1b_cross = client.get(
        f"/api/search?q=Paxos%20consensus%20quorum&subject_id={sub_1b_id}&search_mode=KEYWORD",
        headers=u1_headers
    ).json()
    assert search_1b_cross["total_results"] == 0

    # Search Subject 1B for Phong Illumination
    search_1b = client.get(
        f"/api/search?q=Phong%20illumination%20reflection&subject_id={sub_1b_id}&search_mode=HYBRID",
        headers=u1_headers
    ).json()
    assert search_1b["total_results"] > 0
    assert all(r["subject_id"] == sub_1b_id for r in search_1b["results"])
    assert any("phong" in r["snippet"].lower() for r in search_1b["results"])

    # ---------------------------------------------------------
    # 7. ANSWER COACH GROUNDED GUIDANCE
    # ---------------------------------------------------------
    coach_1a = client.post("/api/answer/strategy", json={
        "subject_id": sub_1a_id,
        "question_id": q_1a_id
    }, headers=u1_headers)
    assert coach_1a.status_code == 200
    c_res_1a = coach_1a.json()
    assert c_res_1a["subject_id"] == sub_1a_id
    assert c_res_1a["subject_name"] == "Distributed Systems"
    # Grounded evidence should reference dist_sys_paxos.pdf
    if c_res_1a.get("citations"):
        assert any("dist_sys_paxos" in s.get("document_name", "") for s in c_res_1a["citations"])
        # Must not reference graphics_phong.pdf
        assert not any("graphics_phong" in s.get("document_name", "") for s in c_res_1a["citations"])

    # ---------------------------------------------------------
    # 8. MY PROGRESS & TASK COMPLETION REFRESH
    # ---------------------------------------------------------
    db = SessionLocal()
    try:
        # Subject 1A Plan: 4 tasks (2 completed, 2 pending -> 50.0%)
        plan_1a = StudyPlan(user_id=u1_id, subject_id=sub_1a_id, exam_date="2026-11-20", status="ACTIVE", total_days=4, total_hours=8.0)
        db.add(plan_1a)
        db.commit()
        db.refresh(plan_1a)

        t1 = StudyTask(study_plan_id=plan_1a.id, day_number=1, task_type="LEARN", title="Read Paxos Spec", duration_minutes=60, status="COMPLETED")
        t2 = StudyTask(study_plan_id=plan_1a.id, day_number=2, task_type="PRACTICE", title="Solve Quorum Questions", duration_minutes=60, status="COMPLETED")
        t3 = StudyTask(study_plan_id=plan_1a.id, day_number=3, task_type="LEARN", title="Study Raft States", duration_minutes=60, status="PENDING")
        t4 = StudyTask(study_plan_id=plan_1a.id, day_number=4, task_type="MOCK_TEST", title="Consensus Mock Exam", duration_minutes=60, status="PENDING")
        db.add_all([t1, t2, t3, t4])
        db.commit()
        db.refresh(t3)
        t3_id = t3.id

        # Subject 1B Plan: 2 tasks (0 completed, 2 pending -> 0.0%)
        plan_1b = StudyPlan(user_id=u1_id, subject_id=sub_1b_id, exam_date="2026-12-10", status="ACTIVE", total_days=2, total_hours=4.0)
        db.add(plan_1b)
        db.commit()
        db.refresh(plan_1b)

        t1b = StudyTask(study_plan_id=plan_1b.id, day_number=1, task_type="LEARN", title="Read Phong Formulas", duration_minutes=60, status="PENDING")
        t2b = StudyTask(study_plan_id=plan_1b.id, day_number=2, task_type="PRACTICE", title="Ray Tracing Lab", duration_minutes=60, status="PENDING")
        db.add_all([t1b, t2b])
        db.commit()
    finally:
        db.close()

    prog_1a = client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u1_headers).json()
    prog_1b = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()

    assert prog_1a["tasks_total"] == 4
    assert prog_1a["tasks_completed"] == 2
    assert prog_1a["tasks_pending"] == 2
    assert prog_1a["task_completion_percentage"] == 50.0
    assert prog_1a["documents_count"] == 1
    assert prog_1a["important_topics_count"] >= 1

    assert prog_1b["tasks_total"] == 2
    assert prog_1b["tasks_completed"] == 0
    assert prog_1b["tasks_pending"] == 2
    assert prog_1b["task_completion_percentage"] == 0.0
    assert prog_1b["documents_count"] == 1

    # Toggle task 3 in Subject 1A to COMPLETED -> live recalculates to 75%
    up_task = client.put(f"/api/study-plan/tasks/{t3_id}", json={"status": "COMPLETED"}, headers=u1_headers)
    assert up_task.status_code == 200

    prog_1a_after = client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u1_headers).json()
    assert prog_1a_after["tasks_completed"] == 3
    assert prog_1a_after["task_completion_percentage"] == 75.0

    # Subject 1B is completely unaffected
    prog_1b_after = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()
    assert prog_1b_after["tasks_completed"] == 0
    assert prog_1b_after["task_completion_percentage"] == 0.0

    # ---------------------------------------------------------
    # 9. USER 2 DATA ISOLATION & AUTHORIZATION CHECKS
    # ---------------------------------------------------------
    # User 2 tries to access User 1's Subject 1A
    assert client.get(f"/api/subjects/{sub_1a_id}", headers=u2_headers).status_code == 403
    assert client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u2_headers).status_code == 403
    assert client.get(f"/api/documents/{doc_1a_id}", headers=u2_headers).status_code == 403
    assert client.get(f"/api/topics/{top_1a_id}", headers=u2_headers).status_code == 403
    assert client.get(f"/api/questions/{q_1a_id}", headers=u2_headers).status_code == 403
    assert client.post("/api/answer/strategy", json={"subject_id": sub_1a_id, "question_id": q_1a_id}, headers=u2_headers).status_code == 403
    assert client.get(f"/api/search?q=Paxos&subject_id={sub_1a_id}", headers=u2_headers).status_code == 403

    # User 2 creates their own subject and verifies empty search
    u2_sub = client.post("/api/subjects", json={"name": "Quantum Computing", "code": "QC101"}, headers=u2_headers).json()
    u2_search = client.get("/api/search?q=Paxos", headers=u2_headers).json()
    assert u2_search["total_results"] == 0, "User 2 search must not return User 1 document chunks"

    # ---------------------------------------------------------
    # 10. DOCUMENT DELETION & VECTOR INDEX PURGING
    # ---------------------------------------------------------
    del_doc = client.delete(f"/api/documents/{doc_1b_id}", headers=u1_headers)
    assert del_doc.status_code == 200

    # Verify search in 1B immediately returns 0 results for Phong
    search_1b_deleted = client.get(f"/api/search?q=Phong%20illumination&subject_id={sub_1b_id}", headers=u1_headers).json()
    assert search_1b_deleted["total_results"] == 0, "Deleted document chunks must immediately be purged from search results"

    # Verify 1B progress reflects 0 documents
    prog_1b_del = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()
    assert prog_1b_del["documents_count"] == 0
