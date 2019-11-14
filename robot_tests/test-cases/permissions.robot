*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser on Failure
Suite Teardown    Close All Browsers
Force Tags        System

*** Variables ***
${email}           ${EMAIL OWNER}
${password}        ${BASE PASSWORD}
${url}             ${ENV}

*** Keywords ***
Log in to Auto Tests System
    [arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    None
    Validate Log In
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements are Visible
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${RENAME SYSTEM}
    Run Keyword Unless
    ...    '${email}' == '${EMAIL OWNER}' or '${email}' == '${EMAIL ADMIN}'
    ...    Wait Until Elements are Visible    ${DISCONNECT FROM MY ACCOUNT}

Share with Adminstrator
    [arguments]    ${random email}
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

Check Log In
    Log In    ${EMAIL UNREGISTERED}    ${password}
    Check For Alert    ${ACCOUNT DOES NOT EXIST}
    Log In    ${email}    ${password}    None
    Validate Log In

Check Special Hint
    [arguments]    ${type}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${type}']
    Run Keyword If    "${LANGUAGE}"=="nl_NL"    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()="${type}"]
    Wait Until Element is Visible    ${dropdown type}
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

Restart
    Register Keyword To Run On Failure    NONE
    ${status}    Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out

Reset DB and Open New Browser on Failure
    Close Browser
    Clean up random emails
    Clean up email noperm
    Open Browser and go to URL    ${url}

*** Test Cases ***
Share button - opens dialog
    [tags]    C41888    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

Sharing link /systems/{system_id}/share - opens dialog
    [tags]    Threaded
    Log in to Auto Tests System    ${email}
    ${location}    Get Location
    Go To    ${location}/share
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

Sharing link for anonymous - first ask login, then show share dialog
    [tags]    Threaded
    Log in to Auto Tests System    ${email}
    ${location}    Get Location
    Log Out
    Go To    ${location}/share
    Log In    ${email}    ${password}    button=None
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

After closing dialog, called by link - clear link
    [tags]    C41888    Threaded    CLOUD-3733
    Log in to Auto Tests System    ${email}
    ${location}    Get Location

#Check Cancel Button
    Go To    ${location}/share
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CANCEL}
    Click Button    ${SHARE CANCEL}
    Wait Until Element is Not Visible    ${SHARE MODAL}
    ${location2}    Get Location

#Check 'X' Button
    Go To    ${location}/share
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CLOSE}
    Wait Until Element is Visible    ${SHARE CLOSE}
    Click Button    ${SHARE CLOSE}
    Wait Until Element is Not Visible    ${SHARE MODAL}
    Location Should Be    ${location2}

Sharing roles are ordered: more access is on top of the list with options
    [tags]    Threaded
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
    [tags]    C41901    Threaded
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
    ${random email}    Get Random Email    ${BASE EMAIL}
    Share To    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Remove User Permissions    ${random email}

Admin cannot delete or edit self
    [tags]    C41904    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Select user in Users List    ${EMAIL ADMIN}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}

Admin cannot edit self via share
    [tags]    C41904    Threaded
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
    Click Link
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']/..
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${CANNOT SHARE SYSTEM}${CHANGING OWN PERMISSIONS IS NOT ALLOWED}
    Wait Until Element is Visible    ${SHARE CANCEL}
    Click Button    ${SHARE CANCEL}

Owner cannot edit self via share
    [tags]    C41904    Threaded
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
    Click Link
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']/..
    Click Button    ${SHARE BUTTON MODAL}
    Click Button    ${SHARE CLOSE}
    Check For Alert    ${CANNOT SHARE SYSTEM}${SPACE}${SPACE}${CHANGING OWN PERMISSIONS IS NOT ALLOWED}

Admin cannot delete or edit other admins
    [tags]    C41905
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
    [tags]    C41905    Threaded
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
    [tags]    C41900
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
    [tags]    email    C41903
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
    [tags]    email    C41888
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
    [tags]    email    C41889
    ${random email}    Get Random Email    ${BASE EMAIL}
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Log Out
    Validate Log Out
    ${link}    Get Email Link    ${random email}    register
    Go To    ${link}
    Register
    ...    ${TEST FIRST NAME}
    ...    ${TEST LAST NAME}
    ...    ${random email}
    ...    ${password}
    Validate Log In

Sharing system with a user who is already in the list updates their permissions
    [tags]    C41892
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
    Delete All Emails
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Share To    ${random email}    ${VIEWER TEXT}
    Delete All Emails
    Close Mailbox
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Remove User Permissions    ${random email}

Check share email for registered user
    [tags]    C47297
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
    Delete All Emails
    Close Mailbox
    Remove User Permissions    ${EMAIL NOPERM}

User with client custom settings has access to system
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL CLIENT CUSTOM}
    Location Should Be    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Verify In System    ${AUTO TESTS}

User can be invited with client custom permissions
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${random email}    Get Random Email    ${BASE EMAIL}
    Share To    ${random email}    Client Custom
    Check User Permissions    ${random email}    Client Custom
    Sleep    2
    Remove User Permissions    ${random email}
    Delete All Emails
    Close Mailbox