import io
import os
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import Topic, Question, Document, Subject, User
from app.services.topic_service import topic_service
from app.ml.question_generator import question_generator

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


def test_unique_upload_path_collision_prevention():
    """
    Verify that two distinct subjects/users uploading files with identical filenames
    (e.g., 'syllabus.txt') get isolated paths on disk, and deleting one does NOT delete the other.
    """
    u1_id, _, h1 = create_test_user("Alice Upload")
    u2_id, _, h2 = create_test_user("Bob Upload")
    s1 = create_test_subject(h1, "Security Systems", "SEC101")
    s2 = create_test_subject(h2, "Distributed Systems", "DIS101")

    content1 = "Security Architecture Syllabus: Introduction to Symmetric Ciphers and Block Encryption Principles."
    content2 = "Distributed Systems Syllabus: Consensus Algorithms, Raft, Paxos, and Vector Clocks in Large Scale Networks."

    # Both upload a file with the identical name 'syllabus.txt'
    r1 = client.post("/api/documents/upload", files={"file": ("syllabus.txt", io.BytesIO(content1.encode("utf-8")), "text/plain")}, data={"subject_id": s1}, headers=h1)
    assert r1.status_code == 200, r1.text
    doc1 = r1.json()

    r2 = client.post("/api/documents/upload", files={"file": ("syllabus.txt", io.BytesIO(content2.encode("utf-8")), "text/plain")}, data={"subject_id": s2}, headers=h2)
    assert r2.status_code == 200, r2.text
    doc2 = r2.json()

    # Verify both have filename 'syllabus.txt' in the UI
    assert doc1["filename"] == "syllabus.txt"
    assert doc2["filename"] == "syllabus.txt"

    # Verify physical file paths on disk are distinct
    db = SessionLocal()
    d1_db = db.query(Document).filter(Document.id == doc1["id"]).first()
    d2_db = db.query(Document).filter(Document.id == doc2["id"]).first()
    assert d1_db.file_path != d2_db.file_path, "Physical file paths should be distinct to avoid collision!"
    assert os.path.exists(d1_db.file_path)
    assert os.path.exists(d2_db.file_path)
    path2 = d2_db.file_path
    db.close()

    # Delete Alice's document
    del_res = client.delete(f"/api/documents/{doc1['id']}", headers=h1)
    assert del_res.status_code == 200

    # Verify Bob's file on disk still exists and was NOT deleted by Alice's action
    assert os.path.exists(path2), "Bob's file should remain intact on disk after Alice deletes hers!"


def test_topic_acronym_and_alias_deduplication():
    """
    Verify that topic deduplication normalizes acronyms and aliases
    (e.g., 'Advanced Encryption Standard (AES)', 'Advanced Encryption Standard', and 'AES')
    so that duplicate topics are not generated.
    """
    keys1 = topic_service.get_alias_keys("Advanced Encryption Standard (AES)")
    assert "advanced encryption standard aes" in keys1
    assert "advanced encryption standard" in keys1
    assert "aes" in keys1

    keys2 = topic_service.get_alias_keys("AES")
    assert "aes" in keys2
    assert "advanced encryption standard" in keys2

    # Verify intersection
    common = set(keys1).intersection(set(keys2))
    assert len(common) > 0, "AES and Advanced Encryption Standard (AES) must share alias keys"


