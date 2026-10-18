import re
from typing import List, Dict, Any, Tuple

class QuestionClassifier:
    """
    Multi-label question classifier and estimated difficulty engine.
    Never forces single label: questions can be Comparison + Explanation,
    or Numerical + Algorithm simultaneously.
    """

    QUESTION_TYPES = [
        "Definition",
        "Explanation",
        "Comparison",
        "Numerical",
        "Algorithm",
        "Diagram",
        "Application",
        "Case Study",
        "Attack Analysis",
        "Short Answer",
        "Long Answer"
    ]

    def classify_question(self, text: str, marks: float) -> Tuple[List[str], str, float]:
        """
        Returns:
            (labels: List[str], estimated_difficulty: str, confidence: float)
        """
        text_lower = text.lower()
        labels = []

        # Comparison
        if re.search(r"\b(differentiate|distinguish|compare|versus|vs\.?|difference between)\b", text_lower):
            labels.append("Comparison")

        # Definition
        if re.search(r"\b(define|what is|meaning of|state|term)\b", text_lower) and marks <= 3.0:
            labels.append("Definition")

        # Numerical
        if re.search(r"\b(calculate|compute|solve|find the equation|mod\b|gcd|matrix|points?|data)\b", text_lower):
            labels.append("Numerical")

        # Algorithm
        if re.search(r"\b(algorithm|encrypt|decrypt|steps?|demonstrate with steps|procedure|s-box|round)\b", text_lower):
            labels.append("Algorithm")

        # Diagram
        if re.search(r"\b(illustrate|diagram|draw|schematic|architecture|flowchart)\b", text_lower):
            labels.append("Diagram")

        # Attack Analysis
        if re.search(r"\b(attack|vulnerability|adversary|break the security|threat|exploit|passive attack|active attack)\b", text_lower):
            labels.append("Attack Analysis")

        # Application / Case Study
        if re.search(r"\b(given scenario|design|case study|real-world|application|redesign)\b", text_lower):
            labels.append("Application")

        # Explanation (default if explaining or discussing)
        if re.search(r"\b(explain|examine|discuss|elaborate|describe|justify|significance|why)\b", text_lower) or not labels:
            labels.append("Explanation")

        # Length categorization
        if marks >= 7.0:
            labels.append("Long Answer")
        elif marks <= 3.0:
            labels.append("Short Answer")

        # Remove duplicates while preserving order
        unique_labels = list(dict.fromkeys(labels))

        # Difficulty Estimation:
        # Heuristic based on marks, cognitive depth keywords (Bloom's taxonomy), and multiple requirements
        difficulty_score = 0.0
        
        # Marks contribution
        if marks <= 3.0:
            difficulty_score += 0.2
        elif marks <= 5.5:
            difficulty_score += 0.55
        else:
            difficulty_score += 0.85

        # Cognitive complexity keywords
        if any(w in text_lower for w in ["derive", "calculate", "prove", "matrix", "irreducible", "basis reduction", "quantum", "hardness"]):
            difficulty_score += 0.3
        elif any(w in text_lower for w in ["differentiate", "examine", "attack strategy", "weakness"]):
            difficulty_score += 0.15
        
        # Multi-label complexity
        if len(unique_labels) >= 3:
            difficulty_score += 0.15

        if difficulty_score < 0.45:
            estimated_diff = "EASY"
            confidence = 0.86
        elif difficulty_score < 0.78:
            estimated_diff = "MEDIUM"
            confidence = 0.89
        else:
            estimated_diff = "HARD"
            confidence = 0.87

        return unique_labels, estimated_diff, round(confidence, 2)

question_classifier = QuestionClassifier()
