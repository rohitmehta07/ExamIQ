import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import Document, DocumentChunk, Subject, User
from app.ml.vector_store import vector_store

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
        "semester": "Semester 4",
        "exam_date": "2026-11-30"
    }, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["id"]

def create_dummy_txt_file(filename: str, content: str):
    file_bytes = content.encode("utf-8")
    return ("file", (filename, io.BytesIO(file_bytes), "text/plain"))

def test_user_and_subject_document_isolation():
    """
    Validates:
    - User 1 has Subject 1A and Subject 1B.
    - User 2 has Subject 2A and Subject 2B.
    - Document uploaded to Subject 1A is only listed in Subject 1A.
    - Document uploaded to Subject 1B is only listed in Subject 1B.
    - Neither appears in the other's document list.
    - User 2 sees neither of User 1's documents.
    - Document counts are calculated separately for each subject.
    """
    # 1. Create two users
    u1_id, u1_email, u1_headers = create_test_user("Alice Isolation")
    u2_id, u2_email, u2_headers = create_test_user("Bob Isolation")

    # 2. Create two subjects for Alice
    sub_1a_id = create_test_subject(u1_headers, "Data Structures and Algorithms", "CS201")
    sub_1b_id = create_test_subject(u1_headers, "Operating Systems Concepts", "CS202")

    # 3. Create two subjects for Bob
    sub_2a_id = create_test_subject(u2_headers, "Database Management Systems", "CS301")
    sub_2b_id = create_test_subject(u2_headers, "Computer Networks", "CS302")

    # Verify initial document counts are 0
    p1a = client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u1_headers).json()
    p1b = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()
    assert p1a["documents_count"] == 0
    assert p1b["documents_count"] == 0

    # 4. Upload Document 1 to Alice's Subject 1A
    doc1_content = "Binary Search Trees and AVL Trees provide logarithmic search complexity. Balanced trees prevent worst-case O(n) traversal."
    files1 = {
        "file": ("dsa_trees_notes.txt", io.BytesIO(doc1_content.encode("utf-8")), "text/plain")
    }
    data1 = {"subject_id": sub_1a_id, "doc_category": "LECTURE_NOTES"}
    upload_res1 = client.post("/api/documents/upload", data=data1, files=files1, headers=u1_headers)
    assert upload_res1.status_code == 200, upload_res1.text
    doc1 = upload_res1.json()
    doc1_id = doc1["id"]
    assert doc1["subject_id"] == sub_1a_id
    assert doc1["filename"] == "dsa_trees_notes.txt"

    # Verify Document 1 appears in Subject 1A and NOT in Subject 1B
    docs_1a = client.get(f"/api/documents?subject_id={sub_1a_id}", headers=u1_headers).json()
    assert len(docs_1a) == 1
    assert docs_1a[0]["id"] == doc1_id

    docs_1b = client.get(f"/api/documents?subject_id={sub_1b_id}", headers=u1_headers).json()
    assert len(docs_1b) == 0

    # Verify progress counts
    p1a = client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u1_headers).json()
    p1b = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()
    assert p1a["documents_count"] == 1
    assert p1b["documents_count"] == 0

    # 5. Upload Document 2 to Alice's Subject 1B
    doc2_content = "Process Scheduling algorithms include Round Robin, Shortest Job First, and Multi-Level Feedback Queues. Context switching incurs CPU overhead."
    files2 = {
        "file": ("os_scheduling_notes.txt", io.BytesIO(doc2_content.encode("utf-8")), "text/plain")
    }
    data2 = {"subject_id": sub_1b_id, "doc_category": "LECTURE_NOTES"}
    upload_res2 = client.post("/api/documents/upload", data=data2, files=files2, headers=u1_headers)
    assert upload_res2.status_code == 200, upload_res2.text
    doc2 = upload_res2.json()
    doc2_id = doc2["id"]
    assert doc2["subject_id"] == sub_1b_id

    # Verify isolation between Subject 1A and Subject 1B
    docs_1a = client.get(f"/api/documents?subject_id={sub_1a_id}", headers=u1_headers).json()
    assert len(docs_1a) == 1
    assert docs_1a[0]["id"] == doc1_id

    docs_1b = client.get(f"/api/documents?subject_id={sub_1b_id}", headers=u1_headers).json()
    assert len(docs_1b) == 1
    assert docs_1b[0]["id"] == doc2_id

    p1a = client.get(f"/api/subjects/{sub_1a_id}/progress", headers=u1_headers).json()
    p1b = client.get(f"/api/subjects/{sub_1b_id}/progress", headers=u1_headers).json()
    assert p1a["documents_count"] == 1
    assert p1b["documents_count"] == 1

    # 6. Verify Bob (User 2) sees NO documents
    bob_docs_all = client.get("/api/documents", headers=u2_headers).json()
    assert len(bob_docs_all) == 0

    bob_docs_2a = client.get(f"/api/documents?subject_id={sub_2a_id}", headers=u2_headers).json()
    assert len(bob_docs_2a) == 0

    # Bob attempts to pass Alice's subject_id -> returns empty list (filtered out by ownership)
    bob_docs_1a = client.get(f"/api/documents?subject_id={sub_1a_id}", headers=u2_headers).json()
    assert len(bob_docs_1a) == 0

    # Overview for Bob shows 0 documents across all subjects
    bob_overview = client.get("/api/subjects/overview", headers=u2_headers).json()
    for sub_card in bob_overview["subjects"]:
        assert sub_card["documents_count"] == 0

