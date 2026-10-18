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

def test_extract_topics_from_subject_documents_with_attribution():
    """
    1. Extract topics from uploaded subject-specific documents.
    2. Show source documents and page references.
    3. Calculate topic frequency from actual available papers (0 if no papers yet - zero fabrication).
    """
    u_id, _, headers = create_test_user("Alice Topics")
    sub_id = create_test_subject(headers, "Advanced Cryptography", "CS801")

    # Upload study material
    content = (
        "Unit 1: Advanced Encryption Standard (AES)\n\n"
        "Advanced Encryption Standard (AES) is a symmetric block cipher standardized by NIST.\n"
        "AES uses a state matrix with 10, 12, or 14 rounds depending on key size (128, 192, 256 bits).\n"
        "Each round consists of SubBytes, ShiftRows, MixColumns, and AddRoundKey transformations.\n"
        "MixColumns uses finite field arithmetic over Galois Field GF(2^8) with irreducible polynomial f(x)g(x) = 1 (mod m(x)).\n"
    )
    files = {"file": ("aes_lecture_notes.txt", io.BytesIO(content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "LECTURE_NOTES"}, files=files, headers=headers)
    assert up_res.status_code == 200
    doc_id = up_res.json()["id"]

    # Explicitly run processing
    proc_res = client.post(f"/api/documents/{doc_id}/process", headers=headers)
    assert proc_res.status_code == 200

    # Retrieve topics for this subject
    top_res = client.get(f"/api/topics?subject_id={sub_id}", headers=headers)
    assert top_res.status_code == 200
    topics = top_res.json()
    assert len(topics) > 0

    # Verify source document attribution
    aes_topic = next((t for t in topics if "AES" in t["name"] or "Advanced Encryption Standard" in t["name"]), None)
    assert aes_topic is not None
    assert aes_topic["source_document_id"] == doc_id
    assert aes_topic["source_document_name"] == "aes_lecture_notes.txt"
    assert aes_topic["source_page_number"] == 1

    # Zero fabrication: since NO question papers have been uploaded yet, historical_frequency must be 0!
    assert aes_topic["historical_frequency"] == 0
    assert aes_topic["pyq_appearances"] == 0
    assert aes_topic["pyq_sources"] == []

def test_extract_and_map_questions_from_pyqs_and_calculate_frequencies():
    """
    1. Extract and map questions from previous-year papers.
    2. Calculate topic frequency from actual available papers without fabrication.
    3. Rank topics using available evidence.
    """
    u_id, _, headers = create_test_user("Bob PYQ")
    sub_id = create_test_subject(headers, "Information Security", "CS802")

    # Step 1: Upload course notes to generate topics first
    notes_content = (
        "Unit 1: Data Encryption Standard (DES)\n"
        "DES uses a 16-round Feistel network with 56-bit key and S-Boxes to create diffusion and confusion.\n\n"
        "Unit 2: Advanced Encryption Standard (AES)\n"
        "AES replaces DES with a substitution-permutation network over Galois Field GF(2^8).\n\n"
        "Unit 3: Classical Cryptography & Ciphers\n"
        "Playfair cipher and Hill cipher use polygraphic substitution with matrix key multiplication mod 26.\n"
    )
    f_notes = {"file": ("crypto_syllabus_notes.txt", io.BytesIO(notes_content.encode("utf-8")), "text/plain")}
    up_n = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "LECTURE_NOTES"}, files=f_notes, headers=headers)
    client.post(f"/api/documents/{up_n.json()['id']}/process", headers=headers)

    # Step 2: Upload a Question Paper with 2 specific questions on DES and 1 on Hill Cipher
    pyq_content = (
        "EXAMINATION QUESTION PAPER 2025\n\n"
        "Q1. [5 Marks] Explain the 16-round Feistel Network architecture of Data Encryption Standard (DES) and discuss the role of S-Boxes.\n\n"
        "Q2. [5 Marks] Compare the avalanche effect in Data Encryption Standard (DES) with Triple DES.\n\n"
        "Q3. [5 Marks] Encrypt the plaintext 'EXAM' using Hill Cipher with key matrix [3, 2; 5, 7] mod 26.\n"
    )
    f_pyq = {"file": ("Midterm_Exam_2025.txt", io.BytesIO(pyq_content.encode("utf-8")), "text/plain")}
    up_p = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "QUESTION_PAPER"}, files=f_pyq, headers=headers)
    proc_p = client.post(f"/api/documents/{up_p.json()['id']}/process", headers=headers)
    assert proc_p.status_code == 200

    # Step 3: Verify questions are mapped to topics
    db = SessionLocal()
    questions = db.query(Question).filter(Question.subject_id == sub_id).all()
    assert len(questions) >= 3
    # Every extracted question should have a mapped topic_id
    mapped_q_count = len([q for q in questions if q.topic_id is not None])
    assert mapped_q_count >= 2
    db.close()

    # Step 4: Check topic frequency and rankings in API
    top_res = client.get(f"/api/topics?subject_id={sub_id}", headers=headers)
    assert top_res.status_code == 200
    topics = top_res.json()

    des_topic = next((t for t in topics if "DES" in t["name"] or "Data Encryption Standard" in t["name"]), None)
    assert des_topic is not None
    # DES had 2 questions in the uploaded 2025 paper -> frequency must be 2!
    assert des_topic["historical_frequency"] == 2
    assert des_topic["pyq_appearances"] == 1
    assert "Midterm_Exam_2025.txt" in des_topic["pyq_sources"]
    assert des_topic["avg_marks"] == 5.0

    # Topics that did NOT appear in the exam (like AES) must have frequency 0
    aes_topic = next((t for t in topics if "AES" in t["name"] or "Advanced Encryption Standard" in t["name"]), None)
    if aes_topic:
        assert aes_topic["historical_frequency"] == 0
        assert aes_topic["pyq_appearances"] == 0
        assert aes_topic["pyq_sources"] == []

    # Since DES has 2 questions and real exam evidence, its priority score must be significantly higher than AES
    if aes_topic:
        assert des_topic["priority_score"] > aes_topic["priority_score"]
    assert des_topic["preparation_priority"] in ["HIGH", "MEDIUM"]

