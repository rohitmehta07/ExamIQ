import os
import csv

WORKSPACE = r"d:\desktop\ml proj"
annotations_dir = os.path.join(WORKSPACE, "data", "annotations")
os.makedirs(annotations_dir, exist_ok=True)

questions = [
    {
        "question_id": "CNS-2025-MS-Q1",
        "question_number": "1",
        "text": "Differentiate between active and passive attacks with suitable examples. Identify the attack which is difficult to detect and prevent. Provide proper justification to support your answer.",
        "marks": 5.0,
        "topic": "Security Attacks",
        "subtopics": "Active Attacks, Passive Attacks, Traffic Analysis, Masquerade",
        "question_types": "Comparison, Explanation",
        "difficulty": "MEDIUM",
        "requires_diagram": False,
        "requires_calculation": False,
        "requires_algorithm": False,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2025-MS-Q2",
        "question_number": "2",
        "text": "Illustrate the characteristics of cryptographic systems and requirements of secure symmetric encryption systems.",
        "marks": 5.0,
        "topic": "Symmetric Cryptography",
        "subtopics": "Cryptographic Systems, Symmetric Cipher Model, Kerckhoffs's Principle",
        "question_types": "Explanation, Diagram",
        "difficulty": "EASY",
        "requires_diagram": True,
        "requires_calculation": False,
        "requires_algorithm": False,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2025-MS-Q3",
        "question_number": "3",
        "text": "Examine the significance of isolation, modularity, encapsulation, and layering concepts in designing security principles.",
        "marks": 5.0,
        "topic": "Security Design Principles",
        "subtopics": "Isolation, Modularity, Encapsulation, Layering, Defense in Depth",
        "question_types": "Explanation, Application",
        "difficulty": "MEDIUM",
        "requires_diagram": False,
        "requires_calculation": False,
        "requires_algorithm": False,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2025-MS-Q4",
        "question_number": "4",
        "text": "Consider plaintext as 'Meet me at the usual place' and key matrix using Hill Cipher. Demonstrate with proper steps (a) Encryption (b) Decryption.",
        "marks": 5.0,
        "topic": "Hill Cipher",
        "subtopics": "Classical Cryptography, Matrix Inversion, Modulo 26 Arithmetic",
        "question_types": "Numerical, Algorithm",
        "difficulty": "HARD",
        "requires_diagram": False,
        "requires_calculation": True,
        "requires_algorithm": True,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2025-MS-Q5",
        "question_number": "5",
        "text": "In context to Playfair Cipher: (a) Possible keys in Playfair Cipher with justification. (b) Discuss an attack strategy by which an attacker with ciphertext and algorithm can break security, explaining weaknesses that permit this attack.",
        "marks": 5.0,
        "topic": "Playfair Cipher",
        "subtopics": "Classical Cryptography, Frequency Analysis, Digram Frequencies",
        "question_types": "Attack Analysis, Explanation, Numerical",
        "difficulty": "MEDIUM",
        "requires_diagram": False,
        "requires_calculation": True,
        "requires_algorithm": False,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2025-MS-Q6",
        "question_number": "6",
        "text": "Assume f(x) = (x^3 + x + 1) and m(x) = (x^4 + x + 1). Calculate g(x) such that f(x)g(x) = 1 (mod m(x)). Support your answer with step-wise calculations. Elaborate on characteristics of irreducible polynomials.",
        "marks": 5.0,
        "topic": "Galois Fields",
        "subtopics": "Finite Field Arithmetic, AES Mathematics, Extended Euclidean Algorithm",
        "question_types": "Numerical, Explanation",
        "difficulty": "HARD",
        "requires_diagram": False,
        "requires_calculation": True,
        "requires_algorithm": True,
        "source": "Semester 5 Mid Sem (BT14503)",
        "year": 2025
    },
    {
        "question_id": "CNS-2024-ES-Q1",
        "question_number": "7",
        "text": "Explain the architecture of DES and the internal structure of a single Feistel round. Explain how the avalanche effect is achieved.",
        "marks": 6.0,
        "topic": "DES",
        "subtopics": "Feistel Cipher, S-Boxes, Avalanche Effect, Permutation",
        "question_types": "Explanation, Diagram, Algorithm",
        "difficulty": "MEDIUM",
        "requires_diagram": True,
        "requires_calculation": False,
        "requires_algorithm": True,
        "source": "CNS PYQ Collection 2024",
        "year": 2024
    },
    {
        "question_id": "CNS-2024-ES-Q2",
        "question_number": "8",
        "text": "Explain the SubBytes, ShiftRows, MixColumns, and AddRoundKey transformations in AES. Why is MixColumns omitted in the final round?",
        "marks": 7.0,
        "topic": "AES",
        "subtopics": "State Matrix, Galois Field GF(2^8), Diffusion, Confusion",
        "question_types": "Explanation, Algorithm",
        "difficulty": "MEDIUM",
        "requires_diagram": True,
        "requires_calculation": False,
        "requires_algorithm": True,
        "source": "CNS PYQ Collection 2024",
        "year": 2024
    },
    {
        "question_id": "CNS-2024-ES-Q3",
        "question_number": "9",
        "text": "Define Learning With Errors (LWE). Differentiate between Search-LWE and Decision-LWE problems, and explain how the noise vector prevents Gaussian elimination.",
        "marks": 6.0,
        "topic": "LWE",
        "subtopics": "Post-Quantum Cryptography, Lattice Problems, Hardness Reductions",
        "question_types": "Definition, Explanation, Comparison",
        "difficulty": "HARD",
        "requires_diagram": False,
        "requires_calculation": False,
        "requires_algorithm": False,
        "source": "PQC Advanced Topics 2024",
        "year": 2024
    },
    {
        "question_id": "CNS-2024-ES-Q4",
        "question_number": "10",
        "text": "Compare Shor's algorithm and Grover's algorithm in terms of their quantum speedup and impact on public-key vs symmetric-key cryptography.",
        "marks": 5.0,
        "topic": "Quantum Threat",
        "subtopics": "Shor's Algorithm, Grover's Algorithm, Post-Quantum Transition, RSA Impact",
        "question_types": "Comparison, Explanation",
        "difficulty": "MEDIUM",
        "requires_diagram": False,
        "requires_calculation": False,
        "requires_algorithm": False,
        "source": "PQC Foundations 2024",
        "year": 2024
    },
    {
        "question_id": "CNS-2024-ES-Q5",
        "question_number": "11",
        "text": "Explain the Shortest Vector Problem (SVP) and Closest Vector Problem (CVP) on Euclidean lattices. How does the LLL basis reduction algorithm approximate SVP?",
        "marks": 6.0,
        "topic": "Lattices",
        "subtopics": "SVP, CVP, LLL Algorithm, Gram-Schmidt Orthogonalization",
        "question_types": "Explanation, Algorithm",
        "difficulty": "HARD",
        "requires_diagram": True,
        "requires_calculation": False,
        "requires_algorithm": True,
        "source": "Lattices I Reference 2024",
        "year": 2024
    },
    {
        "question_id": "CNS-2024-ES-Q6",
        "question_number": "12",
        "text": "Explain ML-KEM (FIPS 203) Key Encapsulation Mechanism and how it differs from traditional Diffie-Hellman key exchange.",
        "marks": 7.0,
        "topic": "ML-KEM",
        "subtopics": "Module-LWE, KEM vs Key Exchange, Decapsulation, IND-CCA2 Security",
        "question_types": "Explanation, Comparison, Algorithm",
        "difficulty": "HARD",
        "requires_diagram": True,
        "requires_calculation": False,
        "requires_algorithm": True,
        "source": "NIST PQC Standards 2024",
        "year": 2024
    }
]

q_csv_path = os.path.join(annotations_dir, "questions.csv")
with open(q_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "question_id", "question_number", "text", "marks", "topic", "subtopics",
        "question_types", "difficulty", "requires_diagram", "requires_calculation",
        "requires_algorithm", "source", "year"
    ])
    writer.writeheader()
    for q in questions:
        writer.writerow(q)

print(f"Saved {len(questions)} annotated questions to {q_csv_path}")
