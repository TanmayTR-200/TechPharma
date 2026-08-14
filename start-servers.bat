@echo off
echo Starting TechPharma servers...
echo.

echo Starting backend (port 5000)...
cd /d "D:\Project\TechPharma\backend"
start "TechPharma Backend" /min cmd /c "node server.js"

echo Starting frontend (port 3000)...
cd /d "D:\Project\TechPharma\frontend"
set NODE_ENV=development
start "TechPharma Frontend" /min cmd /c "npx next dev -p 3000"

echo.
echo Both servers launched!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Close the minimized "TechPharma Backend" and "TechPharma Frontend" windows to stop them.
echo.
pause
