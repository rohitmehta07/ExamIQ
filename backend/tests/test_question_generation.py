import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import Topic, Question, Document, Subject, User

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


def test_generate_questions_from_study_pdf_without_questions():
    """
    1. Upload study material (lecture notes) containing explanations but NO questions.
    2. Request question generation (count=5, question_type='MIXED').
    3. Verify questions are generated from actual concepts, saved with origin='AI_GENERATED',
       and tagged with source document and page number.
    """
    u_id, _, headers = create_test_user("Alice Generation")
    sub_id = create_test_subject(headers, "Advanced Cryptography", "CS801")

    # Pure study content with explanations and zero questions
    lecture_content = (
        "Chapter 3: Advanced Encryption Standard (AES) Architecture.\n\n"
        "Advanced Encryption Standard (AES) is a symmetric block cipher standardized by NIST in FIPS 197.\n"
        "AES processes data blocks of 128 bits using secret key sizes of 128, 192, or 256 bits.\n"
        "Each AES round consists of four distinct transformations: SubBytes, ShiftRows, MixColumns, and AddRoundKey.\n"
        "SubBytes is an invertible non-linear byte substitution utilizing an 8x8 S-box in Galois Field GF(2^8).\n"
        "MixColumns operates on state columns treating each column as a four-term polynomial modulo x^4 + 1.\n"
        "Active attacks differ from passive attacks in that active attacks alter the communication stream whereas passive attacks monitor traffic without alteration.\n"
        "The Avalanche Effect is a fundamental cryptographic property where a single bit change in plaintext induces changes in over 50 percent of ciphertext bits.\n"
    )

    files = {"file": ("aes_lecture_notes.txt", io.BytesIO(lecture_content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "LECTURE_NOTES"}, files=files, headers=headers)
    assert up_res.status_code == 200
    doc_id = up_res.json()["id"]

    # Process document
    client.post(f"/api/documents/{doc_id}/process", headers=headers)

    # Generate 5 questions from this document
    gen_res = client.post("/api/questions/generate", json={
        "subject_id": sub_id,
        "document_ids": [doc_id],
        "count": 5,
        "difficulty": "MIXED",
        "question_type": "MIXED"
    }, headers=headers)
    assert gen_res.status_code == 201, gen_res.text
    data = gen_res.json()
    assert data["generated_count"] == 5
    assert len(data["questions"]) == 5
    assert "aes_lecture_notes.txt" in data["source_documents"][0]

    # Inspect generated questions
    for q in data["questions"]:
        assert q["subject_id"] == sub_id
        assert q["is_pyq"] is False
        assert q["origin"] == "AI_GENERATED"
        assert q["source_document_id"] == doc_id
        assert len(q["text"]) >= 25
        assert q["marks"] > 0
        assert q["marking_rubric"] is not None


def test_preserves_pyqs_and_origin_distinction():
    """
    Ensure existing PYQ records remain completely intact and distinguishable from AI generated questions.
    Verify question list API supports filtering by origin ('PYQ' vs 'AI_GENERATED').
    """
    u_id, _, headers = create_test_user("Bob OriginTest")
    sub_id = create_test_subject(headers, "Information Security", "IS401")

    # 1. Add an authentic PYQ question
    pyq_res = client.post("/api/questions", json={
        "subject_id": sub_id,
        "question_number": "1",
        "text": "Explain Hill Cipher encryption and decryption with key matrix [[9, 4], [5, 7]].",
        "marks": 5.0,
        "academic_year": 2024,
        "source_name": "Mid Sem Exam 2024",
        "is_pyq": True,
        "origin": "PYQ"
    }, headers=headers)
    assert pyq_res.status_code == 201
    pyq_id = pyq_res.json()["id"]


    # 2. Upload study notes and generate 5 practice questions
    study_content = (
        "Data Encryption Standard (DES) employs a 16-round Feistel network architecture.\n"
        "DES operates on 64-bit plaintext blocks with an effective 56-bit key length.\n"
        "Triple DES (3DES) executes encrypt-decrypt-encrypt (EDE) sequence with 168-bit key strength.\n"
        "Block ciphers differ from stream ciphers by encrypting fixed-length blocks rather than continuous bit streams.\n"
        "Differential cryptanalysis is an analytical attack analyzing propagation of differences through cipher rounds.\n"
    )
    files = {"file": ("des_notes.txt", io.BytesIO(study_content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "LECTURE_NOTES"}, files=files, headers=headers)
    doc_id = up_res.json()["id"]
    client.post(f"/api/documents/{doc_id}/process", headers=headers)

    gen_res = client.post("/api/questions/generate", json={
        "subject_id": sub_id,
        "document_ids": [doc_id],
        "count": 5
    }, headers=headers)
    assert gen_res.status_code == 201

    # 3. Query all questions: must contain PYQ + 5 generated
    all_q_res = client.get(f"/api/questions?subject_id={sub_id}", headers=headers)
    all_qs = all_q_res.json()
    assert len(all_qs) == 6

    # 4. Filter by origin=PYQ
    pyqs_only = client.get(f"/api/questions?subject_id={sub_id}&origin=PYQ", headers=headers).json()
    assert len(pyqs_only) == 1
    assert pyqs_only[0]["id"] == pyq_id
    assert pyqs_only[0]["origin"] == "PYQ"

    # 5. Filter by origin=AI_GENERATED
    ai_only = client.get(f"/api/questions?subject_id={sub_id}&origin=AI_GENERATED", headers=headers).json()
    assert len(ai_only) == 5
    for q in ai_only:
        assert q["origin"] == "AI_GENERATED"
        assert q["is_pyq"] is False


def test_cross_user_and_subject_isolation_in_generation():
    """
    Test security enforcement:
    - User 1 cannot generate questions from User 2's documents (403 Forbidden).
    - User 1 cannot generate questions for a document belonging to a different subject (403 Forbidden).
    """
    u1_id, _, u1_headers = create_test_user("Alice Isolation")
    u2_id, _, u2_headers = create_test_user("Bob Hacker")

    sub1_id = create_test_subject(u1_headers, "Subject One", "SUB1")
    sub2_id = create_test_subject(u1_headers, "Subject Two", "SUB2")
    user2_sub_id = create_test_subject(u2_headers, "User 2 Subject", "U2SUB")

    # User 1 uploads document to Subject 1
    content = "Distributed file systems provide location transparency and replication consistency."
    files = {"file": ("notes.txt", io.BytesIO(content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub1_id, "doc_category": "LECTURE_NOTES"}, files=files, headers=u1_headers)
    doc1_id = up_res.json()["id"]
    client.post(f"/api/documents/{doc1_id}/process", headers=u1_headers)

    # 1. User 2 tries to generate questions using User 1's document in User 2's subject -> 403 Forbidden
    res_hack = client.post("/api/questions/generate", json={
        "subject_id": user2_sub_id,
        "document_ids": [doc1_id],
        "count": 5
    }, headers=u2_headers)
    assert res_hack.status_code == 403

    # 2. User 1 tries to generate questions in Subject 2 using a document from Subject 1 -> 403 Forbidden
    res_cross_sub = client.post("/api/questions/generate", json={
        "subject_id": sub2_id,
        "document_ids": [doc1_id],
        "count": 5
    }, headers=u1_headers)
    assert res_cross_sub.status_code == 403


def test_empty_or_unreadable_pdf_handling():
    """
    Ensure that attempting to generate questions from an empty or unreadable document
    returns a clear 400 Bad Request error without crashing or generating empty questions.
    """
    u_id, _, headers = create_test_user("Charlie Empty")
    sub_id = create_test_subject(headers, "Compiler Design", "CD301")

    # Document with only whitespace
    empty_content = "   \n\n\t   \n"
    files = {"file": ("empty_notes.txt", io.BytesIO(empty_content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_id, "doc_category": "LECTURE_NOTES"}, files=files, headers=headers)
    doc_id = up_res.json()["id"]

    # Try generating
    res = client.post("/api/questions/generate", json={
        "subject_id": sub_id,
        "document_ids": [doc_id],
        "count": 5
    }, headers=headers)
    assert res.status_code == 400
    assert "no readable text" in res.json()["detail"].lower()
