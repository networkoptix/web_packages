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
    [Arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}' == '${EMAIL OWNER}' or '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Check System Text
    [Arguments]    ${user}
    Log Out
    Log in to Auto Tests System    ${user}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}
    Run Keyword Unless    "${user}"=="${EMAIL ADMIN}"    Wait Until Element Is Not Visible    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
#    Make sure notowner is in the system
    Add user to cloud system if not there    ${AUTO_TESTS SYSTEM ID}    ${VIEWER TEXT}    ${EMAIL NOTOWNER}
    Open Browser and go to URL    ${url}

Restart
    Common Restart Logout    ${url}

Share with Adminstrator
    [Arguments]    ${random email}
    Wait Until Element is Visible    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${random email}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    ${admin selector}=   /following-sibling::div/button/span[text()='${ADMIN TEXT}']
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}${admin selector}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}${admin selector}/..
    Click Button    ${SHARE BUTTON MODAL}

Check Special Hint
    [Arguments]    ${type}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${type}']
    Run Keyword If    "${LANGUAGE}"=="nl_NL"    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()="${type}"]
    Wait Until Element is Visible    ${dropdown type}
    Sleep    1
    Click Link    ${dropdown type}/..
    ${type}    Convert To Uppercase    ${type}
    Run Keyword If    "${type}"=="${ADMIN TEXT}"          Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT ADMINISTRATOR}
    ...    ELSE IF    "${type}"=="${ADV VIEWER TEXT}"     Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT ADVANCED VIEWER}
    ...    ELSE IF    "${type}"=="${VIEWER TEXT}"         Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT VIEWER}
    ...    ELSE IF    "${type}"=="${LIVE VIEWER TEXT}"    Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT LIVE VIEWER}
    ...    ELSE IF    "${type}"=="${CUSTOM TEXT}"         Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT CUSTOM}

*** Test Cases ***
Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884
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
    [Tags]    email    Threaded
#create user
    ${random email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/register
    Register    ${COMBO TEXT}    ${COMBO TEXT}    ${random email}    ${password}
    Activate    ${random email}
#share system with new user
    Log in to Auto Tests System    ${EMAIL OWNER}
    Share To    ${random email}    ${ADMIN TEXT}
    Log Out

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
    Log in to Auto Tests System    ${EMAIL OWNER}
    Remove User Permissions    ${random email}
    # Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    # Delete All Emails
    # Close Mailbox

Should display same user data as shown in user account
    [Tags]    email    C41573    C41842    Threaded
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
    # Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    # Delete All Emails
    # Close Mailbox

Share button - opens dialog
    [Tags]    C41888    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

Sharing link for anonymous - first ask login, then show share dialog
    [Tags]    Threaded
    Log in to Auto Tests System    ${email}
    ${location}    Get Location
    Log Out
    Go To    ${location}/share
    Log In    ${email}    ${password}    button=None
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

After closing dialog, called by link - clear link
    [Tags]    C41888    Threaded    CLOUD-3733
    Log in to Auto Tests System    ${email}

#Check Cancel Button
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CANCEL}
    Click Button    ${SHARE CANCEL}
    Wait Until Element is Not Visible    ${SHARE MODAL}
    Wait Until Location contains    ${url}/systems/${AUTO TESTS SYSTEM ID}/users

#Check 'X' Button
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CLOSE}
    Wait Until Element is Visible    ${SHARE CLOSE}
    Click Button    ${SHARE CLOSE}
    Wait Until Element is Not Visible    ${SHARE MODAL}
    Wait Until Location Contains    ${url}/systems/${AUTO TESTS SYSTEM ID}/users

Sharing roles are ordered: more access is on top of the list with options
    [Tags]    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Element    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']/../../following-sibling::li/a/span[text()="${ADV VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${LIVE VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="Client Custom"]/../../following-sibling::li/a/span[text()="${CUSTOM TEXT}"]
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

When user selects role - special hint appears
    [Tags]    C41901    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    FOR    ${type}    IN    @{USER TYPE LIST}
        Run Keyword Unless    "${type}"=="${OWNER TEXT}"    Check Special Hint    ${type}
    END
    Click Button    ${SHARE CANCEL}

Sharing works
    Log in to Auto Tests System    ${email}
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Go To Users List
    Share To    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Remove User Permissions    ${random email}

Admin cannot delete or edit self
    [Tags]    C41904    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Select user in Users List    ${EMAIL ADMIN}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}

Admin cannot edit self via share
    [Tags]    C41904    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${EMAIL ADMIN}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']
    Sleep    1
    Click Link
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']/..
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${CANNOT SHARE SYSTEM}${SPACE}${SPACE}${CHANGING OWN PERMISSIONS IS NOT ALLOWED}
    Wait Until Element is Visible    ${SHARE CANCEL}
    Click Button    ${SHARE CANCEL}