def test_student_manual_add_edit_and_mark_important():
    """
    1. Allow students to manually add a topic.
    2. Allow students to edit topic.
    3. Allow students to mark/unmark topic as important with personal notes.
    4. Keep AI-generated priority separate from manual selection.
    5. Delete topic.
    """
    u_id, _, headers = create_test_user("Charlie Manual")
    sub_id = create_test_subject(headers, "Distributed Computing", "CS601")

    # 1. Student adds topic manually
    create_payload = {
        "subject_id": sub_id,
        "name": "Raft Consensus Algorithm",
        "category": "Consensus Protocols",
        "description": "Leader election, log replication, and safety invariants in Raft.",
        "is_manually_marked": True,
        "personal_notes": "Professor explicitly stressed Raft leader election will be in Section B.",
        "syllabus_weight": 0.90
    }
    create_res = client.post("/api/topics", json=create_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    topic_id = created["id"]
    assert created["name"] == "Raft Consensus Algorithm"
    assert created["is_manually_marked"] is True
    assert "Section B" in created["personal_notes"]

    # 2. Student edits topic
    edit_payload = {
        "category": "Fault Tolerant Protocols",
        "description": "Updated syllabus outline with log compaction."
    }
    edit_res = client.put(f"/api/topics/{topic_id}", json=edit_payload, headers=headers)
    assert edit_res.status_code == 200
    updated = edit_res.json()
    assert updated["category"] == "Fault Tolerant Protocols"
    assert "log compaction" in updated["description"]

    # 3. Student toggles manual importance (unmarks it)
    toggle_res = client.patch(f"/api/topics/{topic_id}/mark-important", json={
        "is_manually_marked": False,
        "personal_notes": "Revised after tutorial"
    }, headers=headers)
    assert toggle_res.status_code == 200
    toggled = toggle_res.json()
    assert toggled["is_manually_marked"] is False
    assert toggled["personal_notes"] == "Revised after tutorial"

    # AI priority is preserved independently (e.g. MEDIUM/HIGH) and not overwritten by manual boolean
    assert toggled["preparation_priority"] in ["HIGH", "MEDIUM", "LOW"]
    assert toggled["priority_score"] > 0

    # 4. Student deletes topic
    del_res = client.delete(f"/api/topics/{topic_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify topic is gone
    get_res = client.get(f"/api/topics/{topic_id}", headers=headers)
    assert get_res.status_code == 404

def test_ownership_and_user_authorization():
    """
    Enforces user and subject ownership across all Topic backend endpoints:
    - User 2 cannot access, edit, mark important, or delete User 1's topics (403).
    - User 2 cannot create a topic inside User 1's subject (403).
    """
    u1_id, _, u1_headers = create_test_user("Owner Alice")
    u2_id, _, u2_headers = create_test_user("Attacker Bob")

    sub_1_id = create_test_subject(u1_headers, "Cloud Architecture", "CS901")

    # Alice creates a topic
    t_res = client.post("/api/topics", json={
        "subject_id": sub_1_id,
        "name": "Microservices Communication",
        "category": "Architecture"
    }, headers=u1_headers)
    assert t_res.status_code == 201
    topic_id = t_res.json()["id"]

    # Bob attempts to create a topic in Alice's subject -> 403
    bob_add = client.post("/api/topics", json={
        "subject_id": sub_1_id,
        "name": "Injected Topic"
    }, headers=u2_headers)
    assert bob_add.status_code == 403

    # Bob attempts to get Alice's topic -> 403
    bob_get = client.get(f"/api/topics/{topic_id}", headers=u2_headers)
    assert bob_get.status_code == 403

    # Bob attempts to edit Alice's topic -> 403
    bob_put = client.put(f"/api/topics/{topic_id}", json={"name": "Hacked"}, headers=u2_headers)
    assert bob_put.status_code == 403

    # Bob attempts to mark Alice's topic -> 403
    bob_patch = client.patch(f"/api/topics/{topic_id}/mark-important", json={"is_manually_marked": True}, headers=u2_headers)
    assert bob_patch.status_code == 403

    # Bob attempts to delete Alice's topic -> 403
    bob_del = client.delete(f"/api/topics/{topic_id}", headers=u2_headers)
    assert bob_del.status_code == 403
