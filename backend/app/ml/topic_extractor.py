import re
from typing import List, Dict, Any, Optional

class TopicExtractor:
    """
    Extracts structured topics, key concepts, algorithms, formulas, and explanations
    from ANY academic material (syllabus, lecture slides, scanned notes, teacher guides).
    Combines rule-based academic structure parsing, definition extraction, and domain heuristics.
    """

    GENERIC_STOP_WORDS = {
        "introduction", "overview", "summary", "conclusion", "references", "syllabus",
        "index", "contents", "table", "figure", "page", "note", "notes", "lecture",
        "department", "university", "college", "semester", "exam", "assignment"
    }

    KNOWN_ALGORITHMS = [
        "AES", "DES", "Triple DES", "Hill Cipher", "Playfair Cipher", "Caesar Cipher",
        "Vigenere Cipher", "One-Time Pad", "RSA", "Diffie-Hellman", "Shor's Algorithm",
        "Grover's Algorithm", "LLL Algorithm", "Regev's Cryptosystem", "ML-KEM", "ML-DSA",
        "Gram-Schmidt Orthogonalization", "Extended Euclidean Algorithm", "Backpropagation",
        "Gradient Descent", "Random Forest", "Support Vector Machine", "K-Means",
        "Dijkstra's Algorithm", "A* Search", "Raft Consensus", "Paxos", "MapReduce"
    ]

    KNOWN_FORMULAS = [
        "C = E(K, P)", "P = D(K, C)", "C = (K * P) mod 26", "f(x)g(x) = 1 (mod m(x))",
        "b = A*s + e (mod q)", "SVP: ||v|| <= lambda_1(L)", "CVP: ||v - t|| minimal",
        "Avalanche Effect: >50% bit flip", "SIS: A*x = 0 (mod q), ||x|| <= beta",
        "gcd(a, b) = ax + by", "y = Wx + b", "L(y, y_hat) = -(y log(y_hat) + (1-y) log(1-y_hat))"
    ]

    # Domain Knowledge Patterns for accurate clustering when common subjects are processed
    DOMAIN_SPECS = [
        {
            "name": "Security Attacks & Services",
            "category": "Foundations",
            "patterns": [r"security attacks?", r"active attacks?", r"passive attacks?", r"masquerade", r"traffic analysis", r"cia triad", r"security services"],
            "keywords": ["Active Attack", "Passive Attack", "Confidentiality", "Integrity", "Availability", "Traffic Analysis", "Masquerade", "Replay", "DoS"],
            "algorithms": [],
            "formulas": [],
            "weight": 0.85,
            "reason": "Forms the theoretical foundation of network vulnerability assessments and CIA triad design."
        },
        {
            "name": "Classical Cryptography & Ciphers",
            "category": "Ciphers",
            "patterns": [r"classical encryption", r"caesar cipher", r"playfair cipher", r"hill cipher", r"monoalphabetic", r"polyalphabetic", r"substitution"],
            "keywords": ["Plaintext", "Ciphertext", "Key Matrix", "Digram Frequencies", "Substitution", "Transposition", "Brute Force", "Cryptanalysis"],
            "algorithms": ["Hill Cipher", "Playfair Cipher", "Caesar Cipher", "Vigenere Cipher"],
            "formulas": ["C = (K * P) mod 26", "P = (K^-1 * C) mod 26"],
            "weight": 0.90,
            "reason": "Core cipher mechanisms frequently tested through numerical matrix calculations and cryptanalysis."
        },
        {
            "name": "Security Design Principles",
            "category": "Architecture",
            "patterns": [r"security principles?", r"isolation", r"modularity", r"encapsulation", r"layering", r"defense in depth", r"least privilege"],
            "keywords": ["Isolation", "Modularity", "Encapsulation", "Layering", "Least Privilege", "Fail-Safe Defaults", "Complete Mediation"],
            "algorithms": [],
            "formulas": [],
            "weight": 0.75,
            "reason": "Fundamental systems architecture principles tested in design and comparative evaluation questions."
        },
        {
            "name": "Data Encryption Standard (DES)",
            "category": "Symmetric Ciphers",
            "patterns": [r"\bdes\b", r"data encryption standard", r"feistel cipher", r"feistel network", r"avalanche effect", r"s-box"],
            "keywords": ["Feistel Network", "16 Rounds", "S-Boxes", "Permutation", "Key Schedule", "Avalanche Effect", "Confusion", "Diffusion"],
            "algorithms": ["DES", "Triple DES"],
            "formulas": ["Avalanche Effect: >50% bit flip"],
            "weight": 0.88,
            "reason": "Benchmark Feistel architecture demonstrating round keys, S-Box non-linearity, and diffusion."
        },
        {
            "name": "Advanced Encryption Standard (AES)",
            "category": "Symmetric Ciphers",
            "patterns": [r"\baes\b", r"advanced encryption standard", r"subbytes", r"shiftrows", r"mixcolumns", r"addroundkey", r"state matrix", r"rijndael"],
            "keywords": ["State Matrix", "SubBytes", "ShiftRows", "MixColumns", "AddRoundKey", "Key Expansion", "Galois Field GF(2^8)", "Irreducible Polynomial"],
            "algorithms": ["AES"],
            "formulas": ["f(x)g(x) = 1 (mod m(x))"],
            "weight": 0.92,
            "reason": "Modern global standard for symmetric block encryption with mathematical field operations."
        },
        {
            "name": "Galois Fields & Finite Field Arithmetic",
            "category": "Mathematical Cryptography",
            "patterns": [r"galois field", r"finite field", r"irreducible polynomials?", r"gf\(2\^8\)", r"modular polynomial"],
            "keywords": ["Galois Field", "Irreducible Polynomial", "Modulo Arithmetic", "Extended Euclidean Algorithm", "Inverse Elements"],
            "algorithms": ["Extended Euclidean Algorithm"],
            "formulas": ["f(x)g(x) = 1 (mod m(x))"],
            "weight": 0.85,
            "reason": "Mathematical substrate underpinning modern byte-level substitutions and polynomial inverses."
        },
        {
            "name": "Post-Quantum Cryptography & Lattices",
            "category": "Post-Quantum",
            "patterns": [r"post-quantum", r"pqc", r"lattice", r"\bsvp\b", r"\bcvp\b", r"\bsis\b", r"fundamental parallelepiped", r"basis reduction", r"\blll\b"],
            "keywords": ["Euclidean Lattice", "Shortest Vector Problem (SVP)", "Closest Vector Problem (CVP)", "Short Integer Solution (SIS)", "LLL Algorithm", "Basis Reduction"],
            "algorithms": ["LLL Algorithm", "Gram-Schmidt Orthogonalization"],
            "formulas": ["SVP: ||v|| <= lambda_1(L)", "SIS: A*x = 0 (mod q), ||x|| <= beta"],
            "weight": 0.94,
            "reason": "Advanced security frontier based on NP-hard geometric lattice vector problems resistant to quantum computers."
        },
        {
            "name": "Learning With Errors (LWE) & NIST Standards",
            "category": "Post-Quantum",
            "patterns": [r"learning with errors", r"\blwe\b", r"ring[\s-]lwe", r"module[\s-]lwe", r"ml[\s-]kem", r"ml[\s-]dsa", r"kyber", r"dilithium"],
            "keywords": ["Learning With Errors (LWE)", "Search-LWE", "Decision-LWE", "Error Noise Vector", "Ring-LWE", "Module-LWE", "ML-KEM (FIPS 203)", "ML-DSA (FIPS 204)"],
            "algorithms": ["Regev's Cryptosystem", "ML-KEM", "ML-DSA"],
            "formulas": ["b = A*s + e (mod q)"],
            "weight": 0.96,
            "reason": "Core standard for post-quantum key encapsulation and digital signatures standardized by NIST."
        },
        {
            "name": "Quantum Threats & Algorithms",
            "category": "Quantum Foundations",
            "patterns": [r"shor['’]?s algorithm", r"grover['’]?s algorithm", r"quantum computer", r"quantum threat", r"discrete log", r"rsa vulnerability"],
            "keywords": ["Shor's Algorithm", "Grover's Algorithm", "Period Finding", "Quantum Speedup", "Symmetric Halving", "Public Key Vulnerability"],
            "algorithms": ["Shor's Algorithm", "Grover's Algorithm"],
            "formulas": [],
            "weight": 0.86,
            "reason": "Theoretical drivers explaining why integer factorization and discrete logarithms fail under quantum polynomial-time attacks."
        }
    ]

    def _clean_topic_name(self, name: str) -> str:
        clean = re.sub(r"^[0-9\.\-\:\s]+", "", name).strip()
        clean = re.sub(r"\s+", " ", clean)
        clean = clean.strip(".:;,-_ ")
        return clean.title() if len(clean) > 3 else clean

    def extract_topics_from_text(
        self,
        text: str,
        source_doc_id: Optional[int] = None,
        source_doc_name: str = "",
        page_number: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Extracts structured topics from text with de-duplication, explainable reasons,
        and links to source documents.
        """
        extracted_dict: Dict[str, Dict[str, Any]] = {}
        text_lower = text.lower()

        # 1. Match Domain Specs if patterns appear in text
        for spec in self.DOMAIN_SPECS:
            matches = sum(1 for p in spec["patterns"] if re.search(p, text_lower))
            if matches > 0:
                key = spec["name"].lower()
                extracted_dict[key] = {
                    "name": spec["name"],
                    "category": spec["category"],
                    "description": f"Focuses on {', '.join(spec['keywords'][:3])}. {spec['reason']}",
                    "syllabus_weight": spec["weight"],
                    "keywords": spec["keywords"],
                    "algorithms": spec["algorithms"],
                    "formulas": spec["formulas"],
                    "source_document_id": source_doc_id,
                    "source_page_number": page_number,
                    "importance_reason": spec["reason"]
                }

        # 2. Generic Academic Outline & Unit/Module Heading Extraction
        unit_pattern = r"(?:Unit|Module|Chapter)\s*([IVXLCDM\d]+)[:\.\-\s]+([^\n\r]+)"
        for unit_match in re.finditer(unit_pattern, text, re.IGNORECASE):
            unit_title = self._clean_topic_name(unit_match.group(2))
            if len(unit_title) >= 4 and unit_title.lower() not in self.GENERIC_STOP_WORDS:
                key = unit_title.lower()
                if key not in extracted_dict:
                    extracted_dict[key] = {
                        "name": unit_title,
                        "category": "Core Syllabus Unit",
                        "description": f"Primary curriculum unit identified from {source_doc_name or 'course material'}.",
                        "syllabus_weight": 0.88,
                        "keywords": [unit_title],
                        "algorithms": [],
                        "formulas": [],
                        "source_document_id": source_doc_id,
                        "source_page_number": page_number,
                        "importance_reason": "Identified as a major syllabus unit or module heading."
                    }

        # 3. Definition Patterns: "X is defined as ...", "X refers to ..."
        def_pattern = r"\b([A-Z][a-zA-Z0-9\s\-]{3,35})\s+(?:is defined as|refers to|can be described as|represents a|is an algorithm for)\s+([^\.\n]+)"
        for def_match in re.finditer(def_pattern, text):
            concept = self._clean_topic_name(def_match.group(1))
            definition_snippet = def_match.group(2).strip()
            if len(concept) >= 4 and concept.lower() not in self.GENERIC_STOP_WORDS:
                key = concept.lower()
                if key not in extracted_dict:
                    extracted_dict[key] = {
                        "name": concept,
                        "category": "Core Concept",
                        "description": f"{concept} {definition_snippet[:120]}...",
                        "syllabus_weight": 0.80,
                        "keywords": [concept],
                        "algorithms": [],
                        "formulas": [],
                        "source_document_id": source_doc_id,
                        "source_page_number": page_number,
                        "importance_reason": "Formally defined core concept in course material."
                    }

        # 4. Extract Explicit Algorithm & Model Mentions
        for algo in self.KNOWN_ALGORITHMS:
            if re.search(rf"\b{re.escape(algo)}\b", text, re.IGNORECASE):
                key = algo.lower()
                if key in extracted_dict:
                    if algo not in extracted_dict[key]["algorithms"]:
                        extracted_dict[key]["algorithms"].append(algo)
                else:
                    extracted_dict[key] = {
                        "name": algo,
                        "category": "Algorithms & Protocols",
                        "description": f"Standard academic algorithm or protocol covered in {source_doc_name or 'lecture notes'}.",
                        "syllabus_weight": 0.85,
                        "keywords": [algo],
                        "algorithms": [algo],
                        "formulas": [],
                        "source_document_id": source_doc_id,
                        "source_page_number": page_number,
                        "importance_reason": "Key algorithmic procedure frequently assessed in technical problems."
                    }

        # 5. Extract Formulas and Associate with Matching Topics
        for formula in self.KNOWN_FORMULAS:
            if formula.lower() in text_lower:
                for topic_data in extracted_dict.values():
                    if formula not in topic_data["formulas"]:
                        topic_data["formulas"].append(formula)

        return list(extracted_dict.values())

topic_extractor = TopicExtractor()
