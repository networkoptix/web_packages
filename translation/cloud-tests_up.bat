call current_branch.bat
crowdin upload sources -b %CURRENT_BRANCH% --config crowdin-cloud-autotests.yaml
