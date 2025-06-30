@echo off
title Server on Port 3016
echo Starting server on port 3016...
cd %~dp0
node server.js
echo Server has stopped.
pause
