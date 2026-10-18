from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# Auth Schemas
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "STUDENT"

class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True

# Student Profile Schemas
class StudentProfileUpdate(BaseModel):
    subject_id: Optional[int] = None
    target_marks: Optional[float] = None
    available_hours_per_day: Optional[float] = None
    exam_date: Optional[str] = None
    completed_topics: Optional[List[str]] = None
    weak_topics: Optional[List[str]] = None
    strong_topics: Optional[List[str]] = None
    previous_marks: Optional[float] = None

class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    subject_id: Optional[int] = None
    target_marks: Optional[float] = 85.0
    available_hours_per_day: Optional[float] = 3.0
    exam_date: Optional[str] = None
    completed_topics: List[str] = []
    weak_topics: List[str] = []
    strong_topics: List[str] = []
    previous_marks: Optional[float] = 0.0
    overall_readiness: Optional[float] = 0.0

    class Config:
        from_attributes = True

class StudentPerformanceCreate(BaseModel):
    topic_id: int
    score: float
    max_score: float = 10.0
    confidence_level: Optional[str] = "MEDIUM"
    notes: Optional[str] = None

class StudentPerformanceResponse(BaseModel):
    id: int
    topic_id: int
    topic_name: Optional[str] = None
    score: float
    max_score: float
    confidence_level: str
    notes: Optional[str]

    class Config:
        from_attributes = True

# Subject Schemas
class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    semester: Optional[str] = None
    exam_date: Optional[str] = None
    target_marks: Optional[float] = 85.0
    study_hours_per_day: Optional[float] = 3.0
    description: Optional[str] = None
    syllabus_text: Optional[str] = None

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    semester: Optional[str] = None
    exam_date: Optional[str] = None
    target_marks: Optional[float] = None
    study_hours_per_day: Optional[float] = None
    description: Optional[str] = None
    syllabus_text: Optional[str] = None

class SubjectResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    syllabus_text: Optional[str] = None
    semester: Optional[str] = None
    exam_date: Optional[str] = None
    target_marks: Optional[float] = None
    study_hours_per_day: Optional[float] = None
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True

