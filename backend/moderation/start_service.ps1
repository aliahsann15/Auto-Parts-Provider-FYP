# Start Chat Moderation Service
# Run this from backend/moderation directory

Write-Host "Starting Chat Moderation Service..." -ForegroundColor Green
Write-Host ""

$pythonPath = "D:\auto-parts-provider\.venv\Scripts\python.exe"
$scriptPath = Join-Path $PSScriptRoot "main.py"

& $pythonPath $scriptPath
