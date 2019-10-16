*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Log in to Autotests 2 System
    [arguments]    ${email}
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${email}    ${password}    None
    Validate Log In
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM MY ACCOUNT}
    Run Keyword Unless    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Restart
    Register Keyword To Run On Failure    NONE
    ${status}    Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out
    Go To    ${url}

Open New Browser On Failure
    Close Browser
    Reset System Names
    Open Browser and go to URL    ${url}

*** Test Cases ***
the page is opened and shows the user list to owner
    [tags]    C41881    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Location Should Be    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${USERS LIST}

should confirm, if owner deletes system (You are going to disconnect your system from cloud)
    [tags]    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL}
    Wait Until Page Does Not Contain Element    ${BACKDROP}

should confirm, if not owner deletes system (You will lose access to this system)
    [tags]    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Validate Log In
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

share button should be disabled
    [tags]    C41881    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Page Does Not Contain Element    //div[contains(@uib-modal-backdrop, "modal-backdrop")]
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${SHARE BUTTON DISABLED}

open in nx button should be disabled
    [tags]    C41881    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON DISABLED}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON DISABLED}

should show offline next to system name
    [tags]    C41881    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

should not be able to delete/edit users
    [tags]    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    ${USERS LIST}//nx-level-3-item//span[text()='${EMAIL VIEWER}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Elements Are Visible    ${ACCESS LEVEL DROPDOWN}${DISABLED}    ${REMOVE USER BUTTON}${DISABLED}

should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

should open System page by link to not authorized user and show it, after owner logs in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    None
    Verify In System    Auto Tests 2

should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [tags]    C41572    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${AVAILABLE SYSTEMS LIST}
    Click Link    ${AVAILABLE SYSTEMS LIST}
    Location Should Be    ${url}/systems

should open System page by link not authorized user, and show alert if logs in and has no permission
    [tags]    Threaded
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL NOPERM}   ${password}    None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

rename button opens dialog and clicking cancel closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    Auto Tests 2

clicking 'X' closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME X BUTTON}
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS 2}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    Auto Tests 2

clicking save with no input in rename dialog throws error
    [tags]    C41880    Threaded
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    sleep    2
    Input Text    ${RENAME INPUT}    ${SPACE}
    Press Key    ${RENAME INPUT}    ${BACKSPACE}
    Click Button    ${RENAME SAVE}
    Wait Until Elements Are Visible    ${RENAME INPUT WITH ERROR}    ${SYSTEM NAME IS REQUIRED}
    Click Button    ${RENAME CANCEL}

Owner is able to rename offline system via Cloud
    [Tags]    C41889
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Elements Are Visible   ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    ${current name}=   Get text    ${SYSTEM NAME}
    # Rename
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible   ${RENAME INPUT}    ${RENAME SAVE}    ${RENAME CANCEL}    ${RENAME X BUTTON}
    ${new name}=   Get random system name
    Input text    ${RENAME INPUT}    ${new name}
    Click button    ${RENAME SAVE}
    Log Out
    Validate Log Out

    # Make sure new name is saved
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Validate Log In
    Wait until keyword succeeds    3s    1s    Element text should be     ${SYSTEM NAME}   ${new name}

    # Return to initial name
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible   ${RENAME INPUT}    ${RENAME SAVE}    ${RENAME CANCEL}    ${RENAME X BUTTON}
    Input text    ${RENAME INPUT}    ${current name}
    Click button    ${RENAME SAVE}
    Log Out
    Validate Log Out

    # Make sure old name is saved
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Validate Log In
    Wait until keyword succeeds    3s    1s    Element text should be     ${SYSTEM NAME}    ${current name}
    Log Out

does not show Share button to viewer, advanced viewer, live viewer
    [tags]    Threaded
    @{emails}    Set Variable    ${EMAIL VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL ADV VIEWER}
    FOR    ${user}    IN    @{emails}
        Log in to Autotests 2 System    ${user}
        Elements Should Not Be Visible    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SHARE BUTTON SYSTEMS}
        Log Out
    END

Your permissions is shown for non-owners
    [tags]    Threaded    C41881
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}    ${EMAIL ADMIN}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}     ${ADMIN TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests 2 System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/span[contains(text(),"${text}")]
        Log Out
    END

should show (you) for owner and (owner's name & email) for non-owners
    [tags]    C41881    Threaded
    Log in to AutoTests 2 System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${current owner name}    ${OWNER EMAIL}