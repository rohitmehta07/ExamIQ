import os
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user_obj
from app.models.database_models import User, Question, Subject, Topic, QuestionTopic, StudentProfile, Document, DocumentChunk
from app.schemas.schemas import (
    QuestionResponse, QuestionCreate, QuestionUpdate, QuestionMapTopic,
    QuestionFilterMeta, GenerateQuestionsRequest, GenerateQuestionsResponse
)
from app.ml.question_classifier import question_classifier
from app.ml.question_generator import question_generator
from app.ml.text_extractor import text_extractor
from app.services.topic_service import topic_service

router = APIRouter(prefix="/questions", tags=["Question Bank"])


def resolve_user_subject_id(subject_id: Optional[int], current_user: User, db: Session) -> Optional[int]:
    """
    Resolves the subject ID for the current authenticated user.
    If an explicit subject_id is passed, strictly enforces that it belongs to current_user.
    If no subject_id is passed, falls back to active subject in profile or first user subject.
    """
    if subject_id is not None:
        sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this subject or it does not exist."
            )
        return sub.id

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile and profile.subject_id:
        sub = db.query(Subject).filter(Subject.id == profile.subject_id, Subject.user_id == current_user.id).first()
        if sub:
            return sub.id

    first_sub = db.query(Subject).filter(Subject.user_id == current_user.id).first()
    return first_sub.id if first_sub else None


