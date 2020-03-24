*** Settings ***
Library      SeleniumLibrary    run_on_failure=Failure Tasks
Library      String
Library      Collections
Library      NoptixImapLibrary
Library      NoptixLibrary
Library      NoptixLibrary/CloudPortalAPI.py
Resource     variables.robot
Resource     APIresource.robot
Resource     ${variables_file}
Resource     Resources/health-monitor-resource.robot
Variables    getIds.py    ${ENV}    ${TEST EMAIL}


*** Variables ***
${directory}    ${SCREENSHOTDIRECTORY}
${variables_file}    variables-env.robot
${options}    true
${headless}    true
@{chrome_arguments}    --disable-gpu    --no-sandbox    --log-level=3
@{chrome_arguments_headless}    --disable-infobars    --disable-gpu    --no-sandbox    --log-level=3     --headless
${speed}    0
${selenium_timeout}    30

@{auth}    ${EMAIL OWNER}    ${BASE PASSWORD}

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
    Create Webdriver    Chrome    chrome_options=${chrome_options}
    Set Window Size    1920    1080
   # Go to    ${ENV}

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

Check Language Logged In
    [Arguments]    ${email}    ${password}
    ${curr lang}=   Get Account Language   ${ENV}    ${email}    ${password}
    Run Keyword Unless    '${curr lang}' == '${LANGUAGE}'    Set Account Language    ${ENV}    ${email}    ${password}    ${LANGUAGE}
    Run Keyword Unless    '${curr lang}' == '${LANGUAGE}'    Reload Page
    Sleep    2

Set Language Anonymous
    [arguments]    ${lang}=${LANGUAGE}
    Sleep     1
    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}
    Click Button    ${LANGUAGE DROPDOWN}
    Wait Until Element Is Visible    ${LANGUAGE TO SELECT}
    Click Element    ${LANGUAGE TO SELECT}
    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}/span[@lang='${lang}']    20
    Sleep    5    #to wait for language to fully change before continuing.  This caused issues with login.

Log In
    [arguments]    ${email}    ${password}    ${validate}=${True}    ${button}=${LOG IN NAV BAR}
    Sleep    2
    Run Keyword Unless    '''${button}''' == "None"    Wait Until Element Is Visible    ${button}
    Run Keyword Unless    '''${button}''' == "None"    Click Link    ${button}
    Wait Until Elements Are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
     Wait Until Keyword Succeeds    10    0.5   Input Text     ${PASSWORD INPUT}    ${password}
    Sleep    1
    Wait Until Element Is Visible    ${LOG IN BUTTON}
    Click Button    ${LOG IN BUTTON}
    Run Keyword If    ${validate} == ${True}    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}    ${selenium_timeout}
    Run Keyword If    ${validate} == ${True}    Wait Until Element is Not Visible    //div[@class="placeholder"]    ${selenium_timeout}
    Run Keyword If    ${validate} == ${True}    Check Language Logged In    ${email}    ${password}
    Sleep    0.5

Log In With Remember Me
    [arguments]    ${email}    ${password}    ${button}=${LOG IN NAV BAR}    ${remember me}=True
    Run Keyword Unless    '''${button}''' == "None"    Wait Until Element Is Visible    ${button}
    Run Keyword Unless    '''${button}''' == "None"    Click Link    ${button}
    Wait Until Elements Are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Sleep    1
    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    0.25
    Input Text    ${PASSWORD INPUT}    ${password}
    Run Keyword If    ${remember me}==True     Select Checkbox    ${REMEMBER ME CHECKBOX REAL}
    ...    ELSE    Unselect Checkbox    ${REMEMBER ME CHECKBOX REAL}
    Click Button    ${LOG IN BUTTON}
    Validate Log In

Validate Log In
    [Arguments]    ${timeout}=${selenium_timeout}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}    ${timeout}
    Sleep    0.5    #this is a test to see if it eliminates a problem with the login dialog popping up on logout

