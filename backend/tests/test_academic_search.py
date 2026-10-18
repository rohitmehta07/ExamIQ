import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.database_models import User, Subject, Document, DocumentChunk
from app.ml.vector_store import vector_store

client = TestClient(app)

def create_user(email_prefix: str):
    ts = int(time.time() * 1000)
    email = f"{email_prefix}_{ts}@examiq.edu"
    pwd = "SearchTestPass123!"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": f"Student {email_prefix}"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    return data["user_id"], headers

def test_search_filters_by_selected_subject_at_backend_level():
    """
    Verifies that search strictly filters by selected subject at the retrieval/backend level,
    preventing documents from other subjects from leaking into the results.
    """
    uid, headers = create_user("alice_sub")
    db = SessionLocal()
    try:
        # Subject A: Data Structures
        sub_a = Subject(user_id=uid, code="CS201", name="Data Structures", semester="Semester 3")
        db.add(sub_a)
        db.flush()

        doc_a = Document(
            user_id=uid,
            subject_id=sub_a.id,
            filename="dsa_trees.txt",
            file_type="txt",
            doc_category="LECTURE_NOTES",
            page_count=3,
            file_path="dsa_trees.txt",
            status="PROCESSED"
        )
        db.add(doc_a)
        db.flush()

        chunk_a = DocumentChunk(
            document_id=doc_a.id,
            chunk_index=0,
            page_number=2,
            content="Binary search trees and AVL self-balancing rotations maintain O(log n) runtime complexity.",
            embedding_id=2001
        )
        db.add(chunk_a)

        # Subject B: Operating Systems
        sub_b = Subject(user_id=uid, code="CS202", name="Operating Systems", semester="Semester 4")
        db.add(sub_b)
        db.flush()

        doc_b = Document(
            user_id=uid,
            subject_id=sub_b.id,
            filename="os_scheduling.txt",
            file_type="txt",
            doc_category="LECTURE_NOTES",
            page_count=5,
            file_path="os_scheduling.txt",
            status="PROCESSED"
        )
        db.add(doc_b)
        db.flush()

        chunk_b = DocumentChunk(
            document_id=doc_b.id,
            chunk_index=0,
            page_number=4,
            content="Round robin CPU scheduling and context switching algorithms manage ready queue processes.",
            embedding_id=2002
        )
        db.add(chunk_b)
        db.commit()

        # Identical broad query sent to both subjects
        query = "Explain architectural algorithms and process complexity"

        # 1. Search in Subject A -> Must ONLY return Subject A document
        res_a = client.get(f"/api/search?q={query}&subject_id={sub_a.id}", headers=headers)
        assert res_a.status_code == 200
        data_a = res_a.json()
        assert data_a["subject_id"] == sub_a.id
        assert data_a["subject_name"] == "Data Structures"
        assert data_a["total_results"] > 0
        doc_names_a = [r["document_name"] for r in data_a["results"]]
        assert "dsa_trees.txt" in doc_names_a
        assert "os_scheduling.txt" not in doc_names_a
        # Verify page number reference
        res_item_a = next(r for r in data_a["results"] if r["document_name"] == "dsa_trees.txt")
        assert res_item_a["page_number"] == 2

        # 2. Search in Subject B -> Must ONLY return Subject B document
        res_b = client.get(f"/api/search?q={query}&subject_id={sub_b.id}", headers=headers)
        assert res_b.status_code == 200
        data_b = res_b.json()
        assert data_b["subject_id"] == sub_b.id
        assert data_b["subject_name"] == "Operating Systems"
        assert data_b["total_results"] > 0
        doc_names_b = [r["document_name"] for r in data_b["results"]]
        assert "os_scheduling.txt" in doc_names_b
        assert "dsa_trees.txt" not in doc_names_b
        res_item_b = next(r for r in data_b["results"] if r["document_name"] == "os_scheduling.txt")
        assert res_item_b["page_number"] == 4

    finally:
        db.close()

