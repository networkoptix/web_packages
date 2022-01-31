*** Settings ***
Resource     ../resource.robot
Resource     ../variables.robot
Resource     smoke_check_variables.robot
Variables    get_variables.py    ${ENV}    ${VMS}

*** Keywords ***
Open browser headless no sandbox
    [Arguments]    ${url}
    Open Browser    ${url}    chrome    options=add_argument("--no-sandbox"); add_argument("--headless")