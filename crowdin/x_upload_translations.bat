@echo off
setlocal
cd %~dp0
call current_branch.bat
crowdin upload translations -b %CURRENT_BRANCH% --config config.yaml --no-auto-approve-imported --no-import-eq-suggestions %*
