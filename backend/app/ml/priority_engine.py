from typing import Dict, Any, List
from app.core.config import settings

class TopicPriorityEngine:
    """
    Topic Preparation Priority Ranking Engine.
    Combines:
    1. Historical Question Frequency
    2. Marks Importance (weight of marks associated)
    3. Recency (recent papers appearance)
    4. Syllabus Weight (curriculum core prominence)
    5. Question Variety (comparison, numerical, theory varieties)
    6. Student Weakness (personalized student performance gap)
    """

    def calculate_priority(
        self,
        historical_freq: int,
        max_possible_freq: int,
        avg_marks: float,
        last_observed_year: int,
        syllabus_weight: float,
        question_types_count: int,
        student_score: float = None,  # 0 to 10 scale
        is_weak_topic: bool = False
    ) -> Dict[str, Any]:
        # 1. Frequency Score (0.0 to 1.0)
        denom_freq = max(1, max_possible_freq)
        freq_score = min(1.0, historical_freq / denom_freq)

        # 2. Marks Importance (0.0 to 1.0, benchmark 10 marks max per question)
        marks_score = min(1.0, avg_marks / 8.0)

        # 3. Recency Score (higher if appeared in 2024 or 2025)
        current_year = 2026
        year_diff = max(0, current_year - last_observed_year)
        recency_score = max(0.2, 1.0 - (year_diff * 0.25))

        # 4. Syllabus Relevance (0.0 to 1.0)
        syllabus_score = min(1.0, max(0.1, syllabus_weight))

        # 5. Question Variety (0.0 to 1.0)
        variety_score = min(1.0, question_types_count / 3.0)

        # 6. Student Weakness Score
        if student_score is not None:
            # lower student score = higher preparation priority need
            weakness_score = max(0.0, min(1.0, 1.0 - (student_score / 10.0)))
        elif is_weak_topic:
            weakness_score = 0.90
        else:
            weakness_score = 0.50

        # Weighted Sum
        w_f = settings.WEIGHT_FREQUENCY
        w_m = settings.WEIGHT_MARKS
        w_r = settings.WEIGHT_RECENCY
        w_s = settings.WEIGHT_SYLLABUS
        w_v = settings.WEIGHT_VARIETY
        w_w = settings.WEIGHT_STUDENT_WEAKNESS

        composite_score = (
            w_f * freq_score +
            w_m * marks_score +
            w_r * recency_score +
            w_s * syllabus_score +
            w_v * variety_score +
            w_w * weakness_score
        )

        composite_score = round(min(1.0, max(0.1, composite_score)), 3)

        # Priority Level
        if composite_score >= 0.72:
            priority_level = "HIGH"
            recommended_mins = 75
        elif composite_score >= 0.48:
            priority_level = "MEDIUM"
            recommended_mins = 45
        else:
            priority_level = "LOW"
            recommended_mins = 30

        # Explainable Rationale
        reasons = []
        if historical_freq > 0:
            reasons.append(f"Appeared {historical_freq} time(s) in available exam papers")
        if avg_marks >= 5.0:
            reasons.append(f"Carries high average weight ({avg_marks:.1f} Marks)")
        if syllabus_score >= 0.8:
            reasons.append("High curriculum syllabus weight")
        if weakness_score > 0.6:
            reasons.append("Identified as student focus/weakness area")

        rationale_text = "; ".join(reasons) if reasons else "Standard curriculum coverage recommendation."

        return {
            "priority_level": priority_level,
            "composite_score": composite_score,
            "recommended_study_minutes": recommended_mins,
            "rationale": rationale_text,
            "breakdown": {
                "historical_frequency": round(freq_score, 2),
                "marks_importance": round(marks_score, 2),
                "recency": round(recency_score, 2),
                "syllabus_relevance": round(syllabus_score, 2),
                "question_variety": round(variety_score, 2),
                "student_weakness": round(weakness_score, 2),
            }
        }

priority_engine = TopicPriorityEngine()