Check Log In
    [arguments]    ${button}=${LOG IN NAV BAR}
    ${random email}    Get Random Email    ${BASE EMAIL}
    Log In    ${random email}    ${password}      validate=False     button=${button}
    Wait Until Element Is Visible    ${ACCOUNT NOT FOUND}
    Log In    ${EMAIL OWNER}    ${password}    button=None

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
    Run keyword and continue on failure    Title should be    ${REGISTER TITLE TEXT} ${PRODUCT_NAME}

Register
    [arguments]    ${first name}    ${last name}    ${email}    ${password}    ${checked}=false    ${from}=desktop
    Run Keyword If    '${from}'=='desktop'    Go To    ${ENV}/register
    Run Keyword If    '${from}'=='mobile'     Go To    ${ENV}/register/?from=mobile
    Run Keyword If    '${from}'=='client'     Go To    ${ENV}/register/?from=client
    Validate on Register Page
    Input Text    ${REGISTER FIRST NAME INPUT}    ${first name}
    Input Text    ${REGISTER LAST NAME INPUT}    ${last name}
    ${read only}    Run Keyword And Return Status    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}    10
    Run Keyword Unless    ${read only}    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run Keyword If    "${checked}"=="false"    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}


Validate Register Success
    [arguments]    ${location}=${url}/register/success
    Wait Until Element Is Visible    ${ACCOUNT CREATION SUCCESS}
    Wait Until Location Is    ${location}
    Run keyword and continue on failure    Title should be    ${WELCOME TEXT} ${PRODUCT_NAME}

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
    ${code}=   Get Code From Email   ${ENV}    ${auth}    ${email}    activate_account
    Go To    ${ENV}/activate/${code}
    Wait Until Elements Are Visible
    ...    ${ACTIVATION SUCCESS}
    ...    ${ACTIVATION SUCCESS ICON}
    Location Should Be    ${ENV}/activate/success

Register And Activate Account
    [Arguments]    ${first name}    ${last name}    ${email}    ${password}    ${reg}=api    ${act}=api
    Run Keyword If    '${reg}'=='api'    Register Account    ${first name}    ${last name}    ${email}    ${password}
    Run Keyword If    '${reg}'=='ui'     Register    ${first name}    ${last name}    ${email}    ${password}
    Run Keyword If    '${act}'=='api'    Activate Account   ${email}    ${password}
    Run Keyword If    '${act}'=='ui'     Activate    ${email}
    Run Keyword If    '${act}'=='ui'     CloudPortalAPI.Log In    ${ENV}    ${email}    ${password}

Register and activate account with random email
    [Arguments]    ${first name}    ${last name}    ${password}
    ${email}=    Get Random Email    ${BASE EMAIL}
    Register And Activate Account    ${first name}    ${last name}    ${email}    ${password}
    [Return]    ${email}

# Replaced with "Restore password using API"
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
    Close Browser

Restore Password using API
    [Arguments]    ${email}    ${new password}
    ${resp}=   CloudPortalAPI.Restore Password    ${ENV}    ${email}    None    None
    Should Be Equal as Strings    ${resp}    200
    ${code}=   Get Code From Email    ${ENV}    ${auth}    ${email}    restore_password
    ${code}=   Convert Code    ${code}
    ${resp}=   CloudPortalAPI.Restore Password    ${ENV}    ${email}    ${code}   ${new password}
    Should Be Equal As Strings    ${resp}    200
    CloudPortalAPI.Log In    ${ENV}    ${email}    ${new password}

Go to Users List
    ${location}=   Get Location
    Go To    ${location}/users

Go to System Administration
    Wait Until Elements Are Visible    ${SYSTEM ADMINISTRATION LINK}    timeout=30
    Click Link    ${SYSTEM ADMINISTRATION LINK}

