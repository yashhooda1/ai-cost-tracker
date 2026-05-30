# Start AI Cost Tracker — backend + frontend
# Usage: .\start.ps1

$root = $PSScriptRoot

Write-Host "Starting backend (http://localhost:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 2

Write-Host "Starting frontend (http://localhost:5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "AI Cost Tracker is running:" -ForegroundColor Green
Write-Host "  Dashboard : http://localhost:5173" -ForegroundColor White
Write-Host "  API docs  : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "To seed demo data, run: cd backend; python seed_demo.py" -ForegroundColor Yellow
