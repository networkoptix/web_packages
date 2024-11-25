@echo off
setlocal
cd %~dp0
call current_branch.bat
crowdin download -b %CURRENT_BRANCH% --config config.yaml --debug %*
