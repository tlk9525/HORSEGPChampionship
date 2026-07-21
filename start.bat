@echo off
echo Starting Horse Racing Championship...

:: Start backend in a new window
start "Backend" cmd /k "npm run api"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak

:: Start frontend in a new window
start "Frontend" cmd /k "npm run dev"

echo Done! Open http://127.0.0.1:5173 in your browser.
pause