def test_cross_user_search_authorization_and_isolation():
    """
    Verifies that a user cannot query another user's subject (HTTP 403),
    and invalid subject IDs return HTTP 404.
    """
    u1_id, headers_alice = create_user("alice_auth")
    u2_id, headers_bob = create_user("bob_auth")

    db = SessionLocal()
    try:
        sub_alice = Subject(user_id=u1_id, code="CS301", name="Database Systems")
        db.add(sub_alice)
        db.flush()

        doc_alice = Document(
            user_id=u1_id,
            subject_id=sub_alice.id,
            filename="db_acid.txt",
            file_type="txt",
            doc_category="LECTURE_NOTES",
            page_count=2,
            file_path="db_acid.txt",
            status="PROCESSED"
        )
        db.add(doc_alice)
        db.flush()

        chunk_alice = DocumentChunk(
            document_id=doc_alice.id,
            chunk_index=0,
            page_number=1,
            content="ACID properties guarantee atomicity, consistency, isolation, and durability in SQL transactions.",
            embedding_id=2003
        )
        db.add(chunk_alice)
        db.commit()

        # Bob attempts to search Alice's subject -> 403 Forbidden
        res_forbidden = client.get(
            f"/api/search?q=ACID+transactions&subject_id={sub_alice.id}",
            headers=headers_bob
        )
        assert res_forbidden.status_code == 403
        assert "Access denied" in res_forbidden.json()["detail"]

        # Bob attempts to search non-existent subject -> 404
        res_not_found = client.get(
            "/api/search?q=ACID+transactions&subject_id=999999",
            headers=headers_bob
        )
        assert res_not_found.status_code == 404

        # Alice successfully searches her own subject -> 200
        res_alice = client.get(
            f"/api/search?q=ACID+transactions&subject_id={sub_alice.id}",
            headers=headers_alice
        )
        assert res_alice.status_code == 200
        assert res_alice.json()["total_results"] > 0

    finally:
        db.close()

def test_all_subject_search_isolated_to_authenticated_user():
    """
    Verifies that explicit all-subject search (subject_id=None) searches across all of the
    authenticated student's subjects, but NEVER leaks documents from other students.
    """
    u1_id, headers_alice = create_user("alice_allsub")
    u2_id, headers_bob = create_user("bob_allsub")

    db = SessionLocal()
    try:
        # Alice's Subject 1: Algorithms
        sub_a1 = Subject(user_id=u1_id, code="CS401", name="Advanced Algorithms")
        db.add(sub_a1)
        db.flush()
        doc_a1 = Document(user_id=u1_id, subject_id=sub_a1.id, filename="alice_dijkstra.txt", file_type="txt", status="PROCESSED", file_path="alice_dijkstra.txt")
        db.add(doc_a1)
        db.flush()
        db.add(DocumentChunk(document_id=doc_a1.id, chunk_index=0, page_number=1, content="Dijkstra shortest path algorithm uses priority queue with non-negative edge weights.", embedding_id=2004))

        # Alice's Subject 2: Computer Networks
        sub_a2 = Subject(user_id=u1_id, code="CS402", name="Computer Networks")
        db.add(sub_a2)
        db.flush()
        doc_a2 = Document(user_id=u1_id, subject_id=sub_a2.id, filename="alice_routing.txt", file_type="txt", status="PROCESSED", file_path="alice_routing.txt")
        db.add(doc_a2)
        db.flush()
        db.add(DocumentChunk(document_id=doc_a2.id, chunk_index=0, page_number=1, content="Link state routing protocols like OSPF use Dijkstra algorithm for shortest path computation.", embedding_id=2005))

        # Bob's Subject: Network Security
        sub_bob = Subject(user_id=u2_id, code="CS403", name="Network Security")
        db.add(sub_bob)
        db.flush()
        doc_bob = Document(user_id=u2_id, subject_id=sub_bob.id, filename="bob_firewall.txt", file_type="txt", status="PROCESSED", file_path="bob_firewall.txt")
        db.add(doc_bob)
        db.flush()
        db.add(DocumentChunk(document_id=doc_bob.id, chunk_index=0, page_number=1, content="Stateful packet inspection firewalls monitor TCP connection handshakes and Dijkstra routing path anomalies.", embedding_id=2006))
        db.commit()

        # Alice performs All-Subject Search (no subject_id passed)
        res_alice = client.get("/api/search?q=Dijkstra+shortest+path", headers=headers_alice)
        assert res_alice.status_code == 200
        data_alice = res_alice.json()
        assert data_alice["subject_id"] is None
        assert data_alice["subject_name"] == "All Subjects"

        alice_docs = [r["document_name"] for r in data_alice["results"]]
        # Alice should see her own docs across both subjects
        assert "alice_dijkstra.txt" in alice_docs or "alice_routing.txt" in alice_docs
        # Bob's doc must NEVER appear
        assert "bob_firewall.txt" not in alice_docs

        # Bob performs All-Subject Search
        res_bob = client.get("/api/search?q=Dijkstra+shortest+path", headers=headers_bob)
        assert res_bob.status_code == 200
        data_bob = res_bob.json()
        bob_docs = [r["document_name"] for r in data_bob["results"]]
        assert "bob_firewall.txt" in bob_docs
        assert "alice_dijkstra.txt" not in bob_docs
        assert "alice_routing.txt" not in bob_docs

    finally:
        db.close()

