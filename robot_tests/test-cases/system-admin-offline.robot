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
@{cloud auth}    ${EMAIL OWNER}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
    FOR    ${user email}   ${user role}    IN ZIP   ${AUTO TESTS USERS.keys()}     ${AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${cloud system id}    ${user role}    ${user email}
    END
    Open Browser and go to URL    ${url}
    
*** Test Cases ***
The page is opened and shows the user list to owner
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Location Should Be    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    # Title Should Be    Systems - ${PRODUCT_NAME}
    Wait Until Element Is Enabled    ${RENAME SYSTEM}
    Wait Until Element Is Enabled    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${USERS LIST LINK}    
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${USERS LIST}

Should confirm, if owner deletes system (You are going to disconnect your system from cloud)
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL BUTTON}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}

Offline system should confirm, if not owner deletes system (You will lose access to this system)
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL BUTTON}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

Share button should be disabled
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Page Does Not Contain Element    //div[contains(@uib-modal-backdrop, "modal-backdrop")]
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}${DISABLED}

Merge button is disabled
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Page Does Not Contain Element    //div[contains(@uib-modal-backdrop, "modal-backdrop")]
    Wait Until Element Is Visible    ${MERGE BUTTON SYSTEM}${DISABLED}

Open in nx button should be disabled
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}

Should show offline next to system name
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

Should not be able to delete/edit users
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    ${USERS LIST}//nx-level-3-item//span[text()='${EMAIL VIEWER}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Elements Are Visible    ${ACCESS LEVEL DROPDOWN}${DISABLED}    ${REMOVE USER BUTTON}${DISABLED}

Offline system should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

Offline system should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    button=None
    Verify In System    Auto Tests 2

Offline system should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    C41572    Threaded    System-offline
    Log In    ${EMAIL NOPERM}    ${password}
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${AVAILABLE SYSTEMS LIST}
    Click Link    ${AVAILABLE SYSTEMS LIST}
    # If there is another system connected to account url is different from ${url}/systems
    ${actual url}=   Get Location
    Should not Contain    ${actual url}    ${AUTOTESTS OFFLINE SYSTEM ID}
    # Location Should Be    ${url}/systems

Offline system should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL NOPERM}   ${password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Offline system rename button opens dialog and clicking cancel closes rename dialog without rename
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    Auto Tests 2

Offline system clicking 'X' closes rename dialog without rename
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS 2}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    Auto Tests 2

Offline system clicking save with no input in rename dialog throws error
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Input Text    ${RENAME INPUT}    ${SPACE}
    Press Keys    ${RENAME INPUT}    BACKSPACE
    Click Button    ${RENAME SAVE}
    Wait Until Elements Are Visible    ${RENAME INPUT WITH ERROR}    ${SYSTEM NAME IS REQUIRED}
    Click Button    ${RENAME CANCEL}

Owner is able to rename offline system via Cloud
    [Tags]    C41899    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    ${current name}=   Get text    ${SYSTEM NAME}
    ${new name}=   Get random system name
    Open Rename System Dialog
    Input Text    ${RENAME INPUT}    ${new name}
    Click button    ${RENAME SAVE}
    Log Out

    # Make sure new name is saved
    ${system info}=   Get Cloud System Settings    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}
    Should be equal as strings    ${system info}[name]     ${new name}

    # Return to initial name
    Rename System    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}    ${current name}

    # Make sure old name is saved
    ${system info}=   Get Cloud System Settings    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}
    Should be equal as strings    ${system info}[name]     ${current name}

Does not show Share button to viewer, advanced viewer, live viewer
    [Tags]    Threaded    System-offline
    @{emails}    Set Variable    ${EMAIL VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL ADV VIEWER}
    FOR    ${user}    IN    @{emails}
        Log in to Autotests 2 System    ${user}
        Elements Should Not Be Visible    ${USERS LIST LINK}    ${ADD USER BUTTON SYSTEMS}
        Log Out
    END

Your permissions is shown for non-owners
    [Tags]    Threaded    C41881    System-offline
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}    ${EMAIL ADMIN}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}     ${ADMIN TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests 2 System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),"${text}")]
        Log Out
    END

Should show (you) for owner and (owner's name & email) for non-owners
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}

System changes state to offline if all its Servers goes offline
    [Tags]    C41894    System-offline
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}
    Log    Step 2
    Open Connection    10.1.5.126
    SSHLibrary.Login    docker-server-factory    qweasd 123    
    ${results}    Execute Command    docker container stop autotests
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}    31
    Log    Step 3
    ${results}    Execute Command    docker container start autotests
    Wait Until Element Is Not Visible    ${SYSTEM NAME OFFLINE}    65