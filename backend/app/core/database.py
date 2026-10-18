from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def auto_upgrade_db():
    """Ensure newly added columns exist in existing SQLite database without dropping tables."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            # Check topics columns
            res = conn.execute(text("PRAGMA table_info(topics)")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                if "is_manually_marked" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN is_manually_marked BOOLEAN DEFAULT 0"))
                if "personal_notes" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN personal_notes TEXT"))
                if "source_document_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN source_document_id INTEGER"))
                if "source_page_number" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN source_page_number INTEGER"))
                if "importance_reason" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN importance_reason TEXT"))
                if "pyq_appearances" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN pyq_appearances INTEGER DEFAULT 0"))
                if "pyq_sources" not in existing_cols:
                    conn.execute(text("ALTER TABLE topics ADD COLUMN pyq_sources TEXT DEFAULT '[]'"))

            # Check documents columns
            res_doc = conn.execute(text("PRAGMA table_info(documents)")).fetchall()
            existing_doc_cols = {row[1] for row in res_doc}
            if existing_doc_cols:
                if "indexing_status" not in existing_doc_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN indexing_status VARCHAR(50) DEFAULT 'INDEXED'"))

            # Check questions columns
            res_q = conn.execute(text("PRAGMA table_info(questions)")).fetchall()
            existing_q_cols = {row[1] for row in res_q}
            if existing_q_cols:
                if "topic_id" not in existing_q_cols:
                    conn.execute(text("ALTER TABLE questions ADD COLUMN topic_id INTEGER"))
                if "mapping_confidence" not in existing_q_cols:
                    conn.execute(text("ALTER TABLE questions ADD COLUMN mapping_confidence FLOAT DEFAULT 0.85"))
                if "is_user_corrected" not in existing_q_cols:
                    conn.execute(text("ALTER TABLE questions ADD COLUMN is_user_corrected BOOLEAN DEFAULT 0"))
                if "origin" not in existing_q_cols:
                    conn.execute(text("ALTER TABLE questions ADD COLUMN origin VARCHAR(50) DEFAULT 'PYQ'"))

            conn.commit()
        except Exception as e:
            print(f"[Database Upgrade Note] Auto-migration check: {e}")

try:
    auto_upgrade_db()
except Exception:
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