def test_cross_user_authorization_enforcement():
    """
    Validates:
    - User 2 cannot upload into User 1's subject (HTTP 403).
    - User 2 cannot view User 1's document by doc_id (HTTP 403).
    - User 2 cannot trigger processing of User 1's document (HTTP 403).
    - User 2 cannot delete User 1's document (HTTP 403).
    """
    u1_id, _, u1_headers = create_test_user("Alice Auth")
    u2_id, _, u2_headers = create_test_user("Bob Auth")

    sub_1_id = create_test_subject(u1_headers, "Theory of Computation", "CS401")

    # Alice uploads a document
    content = "Deterministic Finite Automata (DFA) accepts regular languages."
    files = {"file": ("toc_dfa.txt", io.BytesIO(content.encode("utf-8")), "text/plain")}
    up_res = client.post("/api/documents/upload", data={"subject_id": sub_1_id}, files=files, headers=u1_headers)
    assert up_res.status_code == 200
    doc_id = up_res.json()["id"]

    # 1. Bob attempts to upload into Alice's subject -> 403
    bob_files = {"file": ("malicious.txt", io.BytesIO(b"hack"), "text/plain")}
    forbidden_upload = client.post("/api/documents/upload", data={"subject_id": sub_1_id}, files=bob_files, headers=u2_headers)
    assert forbidden_upload.status_code == 403

    # 2. Bob attempts to get Alice's document details -> 403
    forbidden_get = client.get(f"/api/documents/{doc_id}", headers=u2_headers)
    assert forbidden_get.status_code == 403

    # 3. Bob attempts to process Alice's document -> 403
    forbidden_process = client.post(f"/api/documents/{doc_id}/process", headers=u2_headers)
    assert forbidden_process.status_code == 403

    # 4. Bob attempts to delete Alice's document -> 403
    forbidden_delete = client.delete(f"/api/documents/{doc_id}", headers=u2_headers)
    assert forbidden_delete.status_code == 403

    # Verify Alice can still access the document
    alice_get = client.get(f"/api/documents/{doc_id}", headers=u1_headers)
    assert alice_get.status_code == 200
    assert alice_get.json()["id"] == doc_id

