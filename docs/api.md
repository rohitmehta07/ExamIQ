# ExamIQ REST API Reference

The ExamIQ backend exposes a RESTful JSON API organized under `/api`.

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI Documentation: `http://localhost:8000/docs`

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new student or admin account | No |
| `POST` | `/auth/login` | Authenticate and obtain JWT bearer token | No |
| `GET` | `/auth/me` | Fetch currently authenticated user identity | Yes |

### Example Request (`POST /auth/login`):
```json
{
  "email": "demo@examiq.edu",
  "password": "DemoStudent123!"
}
```
**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "role": "STUDENT",
  "full_name": "Aarav Sharma",
  "email": "demo@examiq.edu"
}
```

---

## 2. Student Profile (`/api/student`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/student/profile` | Retrieve profile, readiness score, and weak/strong topics |
| `PUT` | `/student/profile` | Update target marks, available study hours, and exam date |
| `GET` | `/student/performance` | Retrieve student marks per topic |
| `POST` | `/student/performance` | Record internal score or self-assessment |

*Privacy Enforcement: All `/student/*` endpoints filter by `current_user.id`. A student cannot read or modify another student's marks.*

---

## 3. Academic Documents & OCR (`/api/documents`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/documents` | List course documents and processing status |
| `POST` | `/documents/upload` | Multipart upload (PDF, PPTX, JPG) with selective OCR |
| `GET` | `/documents/{id}` | Retrieve specific document details |
| `POST` | `/documents/{id}/process` | Trigger re-extraction, OCR, and vector indexing |
| `DELETE` | `/documents/{id}` | Remove document and associated chunks |

---

## 4. Topics & Preparation Priority (`/api/topics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/topics` | Fetch all topics with multi-factor priority score |
| `GET` | `/topics/{id}` | Fetch topic keywords, formulas, and algorithms |
| `GET` | `/topics/priority/overview` | Categorized High, Medium, Low priority lists |

---

## 5. Question Bank & PYQ Analysis (`/api/questions`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/questions` | List questions filtered by subject and difficulty |
| `GET` | `/questions/{id}` | Question details, question types, and marking rubric |
| `POST` | `/questions` | Create question manually or via exam paper parser |

---

## 6. Exam Pattern Intelligence (`/api/exam-pattern`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/exam-pattern` | Aggregate empirical marks breakdown, question types, and evidence sources |

---

## 7. Dynamic Study Plan (`/api/study-plan`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/study-plan` | Retrieve active 14-day study schedule and task states |
| `POST` | `/study-plan/generate` | Generate optimized schedule based on target marks and days |
| `PUT` | `/study-plan/tasks/{task_id}` | Update task status (`COMPLETED`, `PENDING`, `SKIPPED`) |
| `PUT` | `/study-plan/tasks/{task_id}/reschedule` | Move task to a later day |

---

## 8. Answer Strategy & Coach (`/api/answer`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/answer/strategy` | Generates mark-oriented structure, time budget, and keywords |
| `POST` | `/answer/evaluate` | Evaluates student answer text against rubric criteria |

---

## 9. Academic Semantic Search (`/api/search`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/search?q={query}&top_k=6` | Dense TF-IDF/SVD vector retrieval across documents |

---

## 10. HCI Usability & Feedback (`/api/feedback`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/feedback/submit` | Submit 10-statement SUS responses and calculate score |
| `GET` | `/feedback/analytics` | Aggregate System Usability Scale metrics |

---

## 11. System Administration & Evaluation (`/api/admin`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/overview` | Corpus synchronization, document count, and anonymized metrics |
| `GET` | `/admin/evaluation` | Scikit-learn ML pipeline evaluation benchmark report |
