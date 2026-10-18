from app.ml.document_classifier import document_classifier
from app.ml.question_classifier import question_classifier
from app.ml.priority_engine import priority_engine
from app.ml.vector_store import vector_store

def test_document_classification():
    # Test exam paper detection
    res1 = document_classifier.classify(
        filename="Semester 5 Mid Sem.pdf",
        full_text="Indian Institute of Information Technology, Pune Mid-Term Examination (BT14503) CRYPTOGRAPHY Max. Marks: 30 Question 1: Differentiate between active and passive attacks [5 Marks]",
        is_handwritten=False,
        ocr_used=True,
        mean_ocr_conf=0.94
    )
    assert res1["document_type"] == "QUESTION_PAPER"
    assert res1["confidence"] >= 0.90

    # Test handwritten detection
    res2 = document_classifier.classify(
        filename="PQC_1.pdf",
        full_text="Handwritten scribbles on quantum key generation",
        is_handwritten=True,
        ocr_used=True,
        mean_ocr_conf=0.65
    )
    assert res2["document_type"] == "HANDWRITTEN_NOTES"

def test_question_classifier_multilabel():
    text = "Differentiate between active and passive attacks with suitable examples. [5 Marks]"
    labels, diff, conf = question_classifier.classify_question(text, 5.0)
    assert "Comparison" in labels
    assert diff in ["EASY", "MEDIUM", "HARD"]
    assert conf > 0.70

def test_priority_engine():
    res = priority_engine.calculate_priority(
        historical_freq=4,
        max_possible_freq=5,
        avg_marks=6.5,
        last_observed_year=2025,
        syllabus_weight=0.95,
        question_types_count=3,
        is_weak_topic=True
    )
    assert res["priority_level"] == "HIGH"
    assert res["composite_score"] > 0.75
    assert "breakdown" in res