@router.get("", response_model=List[QuestionResponse])
def get_questions(
    subject_id: Optional[int] = None,
    search: Optional[str] = None,
    topic_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    year: Optional[int] = None,
    min_marks: Optional[float] = None,
    max_marks: Optional[float] = None,
    requires_diagram: Optional[bool] = None,
    requires_calculation: Optional[bool] = None,
    requires_algorithm: Optional[bool] = None,
    origin: Optional[str] = None,
    sort_by: Optional[str] = "question_number",
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Retrieve questions strictly belonging to the authenticated user and selected subject.
    Supports comprehensive search and multi-criteria filters.
    Returns an honest empty list if no questions exist.
    """
    target_sub_id = resolve_user_subject_id(subject_id, current_user, db)
    if not target_sub_id:
        return []

    query = db.query(Question).filter(Question.subject_id == target_sub_id)

    # Origin filter (PYQ, AI_GENERATED, MANUAL)
    if origin and origin.upper() != "ALL":
        orig_clean = origin.upper()
        if orig_clean == "PYQ":
            query = query.filter(Question.is_pyq == True)
        elif orig_clean in ["AI_GENERATED", "AI GENERATED"]:
            query = query.filter((Question.origin == "AI_GENERATED") | (Question.is_pyq == False))
        elif orig_clean == "MANUAL":
            query = query.filter(Question.origin == "MANUAL")


    # Search filter across question text
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(func.lower(Question.text).like(term))

    # Topic filter
    if topic_id is not None:
        query = query.filter(Question.topic_id == topic_id)

    # Difficulty filter
    if difficulty and difficulty.upper() != "ALL":
        query = query.filter(Question.estimated_difficulty == difficulty.upper())

    # Year filter
    if year is not None:
        query = query.filter(Question.academic_year == year)

    # Marks range filters
    if min_marks is not None:
        query = query.filter(Question.marks >= min_marks)
    if max_marks is not None:
        query = query.filter(Question.marks <= max_marks)

    # Requirements filters
    if requires_diagram is not None:
        query = query.filter(Question.requires_diagram == requires_diagram)
    if requires_calculation is not None:
        query = query.filter(Question.requires_calculation == requires_calculation)
    if requires_algorithm is not None:
        query = query.filter(Question.requires_algorithm == requires_algorithm)

    # Sorting
    if sort_by == "marks_desc":
        query = query.order_by(Question.marks.desc(), Question.id.asc())
    elif sort_by == "marks_asc":
        query = query.order_by(Question.marks.asc(), Question.id.asc())
    elif sort_by == "year_desc":
        query = query.order_by(Question.academic_year.desc(), Question.question_number.asc())
    elif sort_by == "difficulty":
        # Order by difficulty confidence and difficulty
        query = query.order_by(Question.estimated_difficulty.asc(), Question.marks.desc())
    else:
        # Default order by question number or id
        query = query.order_by(Question.question_number.asc(), Question.id.asc())

    return query.all()


@router.get("/filters/meta", response_model=QuestionFilterMeta)
def get_question_filter_meta(
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Returns available filter metadata (topics with questions, distinct years, marks ranges)
    for the user's selected subject question bank.
    """
    target_sub_id = resolve_user_subject_id(subject_id, current_user, db)
    if not target_sub_id:
        return QuestionFilterMeta(
            total_questions=0,
            available_topics=[],
            available_years=[],
            available_difficulties=[],
            marks_range={"min": 0.0, "max": 0.0}
        )

    questions = db.query(Question).filter(Question.subject_id == target_sub_id).all()
    if not questions:
        return QuestionFilterMeta(
            total_questions=0,
            available_topics=[],
            available_years=[],
            available_difficulties=[],
            marks_range={"min": 0.0, "max": 0.0}
        )

    # Calculate distinct topics with question counts
    topic_counts: Dict[int, int] = {}
    for q in questions:
        if q.topic_id:
            topic_counts[q.topic_id] = topic_counts.get(q.topic_id, 0) + 1

    subject_topics = db.query(Topic).filter(Topic.subject_id == target_sub_id).all()
    available_topics = []
    for t in subject_topics:
        count = topic_counts.get(t.id, 0)
        available_topics.append({
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "question_count": count
        })

    # Available distinct years
    years = sorted(list({q.academic_year for q in questions if q.academic_year}), reverse=True)

    # Available difficulties
    difficulties = sorted(list({q.estimated_difficulty for q in questions if q.estimated_difficulty}))

    # Marks range
    marks = [q.marks for q in questions if q.marks is not None]
    min_mark = min(marks) if marks else 0.0
    max_mark = max(marks) if marks else 0.0

    return QuestionFilterMeta(
        total_questions=len(questions),
        available_topics=available_topics,
        available_years=years,
        available_difficulties=difficulties,
        marks_range={"min": min_mark, "max": max_mark}
    )


@router.get("/{q_id}", response_model=QuestionResponse)
def get_question(
    q_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Get single question verifying subject ownership."""
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    user_sub = db.query(Subject).filter(Subject.id == q.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this question"
        )

    return q


@router.post("/generate", response_model=GenerateQuestionsResponse, status_code=status.HTTP_201_CREATED)
def generate_questions(
    payload: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Generate new practice questions grounded in study materials (lecture notes, textbooks, slides).
    Validates user ownership of subject and all selected documents.
    Does NOT convert or overwrite existing PYQ records.
    """
    # 1. Verify subject ownership
    subject = db.query(Subject).filter(
        Subject.id == payload.subject_id,
        Subject.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this subject or it does not exist."
        )

    # 2. Validate question count and options
    count = payload.count
    if count not in [5, 10, 15]:
        count = min(max(count, 1), 30)

    # 3. Resolve & Validate Documents
    if payload.document_ids:
        docs = db.query(Document).filter(
            Document.id.in_(payload.document_ids),
            Document.subject_id == subject.id,
            Document.user_id == current_user.id
        ).all()
        if len(docs) != len(payload.document_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="One or more selected documents do not belong to this subject or user."
            )
    else:
        # Default to study materials for this subject
        docs = db.query(Document).filter(
            Document.subject_id == subject.id,
            Document.user_id == current_user.id,
            Document.doc_category != "QUESTION_PAPER"
        ).all()
        if not docs:
            docs = db.query(Document).filter(
                Document.subject_id == subject.id,
                Document.user_id == current_user.id
            ).all()

    if not docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No study documents found for this subject. Please upload lecture notes or textbook PDFs first."
        )

    # 4. Extract Text & Pages from Selected Documents
    all_pages: List[Dict[str, Any]] = []
    doc_filenames: List[str] = []
    primary_doc_id = docs[0].id if docs else None

    for doc in docs:
        doc_filenames.append(doc.filename)
        # Check existing chunks first
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.page_number, DocumentChunk.chunk_index).all()
        if chunks:
            pages_dict: Dict[int, List[str]] = {}
            for ch in chunks:
                pages_dict.setdefault(ch.page_number, []).append(ch.content)
            for p_num, content_list in pages_dict.items():
                all_pages.append({
                    "page_number": p_num,
                    "text": "\n".join(content_list),
                    "document_id": doc.id,
                    "document_name": doc.filename
                })
        else:
            # Fallback to direct text extractor
            if doc.file_path and os.path.exists(doc.file_path):
                ext_res = text_extractor.extract_text(doc.file_path)
                for p in ext_res.get("pages", []):
                    all_pages.append({
                        "page_number": p.get("page_number", 1),
                        "text": p.get("text", ""),
                        "document_id": doc.id,
                        "document_name": doc.filename
                    })

    if not all_pages or all(not p["text"].strip() for p in all_pages):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected document(s) contain no readable text. Please ensure documents have text or run OCR on scanned PDFs."
        )

    # 5. Fetch Subject Topics for Automatic Concept Correlation
    topics = [{"id": t.id, "name": t.name} for t in db.query(Topic).filter(Topic.subject_id == subject.id).all()]

    # 6. Generate Questions via Grounded Academic Synthesis Engine
    try:
        raw_questions = question_generator.generate_questions_from_content(
            extracted_pages=all_pages,
            source_doc_name=", ".join(doc_filenames),
            source_doc_id=primary_doc_id,
            count=count,
            difficulty=payload.difficulty,
            question_type=payload.question_type,
            subject_topics=topics
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Question generation failed: {str(e)}"
        )

    if not raw_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate valid questions from the selected material. Try selecting a different study document."
        )

    # 7. Persist Generated Questions (with is_pyq = False and origin = 'AI_GENERATED')
    saved_questions = []
    existing_count = db.query(Question).filter(Question.subject_id == subject.id).count()

    for idx, q_item in enumerate(raw_questions, start=1):
        q_num_str = f"Practice-{existing_count + idx}"
        target_topic_id = payload.topic_id or q_item.get("topic_id")

        q_model = Question(
            subject_id=subject.id,
            source_document_id=q_item.get("source_document_id") or primary_doc_id,
            page_number=q_item.get("page_number", 1),
            question_number=q_num_str,
            text=q_item["text"],
            marks=q_item["marks"],
            question_types=q_item.get("question_types", ["Conceptual"]),
            estimated_difficulty=q_item.get("estimated_difficulty", "MEDIUM"),
            difficulty_confidence=q_item.get("difficulty_confidence", 0.85),
            requires_diagram=q_item.get("requires_diagram", False),
            requires_calculation=q_item.get("requires_calculation", False),
            requires_algorithm=q_item.get("requires_algorithm", False),
            academic_year=2025,
            source_name=q_item.get("source_name", "AI Generated Practice Question"),
            is_pyq=False,
            origin="AI_GENERATED",
            model_answer=q_item.get("model_answer"),
            key_concepts=q_item.get("key_concepts", []),
            marking_rubric=q_item.get("marking_rubric"),
            topic_id=target_topic_id,
            mapping_confidence=0.9 if target_topic_id else 0.0,
            is_user_corrected=False
        )
        db.add(q_model)
        db.flush()

        if target_topic_id:
            qt = QuestionTopic(question_id=q_model.id, topic_id=target_topic_id, relevance_score=1.0)
            db.add(qt)

        saved_questions.append(q_model)

    db.commit()

    for q in saved_questions:
        db.refresh(q)

    response_items = [QuestionResponse.model_validate(q) for q in saved_questions]

    return GenerateQuestionsResponse(
        subject_id=subject.id,
        generated_count=len(response_items),
        questions=response_items,
        source_documents=doc_filenames,
        method="GROUNDED_ACADEMIC_SYNTHESIS",
        disclaimer="Practice questions algorithmically synthesized from core definitions and propositions in uploaded course materials. Use for formative exam preparation."
    )


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Allow students to manually add a question to their subject's question bank.
    Automatically classifies difficulty and question types if not provided.
    """
    # Verify subject ownership
    subject = db.query(Subject).filter(
        Subject.id == payload.subject_id,
        Subject.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this subject or it does not exist."
        )

    # If topic_id provided, verify topic belongs to this subject
    if payload.topic_id:
        topic = db.query(Topic).filter(
            Topic.id == payload.topic_id,
            Topic.subject_id == subject.id
        ).first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected topic does not belong to this subject."
            )

    # Classify question
    types, diff, conf = question_classifier.classify_question(payload.text, payload.marks)
    chosen_diff = payload.estimated_difficulty if payload.estimated_difficulty else diff

    new_q = Question(
        subject_id=subject.id,
        source_document_id=None,
        page_number=1,
        question_number=payload.question_number or "1",
        text=payload.text.strip(),
        marks=payload.marks,
        question_types=types,
        estimated_difficulty=chosen_diff,
        difficulty_confidence=conf,
        requires_diagram=payload.requires_diagram or False,
        requires_calculation=payload.requires_calculation or False,
        requires_algorithm=payload.requires_algorithm or False,
        academic_year=payload.academic_year or 2025,
        source_name=payload.source_name or "Manual Student Entry",
        is_pyq=payload.is_pyq if payload.is_pyq is not None else (payload.origin == "PYQ"),
        origin=payload.origin or ("PYQ" if payload.is_pyq else "MANUAL"),
        key_concepts=payload.key_concepts or [],
        topic_id=payload.topic_id,
        mapping_confidence=1.0 if payload.topic_id else 0.0,
        is_user_corrected=True if payload.topic_id else False
    )

    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    # Link QuestionTopic if topic specified
    if payload.topic_id:
        qt = QuestionTopic(question_id=new_q.id, topic_id=payload.topic_id, relevance_score=1.0)
        db.add(qt)
        db.commit()
        # Recalculate topic evidence
        topic_service.recalculate_topic_frequencies_and_ranks(db, subject.id, user_id=current_user.id)

    db.refresh(new_q)
    return new_q


@router.put("/{q_id}", response_model=QuestionResponse)
def update_question(
    q_id: int,
    payload: QuestionUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Allow students to edit an existing question in their question bank.
    """
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    user_sub = db.query(Subject).filter(Subject.id == q.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    topic_changed = False
    if payload.text is not None:
        q.text = payload.text.strip()
    if payload.marks is not None:
        q.marks = payload.marks
    if payload.academic_year is not None:
        q.academic_year = payload.academic_year
    if payload.question_number is not None:
        q.question_number = payload.question_number
    if payload.estimated_difficulty is not None:
        q.estimated_difficulty = payload.estimated_difficulty.upper()
    if payload.requires_diagram is not None:
        q.requires_diagram = payload.requires_diagram
    if payload.requires_calculation is not None:
        q.requires_calculation = payload.requires_calculation
    if payload.requires_algorithm is not None:
        q.requires_algorithm = payload.requires_algorithm
    if payload.source_name is not None:
        q.source_name = payload.source_name
    if payload.key_concepts is not None:
        q.key_concepts = payload.key_concepts

    if payload.topic_id is not None:
        if payload.topic_id != q.topic_id:
            # Validate new topic belongs to same subject
            topic = db.query(Topic).filter(
                Topic.id == payload.topic_id,
                Topic.subject_id == q.subject_id
            ).first()
            if not topic:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid topic for this subject")
            
            # Remove old QuestionTopic
            db.query(QuestionTopic).filter(QuestionTopic.question_id == q.id).delete()
            # Add new QuestionTopic
            qt = QuestionTopic(question_id=q.id, topic_id=payload.topic_id, relevance_score=1.0)
            db.add(qt)
            q.topic_id = payload.topic_id
            q.is_user_corrected = True
            q.mapping_confidence = 1.0
            topic_changed = True

    db.commit()
    db.refresh(q)

    if topic_changed:
        topic_service.recalculate_topic_frequencies_and_ranks(db, q.subject_id, user_id=current_user.id)

    return q


@router.patch("/{q_id}/map-topic", response_model=QuestionResponse)
def map_question_topic(
    q_id: int,
    payload: QuestionMapTopic,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """
    Map or re-assign a question to a topic within the same subject.
    """
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    user_sub = db.query(Subject).filter(Subject.id == q.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if payload.topic_id is not None:
        topic = db.query(Topic).filter(
            Topic.id == payload.topic_id,
            Topic.subject_id == q.subject_id
        ).first()
        if not topic:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Topic does not belong to this subject")

        # Update mapping
        db.query(QuestionTopic).filter(QuestionTopic.question_id == q.id).delete()
        qt = QuestionTopic(question_id=q.id, topic_id=payload.topic_id, relevance_score=1.0)
        db.add(qt)
        q.topic_id = payload.topic_id
        q.is_user_corrected = True
        q.mapping_confidence = 1.0
    else:
        # Unmap topic
        db.query(QuestionTopic).filter(QuestionTopic.question_id == q.id).delete()
        q.topic_id = None
        q.is_user_corrected = True
        q.mapping_confidence = 0.0

    db.commit()
    db.refresh(q)

    # Recalculate topic evidence
    topic_service.recalculate_topic_frequencies_and_ranks(db, q.subject_id, user_id=current_user.id)

    return q


@router.delete("/{q_id}", status_code=status.HTTP_200_OK)
def delete_question(
    q_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db)
):
    """Delete a question from current user's question bank."""
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    user_sub = db.query(Subject).filter(Subject.id == q.subject_id, Subject.user_id == current_user.id).first()
    if not user_sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    subject_id = q.subject_id
    db.query(QuestionTopic).filter(QuestionTopic.question_id == q.id).delete()
    db.delete(q)
    db.commit()

    # Recalculate topic evidence
    topic_service.recalculate_topic_frequencies_and_ranks(db, subject_id, user_id=current_user.id)

    return {"message": "Question successfully deleted", "deleted_id": q_id}
