import os
import json
import datetime
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.database_models import (
    User, StudentProfile, Subject, Exam, Document, DocumentChunk, Topic,
    Question, QuestionTopic, MarkingScheme, StudyPlan, FeedbackSurvey
)
from app.ml.vector_store import vector_store
from app.ml.embedding_engine import embedding_engine
from app.services.study_plan_service import study_plan_service

def seed_database_if_needed(db: Session):
    # Check if database already seeded
    user_count = db.query(User).count()
    if user_count > 0:
        # Repopulate vector store cache if empty
        if len(vector_store.metadata) == 0:
            chunks = db.query(DocumentChunk).all()
            if chunks:
                docs = {d.id: d for d in db.query(Document).all()}
                chunk_items = []
                for c in chunks:
                    doc = docs.get(c.document_id)
                    chunk_items.append({
                        "id": c.id,
                        "content": c.content,
                        "document_id": c.document_id,
                        "subject_id": doc.subject_id if doc else None,
                        "user_id": doc.user_id if doc else None,
                        "document_name": doc.filename if doc else "Academic Doc",
                        "page_number": c.page_number,
                        "doc_category": doc.doc_category if doc else "LECTURE_NOTES",
                        "topic": c.metadata_json.get("topic", "General") if c.metadata_json else "General"
                    })
                vector_store.add_chunks(chunk_items)
        return

    print("[ExamIQ] Initializing clean database seed with verified CNS dataset...")

    # 1. Create Users
    admin_user = User(
        email="admin@examiq.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Prof. Admin (Exam Coordinator)",
        role="ADMIN"
    )
    demo_student = User(
        email="demo@examiq.edu",
        hashed_password=get_password_hash("DemoStudent123!"),
        full_name="Aarav Sharma (Demo Student)",
        role="STUDENT"
    )
    db.add_all([admin_user, demo_student])
    db.commit()
    db.refresh(admin_user)
    db.refresh(demo_student)

    # 2. Create CNS Subject (belongs strictly to Demo Student Aarav Sharma)
    cns_subject = Subject(
        user_id=demo_student.id,
        code="BT14503",
        name="Cryptography and Network Security",
        semester="Semester 5",
        exam_date="2026-11-15",
        target_marks=85.0,
        study_hours_per_day=3.0,
        description="Comprehensive course covering classical ciphers, DES, AES, Galois fields, network security principles, post-quantum cryptography, lattices, and LWE.",
        syllabus_text="Unit 1: Security Goals, Attacks, Services. Unit 2: Classical Encryption & Symmetric Models. Unit 3: DES, Feistel Ciphers, Avalanche Effect. Unit 4: AES & Galois Fields GF(2^8). Unit 5: Post-Quantum Cryptography, Lattices, LWE, ML-KEM, ML-DSA."
    )
    db.add(cns_subject)
    db.commit()
    db.refresh(cns_subject)

    # 3. Create Exam Record
    cns_exam = Exam(
        subject_id=cns_subject.id,
        user_id=demo_student.id,
        name="Semester 5 Mid-Term Examination (BT14503)",
        date="2026-11-15",
        total_marks=30.0,
        duration_minutes=90,
        academic_year="2025-2026",
        term="Mid-Sem"
    )
    db.add(cns_exam)
    db.commit()

    # 4. Create Student Profile for Demo Student
    profile = StudentProfile(
        user_id=demo_student.id,
        subject_id=cns_subject.id,
        target_marks=85.0,
        available_hours_per_day=3.0,
        exam_date="2026-11-15",
        completed_topics=["Classical Cryptography & Ciphers"],
        weak_topics=["Learning With Errors (LWE) & NIST Standards", "Hill Cipher"],
        strong_topics=["Security Attacks & Services", "Data Encryption Standard (DES)"],
        previous_marks=74.0,
        overall_readiness=68.0
    )
    db.add(profile)
    db.commit()

    # 5. Populate Topics with Priority Scores and Breakdowns
    topics_data = [
        {
            "name": "Learning With Errors (LWE) & NIST Standards",
            "category": "Post-Quantum",
            "description": "LWE problem formulation b = As + e mod q, discrete Gaussian noise, Search vs Decision LWE, and FIPS 203 (ML-KEM) / FIPS 204 (ML-DSA) standards.",
            "syllabus_weight": 0.95,
            "historical_frequency": 4,
            "avg_marks": 6.5,
            "priority": "HIGH",
            "priority_score": 0.88,
            "breakdown": {"historical_frequency": 0.85, "marks_importance": 0.81, "recency": 1.0, "syllabus_relevance": 0.95, "question_variety": 0.90, "student_weakness": 0.90},
            "keywords": ["Learning With Errors", "Secret Vector", "Gaussian Noise", "Search-LWE", "Decision-LWE", "ML-KEM", "ML-DSA", "Modulo q"],
            "algorithms": ["Regev Cryptosystem", "ML-KEM", "ML-DSA"],
            "formulas": ["b = A*s + e (mod q)"],
            "study_mins": 75
        },
        {
            "name": "Classical Cryptography & Hill Cipher",
            "category": "Ciphers",
            "description": "Symmetric cipher model, substitution/transposition, Hill cipher key matrix arithmetic, modular matrix inverse, and Playfair frequency cryptanalysis.",
            "syllabus_weight": 0.90,
            "historical_frequency": 5,
            "avg_marks": 5.0,
            "priority": "HIGH",
            "priority_score": 0.84,
            "breakdown": {"historical_frequency": 0.90, "marks_importance": 0.63, "recency": 1.0, "syllabus_relevance": 0.90, "question_variety": 0.80, "student_weakness": 0.85},
            "keywords": ["Hill Cipher", "Key Matrix", "Determinant", "Modular Multiplicative Inverse", "Playfair 5x5", "Digram Frequency"],
            "algorithms": ["Hill Cipher", "Playfair Cipher"],
            "formulas": ["C = (K * P) mod 26", "gcd(det(K), 26) = 1"],
            "study_mins": 60
        },
        {
            "name": "Advanced Encryption Standard (AES)",
            "category": "Symmetric Ciphers",
            "description": "Rijndael block cipher, 128/192/256-bit keys, State matrix (4x4), SubBytes non-linear transformation, ShiftRows, MixColumns, and AddRoundKey.",
            "syllabus_weight": 0.92,
            "historical_frequency": 3,
            "avg_marks": 7.0,
            "priority": "HIGH",
            "priority_score": 0.82,
            "breakdown": {"historical_frequency": 0.60, "marks_importance": 0.88, "recency": 0.90, "syllabus_relevance": 0.92, "question_variety": 0.85, "student_weakness": 0.60},
            "keywords": ["State Matrix", "SubBytes", "ShiftRows", "MixColumns", "AddRoundKey", "Key Expansion", "Galois Field GF(2^8)"],
            "algorithms": ["AES", "Rijndael"],
            "formulas": ["GF(2^8) irreducible m(x) = x^8 + x^4 + x^3 + x + 1"],
            "study_mins": 60
        },
        {
            "name": "Galois Fields & Finite Field Arithmetic",
            "category": "Mathematical Foundations",
            "description": "Finite field arithmetic, GF(2^n), irreducible polynomials, polynomial division with XOR, and Extended Euclidean modular inverse calculation.",
            "syllabus_weight": 0.85,
            "historical_frequency": 2,
            "avg_marks": 5.0,
            "priority": "HIGH",
            "priority_score": 0.76,
            "breakdown": {"historical_frequency": 0.50, "marks_importance": 0.63, "recency": 1.0, "syllabus_relevance": 0.85, "question_variety": 0.70, "student_weakness": 0.80},
            "keywords": ["Galois Field", "Irreducible Polynomial", "Modulo m(x)", "Extended Euclidean Algorithm", "Multiplicative Inverse"],
            "algorithms": ["Extended Euclidean Algorithm for Polynomials"],
            "formulas": ["f(x)g(x) = 1 (mod m(x))"],
            "study_mins": 55
        },
        {
            "name": "Security Attacks & Services",
            "category": "Foundations",
            "description": "Active vs passive attacks, masquerade, replay, modification of messages, denial of service, traffic analysis, X.800 security services.",
            "syllabus_weight": 0.85,
            "historical_frequency": 4,
            "avg_marks": 5.0,
            "priority": "MEDIUM",
            "priority_score": 0.68,
            "breakdown": {"historical_frequency": 0.80, "marks_importance": 0.63, "recency": 1.0, "syllabus_relevance": 0.85, "question_variety": 0.75, "student_weakness": 0.25},
            "keywords": ["Active Attack", "Passive Attack", "Traffic Analysis", "Masquerade", "Replay Attack", "Confidentiality", "Integrity"],
            "algorithms": [],
            "formulas": [],
            "study_mins": 45
        },
        {
            "name": "Data Encryption Standard (DES)",
            "category": "Symmetric Ciphers",
            "description": "Feistel network design, 16 rounds, S-box substitution, permutation, key schedule generation, avalanche effect, and cryptanalysis limitations.",
            "syllabus_weight": 0.88,
            "historical_frequency": 3,
            "avg_marks": 6.0,
            "priority": "MEDIUM",
            "priority_score": 0.66,
            "breakdown": {"historical_frequency": 0.60, "marks_importance": 0.75, "recency": 0.80, "syllabus_relevance": 0.88, "question_variety": 0.80, "student_weakness": 0.20},
            "keywords": ["Feistel Cipher", "16 Rounds", "S-Boxes", "P-Boxes", "Avalanche Effect", "Confusion", "Diffusion", "56-bit Key"],
            "algorithms": ["DES", "Triple DES"],
            "formulas": ["Avalanche bit flip > 50%"],
            "study_mins": 45
        },
        {
            "name": "Post-Quantum Cryptography & Lattices",
            "category": "Post-Quantum",
            "description": "Euclidean lattices, fundamental parallelepiped, Shortest Vector Problem (SVP), Closest Vector Problem (CVP), LLL basis reduction, and Short Integer Solution (SIS).",
            "syllabus_weight": 0.90,
            "historical_frequency": 2,
            "avg_marks": 6.0,
            "priority": "MEDIUM",
            "priority_score": 0.65,
            "breakdown": {"historical_frequency": 0.40, "marks_importance": 0.75, "recency": 0.90, "syllabus_relevance": 0.90, "question_variety": 0.70, "student_weakness": 0.60},
            "keywords": ["Euclidean Lattice", "Shortest Vector Problem (SVP)", "Closest Vector Problem (CVP)", "LLL Algorithm", "SIS Problem"],
            "algorithms": ["LLL Basis Reduction", "Gram-Schmidt Orthogonalization"],
            "formulas": ["SVP: ||v|| <= lambda_1(L)", "SIS: A*x = 0 (mod q)"],
            "study_mins": 50
        },
        {
            "name": "Security Design Principles",
            "category": "Architecture",
            "description": "Isolation, modularity, encapsulation, layering, least privilege, defense in depth, and complete mediation in secure system design.",
            "syllabus_weight": 0.75,
            "historical_frequency": 2,
            "avg_marks": 5.0,
            "priority": "LOW",
            "priority_score": 0.46,
            "breakdown": {"historical_frequency": 0.40, "marks_importance": 0.63, "recency": 1.0, "syllabus_relevance": 0.75, "question_variety": 0.50, "student_weakness": 0.30},
            "keywords": ["Isolation", "Modularity", "Encapsulation", "Layering", "Defense in Depth", "Least Privilege"],
            "algorithms": [],
            "formulas": [],
            "study_mins": 30
        },
        {
            "name": "Quantum Threats & Shor/Grover Algorithms",
            "category": "Quantum Foundations",
            "description": "Impact of quantum computing on public-key and symmetric cryptography, Shor's polynomial-time factoring/DLOG, and Grover's quadratic database search.",
            "syllabus_weight": 0.80,
            "historical_frequency": 2,
            "avg_marks": 5.0,
            "priority": "LOW",
            "priority_score": 0.45,
            "breakdown": {"historical_frequency": 0.40, "marks_importance": 0.63, "recency": 0.85, "syllabus_relevance": 0.80, "question_variety": 0.60, "student_weakness": 0.35},
            "keywords": ["Shor's Algorithm", "Grover's Algorithm", "Quantum Period Finding", "RSA Factoring Vulnerability", "Key Size Doubling"],
            "algorithms": ["Shor's Algorithm", "Grover's Algorithm"],
            "formulas": ["Quantum Complexity O((log N)^3)"],
            "study_mins": 35
        }
    ]

    topic_records = {}
    for td in topics_data:
        t = Topic(
            subject_id=cns_subject.id,
            name=td["name"],
            category=td["category"],
            description=td["description"],
            syllabus_weight=td["syllabus_weight"],
            historical_frequency=td["historical_frequency"],
            avg_marks=td["avg_marks"],
            preparation_priority=td["priority"],
            priority_score=td["priority_score"],
            priority_breakdown=td["breakdown"],
            keywords=td["keywords"],
            algorithms=td["algorithms"],
            formulas=td["formulas"],
            recommended_study_minutes=td["study_mins"]
        )
        db.add(t)
        db.commit()
        db.refresh(t)
        topic_records[t.name] = t

    # 6. Ingest Documents from dataset inventory
    inventory_file = os.path.join(settings.DATA_DIR, "raw", "dataset_inventory.json")
    doc_records = {}
    chunks_to_index = []

    if os.path.exists(inventory_file):
        with open(inventory_file, "r", encoding="utf-8") as f:
            inv_list = json.load(f)

        for item in inv_list:
            doc = Document(
                subject_id=cns_subject.id,
                user_id=admin_user.id,
                filename=item["filename"],
                file_path=item["dest_path"],
                file_type="pdf",
                doc_category=item["category"],
                page_count=item.get("page_count", 1),
                status="PROCESSED",
                classification_confidence=0.94,
                classification_method="hybrid_feature_matching",
                ocr_used=item.get("is_handwritten", False) or "Mid Sem" in item["filename"],
                ocr_confidence=0.74 if item.get("is_handwritten") else 0.96,
                is_handwritten=item.get("is_handwritten", False),
                metadata_json={
                    "title": item.get("title"),
                    "instructor": item.get("instructor"),
                    "description": item.get("description")
                }
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            doc_records[doc.filename] = doc

            # Create rich chunks for search and retrieval
            content_samples = [
                f"{item.get('title')}: {item.get('description')}",
                f"Core cryptographic properties covered in {item['filename']}: encryption protocols, security objectives, key management, and analytical evaluations.",
                f"Detailed syllabus coverage from {item['filename']} for university examination preparation."
            ]

            # Add domain-specific chunks for key documents
            if "AES" in item["filename"]:
                content_samples.extend([
                    "The Advanced Encryption Standard (AES) specifies a FIPS-approved cryptographic algorithm. AES is a symmetric block cipher that processes data blocks of 128 bits using cipher keys of lengths 128, 192, and 256 bits.",
                    "AES Round Transformations: SubBytes provides non-linear byte substitution using an invertible S-box in GF(2^8). ShiftRows cyclically shifts rows of the state matrix. MixColumns provides diffusion via polynomial multiplication modulo x^4 + 1. AddRoundKey combines the round key via bitwise XOR.",
                    "Why MixColumns is omitted in the final round: Omission of MixColumns in the 10th round ensures symmetric mathematical structure between encryption and decryption, allowing reuse of inverse hardware architectures."
                ])
            elif "DES" in item["filename"]:
                content_samples.extend([
                    "Data Encryption Standard (DES) utilizes a 16-round Feistel cipher architecture. Plaintext block length is 64 bits and the effective secret key length is 56 bits (with 8 parity bits).",
                    "The Avalanche Effect in DES: A small change in either the plaintext or the key should produce a significant change in the ciphertext. In DES, flipping a single bit produces changes in over 50% of ciphertext bits after just 3 rounds.",
                    "DES S-Boxes perform non-linear substitution, mapping 6-bit inputs to 4-bit outputs. This step is the sole source of non-linearity in the DES algorithm."
                ])
            elif "Security_1" in item["filename"]:
                content_samples.extend([
                    "Security Attacks: Active attacks involve modification of the data stream or creation of a false stream (Masquerade, Replay, Modification, Denial of Service). They threaten integrity and availability.",
                    "Passive attacks are in the nature of eavesdropping on or monitoring transmissions (Release of message contents, Traffic analysis). Passive attacks do not alter data, making them virtually impossible to detect; defense relies exclusively on prevention via encryption.",
                    "Security Goals: The CIA Triad comprises Confidentiality (preventing unauthorized disclosure), Integrity (preventing unauthorized modification), and Availability (ensuring timely authorized access)."
                ])
            elif "Security_2" in item["filename"]:
                content_samples.extend([
                    "Classical Cryptography: The Hill Cipher is a polygraphic substitution cipher based on linear algebra. Each letter is represented by a number modulo 26. Encryption uses C = (K * P) mod 26.",
                    "Hill Cipher Decryption requires computing the modular inverse key matrix K^-1 such that K * K^-1 = I (mod 26). The inverse exists if and only if gcd(det(K), 26) = 1.",
                    "Playfair Cipher encrypts pairs of letters (digrams) using a 5x5 key matrix generated from a keyword. Attackers exploit non-uniform English digram frequencies (e.g. high frequency of TH, HE, IN) to break ciphertext without knowledge of the keyword."
                ])
            elif "Lattices_2" in item["filename"]:
                content_samples.extend([
                    "Learning With Errors (LWE): Introduced by Oded Regev. Given a matrix A in Z_q^{m x n} and vector b = A*s + e mod q where e is a discrete Gaussian error vector, Search-LWE requires finding secret s.",
                    "Why Gaussian Noise e is Essential: Without the error vector e, b = A*s mod q is a linear system solvable in polynomial time via Gaussian elimination. The presence of noise breaks linear algebra and makes the system computationally hard.",
                    "NIST Post-Quantum Cryptography Standards: ML-KEM (FIPS 203, formerly CRYSTALS-Kyber) is based on Module-LWE for key encapsulation. ML-DSA (FIPS 204, formerly CRYSTALS-Dilithium) provides quantum-resistant digital signatures.",
                    "Quantum Threat to RSA: Shor's algorithm solves prime factorization and discrete logarithms in polynomial time O((log N)^3) on a quantum computer, completely breaking RSA, Diffie-Hellman, and ECC. Post-quantum lattice cryptography resists Shor's algorithm."
                ])
            elif "Mid Sem" in item["filename"]:
                content_samples.extend([
                    "Indian Institute of Information Technology, Pune - Mid-Sem Examination - (BT14503) Cryptography and Network Security. Total Marks: 30. Duration: 90 Minutes.",
                    "Question 1: Differentiate between active and passive attacks with suitable examples. Identify the attack which is difficult to detect and prevent. Provide proper justification [5 Marks].",
                    "Question 4: Consider plaintext 'Meet me at the usual place' and key matrix using Hill Cipher. Demonstrate with proper steps (a) Encryption (b) Decryption [5 Marks].",
                    "Question 5: Playfair Cipher possible keys justification and attack strategy when key is unknown [5 Marks].",
                    "Question 6: Calculate multiplicative inverse polynomial g(x) such that f(x)g(x) = 1 (mod m(x)) in Galois fields and elaborate irreducible polynomial characteristics [5 Marks]."
                ])

            for p_idx, text_chunk in enumerate(content_samples, 1):
                chunk = DocumentChunk(
                    document_id=doc.id,
                    page_number=min(p_idx, doc.page_count),
                    chunk_index=p_idx,
                    content=text_chunk,
                    chunk_type="text",
                    metadata_json={"topic": item.get("category", "General")}
                )
                db.add(chunk)
                db.commit()
                db.refresh(chunk)

                chunks_to_index.append({
                    "id": chunk.id,
                    "content": text_chunk,
                    "document_id": doc.id,
                    "document_name": doc.filename,
                    "page_number": chunk.page_number,
                    "doc_category": doc.doc_category,
                    "topic": item.get("category", "General")
                })

    # Fit embedding engine & populate vector store
    all_texts = [c["content"] for c in chunks_to_index]
    embedding_engine.fit(all_texts)
    vector_store.clear()
    vector_store.add_chunks(chunks_to_index)

    # 7. Seed Questions (including verified 6 Mid-Sem 2025 questions + 6 PYQ questions)
    mid_sem_doc = doc_records.get("Semester 5 Mid Sem.pdf")
    mid_sem_id = mid_sem_doc.id if mid_sem_doc else 1

    questions_data = [
        {
            "qnum": "1",
            "text": "Differentiate between active and passive attacks with suitable examples. Identify the attack which is difficult to detect and prevent. Provide proper justification to support your answer.",
            "marks": 5.0,
            "types": ["Comparison", "Explanation"],
            "difficulty": "MEDIUM",
            "requires_diagram": False,
            "requires_calc": False,
            "requires_algo": False,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Security Attacks & Services",
            "key_concepts": ["Active vs Passive", "Traffic Analysis", "Masquerade", "Replay", "Confidentiality Defense"],
            "rubric": {
                "criteria": [
                    {"criterion": "Comparative Matrix (Active vs Passive with examples)", "marks": 2.5, "description": "Tabular distinction of goals, impacts, and real-world examples."},
                    {"criterion": "Identification & Justification of Attack Hardest to Detect", "marks": 2.5, "description": "Explicit identification of Passive Attack due to zero message alteration, and justification of encryption prevention."}
                ]
            }
        },
        {
            "qnum": "2",
            "text": "Illustrate the characteristics of cryptographic systems and requirements of secure symmetric encryption systems.",
            "marks": 5.0,
            "types": ["Explanation", "Diagram"],
            "difficulty": "EASY",
            "requires_diagram": True,
            "requires_calc": False,
            "requires_algo": False,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Classical Cryptography & Hill Cipher",
            "key_concepts": ["Symmetric Cipher Model", "Kerckhoffs Principle", "Key Distribution", "Secrecy Requirements"],
            "rubric": {
                "criteria": [
                    {"criterion": "Symmetric Encryption Model Diagram", "marks": 2.0, "description": "Alice, Bob, Secure Channel, Key Source, Ciphertext."},
                    {"criterion": "Characteristics & Security Requirements", "marks": 3.0, "description": "Kerckhoffs principle, key secrecy, brute-force resistance."}
                ]
            }
        },
        {
            "qnum": "3",
            "text": "Examine the significance of isolation, modularity, encapsulation, and layering concepts in designing security principles.",
            "marks": 5.0,
            "types": ["Explanation", "Application"],
            "difficulty": "MEDIUM",
            "requires_diagram": False,
            "requires_calc": False,
            "requires_algo": False,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Security Design Principles",
            "key_concepts": ["Isolation", "Modularity", "Encapsulation", "Layering", "Defense in Depth"],
            "rubric": {
                "criteria": [
                    {"criterion": "Four Principles Explanation", "marks": 4.0, "description": "1 Mark each for Isolation, Modularity, Encapsulation, Layering."},
                    {"criterion": "Synthesis in Defense-in-Depth Architecture", "marks": 1.0, "description": "How they collaboratively minimize attack surface."}
                ]
            }
        },
        {
            "qnum": "4",
            "text": "Consider plaintext as 'Meet me at the usual place' and key matrix [[9, 4], [5, 7]] using Hill Cipher. Demonstrate with proper steps (a) Encryption (b) Decryption.",
            "marks": 5.0,
            "types": ["Numerical", "Algorithm"],
            "difficulty": "HARD",
            "requires_diagram": False,
            "requires_calc": True,
            "requires_algo": True,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Classical Cryptography & Hill Cipher",
            "key_concepts": ["Hill Cipher", "Matrix Multiplication mod 26", "Determinant", "Matrix Inversion"],
            "rubric": {
                "criteria": [
                    {"criterion": "Encryption Steps (P to C vector math)", "marks": 2.5, "description": "Vector grouping, multiplication modulo 26, ciphertext generation."},
                    {"criterion": "Decryption Steps (K^-1 derivation and recovery)", "marks": 2.5, "description": "Determinant calculation, modular inverse det^-1, K^-1, recovery of P."}
                ]
            }
        },
        {
            "qnum": "5",
            "text": "In context to Playfair Cipher: (a) Possible keys in Playfair Cipher with justification. (b) Discuss an attack strategy by which an attacker with ciphertext and algorithm can break security, explaining weaknesses that permit this attack.",
            "marks": 5.0,
            "types": ["Attack Analysis", "Explanation", "Numerical"],
            "difficulty": "MEDIUM",
            "requires_diagram": False,
            "requires_calc": True,
            "requires_algo": False,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Classical Cryptography & Hill Cipher",
            "key_concepts": ["Playfair Key Space", "Digram Frequencies", "Known Ciphertext Attack", "Weaknesses"],
            "rubric": {
                "criteria": [
                    {"criterion": "Key Space Mathematical Justification", "marks": 2.0, "description": "25! / 25 permutations calculation accounting for 5x5 grid."},
                    {"criterion": "Attack Strategy & Weaknesses", "marks": 3.0, "description": "Digram frequency analysis and lack of diffusion weakness."}
                ]
            }
        },
        {
            "qnum": "6",
            "text": "Assume f(x) = (x^3 + x + 1) and m(x) = (x^4 + x + 1). Calculate g(x) such that f(x)g(x) = 1 (mod m(x)). Support your answer with step-wise calculations. Elaborate on characteristics of irreducible polynomials.",
            "marks": 5.0,
            "types": ["Numerical", "Explanation"],
            "difficulty": "HARD",
            "requires_diagram": False,
            "requires_calc": True,
            "requires_algo": True,
            "source": "Semester 5 Mid Sem (BT14503)",
            "year": 2025,
            "topic_name": "Galois Fields & Finite Field Arithmetic",
            "key_concepts": ["Galois Fields GF(2^n)", "Polynomial Division", "Multiplicative Inverse", "Irreducible Polynomials"],
            "rubric": {
                "criteria": [
                    {"criterion": "Step-wise Extended Euclidean Division in GF(2)", "marks": 3.0, "description": "Quotient, remainder, and inverse polynomial calculation g(x)."},
                    {"criterion": "Irreducible Polynomial Characteristics", "marks": 2.0, "description": "No non-trivial factors, field closure, analogue to prime numbers."}
                ]
            }
        },
        {
            "qnum": "7",
            "text": "Explain the architecture of DES and the internal structure of a single Feistel round. Explain how the avalanche effect is achieved.",
            "marks": 6.0,
            "types": ["Explanation", "Diagram", "Algorithm"],
            "difficulty": "MEDIUM",
            "requires_diagram": True,
            "requires_calc": False,
            "requires_algo": True,
            "source": "CNS PYQ Collection",
            "year": 2024,
            "topic_name": "Data Encryption Standard (DES)",
            "key_concepts": ["Feistel Network", "S-Boxes", "Avalanche Effect", "Round Function F"],
            "rubric": {
                "criteria": [
                    {"criterion": "DES Feistel Round Schematic", "marks": 2.5, "description": "Expansion, round key XOR, S-box substitution, P-box."},
                    {"criterion": "Avalanche Effect Demonstration", "marks": 3.5, "description": "Explanation of bit propagation across multiple rounds."}
                ]
            }
        },
        {
            "qnum": "8",
            "text": "Explain the SubBytes, ShiftRows, MixColumns, and AddRoundKey transformations in AES. Why is MixColumns omitted in the final round?",
            "marks": 7.0,
            "types": ["Explanation", "Algorithm", "Diagram"],
            "difficulty": "MEDIUM",
            "requires_diagram": True,
            "requires_calc": False,
            "requires_algo": True,
            "source": "CNS PYQ Collection",
            "year": 2024,
            "topic_name": "Advanced Encryption Standard (AES)",
            "key_concepts": ["State Matrix", "SubBytes", "ShiftRows", "MixColumns", "Omission in Final Round"],
            "rubric": {
                "criteria": [
                    {"criterion": "Four AES Transformations", "marks": 5.0, "description": "Mathematical description of each transformation."},
                    {"criterion": "Final Round MixColumns Omission Rationale", "marks": 2.0, "description": "Hardware symmetry for encryption/decryption inverse."}
                ]
            }
        },
        {
            "qnum": "9",
            "text": "Define Learning With Errors (LWE). Differentiate between Search-LWE and Decision-LWE problems, and explain how the noise vector prevents Gaussian elimination.",
            "marks": 6.0,
            "types": ["Definition", "Explanation", "Comparison"],
            "difficulty": "HARD",
            "requires_diagram": False,
            "requires_calc": False,
            "requires_algo": False,
            "source": "PQC Advanced Topics",
            "year": 2024,
            "topic_name": "Learning With Errors (LWE) & NIST Standards",
            "key_concepts": ["LWE Formulation", "Search vs Decision LWE", "Gaussian Noise", "Gaussian Elimination Failure"],
            "rubric": {
                "criteria": [
                    {"criterion": "Mathematical Definition of LWE", "marks": 2.0, "description": "b = As + e mod q parameters and distributions."},
                    {"criterion": "Search vs Decision LWE Distinction", "marks": 2.0, "description": "Finding s versus distinguishing from uniform."},
                    {"criterion": "Noise Vector Prevention of Linear Solvers", "marks": 2.0, "description": "Why exact Gaussian elimination fails under perturbation."}
                ]
            }
        },
        {
            "qnum": "10",
            "text": "Compare Shor's algorithm and Grover's algorithm in terms of their quantum speedup and impact on public-key vs symmetric-key cryptography.",
            "marks": 5.0,
            "types": ["Comparison", "Explanation"],
            "difficulty": "MEDIUM",
            "requires_diagram": False,
            "requires_calc": False,
            "requires_algo": False,
            "source": "PQC Foundations",
            "year": 2024,
            "topic_name": "Quantum Threats & Shor/Grover Algorithms",
            "key_concepts": ["Shor Algorithm", "Grover Algorithm", "Exponential vs Polynomial Speedup", "AES Key Doubling", "RSA Vulnerability"],
            "rubric": {
                "criteria": [
                    {"criterion": "Speedup Comparison (Polynomial vs Quadratic)", "marks": 2.5, "description": "O((log N)^3) on factoring vs O(sqrt(N)) on search."},
                    {"criterion": "Impact on Asymmetric vs Symmetric Ciphers", "marks": 2.5, "description": "Total compromise of RSA/ECC vs doubling key size for AES."}
                ]
            }
        },
        {
            "qnum": "11",
            "text": "Explain the Shortest Vector Problem (SVP) and Closest Vector Problem (CVP) on Euclidean lattices. How does the LLL basis reduction algorithm approximate SVP?",
            "marks": 6.0,
            "types": ["Explanation", "Algorithm", "Diagram"],
            "difficulty": "HARD",
            "requires_diagram": True,
            "requires_calc": False,
            "requires_algo": True,
            "source": "Lattices I Reference",
            "year": 2024,
            "topic_name": "Post-Quantum Cryptography & Lattices",
            "key_concepts": ["Euclidean Lattices", "SVP", "CVP", "LLL Basis Reduction", "Gram-Schmidt"],
            "rubric": {
                "criteria": [
                    {"criterion": "SVP and CVP Definitions", "marks": 3.0, "description": "Geometric formulation on lattice Lambda."},
                    {"criterion": "LLL Basis Reduction Approximation", "marks": 3.0, "description": "Lovasz condition, polynomial time 2^(n/2) approximation."}
                ]
            }
        },
        {
            "qnum": "12",
            "text": "Explain ML-KEM (FIPS 203) Key Encapsulation Mechanism and how it differs from traditional Diffie-Hellman key exchange.",
            "marks": 7.0,
            "types": ["Explanation", "Comparison", "Algorithm"],
            "difficulty": "HARD",
            "requires_diagram": True,
            "requires_calc": False,
            "requires_algo": True,
            "source": "NIST PQC Standards",
            "year": 2024,
            "topic_name": "Learning With Errors (LWE) & NIST Standards",
            "key_concepts": ["ML-KEM (Kyber)", "Module-LWE", "Key Encapsulation vs Key Exchange", "IND-CCA2 Security"],
            "rubric": {
                "criteria": [
                    {"criterion": "ML-KEM Key Encapsulation Architecture", "marks": 4.0, "description": "KeyGen, Encaps, Decaps workflows using Module-LWE."},
                    {"criterion": "Comparison with Diffie-Hellman", "marks": 3.0, "description": "KEM encapsulation vs interactive exchange, quantum resistance."}
                ]
            }
        }
    ]

    for qd in questions_data:
        matching_topic = topic_records.get(qd["topic_name"])
        q = Question(
            subject_id=cns_subject.id,
            source_document_id=mid_sem_id,
            page_number=2 if int(qd["qnum"]) <= 5 else 3,
            question_number=qd["qnum"],
            text=qd["text"],
            marks=qd["marks"],
            question_types=qd["types"],
            estimated_difficulty=qd["difficulty"],
            difficulty_confidence=0.88,
            requires_diagram=qd["requires_diagram"],
            requires_calculation=qd["requires_calc"],
            requires_algorithm=qd["requires_algo"],
            academic_year=qd["year"],
            source_name=qd["source"],
            is_pyq=True,
            key_concepts=qd["key_concepts"],
            marking_rubric=qd["rubric"]
        )
        db.add(q)
        db.commit()
        db.refresh(q)

        if matching_topic:
            qt = QuestionTopic(
                question_id=q.id,
                topic_id=matching_topic.id,
                relevance_score=1.0
            )
            db.add(qt)

        # Add explicit marking scheme record
        ms = MarkingScheme(
            document_id=mid_sem_id,
            question_id=q.id,
            criteria=qd["rubric"]["criteria"],
            total_marks=qd["marks"],
            evidence_source="Semester 5 Mid-Sem Rubric"
        )
        db.add(ms)

    db.commit()

    # 8. Generate Personalized Study Plan for Demo Student
    study_plan_service.generate_plan(
        db=db,
        user_id=demo_student.id,
        subject_id=cns_subject.id,
        exam_date_str="2026-11-15",
        available_hours_per_day=3.0
    )

    # 9. Seed Initial Anonymous SUS Feedback & Surveys (for HCI analytics)
    survey_samples = [
        {"q1": 5, "q2": 5, "q3": 5, "q4": 5, "q5": 5, "sus": [5, 1, 5, 1, 5, 2, 5, 1, 5, 2], "score": 87.5, "feedback": "Finding exactly what to study for CNS without wading through 300 slides saved immense time."},
        {"q1": 4, "q2": 5, "q3": 4, "q4": 5, "q5": 5, "sus": [4, 2, 5, 1, 4, 2, 5, 2, 4, 1], "score": 82.5, "feedback": "The distinction between Evidence-backed and pattern-based recommendations gave real confidence before mid-sems."},
        {"q1": 5, "q2": 4, "q3": 5, "q4": 5, "q5": 5, "sus": [5, 1, 5, 2, 5, 1, 5, 1, 5, 1], "score": 92.5, "feedback": "The answer coach showing exact rubric allocation for Hill cipher and LWE made a huge difference."}
    ]
    for s in survey_samples:
        survey = FeedbackSurvey(
            user_id=None,  # Anonymous
            q1_ease_of_use=s["q1"],
            q2_recommendation_relevance=s["q2"],
            q3_exam_pattern_help=s["q3"],
            q4_answer_coach_help=s["q4"],
            q5_would_use=s["q5"],
            sus_scores=s["sus"],
            calculated_sus=s["score"],
            qualitative_feedback=s["feedback"]
        )
        db.add(survey)
    db.commit()

    print("[ExamIQ] Clean database seeding complete! Demo Student and Admin ready.")
