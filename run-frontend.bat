@echo off
title KMN frontend
cd /d "%~dp0frontend"
echo Starting the event site at http://localhost:5174
npm run dev
echo.
echo The event site stopped.
pause
