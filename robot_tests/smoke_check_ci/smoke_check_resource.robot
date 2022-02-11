*** Settings ***
Resource     ../resource.robot
Resource     ../variables.robot
Resource     smoke_check_variables.robot
#Variables    get_variables.py    ${ENV}    ${VMS}

*** Keywords ***
#Open browser headless no sandbox
#    [Arguments]    ${url}
#    Open Browser    ${url}    chrome    options=add_argument("--no-sandbox"); add_argument("--headless")

Base Suite Setup
    Open browser and go to url    ${ENV}    False    False
    ${registered}=   Run keyword and return status    Get Account Data    ${BASE EMAIL}    ${base password}
    IF    not $registered
        Register and activate account    Base    User    ${BASE EMAIL}    ${base password}    reg=ui    act=ui
    END
    Go To    ${ENV}
