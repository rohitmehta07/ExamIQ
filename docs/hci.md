# ExamIQ Human-Computer Interaction (HCI) & Usability Research

ExamIQ was built following user-centered design principles specifically tailored to alleviate academic exam anxiety and cognitive overload.

---

## 1. HCI Design Tenets

1. **Cognitive Load Reduction**:
   - Rather than presenting students with hundreds of unstructured PDF pages, ExamIQ reduces the preparation space to an actionable prioritized queue ("What should I study today?").
2. **Transparent AI & Explainability**:
   - Students distrust black-box recommendations. Every topic priority card includes an interactive "Why is this prioritized?" breakdown displaying exact sub-scores and weights.
3. **Evidence Distinction**:
   - Recommendations are visually marked with confidence and evidence source tiers:
     - 🟢 **Evidence-Backed**: Derived directly from verified past question papers.
     - 🟡 **Pattern-Based**: Inferred from recurring syllabus and lecture patterns.
     - ⚪ **General Academic**: Standard pedagogical suggestions.
4. **Actionable Feedback Loop**:
   - The Answer Coach does not just provide a letter grade; it highlights missing domain keywords, structural imbalances, and rubric criteria satisfaction.

---

## 2. Standardized System Usability Scale (SUS)

ExamIQ includes an embedded 10-statement System Usability Scale (SUS) survey conforming to the standard Brooke (1996) methodology.

### The 10 SUS Statements:
1. I think that I would like to use this system frequently before university exams.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most students would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

### Scoring Formula:
$$\text{SUS Score} = 2.5 \times \left( \sum_{i \in \{1,3,5,7,9\}} (S_i - 1) + \sum_{j \in \{2,4,6,8,10\}} (5 - S_j) \right)$$

This maps all responses to a normalized benchmark scale of $0 - 100$.
An empirical score above **68** represents above-average usability; scores above **80.3** denote top-quartile ("Grade A") software.
ExamIQ displays this live score dynamically in both student feedback previews and the administrative dashboard.
