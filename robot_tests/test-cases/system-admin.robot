*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud


*** Test Cases ***
# Disconnect System from Cloud
25. Disconnect dialog interface checks
    [Tags]    C48834    webadmin
    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log     Step 2
    #Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}
    Click Element    ${DISCONNECT FORM CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 3
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    # removing the below step since no password is needed anymore in order to disconnect system from cloud
    #Log    Step 4
    #Click Button    ${DISCONNECT FROM NX}
    #Validate Disconnect Form
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #The below steps commented out since password field was removed from "Discconect System from Nx Cloud"
    #Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}

    #Log    Step 5
    #Input Text    ${DISCONNECT PASSWORD INPUT}    khgwearfgak
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM WRONG PASSWORD}
    #${input class}=   Get Element Attribute    ${DISCONNECT PASSWORD INPUT}    class
    #Should Contain    ${input class}    ng-invalid
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    #Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    #Wait Until Element Is Not Visible    ${DISCONNECT FORM}
