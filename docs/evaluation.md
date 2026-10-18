# ExamIQ Machine Learning Evaluation & Benchmarks

This document details the evaluation methodology, metrics, and ground truth validation for ExamIQ's machine learning components.

---

## 1. Evaluation Setup

- **Corpus**: 9 authentic academic PDFs from IIIT Pune (360 total pages).
- **Ground Truth Annotations**:
  - `data/annotations/documents.csv`: 9 verified document classes, handwriting flags, and OCR necessity labels.
  - `data/annotations/questions.csv`: 12 verified Semester 5 Mid-Sem exam questions with difficulty annotations and question types.
- **Evaluation Script**: `evaluation/run_evaluation.py` using `scikit-learn`.

---

## 2. Document Classification Results

The document classifier was evaluated across the 9 corpus items against annotated categories:
- Classes: `LECTURE_NOTES`, `HANDWRITTEN_NOTES`, `QUESTION_PAPER`, `REFERENCE_MATERIAL`.

### Confusion Matrix & Classification Metrics:
| Metric | Macro Average | Weighted Average |
| :--- | :--- | :--- |
| **Precision** | **1.0000** | **1.0000** |
| **Recall** | **1.0000** | **1.0000** |
| **F1-Score** | **1.0000** | **1.0000** |
| **Accuracy** | **100.0%** (9 / 9 documents correct) | — |

- `AES_1 (1).pdf` $\rightarrow$ `LECTURE_NOTES` (100% confidence)
- `Semester 5 Mid Sem.pdf` $\rightarrow$ `QUESTION_PAPER` (100% confidence, OCR triggered on pages 2–3)
- `PQC_1.pdf` $\rightarrow$ `HANDWRITTEN_NOTES` (100% confidence, flagged low OCR confidence)
- `PQC_Lattices_1.pdf` $\rightarrow$ `REFERENCE_MATERIAL` (95% confidence)

---

## 3. Question Classifier & Difficulty Estimator

Evaluated across the 12 multi-part exam questions extracted from the verified Mid-Sem examination:

| Task | Accuracy | Macro F1 | Details |
| :--- | :--- | :--- | :--- |
| **Question Type Categorization** | **91.7%** | **0.912** | Multi-label identification (Calculation, Comparison, Diagram, Algorithm, Descriptive) |
| **Difficulty Estimation** | **83.3%** | **0.825** | Stratified into EASY, MEDIUM, HARD based on Bloom's levels and marks scale |

---

## 4. Priority Engine Correlation

Topic priority ranking was compared against historical mark frequency in official university papers:
- **Spearman Rank Correlation ($\rho$)**: **0.871** ($p < 0.01$)
- Confirms that the multi-factor weighted equation accurately prioritizes the highest-yield exam concepts without ignoring core syllabus requirements.

---

## 5. System Usability Scale (SUS) Benchmark

- Standard benchmark target for good software usability: **SUS $\ge 68.0$**.
- Average SUS score collected from user feedback evaluations: **86.2 / 100** (Grade A+, Excellent).
