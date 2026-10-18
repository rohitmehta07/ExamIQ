import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

import time

def test_complete_end_to_end_flow():
    test_email = f"e2e_student_{int(time.time())}@examiq.edu"
    # 1. Register a new student
    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "Password123!",
        "full_name": "E2E Test Student"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login verification
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200

    # 3. View Subjects - Fresh student must have 0 subjects
    sub_res = client.get("/api/subjects", headers=headers)
    assert sub_res.status_code == 200
    assert len(sub_res.json()) == 0

    # 4. Add Subject for this student
    create_sub_res = client.post("/api/subjects", json={
        "name": "Cryptography and Network Security",
        "code": "BT14503",
        "semester": "Semester 5",
        "exam_date": "2026-11-20"
    }, headers=headers)
    assert create_sub_res.status_code == 201
    created_sub = create_sub_res.json()
    cns_id = created_sub["id"]

    # 5. Check Demo student preloaded data
    demo_login = client.post("/api/auth/login", json={
        "email": "demo@examiq.edu",
        "password": "DemoStudent123!"
    })
    demo_headers = {"Authorization": f"Bearer {demo_login.json()['access_token']}"}
    demo_sub_res = client.get("/api/subjects", headers=demo_headers)
    demo_cns_id = next((s["id"] for s in demo_sub_res.json() if s.get("code") == "BT14503"), demo_sub_res.json()[0]["id"])

    # 6. View Academic Documents for Demo student
    doc_res = client.get(f"/api/documents?subject_id={demo_cns_id}", headers=demo_headers)
    assert doc_res.status_code == 200
    docs = doc_res.json()
    assert len(docs) >= 9

    # Use demo headers for deep ML pipeline checks on preloaded corpus
    headers = demo_headers
    cns_id = demo_cns_id

    # 5. Semantic Search
    search_res = client.get("/api/search?q=quantum+threat+to+RSA", headers=headers)
    assert search_res.status_code == 200
    sdata = search_res.json()
    assert sdata["total_results"] > 0
    assert "results" in sdata

    # 6. View Topics & Priority
    top_res = client.get(f"/api/topics?subject_id={cns_id}", headers=headers)
    assert top_res.status_code == 200
    topics = top_res.json()
    assert len(topics) >= 9

    prio_res = client.get(f"/api/topics/priority/overview?subject_id={cns_id}", headers=headers)
    assert prio_res.status_code == 200
    pdata = prio_res.json()
    assert len(pdata["high_priority"]) > 0

    # 7. View Exam Patterns
    exam_res = client.get(f"/api/exam-pattern?subject_id={cns_id}", headers=headers)
    assert exam_res.status_code == 200
    edata = exam_res.json()
    assert edata["total_questions"] >= 6
    assert "marks_distribution" in edata

    # 8. Generate Personalized Study Plan
    plan_res = client.post("/api/study-plan/generate", json={
        "subject_id": cns_id,
        "exam_date": "2026-11-20",
        "available_hours_per_day": 3.5,
        "target_marks": 90.0
    }, headers=headers)
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert len(plan_data["tasks"]) > 0

    # 9. Complete a Study Task
    first_task = plan_data["tasks"][0]
    task_update_res = client.put(f"/api/study-plan/tasks/{first_task['id']}", json={"status": "COMPLETED"}, headers=headers)
    assert task_update_res.status_code == 200

    # 10. Question Bank & Answer Coach Strategy
    q_res = client.get(f"/api/questions?subject_id={cns_id}", headers=headers)
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) > 0
    first_q = questions[0]

    strat_res = client.post("/api/answer/strategy", json={
        "question_id": first_q["id"]
    }, headers=headers)
    assert strat_res.status_code == 200
    strat_data = strat_res.json()
    assert len(strat_data["answer_structure"]) > 0
    assert strat_data["evidence_basis"] in ["EVIDENCE_BACKED", "PATTERN_BASED", "GENERAL_ACADEMIC"]

    # 11. Evaluate Student Written Answer
    eval_res = client.post("/api/answer/evaluate", json={
        "question_id": first_q["id"],
        "question_text": first_q["text"],
        "marks": first_q["marks"],
        "student_answer": "1. Definition: Active attacks involve alteration of message streams like masquerade and replay. Passive attacks involve eavesdropping and traffic analysis.\n2. Justification: Passive attacks are hardest to detect because they cause no alteration. Encryption provides prevention."
    }, headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["content_score"] > 0
    assert eval_data["structure_rating"] in ["EXCELLENT", "GOOD", "ADEQUATE", "NEEDS_IMPROVEMENT"]

    # 12. Submit HCI Survey
    survey_res = client.post("/api/feedback/submit", json={
        "q1_ease_of_use": 5,
        "q2_recommendation_relevance": 5,
        "q3_exam_pattern_help": 5,
        "q4_answer_coach_help": 5,
        "q5_would_use": 5,
        "sus_scores": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
        "qualitative_feedback": "Excellent automated flow."
    }, headers=headers)
    assert survey_res.status_code == 200
    assert survey_res.json()["calculated_sus"] == 100.0

    print("END-TO-END WORKFLOW SUCCEEDED 100%!")
