@echo off
title SHB Finance Local Dev Server Starter
echo ==========================================
echo   SHB FINANCE LOCAL DEV SERVER STARTER   
echo ==========================================
echo.

echo 1. Clearing port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a holding port 3000...
    taskkill /f /pid %%a >nul 2>&1
)

echo 2. Clearing port 8000 (Backend API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a holding port 8000...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo 3. Starting FastAPI Backend on port 8000...
start "Orchestrator API" cmd /k "cd services\orchestrator-svc && set PYTHONPATH=%CD%;..\..\packages\shared && uvicorn app.main:app --reload --port 8000"

echo 4. Starting Next.js Frontend on port 3000...
start "Next.js Frontend" cmd /k "cd apps\web && npm run dev"

echo.
echo ==========================================
echo   Servers started! Keep CMD windows open.
echo   - Frontend: http://localhost:3000/admin
echo   - Backend:  http://localhost:8000
echo ==========================================
echo.
pause