Owner cannot edit self via share
    [Tags]    C41904    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${EMAIL OWNER}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']
    Sleep    1
    Click Link
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']/..
    Sleep    1
    Click Button    ${SHARE BUTTON MODAL}
    Click Button    ${SHARE CLOSE}
    Check For Alert    ${CANNOT SHARE SYSTEM}${SPACE}${SPACE}${CHANGING OWN PERMISSIONS IS NOT ALLOWED}

Admin cannot delete or edit other admins
    [Tags]    C41905
    Go To    ${url}/register
    ${random email}    Get Random Email    ${BASE EMAIL}
    Register    mark    harmill    ${random email}    ${password}
    Activate    ${random email}
    Log in to Auto Tests System    ${email}
    Share To    ${random email}    ${ADMIN TEXT}
    Log Out
    Log in to Auto Tests System    ${random email}
    Select user in Users List    ${EMAIL ADMIN}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}
    Log Out
    Log in to Auto Tests System    ${email}
    Remove User Permissions    ${random email}

Admin cannot invite another admin
    [Tags]    C41905    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Sleep    2
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']
    Element Should Not Be Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE CANCEL}

Edit permission works
    [Tags]    C41900
    ${random email}    Get Random Email    ${BASE EMAIL}
    # Maximize Browser Window
    Log in to Auto Tests System    ${email}
    Share To    ${random email}    ${ADMIN TEXT}
    Edit User Permissions In Systems    ${random email}    ${CUSTOM TEXT}
    Check User Permissions    ${random email}    ${CUSTOM TEXT}
    Edit User Permissions In Systems    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Remove User Permissions    ${random email}

Delete user works
    [Tags]    email    C41903
    Go To    ${url}/register
    ${random email}    Get Random Email    ${BASE EMAIL}
    Register    mark    harmill    ${random email}    ${password}
    Activate    ${random email}
    Log in to Auto Tests System    ${email}
    Share To    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Log Out
    Validate Log Out
    Log in to Auto Tests System    ${random email}
    Log Out
    Log in to Auto Tests System    ${email}
    Select user in Users List    ${random email}
    Wait Until Element Is Visible    ${REMOVE USER BUTTON}
    Click Button    ${REMOVE USER BUTTON}
    Wait Until Element is Visible    ${REMOVE CANCEL BUTTON}
    Click Button    ${REMOVE CANCEL BUTTON}
    Remove User Permissions    ${random email}
    Go To    ${url}
    Log Out
    Log In    ${random email}    ${password}
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}

Share with registered user works and sends him notification
    [Tags]    email    C41888
    #log in as noperm to check language and change its language to the current testing language
    #otherwise it may receive the notification in another language and fail the email subject comparison
    Log In    ${EMAIL NOPERM}    ${password}
    Sleep    1
    Log Out
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${EMAIL NOPERM}    ${ADMIN TEXT}
    Check User Permissions    ${EMAIL NOPERM}    ${ADMIN TEXT}
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${AUTO TESTS}
    ${emailID}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120
    Check Email Subject
    ...    ${emailID}
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${emailID}
    Close Mailbox
    Log Out
    Log in to Auto Tests System    ${EMAIL NOPERM}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Check User Permissions    ${EMAIL NOPERM}    ${ADMIN TEXT}
    Log Out
    Log in to Auto Tests System    ${email}
    Remove User Permissions    ${EMAIL NOPERM}

Share with unregistered user - brings them to registration page with code with correct email locked
    [Tags]    email    C41889
    ${random email}    Get Random Email    ${BASE EMAIL}
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Log Out
    ${link}    Get Email Link    ${random email}    register
    Go To    ${link}
    Validate on Register Page
    Input Text    ${REGISTER FIRST NAME INPUT}    ${TEST FIRST NAME}
    Input Text    ${REGISTER LAST NAME INPUT}    ${TEST LAST NAME}
    ${read only}    Run Keyword And Return Status    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}    10
    Run Keyword Unless    ${read only}    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}
    Validate Log In

Sharing system with a user who is already in the list updates their permissions
    [Tags]    C41892
    ${random email}    Get Random Email    ${BASE EMAIL}
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${random email}    ${ADMIN TEXT}
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
  # TOOD Fix the next line intermittently failing.
    Run Keyword And Expect Error    *    Wait For Email    recipient=${EMAIL ADMIN}    timeout=30
    # Delete All Emails
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Share To    ${random email}    ${VIEWER TEXT}
    ${email}=   Wait For Email    recipient=${random email}    timeout=120
    Delete Email    ${email}
    Close Mailbox
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Remove User Permissions    ${random email}