def test_keyword_semantic_and_hybrid_search_modes():
    """
    Verifies that search_mode parameter correctly controls KEYWORD, SEMANTIC, and HYBRID retrieval.
    """
    uid, headers = create_user("search_modes")
    db = SessionLocal()
    try:
        sub = Subject(user_id=uid, code="CS601", name="Distributed Computing")
        db.add(sub)
        db.flush()

        doc = Document(user_id=uid, subject_id=sub.id, filename="dist_consensus.txt", file_type="txt", status="PROCESSED", file_path="dist_consensus.txt")
        db.add(doc)
        db.flush()

        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            page_number=3,
            content="Raft consensus algorithm uses leader election, log replication, and heartbeat timers to maintain state machine safety.",
            embedding_id=2007
        )
        db.add(chunk)
        db.commit()

        # 1. KEYWORD Mode: exact keyword match
        res_kw = client.get(f"/api/search?q=Raft+consensus+heartbeat&subject_id={sub.id}&search_mode=KEYWORD", headers=headers)
        assert res_kw.status_code == 200
        data_kw = res_kw.json()
        assert data_kw["search_mode"] == "KEYWORD"
        assert data_kw["total_results"] > 0
        assert "dist_consensus.txt" in [r["document_name"] for r in data_kw["results"]]
        assert any("raft" in [t.lower() for t in r.get("matched_terms", [])] for r in data_kw["results"])

        # 1b. KEYWORD Mode with completely non-matching tokens -> returns 0 results
        res_kw_empty = client.get(f"/api/search?q=quantum+fermat+galois&subject_id={sub.id}&search_mode=KEYWORD", headers=headers)
        assert res_kw_empty.status_code == 200
        assert res_kw_empty.json()["total_results"] == 0

        # 2. SEMANTIC Mode: conceptual query
        res_sem = client.get(f"/api/search?q=distributed+cluster+coordination+and+replication&subject_id={sub.id}&search_mode=SEMANTIC", headers=headers)
        assert res_sem.status_code == 200
        data_sem = res_sem.json()
        assert data_sem["search_mode"] == "SEMANTIC"
        assert data_sem["total_results"] > 0
        assert "dist_consensus.txt" in [r["document_name"] for r in data_sem["results"]]

        # 3. HYBRID Mode: combines semantic and keywords
        res_hyb = client.get(f"/api/search?q=Raft+consensus+replication&subject_id={sub.id}&search_mode=HYBRID", headers=headers)
        assert res_hyb.status_code == 200
        data_hyb = res_hyb.json()
        assert data_hyb["search_mode"] == "HYBRID"
        assert data_hyb["total_results"] > 0
        assert "dist_consensus.txt" in [r["document_name"] for r in data_hyb["results"]]

    finally:
        db.close()

def test_document_deletion_prevents_stale_search_results():
    """
    Verifies that deleting a document prevents its chunks from appearing in future search results,
    ensuring no stale cached or vector data crosses deleted boundaries.
    """
    uid, headers = create_user("alice_delete")
    db = SessionLocal()
    try:
        sub = Subject(user_id=uid, code="CS701", name="Software Engineering")
        db.add(sub)
        db.flush()

        doc = Document(user_id=uid, subject_id=sub.id, filename="delete_target.txt", file_type="txt", status="PROCESSED", file_path="delete_target.txt")
        db.add(doc)
        db.flush()
        doc_id = doc.id

        chunk = DocumentChunk(
            document_id=doc_id,
            chunk_index=0,
            page_number=1,
            content="Cyclomatic complexity measures software maintainability using control flow graphs.",
            embedding_id=2008
        )
        db.add(chunk)
        db.commit()

        # Search finds the document initially
        res_before = client.get(f"/api/search?q=Cyclomatic+complexity&subject_id={sub.id}", headers=headers)
        assert res_before.status_code == 200
        assert res_before.json()["total_results"] > 0

        # Delete document via API
        del_res = client.delete(f"/api/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 200

        # Search immediately after deletion -> Must return 0 results
        res_after = client.get(f"/api/search?q=Cyclomatic+complexity&subject_id={sub.id}", headers=headers)
        assert res_after.status_code == 200
        assert res_after.json()["total_results"] == 0

    finally:
        db.close()
