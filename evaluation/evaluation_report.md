# ExamIQ: Machine Learning & NLP Evaluation Report

**Evaluation Date:** October 2026  
**Subject:** Cryptography and Network Security (BT14503)  
**Dataset:** 9 Verified Academic Sources & Semester 5 Mid-Sem Exam Papers  

---

## 1. Document Classification Performance

- **Evaluated Documents:** 9
- **Classification Accuracy:** **66.67%**
- **Macro Precision:** 0.4062
- **Macro Recall:** 0.5000
- **Macro F1-Score:** **0.4423**

### Breakdown by Document:
| Document | Ground Truth | Predicted | Confidence | Match |
| :--- | :--- | :--- | :--- | :--- |
| AES_1 (1).pdf | LECTURE_NOTES | LECTURE_NOTES | 0.92 | PASS |
| Cryptography and Network Security_1 (1).pdf | LECTURE_NOTES | LECTURE_NOTES | 0.92 | PASS |
| Cryptography and Network Security_2 (1).pdf | LECTURE_NOTES | LECTURE_NOTES | 0.92 | PASS |
| Data Encryption Standard (2).pdf | LECTURE_NOTES | LECTURE_NOTES | 0.92 | PASS |
| Modern Symmetric-Key Ciphers (1).pdf | LECTURE_NOTES | LECTURE_NOTES | 0.92 | PASS |
| PQC_1.pdf | HANDWRITTEN_NOTES | HANDWRITTEN_NOTES | 0.89 | PASS |
| PQC_Lattices_1.pdf | REFERENCE | LECTURE_NOTES | 0.92 | FAIL |
| PQC_Lattices_2.pdf | REFERENCE | LECTURE_NOTES | 0.92 | FAIL |
| Semester 5 Mid Sem.pdf | QUESTION_PAPER | LECTURE_NOTES | 0.75 | FAIL |

---

## 2. Question Classification & Difficulty Estimation Performance

- **Annotated Questions Evaluated:** 12
- **Multi-Label Type Overlap Ratio:** **66.67%**
- **Difficulty Estimation Accuracy:** **58.33%**
- **Difficulty F1-Score (Macro):** **0.3862**

### Breakdown by Question:
| Question ID | Ground Truth Types | Predicted Types | True Difficulty | Predicted Difficulty |
| :--- | :--- | :--- | :--- | :--- |
| CNS-2025-MS-Q1 | Comparison, Explanation | Comparison, Attack Analysis | MEDIUM | MEDIUM |
| CNS-2025-MS-Q2 | Explanation, Diagram | Diagram | EASY | MEDIUM |
| CNS-2025-MS-Q3 | Explanation, Application | Explanation | MEDIUM | MEDIUM |
| CNS-2025-MS-Q4 | Numerical, Algorithm | Numerical, Algorithm | HARD | HARD |
| CNS-2025-MS-Q5 | Attack Analysis, Explanation, Numerical | Algorithm, Attack Analysis, Explanation | MEDIUM | HARD |
| CNS-2025-MS-Q6 | Numerical, Explanation | Numerical, Algorithm, Explanation | HARD | HARD |
| CNS-2024-ES-Q1 | Explanation, Diagram, Algorithm | Algorithm, Diagram, Explanation | MEDIUM | HARD |
| CNS-2024-ES-Q2 | Explanation, Algorithm | Algorithm, Explanation, Long Answer | MEDIUM | HARD |
| CNS-2024-ES-Q3 | Definition, Explanation, Comparison | Comparison, Explanation | HARD | HARD |
| CNS-2024-ES-Q4 | Comparison, Explanation | Comparison, Algorithm | MEDIUM | HARD |
| CNS-2024-ES-Q5 | Explanation, Algorithm | Algorithm, Explanation | HARD | HARD |
| CNS-2024-ES-Q6 | Explanation, Comparison, Algorithm | Explanation, Long Answer | HARD | HARD |

---

## 3. Methodological Notes & Transparency
1. **Zero Hallucination Guarantee:** Metrics were calculated directly via scikit-learn metrics functions over manually verified ground truth CSV files in `data/annotations/`.
2. **Explainable Features:** The document classifier uses structural heuristics, OCR confidence variance for handwritten identification, and pedagogical signals.
3. **Multi-label Consistency:** Questions are not artificially forced into a single category; questions can be simultaneously Comparison, Explanation, Numerical, and Algorithm.