Share To
    [arguments]    ${email}    ${permissions}    ${alert}=success
    Wait Until Element Is Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Enabled    ${SHARE BUTTON SYSTEMS}
    Sleep    1
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${SHARE EMAIL}    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${email}
    Wait Until Element Is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Sleep    1
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Elements Are Visible    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${permissions}']    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${permissions}']/..
    Click Link    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${permissions}']/..
    Click Button    ${SHARE BUTTON MODAL}
    Run Keyword if    '${alert}'=='success'    Check For Alert    ${NEW PERMISSIONS SAVED}
    Run Keyword if    '${alert}'=='fail'    Check For Alert    ${CANNOT SHARE SYSTEM}${SPACE}${SPACE}${CHANGING OWN PERMISSIONS IS NOT ALLOWED}

Edit User Permissions In Systems
    [arguments]    ${user email address}    ${permissions}
    Wait Until Element Is Not Visible    ${SHARE MODAL}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Element Text Should Be    ${USER EMAIL}    ${user email address}
    Select user in Users List    ${user email address}
    Change User Permissions    ${permissions}
    Element Text Should Be    ${ACCESS LEVEL DROPDOWN}    ${permissions}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Sleep    3
    Wait Until Element Is Not Visible    ${ACCOUNT SAVE}

Check User Permissions
    [arguments]    ${user email address}    ${permissions}    ${timeout}=${selenium_timeout}
    ${original timeout}=   Set Selenium Timeout    ${timeout}

    Select user in Users List    ${user email address}

    ${s}=   Run Keyword And Return Status    Wait Until Element is Visible    ${ACCESS LEVEL DROPDOWN}    10
    Run Keyword If    ${s} == True    Element Text Should Be    ${ACCESS LEVEL DROPDOWN}    ${permissions}

    Run Keyword If    '${permissions}'=='${OWNER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${UNRESTRICTED ACCESS CONNECT TEXT}
    Run Keyword If    '${permissions}'=='${ADMIN TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${SHARE PERMISSIONS HINT ADMINISTRATOR}
    Run Keyword If    '${permissions}'=='${ADV VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${SHARE PERMISSIONS HINT ADVANCED VIEWER}
    Run Keyword If    '${permissions}'=='${VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${SHARE PERMISSIONS HINT VIEWER}
    Run Keyword If    '${permissions}'=='${LIVE VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${SHARE PERMISSIONS HINT LIVE VIEWER}
    Run Keyword If    '${permissions}'=='${CUSTOM TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${SHARE PERMISSIONS HINT CUSTOM}

    Set Selenium Timeout    ${original timeout}

Get Cloud User Role
    [Arguments]    ${auth}    ${email}    ${system id}
    @{users}=   Get Cloud System Users   ${auth}    ${system id}
    FOR    ${user}    IN    @{users}
        Run Keyword If   '&{user}[accountEmail]'=='${email}'    Return From Keyword    &{user}[accessRole]
    END

Get Cloud User Id By Email
   [Arguments]    ${auth}    ${email}    ${system id}
   @{users}=   Get Cloud System Users    ${auth}    ${system id}
   FOR    ${user}    IN    @{users}
       Run Keyword If   '&{user}[accountEmail]'=='${email}'    return from keyword    &{user}[vmsUserId]
   END

Change User Permissions
    [arguments]    ${permissions}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Sleep    1
    ${p}=   Set Variable    ${ACCESS LEVEL DROPDOWN}/..${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/a[contains(@class, "dropdown-item")]/span[text()='${permissions}']/..
    Wait Until Element Is Visible    ${p}
    Sleep    1
    Click Link    ${p}
    Sleep    1

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
    ${status}=   Run Keyword And Return Status    Wait Until Element Is Visible   ${SHARE BUTTON SYSTEMS}   5
    Run Keyword Unless    ${status}   Go To Users List
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
#    Sleep    5

Disconnect from my account
    Go to System Administration
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}

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
        Run Keyword And Continue On Failure    Wait Until Element Is Visible    ${element}    ${timeout}
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
    Log In    ${EMAIL OWNER}    ${password}    ${False}
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
    Log In    ${EMAIL OWNER}    ${password}    ${False}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Go To Users List
    ${status}    Run Keyword And Return Status    Wait Until Page Contains Element
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
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None

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
    Log In    ${EMAIL OWNER}    ${password}    ${False}
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
    Log In    ${EMAIL OWNER}    ${password}    ${False}
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible    ${VIEWER IN SYSTEM}
    Run Keyword Unless    ${status}    Share To    ${EMAIL VIEWER}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL VIEWER}    timeout=120    status=UNSEEN
    Delete Email    ${email}
    Close Mailbox
    Close Browser

