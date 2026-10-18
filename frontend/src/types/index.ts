export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface StudentProfile {
  id: number;
  user_id: number;
  subject_id?: number;
  target_marks: number;
  available_hours_per_day: number;
  exam_date: string;
  completed_topics: string[];
  weak_topics: string[];
  strong_topics: string[];
  previous_marks: number;
  overall_readiness: number;
}

export interface Subject {
  id: number;
  user_id?: number;
  code?: string;
  name: string;
  description?: string;
  syllabus_text?: string;
  semester?: string;
  exam_date?: string;
  target_marks?: number;
  study_hours_per_day?: number;
  created_at?: string;
}

export interface SubjectCreatePayload {
  name: string;
  code?: string;
  semester?: string;
  exam_date?: string;
  target_marks?: number;
  study_hours_per_day?: number;
  description?: string;
  syllabus_text?: string;
}

export interface SubjectProgressItem {
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  semester?: string;
  exam_date?: string;
  days_remaining?: number | null;
  target_marks?: number;
  study_hours_per_day?: number;
  preparation_progress?: number | null;
  task_completion_percentage?: number | null;
  progress_status: string;
  tasks_completed: number;
  tasks_pending?: number;
  tasks_total: number;
  documents_count: number;
  notes_documents_count?: number;
  pyq_documents_count?: number;
  syllabus_documents_count?: number;
  topics_count: number;
  extracted_topics_count?: number;
  topics_completed: number;
  important_topics_count?: number;
  high_priority_topics_count?: number;
  manually_marked_topics_count?: number;
  questions_count?: number;
  pyq_questions_count?: number;
  generated_questions_count?: number;
  exam_urgency?: string | null;
  next_recommended_action?: string | null;
  formula_info?: {
    formula: string;
    tasks_completed: number;
    tasks_pending: number;
    tasks_total: number;
    completion_percentage?: number | null;
    mastery_policy?: string;
  } | null;
}

export interface SubjectOverviewResponse {
  summary: {
    total_subjects: number;
    upcoming_exams: number;
    completed_tasks: number;
    overall_progress: number | null;
  };
  subjects: SubjectProgressItem[];
}

export interface DocumentItem {
  id: number;
  subject_id: number;
  filename: string;
  file_type: string;
  doc_category: string;
  page_count: number;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  indexing_status?: 'INDEXED' | 'PENDING' | 'FAILED';
  classification_confidence: number;
  classification_method: string;
  ocr_used: boolean;
  ocr_confidence: number;
  is_handwritten: boolean;
  created_at?: string;
}

export interface TopicItem {
  id: number;
  subject_id: number;
  name: string;
  category: string;
  description?: string;
  syllabus_weight: number;
  historical_frequency: number;
  avg_marks: number;
  preparation_priority: 'HIGH' | 'MEDIUM' | 'LOW';
  priority_score: number;
  priority_breakdown: {
    historical_frequency?: number;
    marks_importance?: number;
    recency?: number;
    syllabus_relevance?: number;
    question_variety?: number;
    student_weakness?: number;
  };
  keywords: string[];
  algorithms: string[];
  formulas: string[];
  recommended_study_minutes: number;
  is_manually_marked?: boolean;
  personal_notes?: string;
  source_document_id?: number;
  source_document_name?: string;
  source_page_number?: number;
  importance_reason?: string;
  pyq_appearances?: number;
  pyq_sources?: string[];
}

export interface QuestionItem {
  id: number;
  subject_id: number;
  source_document_id?: number;
  page_number: number;
  question_number: string;
  text: string;
  marks: number;
  question_types: string[];
  estimated_difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  difficulty_confidence: number;
  requires_diagram: boolean;
  requires_calculation: boolean;
  requires_algorithm: boolean;
  academic_year: number;
  source_name: string;
  is_pyq: boolean;
  origin?: 'PYQ' | 'AI_GENERATED' | 'MANUAL';
  key_concepts: string[];
  source_document_name?: string;
  topic_id?: number;
  topic_name?: string;
  mapping_confidence?: number;
  is_user_corrected?: boolean;
  marking_rubric?: {
    criteria: Array<{
      criterion: string;
      marks: number;
      description: string;
    }>;
  };
}

