*** Settings ***
Library      SeleniumLibrary    run_on_failure=Failure Tasks
Library      String
Library      Collections
Library      NoptixImapLibrary/
Library      NoptixLibrary/
Library      NoptixLibrary/CloudPortalAPI.py
Resource     variables.robot
Resource     ${variables_file}
Variables    getIds.py    ${ENV}


*** variables ***
${directory}    ${SCREENSHOTDIRECTORY}
${variables_file}    variables-env.robot
${options}    true
${headless}    true
@{chrome_arguments}    --disable-gpu    --no-sandbox    --log-level=3    --start-maximized
@{chrome_arguments_headless}    --disable-infobars    --headless    --disable-gpu    --no-sandbox    --log-level=3
${speed}    0
${selenium_timeout}    30

*** Keywords ***
Open Browser and go to URL
    [Arguments]    ${url}
    Run Keyword If    "${options}"=="false" or "${headless}"=="false"    Regular Open Browser
    ...          ELSE    Open Browser With Options
    Set Selenium Speed    ${speed}
    Set Selenium Timeout    ${selenium_timeout}
    Check Language Anonymous
    Go To    ${url}

Regular Open Browser
    Set Screenshot Directory    ${SCREENSHOT_DIRECTORY}
    ${chrome_options}=    Set Chrome Options
    Create Webdriver    ${BROWSER}    chrome_options=${chrome_options}
    Set Window Size    1920    1080
    Go To    ${ENV}

Open Browser With Options
    Set Screenshot Directory    ${SCREENSHOT_DIRECTORY}
    ${chrome_options}=    Set Chrome Options Headless
    ${system}=    Evaluate    platform.system()    platform
    Run Keyword if    "${system}"=="Darwin"      Create Webdriver    Chrome    chrome_options=${chrome_options}    executable_path=/usr/local/bin/chromedriver
    ...            ELSE    Create Webdriver    Chrome    chrome_options=${chrome_options}
    Set Window Size    1920    1080
    Go to    ${ENV}

Open page anonymously
    [Arguments]    ${url}    ${title}
    Go To    ${url}
    Location should be    ${url}
    Title should be    ${title}

Set Chrome Options
    [Documentation]    Set Chrome options for headless mode
    ${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    FOR    ${option}    IN    @{chrome_arguments}
        Call Method    ${options}    add_argument    ${option}
    END
    [Return]    ${options}

Set Chrome Options Headless
    [Documentation]    Set Chrome options for headless mode
    ${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    FOR    ${option}    IN    @{chrome_arguments_headless}
        Call Method    ${options}    add_argument    ${option}
    END
    [Return]    ${options}


Check Language Anonymous
    Register Keyword To Run On Failure    NONE
    ${lang}=   Get Language Anonymous    ${ENV}
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword Unless    "${lang}"=="${LANGUAGE}"   Set Language Anonymous

Check Langauge Logged In
    Register Keyword To Run On Failure    NONE
    # this is a temorary fix.  Future update will use API calls
    ${previous location}=   Get Location
    Go To    ${ENV}/account
    ${status}=    Run Keyword And Return Status    Wait Until Element Is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang='${LANGUAGE}']    15
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    "${status}"=="False"    Set Language
    Run Keyword If    "${status}"=="False"    Click Button    ${ACCOUNT SAVE}
    Sleep    5
    Go To    ${previous location}

Set Language Anonymous
    [arguments]    ${lang}=${LANGUAGE}
    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}
    Click Button    ${LANGUAGE DROPDOWN}
    Wait Until Element Is Visible    ${LANGUAGE TO SELECT}
    Click Element    ${LANGUAGE TO SELECT}
    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}/span[@lang='${lang}']    20
    Sleep    5    #to wait for language to fully change before continuing.  This caused issues with login.

