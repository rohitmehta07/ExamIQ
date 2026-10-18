import os

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.services.seed_data_service import seed_database_if_needed

# Import API Routers
from app.api.auth import router as auth_router
from app.api.student import router as student_router
from app.api.subjects import router as subjects_router
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.topics import router as topics_router
from app.api.questions import router as questions_router
from app.api.exam_pattern import router as exam_pattern_router
from app.api.study_plan import router as study_plan_router
from app.api.answer_coach import router as answer_coach_router
from app.api.feedback import router as feedback_router
from app.api.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist & seed demo data
    print("[ExamIQ] Starting up: initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_needed(db)
    finally:
        db.close()
    yield
    print("[ExamIQ] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.TAGLINE,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(student_router, prefix=settings.API_V1_STR)
app.include_router(subjects_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(topics_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(exam_pattern_router, prefix=settings.API_V1_STR)
app.include_router(study_plan_router, prefix=settings.API_V1_STR)
app.include_router(answer_coach_router, prefix=settings.API_V1_STR)
app.include_router(feedback_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

from fastapi.responses import FileResponse

# Serve document files if directory exists
if os.path.exists(settings.DOCUMENTS_DIR):
    app.mount("/source-files", StaticFiles(directory=settings.DOCUMENTS_DIR), name="source_files")

@app.get("/api/info")
def api_info():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "online",
        "demonstration_subject": "BT14503: Cryptography and Network Security",
        "demo_credentials": {
            "student": {"email": "demo@examiq.edu", "password": "DemoStudent123!"},
            "admin": {"email": "admin@examiq.edu", "password": "AdminPass123!"}
        }
    }

frontend_dist = os.path.join(settings.BASE_DIR, "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="static_assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return api_info()

