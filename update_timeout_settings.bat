@echo off
git add .
git commit -m "Increase MongoDB connection timeout to address buffering timeout error"
git push origin main
@echo on