def test_question_to_topic_acronym_mapping():
    """
    Verify that a question referencing an acronym (e.g. 'AES') correctly maps to
    a topic titled 'Advanced Encryption Standard (AES)'.
    """
    u_id, _, headers = create_test_user("Charlie Mapping")
    s_id = create_test_subject(headers, "Information Security", "IS401")

    db = SessionLocal()
    t = Topic(
        subject_id=s_id,
        name="Advanced Encryption Standard (AES)",
        category="Symmetric Ciphers",
        syllabus_weight=0.9,
        keywords=["MixColumns", "SubBytes"]
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # Add question that only mentions 'AES'
    q = Question(
        subject_id=s_id,
        text="Explain how round keys are expanded and applied in AES block cipher.",
        marks=5.0,
        is_pyq=True,
        origin="PYQ"
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    # Run mapping
    topic_service.map_questions_to_topics(db, s_id)
    db.refresh(q)

    assert q.topic_id == t.id, f"Question should map to AES topic (got topic_id={q.topic_id}, expected={t.id})"
    db.close()


def test_ai_practice_questions_do_not_inflate_historical_exam_frequency():
    """
    Verify that generating practice questions (origin='AI_GENERATED') does NOT
    artificially inflate topic historical frequency or pyq appearances.
    """
    u_id, _, headers = create_test_user("David Isolation")
    s_id = create_test_subject(headers, "Network Security", "NS501")

    db = SessionLocal()
    topic = Topic(
        subject_id=s_id,
        name="Data Encryption Standard (DES)",
        syllabus_weight=0.85,
        historical_frequency=1,
        pyq_appearances=1
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    # Add 1 genuine PYQ
    pyq = Question(
        subject_id=s_id,
        topic_id=topic.id,
        text="Detail the Feistel structure of DES with 16 rounds.",
        marks=10.0,
        is_pyq=True,
        origin="PYQ",
        source_name="Mid-Sem 2024"
    )
    db.add(pyq)

    # Add 5 AI generated practice questions
    for i in range(5):
        ai_q = Question(
            subject_id=s_id,
            topic_id=topic.id,
            text=f"Practice Question {i+1}: What is the Avalanche effect in DES?",
            marks=2.0,
            is_pyq=False,
            origin="AI_GENERATED",
            source_name="AI Practice"
        )
        db.add(ai_q)
    db.commit()

    # Recalculate frequencies and ranks
    topic_service.recalculate_topic_frequencies_and_ranks(db, s_id, user_id=u_id)
    db.refresh(topic)

    # Topic frequency should strictly equal 1 (the 1 genuine PYQ), NOT 6!
    assert topic.historical_frequency == 1, f"Historical frequency must be 1, got {topic.historical_frequency}"
    assert topic.pyq_appearances == 1, f"PYQ appearances must be 1, got {topic.pyq_appearances}"
    db.close()


def test_mcq_option_placement_and_rubric_synchronization():
    """
    Verify that generated MCQs do NOT always place the correct answer in Option A,
    and that the marking rubric and model answer correctly match the dynamically assigned letter.
    """
    academic_text = (
        "Advanced Encryption Standard (AES) is a symmetric block cipher standardized by NIST for protecting classified information.\n"
        "Data Encryption Standard (DES) is an older block cipher that utilizes a 56-bit key Feistel architecture.\n"
        "Rivest Shamir Adleman (RSA) is an asymmetric algorithm based on the difficulty of integer factorization.\n"
        "Elliptic Curve Cryptography (ECC) is a public-key approach based on algebraic structures of elliptic curves."
    )

    letters_observed = set()
    for doc_idx in range(8):
        doc_name = f"cryptography_unit_{doc_idx}.txt"
        res = question_generator.generate_questions_from_content(
            extracted_pages=[{"page_number": 1, "text": academic_text, "document_id": 1, "document_name": doc_name}],
            source_doc_name=doc_name,
            source_doc_id=1,
            count=2,
            difficulty="MEDIUM",
            question_type="MCQ",
            subject_topics=[]
        )
        assert len(res) == 2
        for mcq in res:
            ans = mcq["model_answer"]
            assert "Correct Answer: Option " in ans
            letter = ans.split("Correct Answer: Option ")[1][0]
            letters_observed.add(letter)

            rubric_str = str(mcq["marking_rubric"])
            assert f"Correct Option Selection ({letter})" in rubric_str, f"Rubric must match option {letter}"

    # Over multiple documents and questions, we must observe multiple distinct option letters (no hardcoded Option A)
    assert len(letters_observed) > 1, f"Options should be distributed across letters, but only observed: {letters_observed}"

