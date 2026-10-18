import os
import shutil
import json
import pymupdf
import csv

WORKSPACE = r"d:\desktop\ml proj"
DOCS_DIR = os.path.join(WORKSPACE, "documents", "CNS")
DATA_DIR = os.path.join(WORKSPACE, "data")

inventory_map = [
    {
        "filename": "AES_1 (1).pdf",
        "category": "LECTURE_NOTES",
        "subfolder": "lecture",
        "title": "BT14503: Advanced Encryption Standard (AES)",
        "instructor": "Dr. Shivangi Shukla, IIIT Pune",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "NIST selection criteria, AES state matrix, SubBytes, ShiftRows, MixColumns, AddRoundKey, Key Expansion, Inverse ciphers."
    },
    {
        "filename": "Cryptography and Network Security_1 (1).pdf",
        "category": "LECTURE_NOTES",
        "subfolder": "lecture",
        "title": "BT14503: Security Goals, Attacks, and Mechanisms",
        "instructor": "Dr. Shivangi Shukla, IIIT Pune",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "CIA triad, active vs passive attacks (masquerade, replay, modification, DoS), X.800 security services and mechanisms."
    },
    {
        "filename": "Cryptography and Network Security_2 (1).pdf",
        "category": "LECTURE_NOTES",
        "subfolder": "lecture",
        "title": "BT14503: Classical Encryption Techniques",
        "instructor": "Dr. Shivangi Shukla, IIIT Pune",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "Symmetric cipher model, cryptanalysis, substitution ciphers (Caesar, Monoalphabetic, Playfair, Hill Cipher), transposition ciphers, OTP."
    },
    {
        "filename": "Data Encryption Standard (2).pdf",
        "category": "LECTURE_NOTES",
        "subfolder": "lecture",
        "title": "BT14503: Data Encryption Standard (DES)",
        "instructor": "Dr. Shivangi Shukla, IIIT Pune",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "DES history, Feistel network, 16 rounds, S-box substitution, permutation, key schedule, avalanche effect, cryptanalysis of DES."
    },
    {
        "filename": "Modern Symmetric-Key Ciphers (1).pdf",
        "category": "LECTURE_NOTES",
        "subfolder": "lecture",
        "title": "BT14503: Modern Symmetric-Key Ciphers",
        "instructor": "Dr. Shivangi Shukla, IIIT Pune",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "Block vs stream ciphers, Shannon's confusion and diffusion, modes of operation (ECB, CBC, CFB, OFB, CTR)."
    },
    {
        "filename": "PQC_1.pdf",
        "category": "HANDWRITTEN_NOTES",
        "subfolder": "notes",
        "title": "PQC: Cryptographic Foundations & Insecure Channels",
        "instructor": "Course Notes",
        "subject": "CNS",
        "is_handwritten": True,
        "description": "Handwritten lecture notes covering cryptographic security games, adversaries, key generation, and post-quantum transitions."
    },
    {
        "filename": "PQC_Lattices_1.pdf",
        "category": "REFERENCE",
        "subfolder": "reference",
        "title": "Post-Quantum Cryptography Lattices I: Geometry and Hard Problems",
        "instructor": "Somitra Sanadhya",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "Lattice definition, fundamental parallelepiped, hard lattice problems (SVP, CVP, SIVP, BDD), basis reduction (LLL), Short Integer Solution (SIS)."
    },
    {
        "filename": "PQC_Lattices_2.pdf",
        "category": "REFERENCE",
        "subfolder": "reference",
        "title": "Post-Quantum Cryptography Lattices II: LWE, ML-KEM and ML-DSA",
        "instructor": "Somitra Sanadhya",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "Learning With Errors (LWE), encryption from LWE, Ring-LWE, Module-LWE, NIST PQC standards: ML-KEM (FIPS 203) and ML-DSA (FIPS 204)."
    },
    {
        "filename": "Semester 5 Mid Sem.pdf",
        "category": "QUESTION_PAPER",
        "subfolder": "question_papers",
        "title": "IIIT Pune Semester 5 Mid-Term Examination (BT14503 CNS)",
        "instructor": "IIIT Pune Examination Cell",
        "subject": "CNS",
        "is_handwritten": False,
        "description": "Semester 5 Mid-Sem Exam paper containing official CNS questions: Active vs Passive attacks (Q1, 5M), Symmetric crypto properties (Q2, 5M), Security design principles (Q3, 5M), Hill Cipher step-by-step (Q4, 5M), Playfair Cipher attack strategy (Q5, 5M), Galois Field irreducible polynomials (Q6, 5M)."
    }
]

inventory_results = []

for item in inventory_map:
    src_path = os.path.join(WORKSPACE, item["filename"])
    dest_dir = os.path.join(DOCS_DIR, item["subfolder"])
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, item["filename"])
    
    if os.path.exists(src_path) and not os.path.exists(dest_path):
        shutil.copy2(src_path, dest_path)
    
    page_count = 0
    file_size = 0
    if os.path.exists(src_path):
        file_size = os.path.getsize(src_path)
        try:
            doc = pymupdf.open(src_path)
            page_count = len(doc)
            doc.close()
        except Exception:
            pass

    record = dict(item)
    record["file_size_bytes"] = file_size
    record["page_count"] = page_count
    record["source_path"] = src_path
    record["dest_path"] = dest_path
    inventory_results.append(record)

# Ensure directories exist
os.makedirs(os.path.join(DATA_DIR, "raw"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "annotations"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "processed"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "demo"), exist_ok=True)

# Save JSON inventory
with open(os.path.join(DATA_DIR, "raw", "dataset_inventory.json"), "w", encoding="utf-8") as f:
    json.dump(inventory_results, f, indent=2)


# Save annotations CSVs for ML evaluation
docs_csv_path = os.path.join(DATA_DIR, "annotations", "documents.csv")
with open(docs_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["document_id", "filename", "document_type", "is_handwritten", "instructor", "page_count"])
    for idx, item in enumerate(inventory_results, 1):
        writer.writerow([idx, item["filename"], item["category"], item["is_handwritten"], item["instructor"], item["page_count"]])

print(f"Successfully inventoried {len(inventory_results)} CNS academic documents.")
