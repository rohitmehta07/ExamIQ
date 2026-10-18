import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import User, Subject, Document, DocumentChunk, Question, Topic

client = TestClient(app)

def create_authenticated_user(email: str, name: str = "Test Student"):
    client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": "STUDENT"
    })
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    user_id = login_res.json()["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, headers

def test_same_query_uses_different_subject_specific_context():
    """
    Verifies that the EXACT SAME query submitted in two different subjects
    retrieves entirely different, subject-specific context, citations, key terms,
    and topic associations.
    """
    user_id, headers = create_authenticated_user("subject_coach_test@examiq.edu")
    db = SessionLocal()
    try:
        # 1. Subject A: Data Structures (CS201)
        sub_a = Subject(user_id=user_id, code="CS201", name="Data Structures", semester="Semester 3")
        db.add(sub_a)
        db.flush()

        doc_a = Document(
            user_id=user_id,
            subject_id=sub_a.id,
            filename="dsa_trees.txt",
            file_type="txt",
            doc_category="LECTURE_NOTES",
            page_count=2,
            file_path="dsa_trees.txt",
            status="PROCESSED"
        )
        db.add(doc_a)
        db.flush()

        chunk_a = DocumentChunk(
            document_id=doc_a.id,
            chunk_index=0,
            page_number=1,
            content="Binary Search Trees and AVL Trees require self balancing rotations LL and RR to maintain O(log n) time complexity.",
            embedding_id=1001
        )
        db.add(chunk_a)

        topic_a = Topic(
            subject_id=sub_a.id,
            name="Binary Search Trees",
            category="Trees & Graphs",
            keywords=["Binary Search Trees", "AVL Balance Factor", "Tree Rotations"],
            formulas=["Height = O(log n)"],
            algorithms=["AVL Insert"],
            preparation_priority="HIGH"
        )
        db.add(topic_a)

        # 2. Subject B: Operating Systems (CS202)
        sub_b = Subject(user_id=user_id, code="CS202", name="Operating Systems", semester="Semester 4")
        db.add(sub_b)
        db.flush()

        doc_b = Document(
            user_id=user_id,
            subject_id=sub_b.id,
            filename="os_cpu.txt",
            file_type="txt",
            doc_category="LECTURE_NOTES",
            page_count=2,
            file_path="os_cpu.txt",
            status="PROCESSED"
        )
        db.add(doc_b)
        db.flush()

        chunk_b = DocumentChunk(
            document_id=doc_b.id,
            chunk_index=0,
            page_number=1,
            content="CPU Scheduling uses Round Robin and Context Switch managed by the Process Control Block PCB with Preemption.",
            embedding_id=1002
        )
        db.add(chunk_b)

        topic_b = Topic(
            subject_id=sub_b.id,
            name="Process Scheduling",
            category="Kernel Architecture",
            keywords=["Round Robin", "Context Switch", "PCB", "CPU Burst"],
            formulas=["Turnaround Time = Completion - Arrival"],
            algorithms=["Round Robin Scheduler"],
            preparation_priority="HIGH"
        )
        db.add(topic_b)
        db.commit()

        # The EXACT SAME question query submitted to both subjects:
        same_query = "Explain core architectural design, implementation workflows, and time complexity tradeoffs."

        # Request strategy in Subject A
        res_a = client.post("/api/answer/strategy", json={
            "subject_id": sub_a.id,
            "question_text": same_query,
            "marks": 5.0
        }, headers=headers)
        assert res_a.status_code == 200
        data_a = res_a.json()

        # Request strategy in Subject B
        res_b = client.post("/api/answer/strategy", json={
            "subject_id": sub_b.id,
            "question_text": same_query,
            "marks": 5.0
        }, headers=headers)
        assert res_b.status_code == 200
        data_b = res_b.json()

        # Subject A Verification: citations and context strictly from Subject A
        assert data_a["subject_id"] == sub_a.id
        assert data_a["subject_name"] == "Data Structures"
        citations_a_docs = [c["document_name"] for c in data_a["citations"]]
        assert "dsa_trees.txt" in citations_a_docs
        assert "os_cpu.txt" not in citations_a_docs
        assert any("binary" in str(t).lower() or "tree" in str(t).lower() or "avl" in str(t).lower() for t in data_a["key_terms"])
        assert not any("round robin" in str(t).lower() or "context switch" in str(t).lower() for t in data_a["key_terms"])

        # Subject B Verification: citations and context strictly from Subject B
        assert data_b["subject_id"] == sub_b.id
        assert data_b["subject_name"] == "Operating Systems"
        citations_b_docs = [c["document_name"] for c in data_b["citations"]]
        assert "os_cpu.txt" in citations_b_docs
        assert "dsa_trees.txt" not in citations_b_docs
        assert any("round robin" in str(t).lower() or "context switch" in str(t).lower() or "pcb" in str(t).lower() for t in data_b["key_terms"])
        assert not any("avl" in str(t).lower() or "binary search" in str(t).lower() for t in data_b["key_terms"])

    finally:
        db.close()

def test_cross_user_and_cross_subject_authorization_enforcement():
    """
    Verifies that User A cannot access User B's subjects or questions in Answer Coach,
    and that requests targeting foreign subjects/questions are strictly rejected with 403/404.
    """
    user_a_id, headers_a = create_authenticated_user("coach_alice@examiq.edu")
    user_b_id, headers_b = create_authenticated_user("coach_bob@examiq.edu")

    db = SessionLocal()
    try:
        # Subject A belonging to Alice
        sub_alice = Subject(user_id=user_a_id, code="ALICE101", name="Alice Secret Subject", semester="Sem 1")
        db.add(sub_alice)
        db.flush()

        q_alice = Question(
            subject_id=sub_alice.id,
            question_number="1",
            text="Alice's confidential exam question?",
            marks=5.0,
            is_pyq=True,
            origin="PYQ"
        )
        db.add(q_alice)
        db.commit()

        # Bob attempts to get strategy for Alice's subject -> must be 403 or 404
        bad_strat_sub = client.post("/api/answer/strategy", json={
            "subject_id": sub_alice.id,
            "question_text": "Trying to peek at Alice's subject notes"
        }, headers=headers_b)
        assert bad_strat_sub.status_code in [403, 404]

        # Bob attempts to get strategy for Alice's question -> must be 403 or 404
        bad_strat_q = client.post("/api/answer/strategy", json={
            "question_id": q_alice.id
        }, headers=headers_b)
        assert bad_strat_q.status_code in [403, 404]

        # Bob attempts to evaluate answer on Alice's question -> must be 403 or 404
        bad_eval = client.post("/api/answer/evaluate", json={
            "question_id": q_alice.id,
            "question_text": q_alice.text,
            "student_answer": "My unauthorized answer submission"
        }, headers=headers_b)
        assert bad_eval.status_code in [403, 404]

        # Alice herself can access her own question without issue
        good_strat = client.post("/api/answer/strategy", json={
            "question_id": q_alice.id
        }, headers=headers_a)
        assert good_strat.status_code == 200

    finally:
        db.close()

def test_missing_evidence_clearly_indicated():
    """
    Verifies that when a question lacks study document coverage or rubrics,
    Answer Coach explicitly reports missing_evidence and falls back to GENERAL_ACADEMIC.
    """
    user_id, headers = create_authenticated_user("missing_evidence_test@examiq.edu")
    db = SessionLocal()
    try:
        # Subject with NO documents uploaded yet
        empty_sub = Subject(user_id=user_id, code="EMPTY101", name="Empty Subject", semester="Sem 1")
        db.add(empty_sub)
        db.commit()

        res = client.post("/api/answer/strategy", json={
            "subject_id": empty_sub.id,
            "question_text": "Explain hyper-dimensional vector embeddings and topological persistence.",
            "marks": 5.0
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()

        # Must explicitly indicate missing evidence and use standard academic conventions
        assert data["evidence_basis"] == "GENERAL_ACADEMIC"
        assert data["missing_evidence"] is not None
        assert "no uploaded lecture notes" in data["missing_evidence"].lower() or "upload" in data["missing_evidence"].lower()
        assert len(data["citations"]) == 0
        assert len(data["answer_structure"]) > 0  # Still provides structured framework

    finally:
        db.close()

def test_pyq_and_marking_scheme_integration():
    """
    Verifies that when a question has an associated marking scheme / rubric from
    previous-year examination papers, Answer Coach structures answer steps directly
    matching the rubric criteria and reports EVIDENCE_BACKED.
    """
    user_id, headers = create_authenticated_user("pyq_rubric_test@examiq.edu")
    db = SessionLocal()
    try:
        sub = Subject(user_id=user_id, code="PYQ301", name="Formal Languages", semester="Sem 5")
        db.add(sub)
        db.flush()

        doc = Document(
            user_id=user_id,
            subject_id=sub.id,
            filename="FLAT_2024_MidSem.pdf",
            file_type="pdf",
            doc_category="QUESTION_PAPER",
            page_count=2,
            file_path="FLAT_2024_MidSem.pdf",
            status="PROCESSED"
        )
        db.add(doc)
        db.flush()

        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            page_number=1,
            content="Mid Semester Examination 2024. Question 2: Construct a DFA accepting all binary strings divisible by 3.",
            embedding_id=2001
        )
        db.add(chunk)

        rubric_data = {
            "criteria": [
                {"criterion": "1. State Transition Table", "marks": 2.0, "description": "Tabulate states Q0, Q1, Q2 with inputs 0, 1."},
                {"criterion": "2. Formal State Diagram", "marks": 2.0, "description": "Draw 3 states with double-circle accepting state Q0."},
                {"criterion": "3. Mathematical Definition (5-tuple)", "marks": 1.0, "description": "Specify (Q, Sigma, delta, q0, F)."}
            ]
        }

        q = Question(
            subject_id=sub.id,
            question_number="2(a)",
            text="Construct a Deterministic Finite Automaton (DFA) that accepts all binary strings whose numerical value is divisible by 3.",
            marks=5.0,
            is_pyq=True,
            origin="PYQ",
            academic_year=2024,
            source_name="FLAT_2024_MidSem.pdf",
            marking_rubric=rubric_data
        )
        db.add(q)
        db.commit()

        res = client.post("/api/answer/strategy", json={
            "question_id": q.id
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["evidence_basis"] == "EVIDENCE_BACKED"
        assert len(data["answer_structure"]) == 3
        assert data["answer_structure"][0]["step"] == "1. State Transition Table"
        assert data["answer_structure"][0]["allocated_marks"] == 2.0
        assert data["answer_structure"][1]["step"] == "2. Formal State Diagram"
        assert data["answer_structure"][1]["allocated_marks"] == 2.0
        assert data["answer_structure"][2]["step"] == "3. Mathematical Definition (5-tuple)"
        assert data["answer_structure"][2]["allocated_marks"] == 1.0

    finally:
        db.close()

def test_no_mark_guarantee_disclaimer_present():
    """
    Verifies that Answer Coach always includes an explicit non-guarantee disclaimer
    preventing false expectations or claims of guaranteed marks.
    """
    user_id, headers = create_authenticated_user("disclaimer_test@examiq.edu")

    # Check Strategy disclaimer
    strat_res = client.post("/api/answer/strategy", json={
        "question_text": "Describe the architecture of modern relational databases."
    }, headers=headers)
    assert strat_res.status_code == 200
    strat_data = strat_res.json()
    assert "disclaimer" in strat_data
    assert "not guarantee" in strat_data["disclaimer"].lower()

    # Check Evaluation disclaimer
    eval_res = client.post("/api/answer/evaluate", json={
        "question_text": "Describe the architecture of modern relational databases.",
        "student_answer": "1. Storage Engine handles indexing. 2. Query Processor parses and optimizes SQL queries. 3. Transaction Manager ensures ACID."
    }, headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "disclaimer" in eval_data
    assert "not guarantee" in eval_data["disclaimer"].lower()