User is in cloud system
    [Arguments]    ${user email}    ${system id}
    @{users}=   Get Cloud System Users    ${auth}    ${system id}
    FOR    ${user}    IN    @{users}
        ${status}=   Run keyword and return status    Should be equal as strings   '&{user}[accountEmail]'    '${user email}'
        Run Keyword If   ${status}    Exit For Loop
    END
    [Return]    ${status}

Add user to cloud system if not there
    [Arguments]    ${system id}    ${access role}    ${email}
    ${is there}=   User is in cloud system    ${email}    ${system id}
    Run Keyword If    ${is there}==False    Run Keyword    Share   ${auth}    ${system id}    ${access role}    ${email}

Reset System Names
    Rename System    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}    Auto Tests 2
    Rename System    ${auth}    ${AUTO TESTS SYSTEM ID}    Auto Tests

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
    Log    ${id}
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

Wait Until Number Of Tabs Are Open
    [Arguments]    ${number}
    @{tabs}=   Get Window Handles
    ${current tabs}=   Get length    ${tabs}
    Wait For Condition       return ${current tabs}==${number}

Save Cookies
    #${saved cookie1} =     Get Cookie    _ga
    #${saved cookie2} =     Get Cookie    _gat_UA-51046510-4
    #${saved cookie3} =     Get Cookie    _gid
    ${saved cookie4}=   Get Cookie    csrftoken
    ${saved cookie5}=   Get Cookie    language
    ${saved cookie6}=   Get Cookie    sessionid
    ${cookies}=   Create List    ${saved cookie4}    ${saved cookie5}    ${saved cookie6}
    [return]    ${cookies}

Apply Saved Cookies
    [arguments]   ${cookies}
    Delete All Cookies
    FOR    ${i}     IN RANGE    2
        Add Cookie    ${cookies[${i}].name}    ${cookies[${i}].value}
    END
    ${session expiry} =    Convert To String    ${cookies[2].expiry}
    Run Keyword Unless    "${session expiry}"=="None"
    ...    Add Cookie    ${cookies[2].name}    ${cookies[2].value}     expiry=${session expiry}
    Reload Page

Persist Current Login State
    [arguments]    ${url}
    ${cookies} =    Save Cookies
    Close Browser
    Open Browser and go to URL    ${url}
    Apply Saved Cookies    ${cookies}
    # Logs to inspect values of cookies before and after applying them for debugging
    # Log Many     ${cookies[0].name} ${cookies[0].value}
    # ...   ${cookies[1].name} ${cookies[1].value}
    # ...   ${cookies[2].name} ${cookies[2].value}
    # ...   ${cookies[3].name} ${cookies[3].value}
    # ...   ${cookies[4].name} ${cookies[4].value}
    # ...   ${cookies[5].name} ${cookies[5].value}
    # ${current cookie4} =     Get Cookie    csrftoken
    # Log    ${current cookie4.name} ${current cookie4.value}
    # ${current cookie6} =     Get Cookie    sessionid
    # Log    ${current cookie6.name} ${current cookie6.value} ${current cookie6.expiry}

Common Restart Logout
    [documentation]    This is common restart code many test cases use.
    ...        It checks if user is logged in and logs him out via API.
    [arguments]    ${url}
    Register Keyword To Run On Failure    NONE
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}    5
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out via API
    Go To    ${url}
    Sleep    2

Convert Code
    [Arguments]    ${code}
    ${code}=   Replace String Using Regexp    ${code}    %3D    =
    ${code}=   Replace String Using Regexp    ${code}    %2B    +
    [Return]    ${code}