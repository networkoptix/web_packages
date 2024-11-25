@echo off
setlocal
cd %~dp0
call current_branch.bat
crowdin upload sources -b %CURRENT_BRANCH% --config config.yaml