Log In
    [arguments]    ${email}    ${password}    ${button}=${LOG IN NAV BAR}
    Run Keyword Unless    '''${button}''' == "None"    Wait Until Element Is Visible    ${button}
    Run Keyword Unless    '''${button}''' == "None"    Click Link    ${button}
    Wait Until Elements Are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Sleep    1
    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    0.25
    Input Text    ${PASSWORD INPUT}    ${password}
    Sleep    0.25
    Wait Until Element Is Visible    ${LOG IN BUTTON}
    Click Button    ${LOG IN BUTTON}
    Sleep    1

Validate Log In
    [arguments]    ${timeout}=${selenium_timeout}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}    ${timeout}
    Sleep    1
    Check Langauge Logged In
    Sleep    1    #this is a test to see if it eliminates a problem with the login dialog popping up on logout

Check Log In
    [arguments]    ${button}=${LOG IN NAV BAR}
    ${random email}    Get Random Email    ${BASE EMAIL}
    Log In    ${random email}    ${password}    ${button}
    Wait Until Element Is Visible    ${ACCOUNT NOT FOUND}
    Log In    ${EMAIL OWNER}    ${password}    None
    Validate Log In

Log Out
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    ${LOG OUT BUTTON}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .05    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element Is Visible    ${LOG OUT BUTTON}
    Click Link    ${LOG OUT BUTTON}
    Validate Log Out

Validate Log Out
    Wait Until Element Is Not Visible    ${BACKDROP}
    Wait Until Page Contains Element    ${ANONYMOUS BODY}
    Check Language Anonymous

Validate on Register Page
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER PASSWORD INPUT}    ${CREATE ACCOUNT BUTTON}
    Run keyword and continue on failure    Title should be    Create account in ${PRODUCT_NAME}

Register
    [arguments]    ${first name}    ${last name}    ${email}    ${password}    ${checked}=false
    Validate on Register Page
    Input Text    ${REGISTER FIRST NAME INPUT}    ${first name}
    Input Text    ${REGISTER LAST NAME INPUT}    ${last name}
    ${read only}    Run Keyword And Return Status    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}    5
    Run Keyword Unless    ${read only}    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run Keyword If    "${checked}"=="false"    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}

Validate Register Success
    [arguments]    ${location}=${url}/register/success
    Wait Until Element Is Visible    ${ACCOUNT CREATION SUCCESS}
    Location Should Be    ${location}
    Run keyword and continue on failure    Title should be    Welcome to ${PRODUCT_NAME}

Validate Register Email Received
    [arguments]    ${recipient}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${recipient}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    Should Not Be Equal    ${email}    ${EMPTY}
    Delete Email    ${email}
    Close Mailbox

Get Email Link
    [arguments]    ${recipient}    ${link type}    ${timeout}=120
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${recipient}    timeout=${timeout}    status=UNSEEN
    Run Keyword If    "${link type}"=="activate"    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    Run Keyword If    "${link type}"=="restore_password"    Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}}    ${TEST FIRST NAME} ${TEST LAST NAME}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    %PRODUCT_NAME%    ${PRODUCT_NAME}
    Run Keyword If    "${link type}"=="register"    Check Email Subject    ${email}    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${links}    Get NX Links From Email    ${email}    ${link type}
    log    ${links}
    Delete Email    ${email}
    Close Mailbox
    Return From Keyword    ${links}

Activate
    [arguments]    ${email}
    ${link}    Get Email Link    ${email}    activate
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Element Should Be Visible    ${ACTIVATION SUCCESS}
    Location Should Be    ${url}/activate/success

Restore password
    [arguments]    ${email}
    #log in to user to make sure their language is set to the current
    Log    Kyle disabled checking the user's langauge before sending. If it's not working blame him
    # Open Browser and go to URL    ${url}
    # Log In    ${email}    ${password}
    # Validate Log In
    # Log Out
    # Validate Log Out
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Click Button    ${RESET PASSWORD BUTTON}
    Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
    ${link}    Get Email Link    ${email}    restore_password
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Sleep    5
    Input Text    ${RESET PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${SAVE PASSWORD}
    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS LOG IN LINK}
    Click Link    ${RESET SUCCESS LOG IN LINK}
    Log In    ${email}    ${BASE PASSWORD}    None
    Validate Log In
    Close Browser

