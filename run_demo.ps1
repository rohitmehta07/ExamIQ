# ExamIQ PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                    EXAMIQ - Intelligent Exam Strategy" -ForegroundColor White
Write-Host "     'Turn your study material into an intelligent exam strategy.'" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Building frontend bundle..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed. Please check node/npm installation." -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Initializing and launching unified backend server..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\backend"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Web Application:   http://localhost:8000/" -ForegroundColor Green
Write-Host "  API Documentation: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Demo Credentials:" -ForegroundColor White
Write-Host "    - Student Demo:      demo@examiq.edu / DemoStudent123!" -ForegroundColor White
Write-Host "    - Admin Demo:        admin@examiq.edu / AdminPass123!" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

python run.py
