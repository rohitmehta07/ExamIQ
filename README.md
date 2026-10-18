# EXAMIQ

> **"Turn your study material into an intelligent exam strategy."**

A complete, demonstrable, human-centered academic preparation web application that unites **Machine Learning / NLP**, **Document Intelligence**, **Personalized Recommendation**, **Exam Pattern Analysis**, and **Human-Computer Interaction (HCI)**.

Designed for college students facing university examinations, ExamIQ analyzes lecture slides, professor notes, handwritten materials, and past question papers (PYQs) to answer the student's most vital question:
**"What should I study today, how should I prioritize my time, and how do I structure high-scoring answers?"**

---

## 🌟 Key Capabilities

1. **Document Intelligence & Hybrid OCR Pipeline**
   - Ingests native PDFs via **PyMuPDF (`fitz`)**.
   - Selectively triggers **RapidOCR (ONNX Runtime)** with zero external Tesseract binary dependencies for scanned pages and handwritten notes.
   - Detects low OCR confidence and handwriting heuristics, applying academic warning flags.
   - Zero paid cloud API dependencies—runs 100% locally on your machine.

2. **Explainable Preparation Priority Engine**
   - Multi-factor mathematical formula calculating Topic Priority Score:
     $$\text{Score} = w_1 F_{\text{norm}} + w_2 M_{\text{norm}} + w_3 R_{\text{norm}} + w_4 S_{\text{norm}} + w_5 V_{\text{norm}} + w_6 W_{\text{student}}$$
   - Classifies topics into **HIGH**, **MEDIUM**, and **LOW** priority.
   - Provides fully transparent score breakdowns (Historical Frequency, Marks Importance, Recency, Syllabus Core, Question Variety, and Student Weakness).

3. **Empirical Exam Pattern Analytics**
   - Analyzes real past question papers to compute topic mark distributions and question type proportions (Algorithmic, Calculation, Comparison, Descriptive).
   - Generates transparent evidence basis for all suggestions:
     - 🟢 **Evidence-Backed**: Direct citation to historical exam papers.
     - 🟡 **Pattern-Based**: Statistical recurring trends.
     - ⚪ **General Academic**: Standard pedagogical suggestions.

4. **Dynamic 14-Day Study Plan**
   - Multi-phase learning cadence: *Foundational Deep Dive* $\rightarrow$ *Practice & Numerical Mastery* $\rightarrow$ *Rapid Revision & Mock Testing*.
   - Reschedulable tasks with immediate visual completion tracking and readiness score updating.

5. **Mark-Oriented Answer Strategy & Live Answer Coach**
   - Step-by-step mark-scaled answer blueprints (e.g. 5-mark vs 10-mark structures).
   - Essential technical terminology checklist and diagram/calculation requirements.
   - Live answer analysis evaluating student submissions against rubric criteria with keyword coverage and targeted feedback.

6. **Academic Semantic Search**
   - In-memory vector store powered by 128-dimensional **TF-IDF + TruncatedSVD** dense local embeddings.
   - Sub-second conceptual retrieval across lecture notes, slides, and scanned exam sheets.

7. **HCI Usability & System Usability Scale (SUS)**
   - Built-in standardized 10-item **System Usability Scale (SUS)** questionnaire.
   - Empirical SUS score computation ($0-100$), qualitative sentiment gathering, and administrator usability metrics.

8. **Role-Based Privacy & Administration**
   - Distinct **Student** and **Admin/Examiner** workspaces.
   - Strict student privacy: individual marks and performance notes remain confidential to the student and are never exposed in public or admin feeds.

---

## 📚 Demonstration Subject: Cryptography & Network Security (BT14503)

