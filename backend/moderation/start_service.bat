@echo off
REM Start Chat Moderation Service
echo Starting Chat Moderation Service...
echo.

cd /d "%~dp0"
D:\auto-parts-provider\.venv\Scripts\python.exe main.py

pause