Restore Password using API
    [Arguments]    ${email}
    CloudPortalAPI.Restore Password    ${ENV}    ${email}    None    None
    ${link}=   Get Email Link    ${email}    restore_password
    ${code}=   Get Code From Email Link    ${link}
    CloudPortalAPI.Restore Password    ${ENV}    ${email}    ${code}   ${BASE PASSWORD}
    CloudPortalAPI.Log In    ${ENV}    ${email}    ${BASE PASSWORD}

Go to Users List
    ${location}=   Get Location
    Go To    ${location}/users

Go to System Administration
    Wait Until Elements Are Visible    ${SYSTEM ADMINISTRATION LINK}
    Click Link    ${SYSTEM ADMINISTRATION LINK}

Share To
    [arguments]    ${email}    ${permissions}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
#remove user first to force share email to be sent.
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${email}']/../../../a
    ${user exists}    Run Keyword And Return Status    Page Should Contain Link    ${User In List}
    Run Keyword If    ${user exists}    Remove User Permissions    ${email}
    Wait Until Element Is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${email}
    Wait Until Element Is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element Is Visible    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${permissions}']
    Click Link    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${permissions}']/..
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${NEW PERMISSIONS SAVED}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True

Edit User Permissions In Systems
    [arguments]    ${user email address}    ${permissions}
    Wait Until Element Is Not Visible    ${SHARE MODAL}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Element Text Should Be    ${USER EMAIL}    ${user email address}
    Select user in Users List    ${user email address}
    Change User Permissions    ${permissions}
    Element Text Should Be    ${ACCESS LEVEL DROPDOWN}    ${permissions}
    ${original timeout}=   Set Selenium Timeout    60
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Sleep    3
    Wait Until Element Is Not Visible    ${ACCOUNT SAVE}
    Set Selenium Timeout    ${original timeout}

Check User Permissions
    [arguments]    ${user email address}    ${permissions}    ${timeout}=${selenium_timeout}
    ${original timeout}=   Set Selenium Timeout    ${timeout}

    Select user in Users List    ${user email address}

    ${s}=   Run Keyword And Return Status    Wait Until Element is Visible    ${ACCESS LEVEL DROPDOWN}    10
    Run Keyword If    ${s} == True    Element Text Should Be    ${ACCESS LEVEL DROPDOWN}    ${permissions}

    Run Keyword If    '${permissions}' == '${OWNER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Unrestricted access including the ability to share and connect/disconnect System from cloud
    Run Keyword If    '${permissions}' == '${ADMIN TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Unrestricted access including the ability to share
    Run Keyword If    '${permissions}' == '${ADV VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Can view live video, browse the archive, control PTZ etc
    Run Keyword If    '${permissions}' == '${VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Can view live video and browse the archive
    Run Keyword If    '${permissions}' == '${LIVE VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Can only view live video
    Run Keyword If    '${permissions}' == '${CUSTOM TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    Use the Nx Witness Client application to set up custom permissions

    Set Selenium Timeout    ${original timeout}