ExamIQ comes pre-loaded and calibrated with authentic academic materials from **IIIT Pune** (Department of Computer Science & Engineering):
- **Lecture 1**: `AES_1 (1).pdf` (41 pages, Advanced Encryption Standard — Dr. Shivangi Shukla)
- **Lecture 2**: `Cryptography and Network Security_1 (1).pdf` (67 pages, Security Attacks, Services & Mechanisms)
- **Lecture 3**: `Cryptography and Network Security_2 (1).pdf` (53 pages, Classical Ciphers, Hill Cipher, Playfair)
- **Lecture 4**: `Data Encryption Standard (2).pdf` (58 pages, DES Feistel Network, Avalanche Effect)
- **Lecture 5**: `Modern Symmetric-Key Ciphers (1).pdf` (49 pages, Stream vs Block Ciphers, Modular Arithmetic)
- **Notes 1**: `PQC_1.pdf` (26 pages, Handwritten Notes on Quantum Threats, Shor's Algorithm)
- **Notes 2**: `PQC_Lattices_1.pdf` (27 pages, Somitra Sanadhya, SVP/CVP/LLL/SIS)
- **Notes 3**: `PQC_Lattices_2.pdf` (27 pages, Somitra Sanadhya, LWE/ML-KEM/ML-DSA)
- **PYQ**: `Semester 5 Mid Sem.pdf` (Pages 2–3 contain the verified 30-mark Mid-Sem exam paper with 6 multi-part questions)

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & **npm 9+**

### 2. Backend Setup
From the repository root:
```bash
# Optional: create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
cd backend
pip install -r requirements.txt
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run build
```

### 4. Running the Complete System
You can run the full application in either of two ways:

#### Option A: Unified FastAPI Serving (Simplest)
Once `npm run build` has run in `frontend/`, launch the FastAPI server:
```bash
cd backend
python run.py
```
Open **[http://localhost:8000/](http://localhost:8000/)** in your browser. The backend serves both the REST API and the React Single Page Application on a single port!

#### Option B: Vite Dev Server (Hot-Reloading)
Start the backend:
```bash
cd backend
python run.py
```
In another terminal, start Vite:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 🔑 Demo Credentials (1-Click Login)

The login screen includes dedicated **1-Click Evaluator Access** buttons:

| Role | Email | Password | Pre-loaded Context |
| :--- | :--- | :--- | :--- |
| **Student** | `demo@examiq.edu` | `DemoStudent123!` | Aarav Sharma (CNS Mid-Sem prep, 68% readiness, active study plan) |
| **Admin / Examiner** | `admin@examiq.edu` | `AdminPass123!` | Dr. Shivangi Shukla (Corpus analytics, HCI scores, ML evaluations) |

---

## 🧪 Automated Testing & Evaluation

### Backend Unit & Integration Tests
Run the automated test suite verifying auth, privacy, document classification, question tagging, and priority scoring:
```bash
cd backend
python -m pytest tests -v
```
**Result**: 8 test suites passed with 100% success rate.

### Machine Learning Benchmark
To reproduce the scikit-learn evaluation report across the document corpus:
```bash
cd evaluation
python run_evaluation.py
```
Outputs:
- `evaluation/evaluation_report.md`
- `evaluation/evaluation_report.json`

---

## 🏛️ System Architecture

```
                  ┌────────────────────────────────────────┐
                  │       ExamIQ React + Vite Frontend     │
                  │   Tailwind CSS v4 + Lucide React UI    │
                  └──────────────────┬─────────────────────┘
                                     │ REST / JSON
                                     ▼
                  ┌────────────────────────────────────────┐
                  │          FastAPI Backend Server        │
                  │  (Auth, Privacy, Schedule, Evaluation) │
                  └───────┬──────────────┬──────────────┬──┘
                          │              │              │
      ┌───────────────────▼──┐   ┌───────▼──────┐   ┌───▼──────────────────┐
      │  Document Intelligence│   │  ML Priority │   │   Answer Strategy    │
      │  - PyMuPDF Native    │   │  Engine      │   │   & Live Rubric      │
      │  - RapidOCR (ONNX)   │   │  Multi-Factor│   │   Evaluation Engine  │
      │  - Rule Classifier   │   │  Ranking     │   │                      │
      └──────────────────────┘   └──────────────┘   └──────────────────────┘
                          │              │              │
                          └──────────────┼──────────────┘
                                         ▼
                  ┌────────────────────────────────────────┐
                  │       Local TF-IDF / SVD Vectors       │
                  │      SQLite Database (examiq.db)       │
                  └────────────────────────────────────────┘
```

---

## 👥 Authors & Academic Context
Developed as an Advanced College Project combining Machine Learning, Document Intelligence, and Human-Computer Interaction for University Level Technical Course Preparation.
