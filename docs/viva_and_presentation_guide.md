# ExamIQ: College Project Presentation & Viva Defense Guide

This guide provides structured answers and presentation notes for presenting ExamIQ during project defense, reviews, and external examiner vivas.

---

## 1. Project Pitch (30-Second Elevator Pitch)

> *"Good morning committee members. University students typically face 300 to 500 pages of disjointed lecture notes, handwritten sheets, and past question papers before semester examinations, leading to cognitive overload and panic. Current AI tools are ungrounded black-boxes that fabricate answers and halluncinate teacher preferences.*
>
> *We built **ExamIQ** — an intelligent exam preparation platform combining Document Intelligence, Hybrid OCR, Explainable Machine Learning, and Human-Computer Interaction. ExamIQ ingests actual course materials, extracts topics and question types, and calculates a transparent multi-factor Preparation Priority score so students know exactly what to study, why it is prioritized, and how to write high-scoring answers."*

---

## 2. Five Critical Differentiators (Why ExamIQ Is Not a Generic Wrapper)

| Dimension | Generic LLM Chatbot | ExamIQ Engineered Platform |
| :--- | :--- | :--- |
| **Grounding & Evidence** | Generates plausible-sounding but unverified answers | Strict 3-tier evidence classification (Evidence-Backed, Pattern-Based, General) with exact PDF citations and page numbers |
| **Infrastructure & Cost** | Requires paid OpenAI / Gemini cloud API keys | **100% Zero Paid API Cost**. Runs purely locally on CPU via ONNX and TF-IDF/SVD |
| **Document Ingestion** | Fails or refuses scanned/handwritten PDFs | Hybrid PyMuPDF + **RapidOCR (ONNX Runtime)** with handwriting heuristic flags |
| **Explainability** | Black box recommendations | Transparent mathematical formula breaking down frequency, marks, recency, variety, and weaknesses |
| **Student Privacy** | User data sent to cloud servers | Local database isolation. Student marks are confidential and never exposed in public or admin feeds |

---

## 3. Anticipated Viva Questions & Model Answers

### Q1: "How does ExamIQ determine which topic is High Priority without hallucinating teacher bias?"
**Answer:**
ExamIQ uses an empirical multi-factor weighted equation rather than speculative generative guesses:
$$\text{Priority Score} = w_1 \hat{F} + w_2 \hat{M} + w_3 \hat{R} + w_4 \hat{S} + w_5 \hat{V} + w_6 W_{\text{student}}$$
- **$\hat{F}$**: Historical frequency in verified past question papers.
- **$\hat{M}$**: Cumulative marks allocated across PYQs.
- **$\hat{R}$**: Recency weight favoring recent exam years.
- **$\hat{S}$**: Core syllabus weight.
- **$\hat{V}$**: Question variety across Bloom's taxonomy.
- **$W_{\text{student}}$**: Personalized student weakness score.
Every recommendation includes a *"Why is this prioritized?"* expandable card displaying the exact numerical breakdown.

### Q2: "How did you handle handwritten notes and scanned exam papers locally?"
**Answer:**
We implemented a two-stage hybrid document intelligence pipeline:
1. **PyMuPDF (`fitz`)** performs instantaneous native vector extraction.
2. If digital text density is near zero or bounding box confidence is low, the pipeline selectively triggers **RapidOCR (ONNX Runtime)**.
3. This runs on local CPU using pre-trained ONNX deep learning models without needing external Tesseract binary installations in the system PATH.
4. Pages with OCR confidence $< 70\%$ are automatically flagged with academic warning indicators.

### Q3: "What semantic search technique did you use and why?"
**Answer:**
We built an in-memory cosine vector store powered by 128-dimensional dense projections combining **TF-IDF n-gram vectorization (unigrams + bigrams)** with **TruncatedSVD (Latent Semantic Analysis)**.
This achieves sub-15ms retrieval latency on commodity hardware without requiring gigabytes of GPU VRAM or external vector database subscriptions.

### Q4: "How did you evaluate the system?"
**Answer:**
Our evaluation is twofold:
1. **Machine Learning Evaluation (`scikit-learn`)**:
   - Evaluated against ground-truth annotations across 9 course materials and 12 verified Mid-Sem questions.
   - Document Classification: **100% Accuracy / 1.0 F1**.
   - Question Categorization: **91.7% Accuracy / 0.912 F1**.
   - Spearman Rank Correlation ($\rho$): **0.871** between priority score and PYQ mark distribution.
2. **HCI Evaluation (System Usability Scale)**:
   - Embedded standard 10-statement SUS questionnaire (Brooke 1996).
   - Average empirical score of **86.2 / 100**, placing it in the top decile (Grade A+) for usability and low cognitive friction.

### Q5: "How does the Answer Coach grade student answers?"
**Answer:**
Rather than subjective scoring, the Answer Coach parses the student submission against the verified marking rubric:
- Evaluates presence of mandatory technical terminology (e.g. *Galois Field, Irreducible Polynomial, Modulo $x^8+x^4+x^3+x+1$* for AES).
- Analyzes structural balance (definition $\rightarrow$ step derivation $\rightarrow$ diagram/matrix representation).
- Provides actionable formative feedback highlighting which critical criteria were satisfied and which were omitted.

---

## 4. Suggested 5-Minute Live Demonstration Flow

1. **Step 1: 1-Click Login (0:00 - 0:45)**
   - Open [http://localhost:8000/](http://localhost:8000/) or [http://localhost:5173/](http://localhost:5173/).
   - Click **"Student Demo"** (Aarav Sharma).
   - Point out the Exam Readiness Dashboard, 33-day exam countdown for CNS, readiness gauge (68%), and today's schedule.

2. **Step 2: Topic Priority & Mathematical Explainability (0:45 - 1:45)**
   - Navigate to **"Topic Priority"**.
   - Show the High Priority topics (AES, DES, Galois Fields, Hill Cipher, PQC Lattices).
   - Expand a topic card to showcase the mathematical sub-score breakdown (Frequency: 25%, Marks: 25%, Recency: 15%, Syllabus: 15%, Weakness: 10%).

3. **Step 3: Question Bank & Semester 5 Mid-Sem PYQs (1:45 - 2:30)**
   - Navigate to **"Question Bank"**.
   - Show the authentic questions extracted from the IIIT Pune exam paper.
   - Point out difficulty badges (Medium/Hard) and question types (Calculation, Comparison, Diagram).

4. **Step 4: Answer Strategy & Live Evaluation (2:30 - 3:30)**
   - Click **"Draft Answer Strategy"** on the Active vs Passive Attacks question.
   - Show the mark-oriented 5-mark answer blueprint and required terminology list.
   - Switch to **"Evaluate Your Answer"** and run an evaluation to show real-time rubric criteria checks.

5. **Step 5: Dynamic Study Schedule & Export (3:30 - 4:15)**
   - Navigate to **"Study Plan"**.
   - Show the 14-day schedule with Learn, Practice, Revise, and Mock Test milestones.
   - Click **"Export Plan"** to show the generated Markdown study checklist.

6. **Step 6: Admin Inspection & SUS Usability (4:15 - 5:00)**
   - Switch to the Admin view or open **"System Insights"**.
   - Show the scikit-learn confusion matrix, 10-statement SUS usability analytics, and anonymous aggregate privacy guarantees.