export interface GenerateQuestionsPayload {
  subject_id: number;
  document_ids?: number[];
  topic_id?: number;
  count: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  question_type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'MIXED';
}

export interface GenerateQuestionsResponse {
  subject_id: number;
  generated_count: number;
  questions: QuestionItem[];
  source_documents: string[];
  method: string;
  disclaimer: string;
}


export interface QuestionFilterMeta {
  total_questions: number;
  available_topics: Array<{
    id: number;
    name: string;
    category?: string;
    question_count: number;
  }>;
  available_years: number[];
  available_difficulties: string[];
  marks_range: {
    min: number;
    max: number;
  };
}


export interface SearchResult {
  document_id: number;
  document_name: string;
  page_number: number;
  snippet: string;
  similarity_score: number;
  relevance_label: string;
  doc_category: string;
  topic?: string;
  subject_id?: number;
  subject_name?: string;
  matched_terms?: string[];
  search_mode?: 'HYBRID' | 'SEMANTIC' | 'KEYWORD' | string;
}

export interface SearchResponse {
  query: string;
  subject_id?: number | null;
  subject_name?: string | null;
  search_mode: string;
  total_results: number;
  results: SearchResult[];
}

export interface StudyTask {
  id: number;
  day_number: number;
  topic_id?: number;
  topic_name?: string;
  task_type: 'LEARN' | 'PRACTICE' | 'REVISE' | 'MOCK_TEST';
  title: string;
  description?: string;
  duration_minutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  scheduled_date?: string;
  practice_question_ids: number[];
  resources: string[];
}

export interface StudyPlan {
  id: number;
  subject_id: number;
  exam_date: string;
  total_days: number;
  total_hours: number;
  status: string;
  tasks: StudyTask[];
}

export interface SourceCitation {
  document_id: number;
  document_name: string;
  page_number: number;
  doc_category: string;
  snippet: string;
}

export interface PYQReference {
  id: number;
  question_number?: string;
  academic_year?: number;
  marks?: number;
  source_name?: string;
  text: string;
}

export interface MarkingCriteriaItem {
  criterion: string;
  marks: number;
  description: string;
}

export interface AnswerStrategy {
  subject_id?: number;
  subject_name?: string;
  question_text: string;
  marks: number;
  question_types: string[];
  topic: string;
  evidence_basis: 'EVIDENCE_BACKED' | 'PATTERN_BASED' | 'GENERAL_ACADEMIC';
  evidence_explanation: string;
  citations?: SourceCitation[];
  retrieved_evidence?: string[];
  missing_evidence?: string | null;
  pyq_references?: PYQReference[];
  marking_scheme_criteria?: MarkingCriteriaItem[];
  answer_structure: Array<{
    step: string;
    allocated_marks: number;
    description: string;
  }>;
  key_terms: string[];
  suggested_diagrams: string[];
  suggested_formulas: string[];
  suggested_examples: string[];
  expected_depth: string;
  presentation_guidance: string[];
  common_omissions: string[];
  model_answer_outline: string;
  disclaimer?: string;
}

export interface AnswerEvaluation {
  subject_id?: number;
  subject_name?: string;
  content_score: number;
  max_score: number;
  structure_rating: string;
  key_terms_present: string[];
  key_terms_missing: string[];
  coverage_percentage: number;
  missing_concepts: string[];
  presentation_feedback: string;
  rubric_alignment: string;
  actionable_improvements: string[];
  citations?: SourceCitation[];
  missing_evidence?: string | null;
  disclaimer: string;
}

export interface ExamPatternData {
  total_papers_analyzed: number;
  total_questions: number;
  marks_distribution: Record<string, number>;
  question_type_distribution: Record<string, number>;
  topic_patterns: Array<{
    topic: string;
    historical_appearances: number;
    avg_marks: number;
    question_types: string[];
    last_observed_year: number;
    evidence: string;
  }>;
  evidence_disclaimer: string;
}

export interface HCIAnalytics {
  total_responses: number;
  mean_sus_score: number;
  sus_grade: string;
  ease_of_use_avg: number;
  relevance_avg: number;
  exam_pattern_help_avg: number;
  answer_coach_help_avg: number;
  would_use_pct: number;
  feedback_samples: string[];
}
