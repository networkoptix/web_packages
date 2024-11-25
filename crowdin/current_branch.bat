@echo off
set REPO=[cloud_portal]
for /F %%A In ('git symbolic-ref --short HEAD') do set CURRENT_BRANCH=%REPO%%%A
echo Current branch is %CURRENT_BRANCH%
