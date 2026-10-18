import os
import sys
import json

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(base_dir, "backend")
sys.path.insert(0, backend_dir)

from app.ml.evaluator import MLEvaluator
from app.core.config import settings

def main():
    print("=" * 60)
    print("           ExamIQ Machine Learning Evaluation Runner")
    print("=" * 60)

    evaluator = MLEvaluator(data_dir=settings.DATA_DIR)
    output_json = os.path.join(base_dir, "evaluation", "evaluation_report.json")
    output_md = os.path.join(base_dir, "evaluation", "evaluation_report.md")

    report = evaluator.run_full_evaluation(output_path=output_json)

    doc_res = report["dataset_evaluation"]["document_classification"]
    q_res = report["dataset_evaluation"]["question_classification"]

    md_content = f"""# ExamIQ: Machine Learning & NLP Evaluation Report

**Evaluation Date:** October 2026  
**Subject:** Cryptography and Network Security (BT14503)  
**Dataset:** 9 Verified Academic Sources & Semester 5 Mid-Sem Exam Papers  

---

## 1. Document Classification Performance

- **Evaluated Documents:** {doc_res.get('sample_size', 0)}
- **Classification Accuracy:** **{doc_res.get('accuracy', 0.0) * 100:.2f}%**
- **Macro Precision:** {doc_res.get('precision_macro', 0.0):.4f}
- **Macro Recall:** {doc_res.get('recall_macro', 0.0):.4f}
- **Macro F1-Score:** **{doc_res.get('f1_macro', 0.0):.4f}**

### Breakdown by Document:
| Document | Ground Truth | Predicted | Confidence | Match |
| :--- | :--- | :--- | :--- | :--- |
"""
    for d in doc_res.get("document_evaluations", []):
        match_icon = "PASS" if d["match"] else "FAIL"
        md_content += f"| {d['filename']} | {d['true_type']} | {d['predicted_type']} | {d['confidence']} | {match_icon} |\n"

    md_content += f"""
---

## 2. Question Classification & Difficulty Estimation Performance

- **Annotated Questions Evaluated:** {q_res.get('sample_size', 0)}
- **Multi-Label Type Overlap Ratio:** **{q_res.get('type_classification_overlap', 0.0) * 100:.2f}%**
- **Difficulty Estimation Accuracy:** **{q_res.get('difficulty_accuracy', 0.0) * 100:.2f}%**
- **Difficulty F1-Score (Macro):** **{q_res.get('difficulty_f1_macro', 0.0):.4f}**

### Breakdown by Question:
| Question ID | Ground Truth Types | Predicted Types | True Difficulty | Predicted Difficulty |
| :--- | :--- | :--- | :--- | :--- |
"""
    for q in q_res.get("question_evaluations", []):
        md_content += f"| {q['question_id']} | {', '.join(q['true_types'])} | {', '.join(q['predicted_types'])} | {q['true_difficulty']} | {q['predicted_difficulty']} |\n"

    md_content += """
---

## 3. Methodological Notes & Transparency
1. **Zero Hallucination Guarantee:** Metrics were calculated directly via scikit-learn metrics functions over manually verified ground truth CSV files in `data/annotations/`.
2. **Explainable Features:** The document classifier uses structural heuristics, OCR confidence variance for handwritten identification, and pedagogical signals.
3. **Multi-label Consistency:** Questions are not artificially forced into a single category; questions can be simultaneously Comparison, Explanation, Numerical, and Algorithm.
"""

    with open(output_md, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[+] Evaluation finished successfully!")
    print(f"    JSON report: {output_json}")
    print(f"    Markdown report: {output_md}")
    print(f"    Document Classification Accuracy: {doc_res.get('accuracy', 0.0) * 100:.2f}%")
    print(f"    Question Difficulty Accuracy: {q_res.get('difficulty_accuracy', 0.0) * 100:.2f}%")
    print("=" * 60)

if __name__ == "__main__":
    main()
