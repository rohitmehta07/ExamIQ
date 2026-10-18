# ExamIQ Machine Learning & NLP Pipeline

ExamIQ is built with explainable, deterministic, and verifiable machine learning components. It avoids ungrounded generative hallucinations by anchoring all priorities, question classifications, and rubric criteria to empirical evidence from real academic materials.

---

## 1. Document Classification

The document classifier identifies the pedagogical role of incoming materials using multi-signal pattern matching:
- `LECTURE_NOTES`: High page count, slide layouts, slide headers, topic structures.
- `QUESTION_PAPER`: Presence of marks allocations (e.g., `[5 Marks]`), question numbers (`Q.1`, `1(a)`), exam metadata (`Mid-Sem`, `Time: 1.5 Hours`).
- `SYLLABUS`: Course unit breakdowns, objective statements, textbook references.
- `HANDWRITTEN_NOTES`: Low OCR confidence ($< 0.70$), high variance in character bounding boxes, low digital text layer density.
- `MARKING_SCHEME`: Step marks criteria, model answers, rubric distribution.

---

## 2. Topic Extraction & Preparation Priority Formula

### Feature Space
For each topic $i$ in a subject:
1. **Historical Frequency ($F_i$)**: Number of distinct questions addressing topic $i$ across past question papers.
2. **Marks Importance ($M_i$)**: Cumulative marks allocated to topic $i$ across PYQs.
3. **Recency Factor ($R_i$)**: Exponential or linear recency weighting favoring recent exam years:
   $$R_i = \sum_{q \in Q_i} \frac{1}{1 + (\text{Year}_{\text{current}} - \text{Year}_q)}$$
4. **Syllabus Core Weight ($S_i$)**: Explicit syllabus weight specified in course curriculum.
5. **Question Variety ($V_i$)**: Diversity of Bloom's cognitive taxonomy levels and question types (Calculation, Algorithm, Diagram, Theory).
6. **Student Weakness ($W_i$)**: Inverse personal performance or explicit weak topic designation from student profile.

### Multi-Factor Priority Equation
$$\text{Priority Score}_i = w_f \cdot \hat{F}_i + w_m \cdot \hat{M}_i + w_r \cdot \hat{R}_i + w_s \cdot \hat{S}_i + w_v \cdot \hat{V}_i + w_w \cdot W_i$$

Where weights are configurable in `backend/app/core/config.py`:
- $w_f = 0.25$
- $w_m = 0.25$
- $w_r = 0.15$
- $w_s = 0.15$
- $w_v = 0.10$
- $w_w = 0.10$

Topics are partitioned into:
- **HIGH Priority**: Score $\ge 0.65$
- **MEDIUM Priority**: $0.40 \le$ Score $< 0.65$
- **LOW Priority**: Score $< 0.40$

---

## 3. Question Multi-Label Classification & Difficulty Estimation

- **Multi-Label Types**: Automatically detects if a question requires `Calculation`, `Diagram`, `Algorithm`, `Comparison`, or `Descriptive` reasoning via technical syntax and keywords.
- **Difficulty Heuristic**:
  - `EASY`: Direct recall or single definition ($< 3$ marks).
  - `MEDIUM`: Structured comparison, 5-round algorithm simulation, or standard matrix operations.
  - `HARD`: Multi-step proofs, quantum reduction, complex Galois field polynomial reductions, or multi-part cryptanalysis.

---

## 4. Dense Semantic Embedding & Vector Search

- **Architecture**: 128-dimensional dense SVD projection over TF-IDF n-gram vectorizer (unigrams + bigrams, sublinear TF scaling).
- **Inference Latency**: Under 15ms for similarity scoring across hundreds of text chunks.
- **Explainability**: Chunks retain explicit page numbers and source document references for clickable citations.
