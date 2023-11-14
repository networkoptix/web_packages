*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Server Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     account-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Account Server Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Account Server Suite Teardown
Force Tags        account
