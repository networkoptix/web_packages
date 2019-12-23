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
Cancel should cancel disconnection and disconnect should remove it when not owner
    [tags]    C41884
    Log In    ${EMAIL OWNER}    ${password}

    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Sleep    .5
    Wait Until Element Is Visible    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${EMAIL NOT OWNER}
    Wait Until Element Contains    ${SHARE PERMISSIONS DROPDOWN}    ${VIEWER TEXT}
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${NEW PERMISSIONS SAVED}

    Log Out
    Log In To Auto Tests System    ${EMAIL NOT OWNER}
    Validate Log In
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL CANCEL}

    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Element Is Not Visible    ${DISCONNECT MODAL WARNING}
    Wait Until Page Does Not Contain Element    //div[@modal-render='true']

    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${MODAL DIALOG}    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}
    ${SYSYEM DELETED FROM ACCOUNT}    Replace String    ${SYSYEM DELETED FROM ACCOUNT}    {{system_name}}    ${AUTO TESTS}
    Check For Alert    ${SYSYEM DELETED FROM ACCOUNT}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

    Log Out
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In

    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${SHARE BUTTON SYSTEMS}
    Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}

    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${EMAIL NOT OWNER}
    Wait Until Element Contains    ${SHARE PERMISSIONS DROPDOWN}    ${VIEWER TEXT}
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${NEW PERMISSIONS SAVED}

should display same user data as user provided during registration
    [tags]    email    Threaded
#create user
    ${random email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/register
    Register    ${COMBO TEXT}    ${COMBO TEXT}    ${random email}    ${password}
    Activate    ${random email}
#share system with new user
    Log in to Auto Tests System    ${EMAIL OWNER}
    Share To    ${random email}    ${ADMIN TEXT}
    Log Out
    Validate Log Out

#verify user was added with appropriate name
    Log In    ${random email}    ${password}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
#click link containing user's email
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${random email}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
#verify name displayed
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header/span[contains(text(),'${COMBO TEXT} ${COMBO TEXT}')]

#remove new user from system
    Log Out
    Validate Log Out
    Log in to Auto Tests System    ${EMAIL OWNER}
    Remove User Permissions    ${random email}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    Delete All Emails
    Close Mailbox

should display same user data as shown in user account
    [tags]    email    C41573    C41842    Threaded
#create user
    ${random email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/register
    Register    mark    hamill    ${random email}    ${password}
    Activate    ${random email}
#share system with new user
    Log in to Auto Tests System    ${EMAIL OWNER}
    Share To    ${random email}    ${VIEWER TEXT}
    Log Out

    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    mark
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    hamill
    # sometimes the text field refills itself if I don't wait a second
    sleep    1
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${COMBO TEXT}
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT LAST NAME}    ${COMBO TEXT}
    sleep    .15
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out

    Log in to Auto Tests System    ${email}
    Go to Users List
#click link containing user's email
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${random email}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
#verify name displayed
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header/span[contains(text(),'${COMBO TEXT} ${COMBO TEXT}')]

    #remove new user from system
    Log Out
    Log in to Auto Tests System    ${EMAIL OWNER}
    Remove User Permissions    ${random email}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    Delete All Emails
    Close Mailbox
    