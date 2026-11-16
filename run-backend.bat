@echo off
title KMN backend
cd /d "%~dp0backend"
echo Starting the event API at http://localhost:4001
npm run dev
echo.
echo The event API stopped.
pause