class SubjectProgressResponse(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: Optional[str] = None
    semester: Optional[str] = None
    exam_date: Optional[str] = None
    days_remaining: Optional[int] = None
    target_marks: Optional[float] = None
    study_hours_per_day: Optional[float] = None
    preparation_progress: Optional[float] = None
    task_completion_percentage: Optional[float] = None
    progress_status: str
    tasks_completed: int
    tasks_pending: int = 0
    tasks_total: int
    documents_count: int
    notes_documents_count: int = 0
    pyq_documents_count: int = 0
    syllabus_documents_count: int = 0
    topics_count: int
    extracted_topics_count: int = 0
    topics_completed: int
    important_topics_count: int = 0
    high_priority_topics_count: int = 0
    manually_marked_topics_count: int = 0
    questions_count: int = 0
    pyq_questions_count: int = 0
    generated_questions_count: int = 0
    exam_urgency: Optional[str] = None
    next_recommended_action: Optional[str] = None
    formula_info: Optional[Dict[str, Any]] = None

class SubjectOverviewSummary(BaseModel):
    total_subjects: int
    upcoming_exams: int
    completed_tasks: int
    overall_progress: Optional[float] = None

class SubjectOverviewResponse(BaseModel):
    summary: SubjectOverviewSummary
    subjects: List[SubjectProgressResponse]

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    subject_id: int
    filename: str
    file_type: str
    doc_category: str
    page_count: int
    status: str
    indexing_status: Optional[str] = "INDEXED"
    classification_confidence: float
    classification_method: str
    ocr_used: bool
    ocr_confidence: float
    is_handwritten: bool
    created_at: Any

    class Config:
        from_attributes = True

# Semantic Search Schemas
class SearchResultItem(BaseModel):
    document_id: int
    document_name: str
    page_number: int
    snippet: str
    similarity_score: float
    relevance_label: str  # Highly Relevant, Relevant, Contextual
    doc_category: str
    topic: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    matched_terms: Optional[List[str]] = []
    search_mode: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    search_mode: Optional[str] = "HYBRID"
    total_results: int
    results: List[SearchResultItem]

# Topic & Priority Schemas
class TopicCreate(BaseModel):
    subject_id: int
    name: str
    category: Optional[str] = "Core Concept"
    description: Optional[str] = None
    is_manually_marked: Optional[bool] = False
    personal_notes: Optional[str] = None
    syllabus_weight: Optional[float] = 0.8

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_manually_marked: Optional[bool] = None
    personal_notes: Optional[str] = None
    preparation_priority: Optional[str] = None

class TopicMarkImportant(BaseModel):
    is_manually_marked: bool
    personal_notes: Optional[str] = None

class TopicResponse(BaseModel):
    id: int
    subject_id: int
    name: str
    category: str
    description: Optional[str]
    syllabus_weight: float
    historical_frequency: int
    avg_marks: float
    preparation_priority: str
    priority_score: float
    priority_breakdown: Dict[str, Any]
    keywords: List[str]
    algorithms: List[str]
    formulas: List[str]
    recommended_study_minutes: int
    is_manually_marked: bool = False
    personal_notes: Optional[str] = None
    source_document_id: Optional[int] = None
    source_document_name: Optional[str] = None
    source_page_number: Optional[int] = None
    importance_reason: Optional[str] = None
    pyq_appearances: int = 0
    pyq_sources: List[str] = []

    class Config:
        from_attributes = True

# Question Schemas
class QuestionMapTopic(BaseModel):
    topic_id: Optional[int] = None

class QuestionCreate(BaseModel):
    subject_id: int
    question_number: Optional[str] = "1"
    text: str
    marks: float = 5.0
    topic_id: Optional[int] = None
    academic_year: Optional[int] = 2025
    estimated_difficulty: Optional[str] = "MEDIUM"
    requires_diagram: Optional[bool] = False
    requires_calculation: Optional[bool] = False
    requires_algorithm: Optional[bool] = False
    source_name: Optional[str] = "Manual Question"
    is_pyq: Optional[bool] = None
    origin: Optional[str] = None
    key_concepts: Optional[List[str]] = []


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    marks: Optional[float] = None
    topic_id: Optional[int] = None
    estimated_difficulty: Optional[str] = None
    academic_year: Optional[int] = None
    question_number: Optional[str] = None
    requires_diagram: Optional[bool] = None
    requires_calculation: Optional[bool] = None
    requires_algorithm: Optional[bool] = None
    source_name: Optional[str] = None
    key_concepts: Optional[List[str]] = None

class QuestionResponse(BaseModel):
    id: int
    subject_id: int
    source_document_id: Optional[int] = None
    source_document_name: Optional[str] = None
    page_number: int = 1
    question_number: str
    text: str
    marks: float
    question_types: List[str] = []
    estimated_difficulty: str
    difficulty_confidence: float = 0.8
    requires_diagram: bool = False
    requires_calculation: bool = False
    requires_algorithm: bool = False
    academic_year: int = 2025
    source_name: str
    is_pyq: bool = True
    origin: str = "PYQ"
    key_concepts: List[str] = []
    marking_rubric: Optional[Dict[str, Any]] = None
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    mapping_confidence: Optional[float] = None
    is_user_corrected: Optional[bool] = False

    class Config:
        from_attributes = True

class GenerateQuestionsRequest(BaseModel):
    subject_id: int
    document_ids: Optional[List[int]] = None
    topic_id: Optional[int] = None
    count: int = 5
    difficulty: str = "MIXED"  # "EASY", "MEDIUM", "HARD", "MIXED"
    question_type: str = "MIXED"  # "MCQ", "SHORT_ANSWER", "LONG_ANSWER", "MIXED"

class GenerateQuestionsResponse(BaseModel):
    subject_id: int
    generated_count: int
    questions: List[QuestionResponse]
    source_documents: List[str]
    method: str = "GROUNDED_ACADEMIC_SYNTHESIS"
    disclaimer: str

class QuestionFilterMeta(BaseModel):
    total_questions: int
    available_topics: List[Dict[str, Any]]
    available_years: List[int]
    available_difficulties: List[str]
    marks_range: Dict[str, float]



# Exam Pattern Analysis Schemas
class TopicExamPattern(BaseModel):
    topic: str
    historical_appearances: int
    avg_marks: float
    question_types: List[str]
    last_observed_year: int
    evidence: str

class ExamPatternResponse(BaseModel):
    total_papers_analyzed: int
    total_questions: int
    marks_distribution: Dict[str, int]
    question_type_distribution: Dict[str, int]
    topic_patterns: List[TopicExamPattern]
    evidence_disclaimer: str

# Study Plan Schemas
class StudyTaskResponse(BaseModel):
    id: int
    day_number: int
    topic_id: Optional[int]
    topic_name: Optional[str]
    task_type: str
    title: str
    description: Optional[str]
    duration_minutes: int
    priority: str
    status: str
    scheduled_date: Optional[str]
    practice_question_ids: List[int]
    resources: List[str]

    class Config:
        from_attributes = True

class StudyPlanResponse(BaseModel):
    id: int
    subject_id: int
    exam_date: str
    total_days: int
    total_hours: float
    status: str
    tasks: List[StudyTaskResponse]

    class Config:
        from_attributes = True

class StudyPlanGenerateRequest(BaseModel):
    subject_id: int
    exam_date: str
    available_hours_per_day: float
    target_marks: Optional[float] = 85.0

# Answer Coach Schemas
class AnswerStrategyRequest(BaseModel):
    subject_id: Optional[int] = None
    question_id: Optional[int] = None
    question_text: Optional[str] = None
    marks: Optional[float] = 5.0
    question_type: Optional[str] = "Explanation"

class AnswerStrategyResponse(BaseModel):
    question_text: str
    marks: float
    question_types: List[str]
    topic: str
    evidence_basis: str  # EVIDENCE_BACKED, PATTERN_BASED, GENERAL_ACADEMIC
    evidence_explanation: str
    answer_structure: List[Dict[str, Any]]
    key_terms: List[str]
    suggested_diagrams: List[str]
    suggested_formulas: List[str]
    suggested_examples: List[str]
    expected_depth: str
    presentation_guidance: List[str]
    common_omissions: List[str]
    model_answer_outline: str
    # Subject-grounded extensions
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    citations: List[Dict[str, Any]] = []
    retrieved_evidence: List[str] = []
    missing_evidence: Optional[str] = None
    pyq_references: List[Dict[str, Any]] = []
    marking_scheme_criteria: List[Dict[str, Any]] = []
    disclaimer: str = "Academic Guidance Notice: Guidance is grounded in available subject study material. ExamIQ does not guarantee specific marks or examination outcomes."

class AnswerEvaluateRequest(BaseModel):
    subject_id: Optional[int] = None
    question_id: Optional[int] = None
    question_text: str
    marks: float = 5.0
    student_answer: str

class AnswerEvaluateResponse(BaseModel):
    content_score: float
    max_score: float
    structure_rating: str  # EXCELLENT, GOOD, ADEQUATE, NEEDS_IMPROVEMENT
    key_terms_present: List[str]
    key_terms_missing: List[str]
    coverage_percentage: float
    missing_concepts: List[str]
    presentation_feedback: str
    rubric_alignment: str
    actionable_improvements: List[str]
    disclaimer: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    citations: List[Dict[str, Any]] = []
    missing_evidence: Optional[str] = None

# HCI Feedback Survey
class FeedbackSurveySubmit(BaseModel):
    q1_ease_of_use: int  # 1 to 5
    q2_recommendation_relevance: int
    q3_exam_pattern_help: int
    q4_answer_coach_help: int
    q5_would_use: int
    sus_scores: List[int]  # 10 questions (1 to 5)
    qualitative_feedback: Optional[str] = None

class FeedbackSurveyResponse(BaseModel):
    id: int
    calculated_sus: float
    message: str

class HCIAnalyticsResponse(BaseModel):
    total_responses: int
    mean_sus_score: float
    sus_grade: str  # A+, A, B, C, D, F
    ease_of_use_avg: float
    relevance_avg: float
    exam_pattern_help_avg: float
    answer_coach_help_avg: float
    would_use_pct: float
    feedback_samples: List[str]

# Admin Overview
class AdminOverviewResponse(BaseModel):
    total_documents: int
    processed_documents: int
    total_topics: int
    total_questions: int
    total_students: int
    total_submissions: int
    document_types_count: Dict[str, int]
    system_health: str
    average_sus_score: float
