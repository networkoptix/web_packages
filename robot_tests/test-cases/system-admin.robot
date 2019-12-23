*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Log in to Auto Tests System
    [arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Validate Log In
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}' == '${EMAIL OWNER}' or '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Check System Text
    [arguments]    ${user}
    Log Out
    Log in to Auto Tests System    ${user}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}
    Run Keyword Unless    "${user}"=="${EMAIL ADMIN}"    Wait Until Element Is Not Visible    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    Make sure notowner is in the system
    Open Browser and go to URL    ${url}

Restart
    Register Keyword To Run On Failure    NONE
    ${status}    Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out
    Go To    ${url}

*** Test Cases ***
systems dropdown should allow you to go back to the systems page
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Location Should Be    ${url}/systems
    Run keyword and continue on failure    Title Should Be    ${SYSTEMS TITLE TEXT} - ${PRODUCT_NAME}


should confirm, if owner deletes system (You are going to disconnect your system from cloud)
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

should confirm, if not owner deletes system (You will lose access to this system)
    [tags]    Threaded
    Log In To Auto Tests System    ${EMAIL NOT OWNER}
    Validate Log In
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL WARNING}
    Click Element    ${DISCONNECT MODAL WARNING}
    Sleep    .5
    Wait Until Element Is Visible    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

correct items are shown for owner
    [tags]    C41560    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}

correct items are shown for admin
    [tags]    C41561    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM MY ACCOUNT}    ${OWNER LABEL}    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

correct items are shown for advanced viewer and below
    [tags]    C41562    Threaded
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER LABEL}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/span[contains(text(),"${text}")]
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Element Should Not Be Visible    ${RENAME SYSTEM}
        Element Should Not Be Visible    ${SHARE BUTTON SYSTEMS}
        Log Out
    END

rename button opens dialog and clicking cancel closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    Auto Tests

clicking 'X' closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME X BUTTON}
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    Auto Tests

clicking save with no input in rename dialog throws error
    [tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    sleep    2
    Input Text    ${RENAME INPUT}    ${SPACE}
    Press Keys    ${RENAME INPUT}    BACKSPACE
    Click Button    ${RENAME SAVE}
    Wait Until Elements Are Visible    ${RENAME INPUT WITH ERROR}    ${SYSTEM NAME IS REQUIRED}
    Click Button    ${RENAME CANCEL}

clicking save in rename dialog renames system
    [tags]    C41880
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests Rename
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests Rename
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests

should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

should open System page by link to not authorized user and show it, after owner logs in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    button=None
    Verify In System    Auto Tests

should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

should open System page by link not authorized user, and show alert if logs in and has no permission
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL NOPERM}    ${password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

should show (your system) for owner and (owner's name) for non-owners
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}
    FOR    ${user}    IN    @{EMAILS LIST}
        Run Keyword Unless    "${user}"=="${EMAIL OWNER}"    Check System Text    ${user}
    END
    
should open a system page in anonymous state
    [tags]    anonymous
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Location should be    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN MODAL} 
    Check Log In    button=None
    