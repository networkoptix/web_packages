*** Settings ***
Resource          ../../resource.robot
Resource          ipvd-resource.robot

*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Restart
    Common Restart Logout    ${url}

Login Everywhere Test Teardown
    Run Keyword If Test Failed    login-everywhere-resource.Open New Browser On Failure