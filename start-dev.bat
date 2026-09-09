@echo off
setlocal enabledelayedexpansion
title Medi7 Launcher

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "UVICORN=%BACKEND%\venv\Scripts\uvicorn.exe"
set "PYTHON=%BACKEND%\venv\Scripts\python.exe"

cls
echo.
echo  ============================================
echo        MEDI7 Hospital Management System
echo  ============================================
echo.

:: ── Checks ───────────────────────────────────
if not exist "%UVICORN%" (
    echo  [ERROR] venv not found. Run setup first:
    echo    cd backend
    echo    python -m venv venv
    echo    venv\Scripts\pip install -r requirements-local.txt
    pause & exit /b 1
)
where npm >nul 2>&1 || (
    echo  [ERROR] npm not found. Install Node.js from https://nodejs.org
    pause & exit /b 1
)

echo  [OK] Python venv
echo  [OK] npm / Node.js
echo.

:: ── Kill stale processes on ports 8000 & 5173 ─
echo  Clearing old processes on ports 8000 and 5173...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

:: ── Launch Backend ────────────────────────────
echo  Starting Backend  (http://localhost:8000) ...
start "Medi7-Backend" /D "%BACKEND%" "%UVICORN%" app.main:app --reload --host 0.0.0.0 --port 8000

timeout /t 3 /nobreak >nul

:: ── Launch Frontend ───────────────────────────
echo  Starting Frontend (http://localhost:5173) ...
start "Medi7-Frontend" /D "%FRONTEND%" cmd /c "npm run dev & pause"

:: ── Summary ───────────────────────────────────
echo.
echo  ─────────────────────────────────────────
echo   Medi7 is live!
echo.
echo   Frontend  ->  http://localhost:5173
echo   Backend   ->  http://localhost:8000
echo   API Docs  ->  http://localhost:8000/docs
echo  ─────────────────────────────────────────
echo.
echo  This window will close in 5 seconds.
timeout /t 5 /nobreak >nul
