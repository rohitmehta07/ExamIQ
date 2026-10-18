import re
from typing import Dict, Any, List, Optional
from app.ml.answer_strategy_engine import answer_strategy_engine

class AnswerEvaluator:
    """
    Evaluates student written answers against academic requirements and subject-specific evidence.
    Provides explainable scoring, keywords matched, missing concepts,
    presentation feedback, and explicit non-prescriptive disclaimers.
    """

    def evaluate_answer(
        self,
        question_text: str,
        student_text: str,
        marks: float = 5.0,
        expected_keywords: Optional[List[str]] = None,
        subject_id: Optional[int] = None,
        subject_name: Optional[str] = None,
        subject_code: Optional[str] = None,
        retrieved_chunks: Optional[List[Dict[str, Any]]] = None,
        marking_rubric: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        citations = []
        if retrieved_chunks:
            for c in retrieved_chunks:
                doc_name = c.get("document_name") or "Subject Material"
                page = c.get("page_number", 1)
                snippet = (c.get("content") or "").strip()
                if len(snippet) > 220:
                    snippet = snippet[:220] + "..."
                citations.append({
                    "document_id": c.get("document_id", 0),
                    "document_name": doc_name,
                    "page_number": page,
                    "doc_category": c.get("doc_category") or "LECTURE_NOTES",
                    "snippet": snippet
                })

        if not expected_keywords:
            strat = answer_strategy_engine.generate_strategy(
                question_text=question_text,
                marks=marks,
                subject_id=subject_id,
                subject_code=subject_code,
                subject_name=subject_name,
                retrieved_chunks=retrieved_chunks,
                marking_rubric=marking_rubric
            )
            expected_keywords = strat["key_terms"]
            missing_evidence = strat.get("missing_evidence")
        else:
            missing_evidence = None if citations else (f"No direct lecture notes or citations retrieved in {subject_name or 'this subject'}." if subject_name else None)

        answer_clean = " ".join(student_text.split())
        answer_lower = answer_clean.lower()

        # Check present vs missing keywords
        present_terms = []
        missing_terms = []

        for kw in (expected_keywords or []):
            escaped = re.escape(kw.lower())
            if re.search(rf"\b{escaped}\b", answer_lower):
                present_terms.append(kw)
            else:
                missing_terms.append(kw)

        coverage_ratio = len(present_terms) / max(1, len(expected_keywords or []))

        # Check structural elements
        has_headings = bool(re.search(r"(^\d+\.|\bstep\s*\d+|\bdefinition\b|\bmechanism\b|\bworkflow\b|\bconclusion\b|\bexample\b)", answer_lower, re.M))
        has_formulas = bool(re.search(r"(=|mod\b|\+|det\(|gf\(|\b(matrix|xor|⊕|o\(log|complexity)\b)", answer_lower))
        word_count = len(answer_clean.split())

        # Structure rating
        if has_headings and word_count >= 80:
            structure_rating = "EXCELLENT"
            struct_score = 1.0
        elif has_headings or word_count >= 60:
            structure_rating = "GOOD"
            struct_score = 0.85
        elif word_count >= 30:
            structure_rating = "ADEQUATE"
            struct_score = 0.65
        else:
            structure_rating = "NEEDS_IMPROVEMENT"
            struct_score = 0.40

        # Calculate Content Score
        raw_score = (0.60 * coverage_ratio + 0.40 * struct_score) * marks
        content_score = round(max(1.0 if word_count > 15 else 0.5, min(marks, raw_score)), 1)

        # Presentation & Missing Elements Feedback
        missing_concepts = []
        improvements = []

        if missing_terms:
            missing_concepts.extend(missing_terms[:3])
            improvements.append(f"Incorporate missing core terminology from {subject_code or 'course'}: {', '.join(missing_terms[:3])}.")

        if not has_formulas and any(w in question_text.lower() for w in ["calculate", "mod", "cipher", "step", "complexity", "formula", "algorithm"]):
            improvements.append("Include explicit equations, mathematical relationships, or algorithm steps.")

        if not has_headings:
            improvements.append("Organize your answer into numbered sections (e.g. 1. Definition, 2. Mechanism, 3. Analysis / Justification).")

        presentation_feedback = (
            f"Answer length: {word_count} words. Terminology recall: {len(present_terms)}/{len(expected_keywords or [])} keywords. "
            f"Structural formatting: {structure_rating}."
        )

        rubric_alignment = "Verified University Marking Scheme" if marking_rubric else "Standard University Examination Rubric"

        return {
            "content_score": content_score,
            "max_score": marks,
            "structure_rating": structure_rating,
            "key_terms_present": present_terms,
            "key_terms_missing": missing_terms,
            "coverage_percentage": round(coverage_ratio * 100, 1),
            "missing_concepts": missing_concepts,
            "presentation_feedback": presentation_feedback,
            "rubric_alignment": rubric_alignment,
            "actionable_improvements": improvements if improvements else ["Strong academic response covering essential subject criteria!"],
            "disclaimer": "Academic Guidance Notice: Guidance and evaluation are generated to support your preparation based on retrieved subject materials. ExamIQ does not guarantee specific examiner marks or examination scores.",
            "subject_id": subject_id,
            "subject_name": subject_name or subject_code,
            "citations": citations,
            "missing_evidence": missing_evidence
        }

answer_evaluator = AnswerEvaluator()