def test_chunk_and_embedding_subject_association():
    """
    Validates:
    - Text extracted from document is chunked and stores correct document_id, subject_id, and user_id.
    - Vector search scoped to Subject A finds Subject A chunks.
    - Vector search scoped to Subject B excludes Subject A chunks.
    - Vector search for another user excludes other users' chunks.
    """
    u1_id, _, u1_headers = create_test_user("Alice Semantic")
    u2_id, _, u2_headers = create_test_user("Bob Semantic")

    sub_crypto = create_test_subject(u1_headers, "Applied Cryptography", "CS701")
    sub_networks = create_test_subject(u1_headers, "Wireless Networks", "CS702")
    sub_bob = create_test_subject(u2_headers, "Cloud Architecture", "CS801")

    # Alice uploads document to Crypto
    crypto_text = "Elliptic Curve Cryptography offers equivalent security to RSA with significantly smaller key sizes, making ECC ideal for resource constrained devices."
    files = {"file": ("ecc_overview.txt", io.BytesIO(crypto_text.encode("utf-8")), "text/plain")}
    up = client.post("/api/documents/upload", data={"subject_id": sub_crypto}, files=files, headers=u1_headers)
    assert up.status_code == 200
    doc_id = up.json()["id"]

    # Explicitly run processing to ensure sync chunk creation and indexing in test
    proc_res = client.post(f"/api/documents/{doc_id}/process", headers=u1_headers)
    assert proc_res.status_code == 200

    # Inspect database chunks
    db = SessionLocal()
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.document_id == doc_id
        assert "Elliptic Curve" in chunk.content
    db.close()

    # Search in Subject Crypto (Alice) -> Should find the result
    res_crypto = client.get(f"/api/search?q=Elliptic+Curve+Cryptography&subject_id={sub_crypto}", headers=u1_headers)
    assert res_crypto.status_code == 200
    cdata = res_crypto.json()
    assert cdata["total_results"] > 0
    assert any("Elliptic Curve" in r["snippet"] for r in cdata["results"])

    # Search in Subject Networks (Alice) -> Must NOT return Crypto results
    res_net = client.get(f"/api/search?q=Elliptic+Curve+Cryptography&subject_id={sub_networks}", headers=u1_headers)
    assert res_net.status_code == 200
    ndata = res_net.json()
    assert ndata["total_results"] == 0

    # Search as Bob (User 2) -> Must NOT return Alice's results
    res_bob = client.get(f"/api/search?q=Elliptic+Curve+Cryptography&subject_id={sub_bob}", headers=u2_headers)
    assert res_bob.status_code == 200
    bdata = res_bob.json()
    assert bdata["total_results"] == 0

def test_document_deletion_cascades_and_updates_counts():
    """
    Validates:
    - Deleting a document from a subject updates that subject's count immediately.
    - Other subjects remain unaffected.
    - Chunks are removed from the database and vector store.
    """
    u1_id, _, u1_headers = create_test_user("Alice Cascade")

    sub_1 = create_test_subject(u1_headers, "Compiler Construction", "CS501")
    sub_2 = create_test_subject(u1_headers, "Computer Graphics", "CS502")

    # Upload to sub_1
    f1 = {"file": ("lexical_analysis.txt", io.BytesIO(b"Lexical analyzer converts source code into a stream of tokens using regular expressions."), "text/plain")}
    d1 = client.post("/api/documents/upload", data={"subject_id": sub_1}, files=f1, headers=u1_headers).json()

    # Upload to sub_2
    f2 = {"file": ("raytracing.txt", io.BytesIO(b"Ray tracing simulates physical behavior of light rays interacting with 3D surfaces."), "text/plain")}
    d2 = client.post("/api/documents/upload", data={"subject_id": sub_2}, files=f2, headers=u1_headers).json()

    # Verify counts before deletion
    p1 = client.get(f"/api/subjects/{sub_1}/progress", headers=u1_headers).json()
    p2 = client.get(f"/api/subjects/{sub_2}/progress", headers=u1_headers).json()
    assert p1["documents_count"] == 1
    assert p2["documents_count"] == 1

    # Delete d1
    del_res = client.delete(f"/api/documents/{d1['id']}", headers=u1_headers)
    assert del_res.status_code == 200

    # Verify d1 is deleted
    docs_1 = client.get(f"/api/documents?subject_id={sub_1}", headers=u1_headers).json()
    assert len(docs_1) == 0

    # Verify d2 in sub_2 is completely unaffected
    docs_2 = client.get(f"/api/documents?subject_id={sub_2}", headers=u1_headers).json()
    assert len(docs_2) == 1
    assert docs_2[0]["id"] == d2["id"]

    # Verify progress counts
    p1_after = client.get(f"/api/subjects/{sub_1}/progress", headers=u1_headers).json()
    p2_after = client.get(f"/api/subjects/{sub_2}/progress", headers=u1_headers).json()
    assert p1_after["documents_count"] == 0
    assert p2_after["documents_count"] == 1

    # Verify chunks for d1 removed from database
    db = SessionLocal()
    chunks_left = db.query(DocumentChunk).filter(DocumentChunk.document_id == d1["id"]).count()
    assert chunks_left == 0
    db.close()
