import {
  User, StudentProfile, Subject, SubjectCreatePayload,
  SubjectProgressItem, SubjectOverviewResponse,
  DocumentItem, TopicItem, QuestionItem, QuestionFilterMeta, SearchResult, SearchResponse,
  GenerateQuestionsPayload, GenerateQuestionsResponse,
  StudyPlan, AnswerStrategy, AnswerEvaluation,
  ExamPatternData, HCIAnalytics
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('examiq_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('examiq_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('examiq_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('examiq_token');
    localStorage.removeItem('examiq_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string):Promise<{ access_token: string; role: string; full_name: string; email: string }> {
    const data = await this.request<{ access_token: string; role: string; full_name: string; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('examiq_user', JSON.stringify(data));
    return data;
  }

  async register(email: string, password: string, full_name: string, role = 'STUDENT') {
    const data = await this.request<{ access_token: string; role: string; full_name: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('examiq_user', JSON.stringify(data));
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Student Profile
  async getProfile(): Promise<StudentProfile> {
    return this.request<StudentProfile>('/student/profile');
  }

  async updateProfile(updates: Partial<StudentProfile>): Promise<StudentProfile> {
    return this.request<StudentProfile>('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getPerformance(): Promise<Array<{ id: number; topic_id: number; topic_name?: string; score: number; max_score: number; confidence_level: string; notes?: string }>> {
    return this.request('/student/performance');
  }

  async addPerformance(topic_id: number, score: number, max_score = 10.0, notes?: string) {
    return this.request('/student/performance', {
      method: 'POST',
      body: JSON.stringify({ topic_id, score, max_score, notes }),
    });
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return this.request<Subject[]>('/subjects');
  }

  async getSubjectsOverview(): Promise<SubjectOverviewResponse> {
    return this.request<SubjectOverviewResponse>('/subjects/overview');
  }

  async getSubject(subjectId: number): Promise<Subject> {
    return this.request<Subject>(`/subjects/${subjectId}`);
  }

  async createSubject(payload: SubjectCreatePayload): Promise<Subject> {
    return this.request<Subject>('/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSubject(subjectId: number, payload: Partial<SubjectCreatePayload>): Promise<Subject> {
    return this.request<Subject>(`/subjects/${subjectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteSubject(subjectId: number): Promise<{ message: string; deleted_id: number }> {
    return this.request<{ message: string; deleted_id: number }>(`/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  }

  async getSubjectProgress(subjectId: number): Promise<SubjectProgressItem> {
    return this.request<SubjectProgressItem>(`/subjects/${subjectId}/progress`);
  }

  async setActiveSubject(subjectId: number): Promise<StudentProfile> {
    return this.request<StudentProfile>(`/student/active-subject/${subjectId}`, {
      method: 'POST',
    });
  }

  // Documents
  async getDocuments(subjectId?: number): Promise<DocumentItem[]> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request<DocumentItem[]>(`/documents${query}`);
  }

  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async processDocument(docId: number) {
    return this.request(`/documents/${docId}/process`, {
      method: 'POST',
    });
  }

  async deleteDocument(docId: number) {
    return this.request(`/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  // Academic & Semantic Search
  async search(
    query: string,
    subjectId?: number,
    topK = 8,
    searchMode = 'HYBRID'
  ): Promise<SearchResponse> {
    const subParam = subjectId ? `&subject_id=${subjectId}` : '';
    const modeParam = searchMode ? `&search_mode=${searchMode}` : '';
    return this.request<SearchResponse>(`/search?q=${encodeURIComponent(query)}&top_k=${topK}${subParam}${modeParam}`);
  }

  // Topics & Priority
  async getTopics(subjectId?: number): Promise<TopicItem[]> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request<TopicItem[]>(`/topics${query}`);
  }

  async createTopic(payload: {
    subject_id: number;
    name: string;
    category?: string;
    description?: string;
    is_manually_marked?: boolean;
    personal_notes?: string;
    syllabus_weight?: number;
  }): Promise<TopicItem> {
    return this.request<TopicItem>('/topics', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTopic(topicId: number, payload: Partial<TopicItem>): Promise<TopicItem> {
    return this.request<TopicItem>(`/topics/${topicId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async markTopicImportant(topicId: number, is_manually_marked: boolean, personal_notes?: string): Promise<TopicItem> {
    return this.request<TopicItem>(`/topics/${topicId}/mark-important`, {
      method: 'PATCH',
      body: JSON.stringify({ is_manually_marked, personal_notes }),
    });
  }

  async deleteTopic(topicId: number): Promise<{ message: string; topic_id: number }> {
    return this.request<{ message: string; topic_id: number }>(`/topics/${topicId}`, {
      method: 'DELETE',
    });
  }

  async syncTopics(subjectId: number): Promise<TopicItem[]> {
    return this.request<TopicItem[]>(`/topics/sync?subject_id=${subjectId}`, {
      method: 'POST',
    });
  }

  async getPriorityOverview(subjectId?: number): Promise<{
    high_priority: any[];
    medium_priority: any[];
    low_priority: any[];
    total_topics: number;
    disclaimer: string;
  }> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request(`/topics/priority/overview${query}`);
  }

  // Question Bank
  async getQuestions(params?: {
    subjectId?: number;
    search?: string;
    topicId?: number;
    difficulty?: string;
    origin?: string;
    year?: number;
    minMarks?: number;
    maxMarks?: number;
    requiresDiagram?: boolean;
    requiresCalculation?: boolean;
    requiresAlgorithm?: boolean;
    sortBy?: string;
  }): Promise<QuestionItem[]> {
    let query = '';
    const searchParams = new URLSearchParams();
    if (params?.subjectId) searchParams.append('subject_id', params.subjectId.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.topicId) searchParams.append('topic_id', params.topicId.toString());
    if (params?.difficulty && params.difficulty !== 'ALL') searchParams.append('difficulty', params.difficulty);
    if (params?.origin && params.origin !== 'ALL') searchParams.append('origin', params.origin);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.minMarks !== undefined) searchParams.append('min_marks', params.minMarks.toString());
    if (params?.maxMarks !== undefined) searchParams.append('max_marks', params.maxMarks.toString());
    if (params?.requiresDiagram !== undefined) searchParams.append('requires_diagram', params.requiresDiagram.toString());
    if (params?.requiresCalculation !== undefined) searchParams.append('requires_calculation', params.requiresCalculation.toString());
    if (params?.requiresAlgorithm !== undefined) searchParams.append('requires_algorithm', params.requiresAlgorithm.toString());
    if (params?.sortBy) searchParams.append('sort_by', params.sortBy);

    if (searchParams.toString()) query = `?${searchParams.toString()}`;
    return this.request<QuestionItem[]>(`/questions${query}`);
  }

  async getQuestionFilterMeta(subjectId?: number): Promise<QuestionFilterMeta> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request<QuestionFilterMeta>(`/questions/filters/meta${query}`);
  }

  async getQuestion(id: number): Promise<QuestionItem> {
    return this.request<QuestionItem>(`/questions/${id}`);
  }

  async createQuestion(payload: {
    subject_id: number;
    question_number?: string;
    text: string;
    marks: number;
    topic_id?: number;
    academic_year?: number;
    estimated_difficulty?: string;
    requires_diagram?: boolean;
    requires_calculation?: boolean;
    requires_algorithm?: boolean;
    source_name?: string;
    key_concepts?: string[];
  }): Promise<QuestionItem> {
    return this.request<QuestionItem>('/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateQuestion(id: number, payload: Partial<{
    text: string;
    marks: number;
    topic_id: number | null;
    estimated_difficulty: string;
    academic_year: number;
    question_number: string;
    requires_diagram: boolean;
    requires_calculation: boolean;
    requires_algorithm: boolean;
    source_name: string;
    key_concepts: string[];
  }>): Promise<QuestionItem> {
    return this.request<QuestionItem>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async mapQuestionTopic(id: number, topicId: number | null): Promise<QuestionItem> {
    return this.request<QuestionItem>(`/questions/${id}/map-topic`, {
      method: 'PATCH',
      body: JSON.stringify({ topic_id: topicId }),
    });
  }

  async deleteQuestion(id: number): Promise<{ message: string; deleted_id: number }> {
    return this.request<{ message: string; deleted_id: number }>(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  async generateQuestions(payload: GenerateQuestionsPayload): Promise<GenerateQuestionsResponse> {
    return this.request<GenerateQuestionsResponse>('/questions/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }


  // Exam Patterns
  async getExamPattern(subjectId?: number): Promise<ExamPatternData> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request<ExamPatternData>(`/exam-pattern${query}`);
  }

  // Study Plan
  async getStudyPlan(subjectId?: number): Promise<StudyPlan | null> {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request<StudyPlan | null>(`/study-plan${query}`);
  }

  async generateStudyPlan(subject_id: number, exam_date: string, available_hours_per_day: number, target_marks = 85.0): Promise<StudyPlan> {
    return this.request<StudyPlan>('/study-plan/generate', {
      method: 'POST',
      body: JSON.stringify({ subject_id, exam_date, available_hours_per_day, target_marks }),
    });
  }

  async updateTaskStatus(taskId: number, status: 'COMPLETED' | 'PENDING' | 'SKIPPED') {
    return this.request(`/study-plan/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async rescheduleTask(taskId: number, newDay: number) {
    return this.request(`/study-plan/tasks/${taskId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ new_day: newDay }),
    });
  }

  // Answer Coach
  async getAnswerStrategy(payload: { subject_id?: number; question_id?: number; question_text?: string; marks?: number; question_type?: string }): Promise<AnswerStrategy> {
    return this.request<AnswerStrategy>('/answer/strategy', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async evaluateAnswer(payload: { subject_id?: number; question_id?: number; question_text: string; marks?: number; student_answer: string }): Promise<AnswerEvaluation> {
    return this.request<AnswerEvaluation>('/answer/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Feedback & HCI Usability
  async submitFeedback(payload: {
    q1_ease_of_use: number;
    q2_recommendation_relevance: number;
    q3_exam_pattern_help: number;
    q4_answer_coach_help: number;
    q5_would_use: number;
    sus_scores: number[];
    qualitative_feedback?: string;
  }): Promise<{ id: number; calculated_sus: number; message: string }> {
    return this.request('/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHCIAnalytics(): Promise<HCIAnalytics> {
    return this.request<HCIAnalytics>('/feedback/analytics');
  }

  // Admin
  async getAdminOverview(): Promise<any> {
    return this.request('/admin/overview');
  }

  async getMLEvaluation(): Promise<any> {
    return this.request('/admin/evaluation');
  }
}

export const api = new ApiService();
