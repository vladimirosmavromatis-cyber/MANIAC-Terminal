@echo off
echo Starting Sol Scanner...
cd /d "%~dp0"
echo Installing dependencies (first time may take a minute)...
call npm install
echo.
echo Starting dev server...
echo Once you see a URL like http://localhost:5173 -- open it in your browser!
echo Press Ctrl+C to stop the app.
echo.
call npm run dev
pause