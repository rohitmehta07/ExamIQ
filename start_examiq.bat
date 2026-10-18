@echo off
title ExamIQ - Academic Exam Strategy Platform
echo ======================================================================
echo                     EXAMIQ - Intelligent Exam Strategy
echo      "Turn your study material into an intelligent exam strategy."
echo ======================================================================
echo.

echo [1/3] Checking environment...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python not found in PATH. Please ensure Python 3.10+ is installed.
    pause
    exit /b 1
)

echo [2/3] Building frontend bundle...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Frontend build failed.
    pause
    exit /b 1
)
cd ..

echo [3/3] Starting Unified ExamIQ Server on http://localhost:8000/ ...
echo.
echo ======================================================================
echo  Open your browser at:
echo    - Web Application: http://localhost:8000/
echo    - API Documentation: http://localhost:8000/docs
echo.
echo  Demo Credentials:
echo    - Student Demo: demo@examiq.edu / DemoStudent123!
echo    - Admin / Examiner: admin@examiq.edu / AdminPass123!
echo ======================================================================
echo.
cd backend
python run.py
pause
