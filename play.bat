@echo off
cd /d "%~dp0"
if not exist "node_modules\" npm install --silent
echo Starting Tetris...
npx vite --port 5173 --open
pause
