*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud


*** Test Cases ***
# Left search

24. Left menu search: Searchable fields
    [Tags]    C81796    webadmin    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version
    Log in to system new    ${system}    ${system}[cloudOwner]

    IF    '${LANGUAGE}'=='en_US'
        Log    Step 1
        Search For    en
        Wait until elements are visible
        ...    ${LICENSES LINK}
        ...    ${GENERAL LINK}
    END

    Log    Step 2
    Search For    ${CAMERA NAME}
    Run keyword and continue on failure    Wait Until Element is Visible    //span[@class="highlighted" and contains(text(), "${CAMERA NAME}")]

    Log    Steps 3,4,5 - cannot be autotested

    Log    Step 6
    Search For    admin
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="admin"]]

    Log    Step 7
    Search For    viewer
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and contains(text(), "viewer")]

    Log    Step 8
    Search For    ${system}[cloudUsers][viewer]
    ${highlighted}=   Fetch From Right    ${system}[cloudUsers][viewer]    ${TEST EMAIL}+
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${TEST EMAIL}"]/following-sibling::span[contains(@class, "highlighted") and text()="${highlighted}"]

    Log    Step 9
    Search For    ${system}[id]
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${system}[id]"]


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
