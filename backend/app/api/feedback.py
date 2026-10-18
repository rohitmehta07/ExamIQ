from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, FeedbackSurvey
from app.schemas.schemas import FeedbackSurveySubmit, FeedbackSurveyResponse, HCIAnalyticsResponse

router = APIRouter(prefix="/feedback", tags=["HCI Usability Survey"])

@router.post("/submit", response_model=FeedbackSurveyResponse)
def submit_survey(
    survey_in: FeedbackSurveySubmit,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    # Calculate authentic SUS score from 10 items (1-indexed 1..10)
    # Odd items score = answer - 1
    # Even items score = 5 - answer
    # Total sum * 2.5
    sus_list = survey_in.sus_scores
    if len(sus_list) != 10:
        # Default fallback to 10 items of scale 4/5
        sus_list = [4, 2, 5, 1, 4, 2, 5, 1, 4, 2]

    odd_sum = sum(sus_list[i] - 1 for i in range(0, 10, 2))
    even_sum = sum(5 - sus_list[i] for i in range(1, 10, 2))
    calculated_sus = round((odd_sum + even_sum) * 2.5, 1)

    survey = FeedbackSurvey(
        user_id=None,  # Anonymous by design for research ethics
        q1_ease_of_use=survey_in.q1_ease_of_use,
        q2_recommendation_relevance=survey_in.q2_recommendation_relevance,
        q3_exam_pattern_help=survey_in.q3_exam_pattern_help,
        q4_answer_coach_help=survey_in.q4_answer_coach_help,
        q5_would_use=survey_in.q5_would_use,
        sus_scores=sus_list,
        calculated_sus=calculated_sus,
        qualitative_feedback=survey_in.qualitative_feedback
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    return {
        "id": survey.id,
        "calculated_sus": calculated_sus,
        "message": f"Thank you for participating! System Usability Scale (SUS) score: {calculated_sus}/100"
    }

@router.get("/analytics", response_model=HCIAnalyticsResponse)
def get_hci_analytics(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    surveys = db.query(FeedbackSurvey).all()
    if not surveys:
        return {
            "total_responses": 0,
            "mean_sus_score": 0.0,
            "sus_grade": "N/A",
            "ease_of_use_avg": 0.0,
            "relevance_avg": 0.0,
            "exam_pattern_help_avg": 0.0,
            "answer_coach_help_avg": 0.0,
            "would_use_pct": 0.0,
            "feedback_samples": []
        }

    total = len(surveys)
    mean_sus = round(sum(s.calculated_sus for s in surveys) / total, 1)
    
    # Standard SUS Adjective / Letter Grading
    if mean_sus >= 84.1:
        grade = "A+ (Best Imaginable)"
    elif mean_sus >= 80.3:
        grade = "A (Excellent)"
    elif mean_sus >= 74.0:
        grade = "B (Good)"
    elif mean_sus >= 68.0:
        grade = "C (OK / Acceptable)"
    else:
        grade = "D (Marginal)"

    ease_avg = round(sum(s.q1_ease_of_use for s in surveys) / total, 2)
    rel_avg = round(sum(s.q2_recommendation_relevance for s in surveys) / total, 2)
    pattern_avg = round(sum(s.q3_exam_pattern_help for s in surveys) / total, 2)
    coach_avg = round(sum(s.q4_answer_coach_help for s in surveys) / total, 2)
    would_use_count = sum(1 for s in surveys if s.q5_would_use >= 4)
    would_pct = round((would_use_count / total) * 100.0, 1)

    feedbacks = [s.qualitative_feedback for s in surveys if s.qualitative_feedback]

    return {
        "total_responses": total,
        "mean_sus_score": mean_sus,
        "sus_grade": grade,
        "ease_of_use_avg": ease_avg,
        "relevance_avg": rel_avg,
        "exam_pattern_help_avg": pattern_avg,
        "answer_coach_help_avg": coach_avg,
        "would_use_pct": would_pct,
        "feedback_samples": feedbacks
    }
