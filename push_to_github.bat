@echo off
git init
git add .
git commit -m "Initial commit of HREC project"
git branch -M main
git remote add origin https://github.com/sumanth41518/HREC.git
git push -u origin main
@echo on
