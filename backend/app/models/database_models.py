import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="STUDENT")  # STUDENT, ADMIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profiles = relationship("StudentProfile", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("AnswerSubmission", back_populates="user")
    study_plans = relationship("StudyPlan", back_populates="user")
    performances = relationship("StudentPerformance", back_populates="user")
    surveys = relationship("FeedbackSurvey", back_populates="user")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    target_marks = Column(Float, default=85.0)
    available_hours_per_day = Column(Float, default=3.0)
    exam_date = Column(String(50), default="2026-11-15")
    completed_topics = Column(JSON, default=list)  # list of topic names or IDs
    weak_topics = Column(JSON, default=list)
    strong_topics = Column(JSON, default=list)
    previous_marks = Column(Float, default=70.0)
    overall_readiness = Column(Float, default=65.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profiles")
    subject = relationship("Subject")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    code = Column(String(50), index=True, nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    syllabus_text = Column(Text, nullable=True)
    semester = Column(String(50), nullable=True)
    exam_date = Column(String(50), nullable=True)
    target_marks = Column(Float, nullable=True, default=85.0)
    study_hours_per_day = Column(Float, nullable=True, default=3.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="subjects")
    documents = relationship("Document", back_populates="subject", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    date = Column(String(50), nullable=False)
    total_marks = Column(Float, default=30.0)
    duration_minutes = Column(Integer, default=90)
    academic_year = Column(String(50), default="2025-2026")
    term = Column(String(50), default="Mid-Sem")

    subject = relationship("Subject", back_populates="exams")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf")
    doc_category = Column(String(50), default="LECTURE_NOTES")
    page_count = Column(Integer, default=1)
    status = Column(String(50), default="PROCESSED")  # PENDING, PROCESSING, PROCESSED, FAILED
    indexing_status = Column(String(50), default="INDEXED")  # PENDING, INDEXED, FAILED
    classification_confidence = Column(Float, default=0.92)
    classification_method = Column(String(100), default="hybrid_feature_matching")
    ocr_used = Column(Boolean, default=False)
    ocr_confidence = Column(Float, default=1.0)
    is_handwritten = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subject = relationship("Subject", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    page_number = Column(Integer, default=1)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    chunk_type = Column(String(50), default="text")  # text, table, formula, handwritten
    embedding_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, default=dict)

    document = relationship("Document", back_populates="chunks")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), default="Core Concept")
    description = Column(Text, nullable=True)
    syllabus_weight = Column(Float, default=0.8)
    historical_frequency = Column(Integer, default=1)
    avg_marks = Column(Float, default=5.0)
    preparation_priority = Column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW
    priority_score = Column(Float, default=0.85)
    priority_breakdown = Column(JSON, default=dict)
    keywords = Column(JSON, default=list)
    algorithms = Column(JSON, default=list)
    formulas = Column(JSON, default=list)
    recommended_study_minutes = Column(Integer, default=60)
    
    # Manual Important Topic Selection & Evidence
    is_manually_marked = Column(Boolean, default=False)
    personal_notes = Column(Text, nullable=True)
    source_document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    source_page_number = Column(Integer, nullable=True)
    importance_reason = Column(Text, nullable=True)
    pyq_appearances = Column(Integer, default=0)
    pyq_sources = Column(JSON, default=list)

    subject = relationship("Subject", back_populates="topics")
    questions = relationship("QuestionTopic", back_populates="topic")
    source_document = relationship("Document", foreign_keys=[source_document_id])

    @property
    def source_document_name(self) -> Optional[str]:
        return self.source_document.filename if self.source_document else None

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    source_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    page_number = Column(Integer, default=1)
    question_number = Column(String(50), default="1")
    text = Column(Text, nullable=False)
    marks = Column(Float, default=5.0)
    question_types = Column(JSON, default=list)  # ["Comparison", "Explanation", "Numerical"]
    estimated_difficulty = Column(String(50), default="MEDIUM")  # EASY, MEDIUM, HARD
    difficulty_confidence = Column(Float, default=0.88)
    requires_diagram = Column(Boolean, default=False)
    requires_calculation = Column(Boolean, default=False)
    requires_algorithm = Column(Boolean, default=False)
    academic_year = Column(Integer, default=2025)
    source_name = Column(String(255), default="Semester 5 Mid Sem")
    is_pyq = Column(Boolean, default=True)
    origin = Column(String(50), default="PYQ")  # "PYQ", "AI_GENERATED", "MANUAL"
    model_answer = Column(Text, nullable=True)
    key_concepts = Column(JSON, default=list)
    marking_rubric = Column(JSON, default=dict)

    # Question-Topic Direct Mapping
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    mapping_confidence = Column(Float, default=0.85)
    is_user_corrected = Column(Boolean, default=False)

    subject = relationship("Subject", back_populates="questions")
    topics = relationship("QuestionTopic", back_populates="question")
    submissions = relationship("AnswerSubmission", back_populates="question")
    mapped_topic = relationship("Topic", foreign_keys=[topic_id])
    source_document = relationship("Document", foreign_keys=[source_document_id])

    @property
    def source_document_name(self) -> Optional[str]:
        if self.source_document and self.source_document.filename:
            return self.source_document.filename
        return self.source_name

    @property
    def topic_name(self) -> Optional[str]:
        return self.mapped_topic.name if self.mapped_topic else None


class QuestionTopic(Base):
    __tablename__ = "question_topics"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    relevance_score = Column(Float, default=1.0)

    question = relationship("Question", back_populates="topics")
    topic = relationship("Topic", back_populates="questions")

class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    year = Column(Integer, default=2025)
    term = Column(String(50), default="Mid-Sem")
    total_marks = Column(Float, default=30.0)
    duration_minutes = Column(Integer, default=90)
    source_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

class MarkingScheme(Base):
    __tablename__ = "marking_schemes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    criteria = Column(JSON, default=list)  # [{"criterion": "Definition", "marks": 1.5}, ...]
    total_marks = Column(Float, default=5.0)
    evidence_source = Column(String(255), default="Evaluated Rubric / Examination Scheme")

class MarkingCriterion(Base):
    __tablename__ = "marking_criteria"

    id = Column(Integer, primary_key=True, index=True)
    marking_scheme_id = Column(Integer, ForeignKey("marking_schemes.id"), nullable=False)
    criterion_text = Column(String(255), nullable=False)
    allocated_marks = Column(Float, default=1.0)
    description = Column(Text, nullable=True)

class EvaluatedAnswer(Base):
    __tablename__ = "evaluated_answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_score = Column(Float, default=4.5)
    max_score = Column(Float, default=5.0)
    extracted_text = Column(Text, nullable=False)
    presentation_notes = Column(Text, nullable=True)
    has_diagram = Column(Boolean, default=True)
    missing_elements = Column(JSON, default=list)
    evidence_notes = Column(Text, nullable=True)

class StudentPerformance(Base):
    __tablename__ = "student_performance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    score = Column(Float, default=7.0)
    max_score = Column(Float, default=10.0)
    confidence_level = Column(String(50), default="MEDIUM")  # HIGH, MEDIUM, LOW
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="performances")
    topic = relationship("Topic")

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    exam_date = Column(String(50), default="2026-11-15")
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, COMPLETED, ARCHIVED
    total_days = Column(Integer, default=14)
    total_hours = Column(Float, default=42.0)

    user = relationship("User", back_populates="study_plans")
    tasks = relationship("StudyTask", back_populates="study_plan", cascade="all, delete-orphan")

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    study_plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False)
    day_number = Column(Integer, default=1)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    task_type = Column(String(50), default="LEARN")  # LEARN, PRACTICE, REVISE, MOCK_TEST
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=60)
    priority = Column(String(50), default="HIGH")  # HIGH, MEDIUM, LOW
    status = Column(String(50), default="PENDING")  # PENDING, COMPLETED, SKIPPED
    scheduled_date = Column(String(50), nullable=True)
    practice_question_ids = Column(JSON, default=list)
    resources = Column(JSON, default=list)

    study_plan = relationship("StudyPlan", back_populates="tasks")
    topic = relationship("Topic")