Change User Permissions
    [arguments]    ${permissions}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    ${p}=   Set Variable    ${ACCESS LEVEL DROPDOWN}/..${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/a/span[text()='${permissions}']
    Wait Until Element Is Visible    ${p}
    Click Link    ${p}/..

Remove User Permissions
    [arguments]    ${user email address}
    ${User In List}=   Select user in Users List    ${user email address}
    Wait Until Element Is Visible    ${REMOVE USER BUTTON}
    Click Button    ${REMOVE USER BUTTON}
    Wait Until Element Is Visible    ${REMOVE BUTTON}
    Click Button    ${REMOVE BUTTON}
    ${PERMISSIONS WERE REMOVED FROM EMAIL}    Replace String    ${PERMISSIONS WERE REMOVED FROM}    %email%    ${user email address}
    Check For Alert    ${PERMISSIONS WERE REMOVED FROM EMAIL}
    Wait Until Element Is Not Visible    ${User In List}

Select user in Users List
    [arguments]    ${user email address}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${user email address}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Elements Are Visible    ${USER EMAIL}
    Element Text Should Be    ${USER EMAIL}    ${user email address}
    [return]    ${user email address}

Check For Alert
    [arguments]    ${alert text}    ${timeout}=${selenium_timeout}
    Wait Until Element Is Visible    ${ALERT}/../span[contains(text(),"${alert text}")]    ${timeout}
    Wait Until Page Does Not Contain Element    ${ALERT}/../span[contains(text(),"${alert text}")]    ${timeout}

Check For Alert Dismissable
    [arguments]    ${alert text}    ${timeout}=${selenium_timeout}
    Wait Until Elements Are Visible    ${ALERT CLOSE}    ${ALERT}/../span[contains(text(),"${alert text}")]    timeout=${timeout}
    Click Button    ${ALERT CLOSE}
    Wait Until Page Does Not Contain Element    ${ALERT}/../span[contains(text(),"${alert text}")]

Verify In System
    [arguments]    ${system name}
    Go to System Administration
    Wait Until Element Is Visible    //h2[contains(@class,"system-name") and contains(text(), '${system name}')]

Disconnect from cloud
    Go to System Administration
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Element    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM CANCEL}    ${DISCONNECT FORM DISCONNECT BUTTON}    ${DISCONNECT PASSWORD INPUT}
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DISCONNECT FORM DISCONNECT BUTTON}
#    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
    Sleep    5

Failure Tasks
    [timeout]    5 minutes
    ${console}    Get Browser Log
    Log    ${console}
    Capture Page Screenshot    selenium-screenshot-${LANGUAGE}{index}.png
    # Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True    folder=[Gmail]/All Mail
    # Delete All Emails
    # Close Mailbox

Wait Until Elements Are Visible
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Wait Until Element Is Visible    ${element}    ${timeout}
    END

Elements Should Not Be Visible
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Element Should Not Be Visible    ${element}    ${timeout}
    END

Wait Until Page Does Not Contain Elements
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Wait Until Page Does Not Contain Element    ${element}    ${timeout}
    END

#Reset resources
Clean up email noperm
    Register Keyword To Run On Failure    None
    Open Browser and Go To URL    ${url}
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Verify In System    Auto Tests
    Go To Users List
    Register Keyword To Run On Failure    NONE
    ${status}=   Run Keyword And Return Status    Wait Until Element Is Visible    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${EMAIL NOPERM}']    5
    Run Keyword If    ${status}    Run Keyword And Ignore Error    Remove User Permissions    ${EMAIL NOPERM}
    Register Keyword To Run On Failure    Failure Tasks
    Close Browser

Clean up random emails
    Register Keyword To Run On Failure    None
    Open Browser and Go To URL    ${url}
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To Users List
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible
    ...    ${USERS LIST}//nx-level-3-item//span[contains(text(),'noptixautoqa+15')]/../../../a
    Run Keyword If    ${status}    Find and remove emails
    Close Browser

Find and remove emails
    ${random emails}    Get WebElements    ${USERS LIST}//nx-level-3-item//span[contains(text(),'noptixautoqa+15')]/../../../a
    FOR    ${element}    IN    @{random emails}
        ${email}    Get Text    ${USERS LIST}//nx-level-3-item//span[contains(text(),'noptixautoqa+15')]
        Remove User Permissions    ${email}
    END

Reset user noperm first/last name
    Register Keyword To Run On Failure    None
    Open Browser and go to URL    ${url}
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    button=None
    Validate Log In

    Run Keyword And Ignore Error    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Run Keyword And Ignore Error    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged
    Register Keyword To Run On Failure    Failure Tasks

    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT LAST NAME}    ${TEST LAST NAME}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    # In case Kyle forgets about this it's a test to see if it fixes a problem with not changing the name back in some cases
    Sleep    2
    Close Browser