Check share email for registered user
    [Tags]    C47297
    #log in as noperm to check language and change its language to the current testing language
    #otherwise it may receive the notification in another language and fail the email subject comparison
    Log In    ${EMAIL NOPERM}    ${password}
    Validate Log In
    Sleep    1
    Log Out
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${EMAIL NOPERM}    ${ADMIN TEXT}
    Check User Permissions    ${EMAIL NOPERM}    ${ADMIN TEXT}
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${AUTO TESTS}
    ${email}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8
    Check Email Subject
    ...    ${email}
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable
    ...    ${SUPPORT URL}
    ...    ${WEBSITE URL}
    ...    ${ENV}
    ...    ${ENV}/systems/${AUTO_TESTS SYSTEM ID}
    ...    mailto:${EMAIL OWNER}
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox
    Remove User Permissions    ${EMAIL NOPERM}

User with client custom settings has access to system
    [Tags]    Threaded
    Log in to Auto Tests System    ${EMAIL CLIENT CUSTOM}
    Location Should Be    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Verify In System    ${AUTO TESTS}

User can be invited with client custom permissions
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${random email}    Get Random Email    ${BASE EMAIL}
    Share To    ${random email}    Client Custom
    ${email}=   Wait For Email    recipient=${random email}    timeout=120
    Check User Permissions    ${random email}    Client Custom
    Sleep    2
    Remove User Permissions    ${random email}
    Delete Email    ${email}
    Close Mailbox

Disable enable User on Cloud Portal correctly affects the User on Cloud Portal
    [Tags]    C63390
    # Step 1
    Log    Step 1
    Log in to Auto Tests System    ${email}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    # Step 2
    Log    Step 2
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    # Step 3
    Log    Step 3
    Log Out
    Go To    ${ENV}/systems
    Log In   ${EMAIL NOT OWNER}    ${BASE PASSWORD}    button=None
    Wait Until Location Is    ${ENV}/systems
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    # Step 4
    Log    Step 4
    Log Out
    Log in to Auto Tests System    ${email}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}
    # Step 5
    Log    Step 5
    Log Out
    Log in to Auto Tests System    ${EMAIL NOT OWNER}
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}

Administrator can add, disable and enable Viewer
    [Tags]    C63391
    # Prep - create new user to be added to autotest system
    Log    Prep
    Go To    ${url}/register
    ${random email} =    Get Random Email    ${BASE EMAIL}
    Register    mark    harmill    ${random email}    ${BASE PASSWORD}
    Activate    ${random email}
    # Step 1 & 2
    Log    Steps 1 & 2
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Share To    ${random email}   ${VIEWER TEXT}
    Select user in Users List    ${random email}
    # Step 3
    Log    Step 3
    Log Out
    Go To     ${ENV}/systems
    Log In    ${random email}    ${BASE PASSWORD}    button=None
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    Wait Until Element Is Visible    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]
    # Step 4
    Log     Step 4
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    # Step 5
    Log    Step 5
    Log Out
    Go To    ${ENV}/systems
    Log In   ${random email}    ${BASE PASSWORD}    button=None
    Wait Until Location Is    ${ENV}/systems
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    # Step 6
    Log    Step 6
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}
    # Step 7
    Log    Step 7
    Log Out
    Go To     ${ENV}/systems
    Log In    ${random email}    ${BASE PASSWORD}    button=None
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    Wait Until Element Is Visible    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]

Only Admin and Owner can access the share URL
    Log     Owner test
    Log in to Auto Tests System    ${EMAIL OWNER}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Wait Until Elements are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Click Button    ${SHARE CANCEL}
    Log Out

    Log     Admin test
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Wait Until Elements are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Click Button    ${SHARE CANCEL}
    Log Out

    Log     Viewer test
    Log in to Auto Tests System    ${EMAIL VIEWER}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Check For Alert    ${NO PERMISSION TO SHARE TEXT}
    Log Out

    Log     Custom test
    Log in to Auto Tests System    ${EMAIL CUSTOM}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Check For Alert    ${NO PERMISSION TO SHARE TEXT}
    Log Out

    Log     Client Custom test
    Log in to Auto Tests System    ${EMAIL CLIENT CUSTOM}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Check For Alert    ${NO PERMISSION TO SHARE TEXT}
    Log Out

    Log     Advanced Viewer test
    Log in to Auto Tests System    ${EMAIL ADV VIEWER}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Check For Alert    ${NO PERMISSION TO SHARE TEXT}
    Log Out

    Log     Live Viewer test
    Log in to Auto Tests System    ${EMAIL LIVE VIEWER}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/share
    Check For Alert    ${NO PERMISSION TO SHARE TEXT}
    Log Out