class StudentProgress(Base):
    __tablename__ = "student_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    completed_topics_count = Column(Integer, default=0)
    total_study_minutes = Column(Integer, default=0)
    questions_attempted = Column(Integer, default=0)
    avg_score_pct = Column(Float, default=0.0)
    last_studied_at = Column(DateTime, default=datetime.datetime.utcnow)

class AnswerSubmission(Base):
    __tablename__ = "answer_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_text = Column(Text, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    content_score = Column(Float, default=7.5)
    structure_rating = Column(String(50), default="GOOD")
    presentation_feedback = Column(Text, nullable=True)
    missing_concepts = Column(JSON, default=list)
    key_terms_present = Column(JSON, default=list)
    key_terms_missing = Column(JSON, default=list)
    rubric_alignment = Column(String(100), default="Standard Academic Rubric")
    overall_feedback = Column(Text, nullable=True)

    user = relationship("User", back_populates="submissions")
    question = relationship("Question", back_populates="submissions")

class AnswerFeedback(Base):
    __tablename__ = "answer_feedback"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("answer_submissions.id"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    score = Column(Float, default=0.0)
    is_evidence_backed = Column(Boolean, default=False)
    criteria_matched = Column(JSON, default=list)

class EmbeddingMetadata(Base):
    __tablename__ = "embedding_metadata"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), default="chunk")  # chunk, question, topic
    entity_id = Column(Integer, nullable=False)
    vector_dim = Column(Integer, default=128)
    model_name = Column(String(100), default="tfidf_dense_svd_local")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FeedbackSurvey(Base):
    __tablename__ = "feedback_surveys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    q1_ease_of_use = Column(Integer, default=5)
    q2_recommendation_relevance = Column(Integer, default=5)
    q3_exam_pattern_help = Column(Integer, default=5)
    q4_answer_coach_help = Column(Integer, default=5)
    q5_would_use = Column(Integer, default=5)
    sus_scores = Column(JSON, default=list)  # 10 SUS answers (1-5)
    calculated_sus = Column(Float, default=85.0)
    qualitative_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="surveys")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    status = Column(String(50), default="PENDING")
    progress_pct = Column(Integer, default=0)
    message = Column(String(255), default="Queued")
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