Reset user owner first/last name
    Register Keyword To Run On Failure    None
    Open Browser and go to URL    ${url}/account
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Validate Log In

    Run Keyword And Ignore Error    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    newFirstName
    Run Keyword And Ignore Error    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    newLastName
    Register Keyword To Run On Failure    Failure Tasks
    Sleep    1
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT LAST NAME}    ${TEST LAST NAME}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser

Add notowner
    Wait Until Element Is Visible    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${EMAIL NOT OWNER}
    Click Button    ${SHARE BUTTON MODAL}
    Check For Alert    ${NEW PERMISSIONS SAVED}
    Check User Permissions    ${EMAIL NOT OWNER}    ${CUSTOM TEXT}
    Close Browser

Make sure notowner is in the system
    Register Keyword To Run On Failure    None
    Open Browser and Go To URL    ${url}
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}
    Run Keyword Unless    ${status}    Share To    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL NOT OWNER}    timeout=120    status=UNSEEN
    Delete Email    ${email}
    Close Browser

Make sure viewer is in the system
    Register Keyword To Run On Failure    None
    Open Browser and Go To URL    ${url}
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible    ${VIEWER IN SYSTEM}
    Run Keyword Unless    ${status}    Share To    ${EMAIL VIEWER}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL VIEWER}    timeout=120    status=UNSEEN
    Delete Email    ${email}
    Close Browser

Reset System Names
    Open Browser and go to URL    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}    None
    Validate Log In
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests 2
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests 2

    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests
    Close Browser

Validate Input Field State
    [arguments]    ${FIELD LOCATOR}    ${Valid True or False}
    ${class}    Get Element Attribute    ${FIELD LOCATOR}    class
    Run Keyword If    ${Valid True or False}==True    Should Contain    ${class}    ng-valid
    Run Keyword If    ${Valid True or False}==False    Should Contain    ${class}    ng-invalid

Get Checkbox Value
    [arguments]    ${CHECKBOX ELEMENT}
    ${id}    Get Element Attribute    ${CHECKBOX ELEMENT}    id
    Should Not Be Empty    ${id}    'The specified checkbox element "${CHECKBOX ELEMENT}" does not have an id attribute and cannot be used with the Get Checkbox Value Keyword.'
    Sleep    2    #Wait for form to load & dynamic control values to populate
    ${checked}    Execute Javascript    return window.document.getElementById('${id}').checked;
    [return]    ${checked}

Set Checkbox Value
    [arguments]    ${CHECKBOX ELEMENT}    ${Desired Bool Value}
    ${Desired Bool Value}    Convert To Boolean    ${Desired Bool Value}    #input standardization
    ${id}    Get Element Attribute    ${CHECKBOX ELEMENT}    id
    Should Not Be Empty    ${id}    'The specified checkbox element "${CHECKBOX ELEMENT}" does not have an id attribute and cannot be used with the Set Checkbox Value Keyword.'
    ${checked}    Get Checkbox Value    ${CHECKBOX ELEMENT}
    Run Keyword If    ${checked} != ${Desired Bool Value}    Execute Javascript    window.document.getElementById('${id}').click()

Get Child WebElements
    [arguments]    ${locator}
    ${element}=   Get WebElement    ${locator}
    ${children}=    Call Method
    ...    ${element}
    ...    find_elements
    ...    by=xpath    value=child::*
    [return]    ${children}

Get Parent WebElement
    [arguments]    ${locator}
    ${element}=   Get WebElement    ${locator}
    ${parent}=   Call Method
    ...    ${element}
    ...    find_element
    ...    by=xpath    value=parent::*
    [return]    ${parent}

Get All Descendant WebElements
    [Arguments]    ${element}
    ${descendants}=   Call Method
    ...    ${element}
    ...    find_elements
    ...    by=xpath    value=.//*
    [Return]    ${descendants}
