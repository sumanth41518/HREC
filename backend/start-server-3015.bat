@echo off
title Server on Port 3015
echo Starting server on port 3015...
cd %~dp0
node server.js
echo Server has stopped.
pause
