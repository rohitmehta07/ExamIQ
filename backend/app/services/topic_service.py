import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.database_models import Topic, Question, QuestionTopic, Document, StudentProfile
from app.ml.topic_extractor import topic_extractor
from app.ml.priority_engine import priority_engine

class TopicService:
    COMMON_ACRONYMS = {
        "aes": "advanced encryption standard",
        "des": "data encryption standard",
        "3des": "triple data encryption standard",
        "rsa": "rivest shamir adleman",
        "ecc": "elliptic curve cryptography",
        "dsa": "digital signature algorithm",
        "sha": "secure hash algorithm",
        "md5": "message digest 5",
        "mac": "message authentication code",
        "hmac": "hash based message authentication code",
        "pqc": "post quantum cryptography",
        "svp": "shortest vector problem",
        "cvp": "closest vector problem",
        "sis": "short integer solution",
        "lwe": "learning with errors",
        "svm": "support vector machine",
        "knn": "k nearest neighbors",
        "cnn": "convolutional neural network",
        "rnn": "recurrent neural network",
        "lstm": "long short term memory",
        "nlp": "natural language processing",
        "bert": "bidirectional encoder representations from transformers",
        "llm": "large language model",
        "os": "operating system",
        "dbms": "database management system",
        "sql": "structured query language"
    }
    ACRONYM_INVERSE = {v: k for k, v in COMMON_ACRONYMS.items()}

    def normalize_name(self, name: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9\s]", "", name.lower())
        return re.sub(r"\s+", " ", clean).strip()

    def get_alias_keys(self, name: str) -> List[str]:
        keys = []
        norm = self.normalize_name(name)
        if norm:
            keys.append(norm)

        # Check for parenthetical pattern: "Full Name (ACRONYM)" or "ACRONYM (Full Name)"
        match = re.search(r"^(.*?)\s*\((.*?)\)\s*$", name)
        if match:
            p1 = self.normalize_name(match.group(1))
            p2 = self.normalize_name(match.group(2))
            if p1:
                keys.append(p1)
            if p2:
                keys.append(p2)

        # Check against common domain acronyms
        for k in list(keys):
            if k in self.COMMON_ACRONYMS:
                expanded = self.COMMON_ACRONYMS[k]
                keys.append(expanded)
            if k in self.ACRONYM_INVERSE:
                abbr = self.ACRONYM_INVERSE[k]
                keys.append(abbr)

        return list(dict.fromkeys(keys))

    def extract_and_persist_topics_from_document(
        self,
        db: Session,
        doc: Document,
        extracted_pages: List[Dict[str, Any]]
    ) -> List[Topic]:
        """
        Extract topics from each page of an academic document, associate source attribution,
        and persist them to the database for this subject with alias deduplication.
        """
        existing_topics = db.query(Topic).filter(Topic.subject_id == doc.subject_id).all()
        topic_map: Dict[str, Topic] = {}
        for t in existing_topics:
            for k in self.get_alias_keys(t.name):
                if k and k not in topic_map:
                    topic_map[k] = t

        new_topics = []

        for p in extracted_pages:
            page_text = p.get("text", "")
            page_num = p.get("page_number", 1)
            if not page_text or len(page_text.strip()) < 30:
                continue

            extracted = topic_extractor.extract_topics_from_text(
                text=page_text,
                source_doc_id=doc.id,
                source_doc_name=doc.filename,
                page_number=page_num
            )

            for item in extracted:
                extracted_keys = self.get_alias_keys(item["name"])
                existing = None
                for k in extracted_keys:
                    if k in topic_map:
                        existing = topic_map[k]
                        break

                if existing:
                    # Update existing topic evidence if missing
                    if not existing.source_document_id:
                        existing.source_document_id = doc.id
                        existing.source_page_number = page_num
                    # Merge keywords, algorithms, and formulas
                    merged_kw = list(dict.fromkeys((existing.keywords or []) + (item.get("keywords") or [])))
                    existing.keywords = merged_kw
                    merged_algo = list(dict.fromkeys((existing.algorithms or []) + (item.get("algorithms") or [])))
                    existing.algorithms = merged_algo
                    merged_form = list(dict.fromkeys((existing.formulas or []) + (item.get("formulas") or [])))
                    existing.formulas = merged_form
                else:
                    # Create new topic with strict 0 frequency baseline (frequency is only derived from PYQs)
                    prio_res = priority_engine.calculate_priority(
                        historical_freq=0,
                        max_possible_freq=1,
                        avg_marks=0.0,
                        last_observed_year=2024,
                        syllabus_weight=item.get("syllabus_weight", 0.8),
                        question_types_count=1,
                        is_weak_topic=False
                    )

                    new_t = Topic(
                        subject_id=doc.subject_id,
                        name=item["name"],
                        category=item.get("category", "Core Concept"),
                        description=item.get("description"),
                        syllabus_weight=item.get("syllabus_weight", 0.8),
                        historical_frequency=0,
                        avg_marks=0.0,
                        preparation_priority=prio_res["priority_level"],
                        priority_score=prio_res["composite_score"],
                        priority_breakdown=prio_res["breakdown"],
                        keywords=item.get("keywords", []),
                        algorithms=item.get("algorithms", []),
                        formulas=item.get("formulas", []),
                        recommended_study_minutes=prio_res["recommended_study_minutes"],
                        is_manually_marked=False,
                        personal_notes=None,
                        source_document_id=doc.id,
                        source_page_number=page_num,
                        importance_reason=item.get("importance_reason") or prio_res["rationale"],
                        pyq_appearances=0,
                        pyq_sources=[]
                    )
                    db.add(new_t)
                    db.flush()
                    for k in self.get_alias_keys(new_t.name):
                        if k not in topic_map:
                            topic_map[k] = new_t
                    new_topics.append(new_t)

        db.commit()
        return new_topics

    def map_questions_to_topics(self, db: Session, subject_id: int):
        """
        Maps all questions in the subject to the best-matching topic based on
        concept overlap, algorithms, keywords, acronym aliases, and title matching.
        """
        topics = db.query(Topic).filter(Topic.subject_id == subject_id).all()
        if not topics:
            return

        questions = db.query(Question).filter(Question.subject_id == subject_id).all()
        if not questions:
            return

        for q in questions:
            if q.is_user_corrected and q.topic_id:
                # Do not overwrite manual student correction
                continue

            q_text_lower = q.text.lower()
            best_topic = None
            best_score = 0.0

            for t in topics:
                t_name_lower = t.name.lower()
                score = 0.0

                # 1. Topic name & alias/acronym containment
                t_aliases = self.get_alias_keys(t.name)
                matched_alias = False
                for alias in t_aliases:
                    if len(alias) <= 4:
                        if re.search(r"\b" + re.escape(alias) + r"\b", q_text_lower):
                            score += 4.0
                            matched_alias = True
                            break
                    elif alias in q_text_lower:
                        score += 4.0
                        matched_alias = True
                        break

                if not matched_alias:
                    name_tokens = [tok for tok in re.findall(r"\w+", t_name_lower) if len(tok) > 2]
                    matched_name_tokens = sum(1 for tok in name_tokens if tok in q_text_lower)
                    if name_tokens:
                        score += (matched_name_tokens / len(name_tokens)) * 2.5

                # 2. Algorithm match
                for algo in (t.algorithms or []):
                    if algo.lower() in q_text_lower:
                        score += 3.0

                # 3. Keywords overlap
                for kw in (t.keywords or []):
                    if kw.lower() in q_text_lower:
                        score += 1.5

                # 4. Formula overlap
                for f in (t.formulas or []):
                    if f.lower() in q_text_lower:
                        score += 2.0

                if score > best_score:
                    best_score = score
                    best_topic = t

            if best_topic and best_score >= 1.5:
                q.topic_id = best_topic.id
                conf = round(min(1.0, 0.65 + (best_score * 0.06)), 2)
                q.mapping_confidence = conf

                # Ensure QuestionTopic record exists
                existing_qt = db.query(QuestionTopic).filter(
                    QuestionTopic.question_id == q.id,
                    QuestionTopic.topic_id == best_topic.id
                ).first()
                if not existing_qt:
                    qt = QuestionTopic(
                        question_id=q.id,
                        topic_id=best_topic.id,
                        relevance_score=conf
                    )
                    db.add(qt)

        db.commit()

    def recalculate_topic_frequencies_and_ranks(self, db: Session, subject_id: int, user_id: Optional[int] = None):
        """
        Recalculates topic frequencies and AI priority rankings strictly from actual available papers in this subject.
        Zero fabrication: if 0 papers exist, frequencies and pyq appearances are 0.
        Preserves student manual selection (is_manually_marked and personal_notes) completely.
        AI practice questions (origin == 'AI_GENERATED') are excluded from historical exam frequency calculations.
        """
        topics = db.query(Topic).filter(Topic.subject_id == subject_id).all()
        if not topics:
            return

        # Check student profile for weak topics
        weak_topics = set()
        if user_id:
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
            if profile and profile.weak_topics:
                weak_topics = set(profile.weak_topics)

        # Get all questions in this subject
        all_questions = db.query(Question).filter(Question.subject_id == subject_id).all()
        # Separate genuine past exam questions (PYQs) from synthetic practice questions
        pyq_questions = [q for q in all_questions if q.is_pyq or q.origin == "PYQ"]
        total_pyq_count = len(pyq_questions)

        # Get all PYQ documents in this subject
        pyq_docs = db.query(Document).filter(
            Document.subject_id == subject_id,
            Document.doc_category.in_(["QUESTION_PAPER", "PYQ"]),
            Document.status != "FAILED"
        ).all()
        doc_name_map = {d.id: d.filename for d in pyq_docs}

        for topic in topics:
            # Find all mapped PYQ questions for this topic
            direct_pyq = [q for q in pyq_questions if q.topic_id == topic.id]
            qt_ids = set(r[0] for r in db.query(QuestionTopic.question_id).filter(QuestionTopic.topic_id == topic.id).all())
            indirect_pyq = [q for q in pyq_questions if q.id in qt_ids and q.topic_id != topic.id]
            mapped_pyqs = direct_pyq + indirect_pyq

            actual_freq = len(mapped_pyqs)
            avg_m = round(sum(q.marks for q in mapped_pyqs) / actual_freq, 1) if actual_freq > 0 else 0.0

            # Gather actual paper names where this topic appeared
            paper_sources = set()
            for q in mapped_pyqs:
                if q.source_name and q.source_name.strip():
                    paper_sources.add(q.source_name.strip())
                elif q.source_document_id and q.source_document_id in doc_name_map:
                    paper_sources.add(doc_name_map[q.source_document_id])

            pyq_sources = sorted(list(paper_sources))
            pyq_apps = len(pyq_sources)

            # Max observed year from genuine PYQs
            years = [q.academic_year for q in mapped_pyqs if q.academic_year]
            last_year = max(years) if years else 2024

            # Question types variety across PYQs
            q_types = set()
            for q in mapped_pyqs:
                for qt_item in (q.question_types or []):
                    q_types.add(qt_item)
            variety_count = len(q_types)

            # Compute AI priority strictly using verified past-paper evidence
            prio = priority_engine.calculate_priority(
                historical_freq=actual_freq,
                max_possible_freq=max(1, total_pyq_count),
                avg_marks=avg_m,
                last_observed_year=last_year,
                syllabus_weight=topic.syllabus_weight or 0.8,
                question_types_count=variety_count,
                is_weak_topic=(topic.name in weak_topics)
            )

            # Update topic attributes
            topic.historical_frequency = actual_freq
            topic.avg_marks = avg_m
            topic.pyq_appearances = pyq_apps
            topic.pyq_sources = pyq_sources
            topic.preparation_priority = prio["priority_level"]
            topic.priority_score = prio["composite_score"]
            topic.priority_breakdown = prio["breakdown"]
            topic.recommended_study_minutes = prio["recommended_study_minutes"]
            topic.importance_reason = prio["rationale"]

        db.commit()

topic_service = TopicService()
