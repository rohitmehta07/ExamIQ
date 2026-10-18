import re
from typing import List, Dict, Any

class QuestionExtractor:
    """
    Extracts structured examination questions from raw academic document text.
    Identifies question indices, question text, mark allocations, and subparts.
    """

    def extract_questions(self, text: str, source_doc_name: str = "Examination Paper", page_number: int = 1) -> List[Dict[str, Any]]:
        questions = []

        # Extract academic year from header text or filename
        academic_year = 2025
        year_match = re.search(r"\b(20[12]\d)\b", source_doc_name + " " + text[:1000])
        if year_match:
            try:
                academic_year = int(year_match.group(1))
            except ValueError:
                academic_year = 2025
        
        # Regex pattern matching questions: Question 1:, Que 1:, Q1:, etc.
        # Handles lines like: "Question 1: Differentiate between active and passive attacks... [2.5+2.5 Marks]"
        pattern = r"(?:Question|Que\.?|Q)\s*(\d+)[:.]?\s*(.*?)(?=(?:(?:Question|Que\.?|Q)\s*\d+[:.]?)|$)"
        matches = re.findall(pattern, text, flags=re.DOTALL | re.IGNORECASE)

        for q_num, q_body in matches:
            clean_body = " ".join(q_body.split()).strip()
            if len(clean_body) < 15:
                continue

            # Extract marks: e.g. [2.5+2.5 Marks], [5 Marks], [3 +2 Marks], [10M]
            marks = 5.0  # default
            marks_match = re.search(r"\[([\d\.\s\+]+)\s*(?:Marks?|M)\]", clean_body, flags=re.IGNORECASE)
            if marks_match:
                expr = marks_match.group(1).replace(" ", "")
                try:
                    if "+" in expr:
                        marks = sum(float(part) for part in expr.split("+") if part)
                    else:
                        marks = float(expr)
                except ValueError:
                    marks = 5.0

            # Requirements detection
            requires_diagram = bool(re.search(r"\b(diagram|illustrate|draw|figure|sketch)\b", clean_body, re.I))
            requires_calc = bool(re.search(r"\b(calculate|compute|solve|demonstrate with steps|matrix|mod\b|gcd)\b", clean_body, re.I))
            requires_algo = bool(re.search(r"\b(algorithm|cipher|encrypt|decrypt|steps|procedure|round)\b", clean_body, re.I))

            questions.append({
                "question_number": str(q_num),
                "text": clean_body,
                "marks": round(marks, 1),
                "requires_diagram": requires_diagram,
                "requires_calculation": requires_calc,
                "requires_algorithm": requires_algo,
                "source_name": source_doc_name,
                "academic_year": academic_year,
                "page_number": page_number
            })

        return questions

    def extract_questions_from_pages(self, pages: List[Dict[str, Any]], source_doc_name: str = "Examination Paper") -> List[Dict[str, Any]]:
        all_questions = []
        seen_q_nums = set()

        for page in pages:
            p_num = page.get("page_number", 1)
            p_text = page.get("text", "")
            if not p_text.strip():
                continue
            qs = self.extract_questions(p_text, source_doc_name=source_doc_name, page_number=p_num)
            for q in qs:
                # Deduplicate if question headers repeat
                q_key = (q["question_number"], q["text"][:30])
                if q_key not in seen_q_nums:
                    seen_q_nums.add(q_key)
                    all_questions.append(q)

        # Fallback to full text if nothing found per page
        if not all_questions and pages:
            full_txt = "\n".join([p.get("text", "") for p in pages])
            all_questions = self.extract_questions(full_txt, source_doc_name=source_doc_name, page_number=1)

        return all_questions


question_extractor = QuestionExtractor()
