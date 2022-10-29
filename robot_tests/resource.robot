*** Settings ***
Resource     variables.robot
Resource     variables-env.robot
Resource     Resources/cms-resources.robot

Library      String
Library      DateTime
Library      Collections
Library      OperatingSystem
Library      SeleniumLibrary    run_on_failure=Failure Tasks
Library      SSHLibrary
Library      ScreenCapLibrary
Library      NoptixImapLibrary/
Library      NoptixLibrary/GenericKeywords.py
Library      NoptixLibrary/CloudPortalAPI.py    ${ENV}    ${customization}    ${BASE PASSWORD}    ${BASE EMAIL NO SEND}
Library      NoptixLibrary/ServerAPI5.py    ${IMAGE}
Library      NoptixLibrary/LicenseManagement.py    ${LM HOST}/nxlicensed    ${LM AUTH}
Library      NoptixLibrary/Cloud2fa.py
Library      pabot.PabotLib

*** Variables ***
${variables_file}    variables-env.robot
${options}    true
${headless}    true
@{chrome_arguments}    --disable-gpu    --no-sandbox    --ignore-certificate-errors    --log-level=3
@{chrome_arguments_headless}    --disable-infobars    --disable-gpu    --no-sandbox    --ignore-certificate-errors    --log-level=3     --headless
${speed}    0
${selenium_timeout}    40
${video_recording}      ${False}

@{auth}    ${EMAIL OWNER}    ${BASE PASSWORD}

*** Keywords ***
Open Browser and go to URL
    [Arguments]    ${url}    ${import IDs}=${True}    ${check language}=${True}
    # Run Keyword If    ${import IDs}    Run Keywords
        # ...    Acquire Lock    MyLock    AND
        # ...    Import Variables    getIds.py    ${ENV}    ${TEST EMAIL}    AND
        # ...    Release Lock    MyLock
    IF    "${options}"=="false" or "${headless}"=="false" or "${headless}"=="False"
        Regular Open Browser
        ${video_recording} =     Set Variable    ${True}
        Set Suite Variable      ${video_recording}      ${video_recording}
    ELSE
        Open Browser With Options
    END
    Set Selenium Speed    ${speed}
    Set Selenium Timeout    ${selenium_timeout}
    Run Keyword If    ${check language}    Run Keywords
       ...    Go To    ${ENV}    AND
       ...    Check Language Anonymous
    Execute Javascript    window.localStorage.setItem("ngx-webstorage|theme", '"${THEME}"')
    Go To    ${url}

Regular Open Browser
    SeleniumLibrary.Set Screenshot Directory    screenshots
    ${chrome_options}=    Set Chrome Options
    Create Webdriver    ${BROWSER}    chrome_options=${chrome_options}
    Set Window Size    1920    1080
    Go To    ${ENV}

Open Browser With Options
    SeleniumLibrary.Set Screenshot Directory    screenshots
    ${chrome_options}=    Set Chrome Options Headless
    Create Webdriver    Chrome    chrome_options=${chrome_options}
    Set Window Size    1920    1080
   # Go to    ${ENV}

Open page anonymously
    [Arguments]    ${url}    ${title}
    Go To    ${url}
    Location should be    ${url}
    Sleep   3
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
    IF    "${lang}"!="${LANGUAGE}"
        Set Language Anonymous
    END

Check Language Logged In
    [Arguments]    ${email}    ${password}=${BASE PASSWORD}
    ${curr lang}=   Get Account Language    ${email}    ${password}
    IF    '${curr lang}' != '${LANGUAGE}'
        Set Account Language    ${email}    ${password}    ${LANGUAGE}
    END
    Sleep    2

Set Language Anonymous
    [arguments]    ${lang}=${LANGUAGE}
    Log     This is temporarily disabled. Uncomment below to reactivate
#    Sleep     1
#    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}
#    Click Button    ${LANGUAGE DROPDOWN}
#    Wait Until Element Is Visible    //header//nx-header-language-select//span[@lang='${lang}']/..
#    Click Element    //header//nx-header-language-select//span[@lang='${lang}']/..
#    Wait Until Element Is Visible    ${LANGUAGE DROPDOWN}/span[@lang='${lang}']    20
#    Sleep    5    #to wait for language to fully change before continuing.  This caused issues with login.

Log In
    [arguments]    ${user}    ${password}    ${validate}=${True}    ${button}=${LOG IN NAV BAR}    ${exists}=${True}    ${reset}=${False}    ${2fa}=${False}    ${2fa backup code}=${EMPTY}
    IF    '''${mode}'''=='''cloud'''
        Log In Cloud    ${user}    ${password}    ${validate}    ${button}     ${exists}    ${reset}    ${2fa}    ${2fa backup code}
    ELSE
        Log In Web Admin    ${user}    ${password}    ${validate}
    END

Log In Cloud
    [arguments]    ${email}    ${password}    ${validate}=${True}    ${button}=${LOG IN NAV BAR}    ${exists}=${True}   ${reset}=${False}    ${2fa}=${False}    ${2fa backup code}=${EMPTY}
    Sleep    4
    IF    '''${button}''' != "None" 
        Wait Until Element Is Visible    ${button}
    END
    IF    '${validate}' == 'True' and '${2fa}' == 'False'    # adding 2fa to conditions as workaround since if 2fa active Get Account Language is failing on 401
        Check Language Logged In    ${email}    ${password}
        Set User Theme    ${email}    ${password}    ${THEME}
    END
    IF    '''${button}''' != "None"
        Click Element    ${button}
    END
    IF    '''${button}''' == '''${RESET LOGIN BUTTON}''' or ${reset}
        Log     Reset autopopulates email
    ELSE
        Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
        Sleep    1
        Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
        Sleep    1
        Click Button    ${LOG IN NEXT BUTTON}
    END

    IF    ${exists}
        Wait Until Element Is Visible    ${PASSWORD INPUT}
        Wait Until Keyword Succeeds    10    0.5   Input Text     ${PASSWORD INPUT}    ${password}
        Sleep    1
        Wait Until Element Is Visible    ${LOG IN BUTTON}
        Click Button    ${LOG IN BUTTON}
    ELSE
        Wait Until Elements Are Visible    ${ACCOUNT DOES NOT EXIST}    ${YOU CAN CREATE AN ACCOUNT}
    END
    IF    ${2fa} == ${True} and "${2fa backup code}" == "${EMPTY}"
        Generate totp and login    ${email}
    ELSE IF    ${2fa} == ${True} and "${2fa backup code}" != "${EMPTY}"
        Type in backup code and login    ${2fa backup code}    ${email}
    END
    IF    ${validate} == ${True}
        Validate Log In    ${email}    password=${password}
    END
    Sleep    0.5

Log In Web Admin
    [arguments]    ${login}    ${password}    ${validate}=${True}
    Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]
    Input Text    //input[@id="login_email"]    ${login}
    Input Text    //input[@id="login_password"]    ${password}
    Click Button    //button[@type="submit"]
    IF    ${validate} == ${True}
        Validate Log In    ${login}    password=${password}
    END
    Sleep    1


Log In With Remember Me
    [arguments]    ${email}    ${password}    ${button}=${LOG IN NAV BAR}    ${remember me}=True
    IF    '''${button}''' != "None"
        Wait Until Element Is Visible    ${button}
        Click Link    ${button}
    END
    Wait Until Elements Are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Sleep    1
    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    0.25
    Input Text    ${PASSWORD INPUT}    ${password}
    Run Keyword If    ${remember me}==True     Select Checkbox    ${REMEMBER ME CHECKBOX REAL}
    ...    ELSE    Unselect Checkbox    ${REMEMBER ME CHECKBOX REAL}
    Click Button    ${LOG IN BUTTON}
    Validate Log In    ${email}

Log in to Auto Tests System
    [Arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${EDITABLE TITLE}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${EDITABLE TITLE}
    IF    '${email}'!='${EMAIL OWNER}' and '${email}'!='${EMAIL ADMIN}'
        Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    END

Log in to system
    [Arguments]    ${system}    ${email}    ${password}=${BASE PASSWORD}    ${validate}=${True}
    ${url}=   Set Variable If
    ...    '''${mode}'''== '''cloud'''    ${ENV}/systems/${system}[cloud id]
    ...    '''${mode}'''=='''webadmin'''    https://${QA BURBANK IP}:${system}[port]
    Go To    ${url}
    Log In    ${email}    ${password}    validate=${validate}    button=${None}

Validate Log In
    [Arguments]    ${email}    ${password}=${BASE PASSWORD}    ${timeout}=${selenium_timeout}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}    ${selenium_timeout}
#    Wait Until Element Contains    ${ACCOUNT DROPDOWN}    MARK H.
    Wait Until Element is Not Visible    //div[@class="placeholder"]    ${selenium_timeout}
    IF    '${mode}' == 'webadmin'
        Wait Until Element Is Visible    ${CLOUD NAME}
        Sleep    1
    END    

Check Log In
    [Arguments]    ${user}    ${button}=${LOG IN NAV BAR}
    ${random email}    Get Random Email Robot    ${BASE EMAIL}
    Log In    ${random email}    ${password}      validate=False     button=${button}    exists=${False}
    Log In    ${user}    ${password}    button=None

Log Out
    # Add a delay to your call if logging in soon after logging oiut to avoid session race condition
    [Arguments]     ${add_delay}=0
    Run Keyword If    '''${mode}'''=='''cloud'''    Log Out cloud
    ...    ELSE    Log Out Web Admin
    IF   ${add_delay} > 0
        Sleep   ${add_delay}
    END

Log Out Cloud
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    ${LOG OUT BUTTON}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .25    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element Is Visible    ${LOG OUT BUTTON}
    Sleep    .5
    Click Link    ${LOG OUT BUTTON}
    Sleep    .5
    Validate Log Out

Log Out Web Admin
    Sleep    2
    Wait Until Element Is Visible    //header//button[@id="accountSettingsSelect"]
    Click Button    //header//button[@id="accountSettingsSelect"]
    Wait Until Element Is Visible    //header//a/span[text()="Log Out"]
    Click Link    //header//a/span[text()="Log Out"]/..
    Close Modal If There  # need to remove once CLOUD-7859 will be solved
    Validate Log Out Web Admin

Validate Log Out
    Wait Until Element Is Not Visible    ${BACKDROP}
    Wait Until Page Contains Element    ${ANONYMOUS BODY}
    Check Language Anonymous

Validate Log Out Web Admin
    Sleep    5
#    Element Should Be Visible    //input[@id="login_email"]
#    Element Should Be Visible    //input[@id="login_password"]
#    Element Should Be Visible    //button[@type="submit"]
    Wait Until Element Is Not Visible    ${ACCOUNT DROPDOWN}

Log Out No Language
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    ${LOG OUT BUTTON}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .05    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element Is Visible    ${LOG OUT BUTTON}
    Click Link    ${LOG OUT BUTTON}
    Validate Log Out

Log Out Japanese
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    //header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]/..
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .05    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element Is Visible    //header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]/..
    Click Link    //header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"ログアウト")]/..
    Validate Log Out    
    
Validate on Register Page
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER PASSWORD INPUT}    ${CREATE ACCOUNT BUTTON}
    Run keyword and continue on failure    Title should be    ${REGISTER TITLE TEXT}

Register
    [Arguments]    ${first name}    ${last name}    ${email}    ${password}    ${checked}=false    ${view type}=${EMPTY}
    IF    '''${view type}''' != '''${EMPTY}'''
        Go To    ${ENV}/authorize?client_type=create&view_type=${view type}
    ELSE
        Go To    ${ENV}/authorize?client_type=create
    END
    Validate on Register Page
    Input Text    ${REGISTER FIRST NAME INPUT}    ${first name}
    Input Text    ${REGISTER LAST NAME INPUT}    ${last name}
    ${read only}    Run Keyword And Return Status    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}    10
    IF    ${read only}==${False}
        Input Text    ${REGISTER EMAIL INPUT}    ${email}
    END
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run Keyword If    "${checked}"=="false"    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}

Verify in Account Page
    Wait Until Elements are Visible
    ...    ${ACCOUNT EMAIL}
    ...    ${ACCOUNT FIRST NAME}
    ...    ${ACCOUNT LAST NAME}
    ...    ${ACCOUNT LANGUAGE DROPDOWN}
    ...    ${ACCOUNT DROPDOWN}
    ...    ${DELETE ACCOUNT BUTTON}
    Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    sleep    .5

Validate Register Success
    [Arguments]    ${location}=${ENV}/register/success
    Wait Until Element Is Visible    ${ACCOUNT CREATION SUCCESS}
    Run keyword and continue on failure    Title should be    ${REGISTER TITLE TEXT}

Validate Register Email Received
    [Arguments]    ${recipient}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${recipient}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    Should Not Be Equal    ${email}    ${EMPTY}
    Delete Email    ${email}
    Close Mailbox

Get Random Email Robot
    [Arguments]    ${email}    ${send email}=${FROM EMAIL DEFAULT}
    ${random email}=    Get Random Email    ${email}    sendemail=${send email}
    [return]    ${random email}

Get Email Link
    [Arguments]    ${recipient}    ${link type}    ${via email}=${FROM EMAIL DEFAULT}    ${timeout}=120
    IF    ${via_email}
        Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL NO SEND}    is_secure=True
        ${email}=   Wait For Email    recipient=${recipient}    timeout=${timeout}    status=UNSEEN
        IF    "${link type}"=="activate"
            Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
        ELSE IF    "${link type}"=="restore_password"    
            Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
        ELSE
            ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}}    ${TEST FIRST NAME} ${TEST LAST NAME}
            ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    %PRODUCT_NAME%    ${PRODUCT_NAME}
            Check Email Subject    ${email}    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
        END
        ${links}=   Get NX Links From Email    ${email}    ${link type}
        Delete Email    ${email}
        Close Mailbox
        Return From Keyword    ${links}
    ELSE
        ${code}=    Get Code From API    ${recipient}    ${link type}
        ${link}=    set variable    ${ENV}/authorize/${link type}/${code}
        Return From Keyword    ${link}
    END
Activate
    [Arguments]    ${email}    ${password}=${BASE PASSWORD}    ${from email}=${FROM EMAIL DEFAULT}
    IF    ${from email}
        ${link}=   Get Email Link    ${email}    activate    via email=${from email}
        Go To    ${link}

        Wait Until Elements Are Visible
        ...    ${ACTIVATION SUCCESS}
        ...    ${ACTIVATION SUCCESS ICON}
        ...    ${ACTIVATION SUCCESS LOG IN BUTTON}
        Location Should Contain    ${ENV}/authorize/activate
    ELSE
        Activate Account Via API    ${email}    ${password}
    END

Validate Activation Success
    ${current url}=   Get Location
    Wait Until Location Contains    ${current url}
    Wait Until Elements Are Visible
    ...    ${ACTIVATION SUCCESS}
    ...    ${ACTIVATION SUCCESS ICON}
    ...    ${ACTIVATION SUCCESS LOG IN BUTTON}

Register And Activate Account
    [Arguments]    ${first name}    ${last name}    ${email}    ${password}    ${reg}=api    ${from email}=${FROM EMAIL DEFAULT}
    IF    '${reg}'=='api'    
        Register Account    ${first name}    ${last name}    ${email}    ${password}
    ELSE IF   '${reg}'=='ui'     
        Register    ${first name}    ${last name}    ${email}    ${password}
    END
    Sleep    1
    Activate    ${email}    ${password}    from email=${from email}
    

Register and activate account with random email
    [Arguments]    ${first name}    ${last name}    ${password}    ${reg}=api    ${act}=${FROM EMAIL DEFAULT}
    ${email}=    Get Random Email Robot    ${BASE EMAIL}
    Register And Activate Account    ${first name}    ${last name}    ${email}    ${password}    reg=${reg}    from email=${act}
    Go to    ${url}
    [Return]    ${email}

Disconnect all systems from account
    [Arguments]    ${email}     ${password}
    ${systems}=   Get Account Systems    ${email}    ${password}
    FOR    ${sys}    IN    @{systems}
        Disconnect    ${email}    ${password}    ${sys}
    END
    
Get Account Id By Email
    [Arguments]    ${email}
    
# Replaced with "Restore password using API"
Restore password
    [Arguments]    ${email}
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
    ${resp}=   API Restore Password    ${email}    None    None
    Should Be Equal As Strings    ${resp}    200
    ${code}=   Get Code From API    ${email}    restore_password
    ${code}=   Convert Code    ${code}
    ${resp}=   API Restore Password    ${email}    ${code}   ${new password}
    Should Be Equal As Strings    ${resp}    200

Go to Users List
    Wait Until Element is Visible    ${USERS LIST LINK}
    Wait Until Keyword Succeeds    10    0.5    Click Element    ${USERS LIST LINK}

Go to System Administration
    Wait Until Element Is Visible    ${SYSTEM ADMINISTRATION LINK}
    Click Link    ${SYSTEM ADMINISTRATION LINK}

Go to Servers
    ${location}=   Get Location
    Go To    ${location}/servers

Share To
    [arguments]    ${email}    ${permissions}    ${alert}=success    ${system}=${AUTO TESTS}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    Wait Until Keyword Succeeds    10    0.5    Click Element    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}    timeout=60
    Sleep    1
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${ADD USER EMAIL}    ${ADD USER BUTTON MODAL}
    Input Text    ${ADD USER EMAIL}    ${email}
    Wait Until Element Is Visible    ${ADD USER PERMISSIONS DROPDOWN}
    Sleep    1
    Click Button    ${ADD USER PERMISSIONS DROPDOWN}
    Wait Until Elements Are Visible    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${permissions}']    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${permissions}']/..
    Click Link    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${permissions}']/..
    Click Button    ${ADD USER BUTTON MODAL}
    ${s}=   Replace String    ${EMAIL IS ALREADY REGISTERED TEXT}    %SYSTEM%    ${system}
    Run Keyword If    '${alert}'=='success'    Wait Until Element is Not Visible    ${ADD USER MODAL}
    ...    ELSE IF   '${alert}'=='fail'    Run Keywords
    ...    Wait Until Element Is Visible    //span[contains(text(),"${s}")]    ${selenium timeout}    AND
    ...    Element Style Should Be    ${ADD USER EMAIL}     border-color    ${ERROR COLOR}    AND
    ...    Element Style Should Be    ${ADD USER EMAIL}    color    ${ERROR COLOR WITH OPACITY}    AND
    ...    Element Style Should Be    //span[contains(text(),"${s}")]    color    ${ERROR COLOR WITH OPACITY}    AND
    ...    Click Button    ${ADD USER CLOSE}
    ${new user}=   Replace String    ${USER IN SYSTEM}    %user%    ${email}
    IF    '${alert}'!='fail'
        Wait Until Element is Visible    ${new user}
    END

Rename System or hardware
    [Arguments]    ${name}
    Click Element    ${EDITABLE TITLE}
    Sleep    1
    Input Content Editable Text    ${EDITABLE TITLE}    ${name}

Get Cloud User Role
    [Arguments]    ${auth}    ${email}    ${system id}
    @{users}=   Get Cloud System Users   ${auth}    ${system id}
    FOR    ${user}    IN    @{users}
        IF   '${user}[accountEmail]'=='${email}'    
            Return From Keyword    ${user}[accessRole]
        END
    END

Get Cloud User Id By Email
   [Arguments]    ${auth}    ${email}    ${system id}
   @{users}=   Get Cloud System Users    ${auth}    ${system id}
   FOR    ${user}    IN    @{users}
       Run Keyword If   '${user}[accountEmail]'=='${email}'    return from keyword    ${user}[vmsUserId]
   END

Get System User Id By Email
    [Arguments]    ${email}
    ${users}=   Get Users    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${email}'    Run Keywords
        ...    Set Test Variable    ${id}    ${user}[id]
        ...    AND     Exit For Loop
    END
    [Return]    ${id}

Check For Alert
    [arguments]    ${alert text}    ${timeout}=${selenium_timeout}
    Wait Until Element Is Visible    ${ALERT}/../span[contains(text(),"${alert text}")]    ${timeout}
    Wait Until Page Does Not Contain Element    ${ALERT}/../span[contains(text(),"${alert text}")]    ${timeout}

Check For Alert Dismissable
    [arguments]    ${alert text}    ${timeout}=${selenium_timeout}
    Wait Until Elements Are Visible    ${ALERT CLOSE}    ${ALERT}/../span[contains(text(),"${alert text}")]    timeout=${timeout}
    Click Button    ${ALERT CLOSE}
    Wait Until Page Does Not Contain Element    ${ALERT}/../span[contains(text(),"${alert text}")]

Check Error Content and Reset Button Disabled
    Wait Until Element Is Visible    //nx-authorize-reset-request-component//main//form//p
    ${error text}=    Get Text    //nx-authorize-reset-request-component//main//form//p
    Should Be Equal    ${error text}    ${ACCOUNT DOES NOT EXIST TEXT}
    Element Should Be Disabled    ${RESET PASSWORD BUTTON}
    
Verify In System
    [arguments]    ${system name}    ${editable}=${True}
    Go to System Administration
    Run Keyword If    '''${editable}'''=='''${True}'''    Wait Until Element Is Visible    //nx-editable-heading//nx-text-editable[@id="systemName-editable" and contains(text(), '${system name}')]
    ...    ELSE    Wait Until Element Is Visible    //nx-editable-heading//nx-text-editable[contains(text(), '${system name}')]

Disconnect from cloud
    Go to System Administration
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Element    ${DISCONNECT FROM NX}
    Wait Until Element Is Visible    ${DISCONNECT FORM DISCONNECT CLOUD BUTTON}
    #Input Text    ${DISCONNECT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Element    ${DISCONNECT FORM DISCONNECT CLOUD BUTTON}
#    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
#    Sleep    5

Disconnect from my account
    [Arguments]    ${system name}
    Go to System Administration
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}
    ${alert}=   Replace String    ${SYSTEM DELETED FROM ACCOUNT}    {{system_name}}    ${system name}
    Check For Alert    ${alert}    timeout=300

Failure Tasks
    [timeout]    5 minutes
    ${location}    Get Location
    Log    ${location}    level=trace
    ${console}    Get Browser Log
    Log    ${console}    level=trace
    Capture Page Screenshot    EMBED
    # Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True    folder=[Gmail]/All Mail
    # Delete All Emails
    # Close Mailbox

Wait Until Elements Are Visible
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Wait Until Element Is Visible    ${element}    ${timeout}
    END
    
Wait Until Elements Are Visible with Retry
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Run Keyword And Warn On Failure    Wait Until Element is Visible With Retry    ${element}    ${timeout}
    END

Wait Until Elements Are Enabled
    [Arguments]    @{elements}    ${timeout}=5
    FOR     ${element}  IN  @{elements}
        Run Keyword And Continue On Failure    Wait Until Element Is Enabled    ${element}    timeout=${timeout}
    END

Elements Should Not Be Visible
    [arguments]    @{elements}
    FOR     ${element}  IN  @{elements}
        Element Should Not Be Visible    ${element}
    END

Wait Until Page Does Not Contain Elements
    [arguments]    @{elements}    ${timeout}=${selenium_timeout}
    FOR     ${element}  IN  @{elements}
        Wait Until Page Does Not Contain Element    ${element}    ${timeout}
    END

Wait Until Elements Are Not Visible
    [Arguments]    @{elements}
    FOR    ${element}    IN    @{elements}
        Wait Until Element Is Not Visible    ${element}
    END

Wait Until Elements Are Disabled
    [Arguments]    @{elements}    ${timeout}=10
    FOR    ${element}    IN    @{elements}
        ${status}=   Element Should Be Disabled    ${element}
        IF    ${status} == ${False}
            Sleep    ${timeout}
            Element Should Be Disabled    ${element}
        END
    END

Slow
    [Arguments]    ${keyword}    @{args}    ${timeout}=0.1
    Sleep    ${timeout}
    Run Keyword    ${keyword}    @{args}
    Sleep    ${timeout}

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
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${ADD USER EMAIL}    ${ADD USER BUTTON MODAL}
    Input Text    ${ADD USER EMAIL}    ${EMAIL NOT OWNER}
    Click Button    ${ADD USER BUTTON MODAL}
    Check For Alert    ${NEW PERMISSIONS SAVED}
    Check User Permissions    ${EMAIL NOT OWNER}    ${CUSTOM TEXT}
    Close Browser

Make sure notowner is in the system
    Register Keyword To Run On Failure    None
    Open Browser and Go To URL    ${url}
    Log In    ${EMAIL OWNER}    ${password}    ${False}
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    ${status}    Run Keyword And Return Status    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}
    IF    ${status} == ${False}
        Share To    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    END
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
    IF    ${status} == ${False}
        Share To    ${EMAIL VIEWER}    ${VIEWER TEXT}
    END
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL VIEWER}    timeout=120    status=UNSEEN
    Delete Email    ${email}
    Close Mailbox
    Close Browser

User is in cloud system
    [Arguments]    ${user email}    ${system id}    ${auth}=${auth}
    @{users}=   Get Cloud System Users    ${auth}    ${system id}
    FOR    ${user}    IN    ${users}
        ${status}=   Run keyword and return status    Should be equal as strings   '${user}[accountEmail]'    '${user email}'
        Run Keyword If   ${status}    Exit For Loop
    END
    [Return]    ${status}

Add user to cloud system if not there
    [Arguments]    ${system id}    ${access role}    ${email}    ${auth}=${auth}
    ${is there}=   User is in cloud system    ${email}    ${system id}    ${auth}
    IF    ${is there} == ${False}
        Share    ${auth}    ${system id}    ${access role}    ${email}     ${permissions}[${access role}]
    END

Connect system to cloud if not
    [Arguments]    ${system auth}    ${server ip}     ${system name}    ${cloud owner email}    ${cloud owner password}
    ${current cloud system id}=    Get Cloud System Id      ${server ip}    ${system auth}
    Run Keyword If    '${current cloud system id}'=='${EMPTY}'    Connect System to Cloud    ${system auth}   ${server ip}    ${server port}    ${system name}    ${cloud owner email}    ${cloud owner password}
    ${current cloud system id}=    Get Cloud System Id      ${server ip}    ${system auth}
    [Return]    ${current cloud system id}

Reset System Names
    Run Keyword And Ignore Error    Rename System    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}    ${AUTO TESTS 2}
    Run Keyword And Ignore Error    Rename System    ${auth}    ${AUTO TESTS SYSTEM ID}    ${AUTO TESTS}

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
    ${user enabeled checkbox}=    Run Keyword And Return Status    Element Should Be Visible    //nx-system-settings-component//nx-block//span[contains(text(),'User disabled')]
    # Special case for user enabled checkbox that returns true even when not checked
    IF    "${user enabeled checkbox}" == "True"
        ${checked}=    Set Variable    False
    ELSE
        ${checked}    Execute Javascript    return window.document.getElementById('${id}').checked;
    END
    [return]    ${checked}

Set Checkbox Value
    [arguments]    ${CHECKBOX ELEMENT}    ${Desired Bool Value}
    ${Desired Bool Value}    Convert To Boolean    ${Desired Bool Value}    #input standardization
    ${id}    Get Element Attribute    ${CHECKBOX ELEMENT}    id
    Should Not Be Empty    ${id}    'The specified checkbox element "${CHECKBOX ELEMENT}" does not have an id attribute and cannot be used with the Set Checkbox Value Keyword.'
    ${checked}    Get Checkbox Value    ${CHECKBOX ELEMENT}
    #Run Keyword If    ${checked} != ${Desired Bool Value}    Execute Javascript    window.document.getElementById('${id}').click()
    IF    ${checked} != ${Desired Bool Value}
        Click Element    ${CHECKBOX ELEMENT}/..
        Scroll Element Into View    ${CHECKBOX ELEMENT}
    END

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

#Wait Until Number Of Tabs Are Open
#    [Arguments]    ${number}
#    FOR    
#    @{tabs}=   Get Window Handles
#    ${current tabs}=   Get length    ${tabs}
#    Wait For Condition       return ${current tabs}==${number}

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
    IF    "${session expiry}"!="None"
        Add Cookie    ${cookies[2].name}    ${cookies[2].value}     expiry=${session expiry}
    END
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

Get the link from email
    [Arguments]    ${email host}    ${email receipient}    ${password}    ${path}    ${timeout}=120
    Open Mailbox    host=${BASE HOST}    password=${password}    port=${BASE PORT}    user=${email host}    is_secure=True
    ${email index}=   Wait For Email    recipient=${email receipient}    timeout=${timeout}    status=UNSEEN
    ${link}=   Get Nx Links From Email    ${email index}    ${path}
    Delete Email    ${email index}
    Close Mailbox
    [Return]    ${link}

Get Key from Value
    [Arguments]    ${dict}   ${value}
    @{dict keys} =    Get Dictionary Keys    ${dict}
    FOR    ${key}     IN     @{dict keys}
        Return From Keyword If    '${dict['${key}']}' == '${value}'   ${key}
    END

Create Local Users via API
    [Arguments]    ${auth}    ${server}    ${locals}    ${password}
    &{local users} =    Create Dictionary
    &{advancedViewer} =    Create Dictionary
    &{cloudAdmin} =    Create Dictionary
    &{custom} =    Create Dictionary
    &{liveViewer} =    Create Dictionary
    &{viewer} =    Create Dictionary
    FOR    ${user}    IN    @{locals}
        Save User    ${auth}    ${server}    Local+${user}    ${permissions}[${user}]    noptixautoqa+local_${user}@gmail.com    Local User    ${password}    isCloud=${False}
        Set To Dictionary    ${${user}}    login=Local+${user}    email=noptixautoqa+local_${user}@gmail.com    #name=Local User    password=${password}
        Set To Dictionary    ${local users}    ${user}=&{${user}}
    END
    [return]    ${local users}

Delete All Local Users
    [Arguments]    ${locator}=//span[contains(text(),"ocal+")]
    Wait Until Element is Visible    ${locator}
    ${local users} =    Get Element Count     ${locator}
    #Click Element    ${locator}[1]
    FOR    ${node}   IN RANGE   ${local users}
        Wait Until Element is Visible    ${locator}
        Click Element    ${locator}
        Wait Until Element is Visible    ${LOCAL USER DELETE BUTTON}
        Click Button    ${LOCAL USER DELETE BUTTON}
        Wait Until Element is Visible     ${LOCAL USER DELETE CONFIRM BUTTON}
        Click Button    ${LOCAL USER DELETE CONFIRM BUTTON}
        Wait Until Element is Not Visible    ${LOCAL USER DELETE CONFIRM BUTTON}
        Sleep    2
        Reload Page
    END
    sleep    5
    Wait Until Element is Visible    //nx-menu//span[text()="admin"]
    Page Should Not Contain Element     ${locator}

Check Password Badge
    [arguments]    ${pass}    ${new focus}  
    IF    '''${pass}'''!='''${EMPTY}'''
        Wait Until Element Is Visible    ${PASSWORD BADGE}
    END
    Run Keyword If    '''${pass}'''=='''${COMMON PASSWORD}'''     Wait Until Element Is Visible    ${PASSWORD IS TOO COMMON BADGE}
    ...    ELSE IF    '''${pass}''' in ${weak passwords}          Wait Until Element Is Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${pass}''' in ${incorrect passwords}     Wait Until Element Is Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${pass}''' in ${fair passwords}          Wait Until Element Is Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${pass}''' in ${good passwords}          Wait Until Element Is Visible    ${PASSWORD IS GOOD BADGE}
    ...    ELSE IF    '''${pass}'''=='''${7CHAR PASSWORD}'''      Wait Until Element Is Visible    ${PASSWORD IS TOO SHORT BADGE}  

    IF    '''${pass}'''!='''${EMPTY}'''
        Mouse Over    ${PASSWORD BADGE}
    END
    Run Keyword If    '''${pass}'''=='''${COMMON PASSWORD}'''    Wait Until Element Is Visible    ${PASSWORD BADGE TOOLTIP}//div[contains(@class, "tooltip-body") and text()="${PASSWORD TOO COMMON TEXT}"]
    ...    ELSE IF    '''${pass}''' in ${weak passwords}         Wait Until Element Is Visible    ${PASSWORD BADGE TOOLTIP}//div[contains(@class, "tooltip-body") and text()="${PASSWORD IS WEAK TEXT}"]
    ...    ELSE IF    '''${pass}''' in ${incorrect passwords}    Wait Until Element Is Visible    ${PASSWORD BADGE TOOLTIP}//div[contains(@class, "tooltip-body") and text()="${PASSWORD SPECIAL CHARS TEXT}"]
    ...    ELSE IF    '''${pass}''' in ${fair passwords}         Wait Until Element Is Visible    ${PASSWORD BADGE TOOLTIP}//div[contains(@class, "tooltip-body") and text()="${PASSWORD IS WEAK TEXT}"]
    ...    ELSE IF    '''${pass}'''=='''${7CHAR PASSWORD}'''     Wait Until Element Is Visible    ${PASSWORD BADGE TOOLTIP}//div[contains(@class, "tooltip-body") and text()="${PASSWORD TOO SHORT TEXT}"]
    Mouse Over    //input[@type="password"]

    Run Keyword If    '''${pass}'''=='''${COMMON PASSWORD}'''    Move focus and check badge stays    ${PASSWORD IS TOO COMMON BADGE}    ${new focus}
    ...    ELSE IF    '''${pass}''' in ${weak passwords}         Move focus and check badge stays    ${PASSWORD IS WEAK BADGE}    ${new focus}
    ...    ELSE IF    '''${pass}''' in ${incorrect passwords}    Move focus and check badge stays    ${PASSWORD INCORRECT BADGE}    ${new focus}
    ...    ELSE IF    '''${pass}'''=='''${7CHAR PASSWORD}'''     Move focus and check badge stays    ${PASSWORD IS TOO SHORT BADGE}    ${new focus}
    ...    ELSE IF    '''${pass}''' in ${fair passwords}         Wait Until Element Is Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${pass}''' in ${good passwords}         Wait Until Element Is Visible    ${PASSWORD IS GOOD BADGE}

Move focus and check badge disappears
    [Arguments]    ${badge}    ${new focus}
    Element Should Be Visible    ${badge}
    Click Element    ${new focus}
    Wait Until Element Is Not Visible    ${badge}

Move focus and check badge stays
    [Arguments]    ${badge}    ${new focus}
    Element Should Be Visible    ${badge}
    Click Element    ${new focus}
    Wait Until Element Is Visible    ${badge}

Move focus and check element
    [Arguments]    ${element}    ${new focus}
    Click Element    ${new focus}
    Wait Until Element is Visible    ${element}

Check New Password Outline and Error Message
    [Arguments]    ${new pw}    ${new focus}    ${input}    ${input name}
    Click Element    ${new focus}
    IF    '''${new pw}''' not in ${fair passwords} and '''${new pw}''' not in ${good passwords}
         Element Style Should Be    ${input}    border-bottom-color    ${ERROR COLOR WITH OPACITY}
         Element Style Should Be    ${input}    border-top-color    ${ERROR COLOR WITH OPACITY}
         Element Style Should Be    ${input}    border-right-color    ${ERROR COLOR WITH OPACITY}
         Element Style Should Be    ${input}    border-left-color    ${ERROR COLOR WITH OPACITY}
    END
    IF    '''${new pw}''' not in ${fair passwords} and '''${new pw}''' not in ${good passwords}
        Element Style Should Be    ${input}    color    ${ERROR COLOR WITH OPACITY}
        Wait Until Element Is Visible    //nx-password-input[@name='${input name}' and contains(@class, 'ng-invalid')]//input[@id="${input name}"]
    END
    # The first "Run Keyword If" is added because a click out of filed is required for showing "Password is required"  error message
    Run Keyword If    '''${new pw}'''=="${EMPTY}" or "${new pw}"=="${SPACE}"    Input text    ${input}    ${EMPTY}
    IF    '''${new pw}'''=="${EMPTY}" or "${new pw}"=="${SPACE}"
        Move focus and check element    ${PASSWORD IS REQUIRED}    ${new focus}
    ELSE IF    '''${new pw}'''=="${7char password}"
        Move focus and check element    ${PASSWORD TOO SHORT}    ${new focus}
    ELSE IF    '''${new pw}''' in "${incorrect passwords}"
        Move focus and check element    ${PASSWORD SPECIAL CHARS}    ${new focus}
    ELSE IF    '''${new pw}'''=="${common password}"
        Move focus and check element    ${PASSWORD TOO COMMON}    ${new focus}
    ELSE IF    '''${new pw}''' in "${weak passwords}"
        Move focus and check element    ${PASSWORD IS WEAK}    ${new focus}
    END
#    Run Keyword If    '''${new pw}'''=="${EMPTY}" or "${new pw}"=="${SPACE}"    Move focus and check element    ${PASSWORD IS REQUIRED}    ${new focus}
#    ...    ELSE IF    '''${new pw}'''=="${7char password}"    Move focus and check element    ${PASSWORD TOO SHORT}    ${new focus}
#    ...    ELSE IF    '''${new pw}''' in "${incorrect passwords}"    Move focus and check element    ${PASSWORD SPECIAL CHARS}    ${new focus}
#    ...    ELSE IF    '''${new pw}'''=="${common password}"    Move focus and check element    ${PASSWORD TOO COMMON}    ${new focus}
#    ...    ELSE IF    '''${new pw}''' in "${weak passwords}"    Move focus and check element    ${PASSWORD IS WEAK}    ${new focus}
# ${CURRENT PASSWORD INPUT}  put that into  register or change pass for intput

Check System Text
    [Arguments]    ${user}    ${sysId}
    Log Out
    Log in to user and system    ${user}    ${sysId}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}
    Dismiss New Feature Modal
    IF    "${user}"!="${EMAIL ADMIN}"
        Wait Until Element Is Not Visible    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]
    END

Get Lang List
    ${lang file} =    OperatingSystem.Get File    customizations/${CUST LANGUAGE LIST}
    ${lang dict} =    Evaluate   json.loads('''${lang file}''')    json
    [Return]    ${lang dict}
    
Log In If Needed
    [Arguments]    ${email}    ${password}
    ${status} =    Run Keyword and Return Status    Wait Until Element Is Visible    ${LOG IN MODAL}    timeout=3
    Run Keyword If    ${status}    Run Keywords
    ...    Log In    ${email}    ${password}    button=None    AND
    ...    Validate Log In    ${email}

Register and Activate Generic Users
    [Arguments]    ${password}=${BASE PASSWORD}
    ${generic users}=    Create Dictionary
    FOR    ${user}    IN    @{permissions.keys()}
        ${email}=   Register and activate account with random email    mark    hamil    ${password}
        Set To Dictionary    ${generic users}    ${user}=${email}
        Sleep    0.1
    END
    [Return]    ${generic users}

Add Cloud Users
    [Arguments]    ${auth}    ${users}    ${system id}
    FOR  ${permission}  ${user}  IN  &{users}
        Add user to cloud system if not there    ${system id}    ${permission}    ${user}    auth=${auth}
    END

Get Random Available Port
    ${port}=   Execute Command    comm -23 <(seq 30000 65535 | sort) <(ss -Htan | awk '{print $4}' | cut -d':' -f2 | sort -u) | shuf | head -n 1
    [Return]    ${port}

Create Docker Server
    [Arguments]    ${name}     ${customPort}    ${image}=${IMAGE}     ${storage string}=${EMPTY}    ${VMS}=new    ${network}=bridge
    &{server}=   Create Dictionary
    ${mac}=   Get Random MAC
    Acquire Lock   create_server_lock
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    IF    '5.0' not in $image
        Set Local Variable   ${vms}    old
    ELSE
        Set Local Variable    ${vms}    new
    END
    IF    not $customPort
        ${port}=   Get Random Available Port
    ELSE
        ${port}=   Set Variable    ${customPort}
    END
    ${ENV NO HTTP}=   Replace String    ${ENV}    https://    ${EMPTY}
    ${full id}=   Run Keyword If    "${network}"=="host"    Execute Command    docker run -d --name=${name} --restart=always -e VMS=${vms} -e PORT=${port} -e CLOUD_HOST=${ENV NO HTTP} --privileged --network=${network} --cap-add=NET_ADMIN ${storage string} ${image}
                  ...    ELSE    Execute Command    docker run -d --name=${name} --restart=always --mac-address=${mac} -e VMS=${vms} -p ${port}:7001 -e CLOUD_HOST=${ENV NO HTTP} --privileged --network=${network} --cap-add=NET_ADMIN ${storage string} ${image}
    ${id}=   Evaluate    $full_id[:12]
    Set to Dictionary    ${server}    id=${id}
    Set to Dictionary    ${server}    port=${port}
    ${name}=   Execute Command    docker ps --format "{{.Names}}" -f "id=${id}"
    Set to Dictionary    ${server}    name=${name}
    ${timeout kill er} =   Execute Command    echo "docker container stop ${server}[name]" | at now +90min    return_stdout=${False}   return_stderr=${True}
    Close Connection
    Release Lock   create_server_lock
    [Return]    ${server}

Create Base System
    [Arguments]    ${container name}    ${image}=${IMAGE}    ${network}=bridge    ${owner}=${None}    ${add users}=${True}    ${storage string}=${EMPTY}    ${password}=${BASE PASSWORD}    ${customPort}=${False}
    [Documentation]    Creates a docker server, and optionally connects to cloud, creates users, and adds storage.
    ...
    ...                Returned keys and value types:
    ...                cloud auth: []
    ...                cloud id: ""
    ...                cloud users: {}
    ...                id: ""
    ...                local auth: []
    ...                local users: {}
    ...                name: ""
    ...                owner: ""
    ...                port: ""
    ${local auth}=   Create List    admin    ${password}
    ${server}=   Create Docker Server    ${container name}    ${custom port}    image=${image}     storage string=${storage string}    network=${network}    
    Sleep    5
    IF    '5.0' == $image or '5.1' == $image
        Setup Local System    https://${QA BURBANK IP}:${server}[port]    ${password}    ${container name}
    ELSE
        Setup Local System 42   https://${QA BURBANK IP}:${server}[port]    ${password}    ${container name}
    END
    # Slow    REST Setup Local System    https://${QA BURBANK IP}:${server}[port]    ${BASE PASSWORD}    ${container name}    timeout=5
    Set To Dictionary    ${server}    name=${container name}
    # If cloud is true connect to cloud and get the cloud ID
    ${cloud auth}=   Run Keyword If    $owner    Create List    ${owner}    ${password}
    ${system id}=   Run Keyword if    $owner    Connect System to Cloud    ${local auth}    https://${QA BURBANK IP}:${server}[port]    ${container name}    ${owner}    ${password}    img=${image}
    # If add users is true add local users.  Add cloud users if both are true.
    @{local users}=    Get Dictionary Keys    ${role names}
    ${local users}=    Run Keyword If    $add_users    Create Local Users Via API    ${local auth}    https://${QA BURBANK IP}:${server}[port]    ${local users}   ${password}
    ${cloud users}=    Run Keyword If    $add_users and $owner   Register and Activate Generic Users
    Run Keyword If    $add_users and $owner    Add Cloud Users    ${cloud auth}    ${cloud users}    ${system id}

    # Add local auth to dict
    Set To Dictionary    ${server}    local auth=${local auth}

    # Add cloud info to dict if owner is true
    Run Keyword If    $owner    Set To Dictionary    ${server}    owner=${owner}    cloud auth=${cloud auth}    cloud id=${system id}
        ...    ELSE    Set To Dictionary    ${server}    owner=${None}

    # Add local users if add users is true
    Run Keyword If    $add_users    Set To Dictionary    ${server}    local users=${local users}

    # Add cloud users if both are true
    Run Keyword If    $add_users and $owner    Set To Dictionary    ${server}    cloud users=${cloud users}
       ...    ELSE    Set To Dictionary    ${server}    cloud users=${None}

    [Return]    ${server}

Delete Accounts
    [Arguments]    ${accounts}
    FOR    ${email}    IN   @{accounts}
        Delete Account    ${email}    ${base password}
    END

Delete Base System
    [Arguments]     ${system}    ${password}=${BASE PASSWORD}
    [Documentation]    Wipe out all resources related to the system
    Run Keyword If    $system['owner']    Disconnect    ${system}[owner]    ${password}    ${system}[cloud id]
    Run Keyword If    $system['cloud users']    Delete Accounts    ${system['cloud users'].values()}

    Delete Docker Server    ${system}[id]

    # Delete user if he doesn't own any cloud systems
    Run Keyword If    not $system['owner']    Return From Keyword    True
    ${systems}=    Get Account Systems    ${system}[owner]    ${password}
    ${num systems}=   Evaluate    len($systems)
    Run Keyword If    ${num systems} == 0    Delete Account    ${system}[owner]    ${password}


Create Custom Network
    [Arguments]    ${name}    ${num}    ${host}=${QA BURBANK IP}
    ${driver}=   Set Variable    bridge
    ${subnet}=   Set Variable    192.28.${num}.0/24
    ${ip range}=   Set Variable    192.28.${num}.0/24
    ${gateway}=    Set Variable    192.28.${num}.254
    ${cmd}=   Set Variable    docker network create --driver=${driver} --subnet=${subnet} --ip-range=${ip range} --gateway=${gateway} ${name}
    ${net id}=   Execute Command Remotely    ${cmd}    ${host}
    [Return]    ${net id}

Remove Custom Network
    [Arguments]    ${net id}    ${host}=${QA BURBANK IP}
    Execute Command Remotely    docker network rm ${net id}    ${host}
    [Return]    ${net id}

Delete Docker Server
    [Arguments]    ${name}
    Execute Command Remotely    docker rm -f ${name}
    [Return]    ${False}

Start Docker Server
    [Arguments]    ${name}
    Execute Command Remotely    docker start ${name}

Stop Docker Server
    [Arguments]    ${name}
    Execute Command Remotely    docker stop ${name}

Restart Docker Servers
    [Arguments]    @{names}
    FOR    ${name}    IN    @{names}
        ${result} =    Execute Command Remotely    docker restart ${name}
        Run Keyword and Warn on Failure    Should Be Equal As Strings     ${result}    ${name}
        Sleep    1
    END
    
    # [Arguments]    ${port}    ${name}    ${auth}
    # Restart Server    https://${QA BURBANK IP}:${port}   ${auth}
    # Sleep    10
    # Acquire Lock   restart_server_lock
    # Open Connection    ${QA BURBANK IP}
    # SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # ${port info}=   Execute Command    docker container port ${name}
    # ${port info}=   Split String    ${port info}    :::
    # Close Connection
    # Release Lock   restart_server_lock
    # [Return]    ${port info}[1]

Get container port by name
    [Arguments]    ${name}
    Acquire Lock   get_port_lock
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${port info}=   Execute Command    docker container port ${name}
    ${port info}=   Split String    ${port info}    :
    Close Connection
    Release Lock   get_port_lock
    [Return]    ${port info}[1]

Get container id by name
    [Arguments]    ${name}
    Acquire Lock    get_id_lock
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${id}=   Execute Command    docker ps -qaf "name=^${name}"
    Close Connection
    Release Lock    get_id_lock
    [Return]    ${id}

Page Should Not Contain Elements
    [Arguments]    @{locators}
    FOR    ${loc}    IN    @{locators}
        Page Should Not Contain Element    ${loc}
    END

Execute Command Remotely
    [Arguments]    ${command}    ${host ip}=${QA BURBANK IP}    ${host user}=${QA BURBANK USER}    ${host password}=${QA BURBANK PASS}
    Acquire Lock    exec_cmd_lock
    Open Connection    ${host ip}
    SSHLibrary.Login    ${host user}    ${host password}
    ${result}=   Execute Command    ${command}     return_rc=${True}
    Should Be Equal As Integers     ${result}[1]    0
    Close Connection
    Release Lock    exec_cmd_lock
    [Return]    ${result}[0]

Wait Until Element is Visible with Retry
    [Arguments]    ${element}    ${timeout}=120
    ${load} =    Run Keyword and Warn On Failure    Wait Until Element is Visible    ${element}    timeout=${timeout}
    IF    ${load} != ('PASS', None)
        Reload Page
    END
    Wait Until Element is Visible    ${element}   timeout=${timeout}
    
Verify No Horizontal Scrollbar
    [Arguments]    ${outer element}    ${inner element}
    ${width out}    ${height out} =    Get Element Size    ${outer element}
    ${width in}     ${height in} =    Get Element Size    ${inner element}
    Should Be Equal As Numbers    ${width out}    ${width in}
    
Verify Horizontal Scrollbar Exists
    [Arguments]    ${outer element}    ${inner element}
    ${width out}    ${height out} =    Get Element Size    ${outer element}
    ${width in}     ${height in} =    Get Element Size    ${inner element}
    Should Be True    ${width out} < ${width in}
    
Verify One Element Above the Other
    [Arguments]    ${higher element}    ${lower element}
    ${lower y} =    Get Vertical Position    ${higher element}
    ${higher y} =    Get Vertical Position    ${lower element}
    Should Be True    ${lower y} < ${higher y}
    
Drag Horizontal Scrollbar
    [Arguments]    ${scrollbar}    ${x offset}
    Assign Id To Element    ${scrollbar}    scrollID
    Execute Javascript        document.getElementById("scrollID").scrollBy(${x offset}, 0)
    
Verify Element Does Not Scroll
    [Arguments]    ${element}    ${scrollbar}
    ${original x} =    Get Horizontal Position    ${element}
    Slow    Drag Horizontal Scrollbar    ${scrollbar}    50
    ${new x} =    Get Horizontal Position    ${element}
    Should Be Equal As Numbers    ${original x}    ${new x}

Delete All Text
    [Arguments]    ${input}     ${replaceText}=${False}     ${replaceWith}=${None}
    ${text}=   Get Text    ${input}
    ${value}=   Get Element Attribute    ${input}    value
    ${innertext}=    Get Element Attribute    ${input}    innertext
    IF    '${text}' == '${None}' or '${text}' == '${Empty}'
        IF    '${value}' == '${None}'
            ${text} =   Set Variable    ${innertext}
        ELSE
            ${text} =   Set Variable    ${value}
        END
    ELSE
        ${text} =    Set Variable   ${text}
    END
    ${length}=   Get Length    ${text}
    ${length}=   Evaluate    ${length} + 1
    Click Element    ${input}
    FOR    ${n}    IN RANGE    ${length}
        Press Keys    None    ARROW_RIGHT
        Press Keys    None     BACKSPACE
    END
    Run Keyword If    ${replaceText}    Press Keys    None   ${replaceWith}

#Delete All Content Editable Text
#    [Arguments]    ${input}
#    ${text}=   Get Element Attribute    ${input}    innertext
#    ${length}=   Get Length    ${text}
#    ${length}=   Evaluate    ${length} + 1
#    Click Element    ${input}
#    FOR    ${n}    IN RANGE    ${length}
#        Press Keys    None     BACKSPACE 
#    END

Skip If Irrelevant
    ${relevant}=   Run keyword and return status    List Should Contain Value    ${TEST TAGS}    ${mode}
    Skip If    not ${relevant}    Test not meant for ${mode}

Input Content Editable Text
    [Arguments]    ${element}    ${text}
    Delete All Text    ${element}
    Press Keys    ${element}    ${text}
    
Create Virtual Disk
    [Arguments]    ${disk location}    ${disk name}    ${disk size}    ${disk target}
    &{disk}=   Create Dictionary
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}=    Execute Command     dd if=/dev/zero of=${disk location}/${disk name}.img bs=1M count=${disk size}    sudo=True    sudo_password=${QA BURBANK PASS}
    ${results}=    Execute Command     mkfs -t ext4 ${disk location}/${disk name}.img    sudo=True    sudo_password=${QA BURBANK PASS}
    ${results}=    Execute Command     mkdir ${disk name}    sudo=True    sudo_password=${QA BURBANK PASS}
    ${results}=    Execute Command     mount -t auto -o loop ${disk location}/${disk name}.img ${disk name}    sudo=True    sudo_password=${QA BURBANK PASS}    return_stdout=False    return_rc=True
    Should Be Equal As Integers   ${results}    0
    Close Connection
    Set To Dictionary    ${disk}    img=${disk location}/${disk name}.img
    Set To Dictionary    ${disk}    folder=${disk name}
    Set To Dictionary    ${disk}    size=${disk size}
    Set To Dictionary    ${disk}    target=${disk target}
    Set To Dictionary    ${disk}    string=--mount type=bind,source="/home/qaburbank/${disk name}",target=/${disk target}
    [Return]    ${disk}
    
Delete Virtual Disk
    [Arguments]    ${img path}    ${folder}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command     umount ${folder}     sudo=True    sudo_password=${QA BURBANK PASS}
    ${results}    Execute Command     rm ${img path}     sudo=True    sudo_password=${QA BURBANK PASS}
    ${results}    Execute Command     rm -r ${folder}     sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    
Make Directory
    [Arguments]    ${dir name}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    mkdir ${dir name}    sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    
Remove Directory
    [Arguments]    ${dir name}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    rm -r ${dir name}   sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    
Remove All Files 
    [Arguments]    ${dir name}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    rm ${dir name}/*   sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    
Verify File Exists
    [Arguments]    ${folder}    ${file}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    find ${folder} -name ${file}    sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    Should Contain    ${results}    ${file}

Create system and attach to cloud
    [Arguments]    ${server url}    ${server port}    ${system name}    ${cloud email}    ${cloud password}=${BASE PASSWORD}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    @{default auth}=    Create List    admin    admin
    &{bind json}=    Bind System    ${cloud auth}    ${ENV}    name=${system name}
    sleep    5
    &{Setup Cloud System json}=    Setup Cloud System
    ...    ${default auth}
    ...    ${server url}:${server port}
    ...    ${bind json["authKey"]}
    ...    ${bind json["name"]}
    ...    ${bind json["id"]}
    ...    ${bind json["ownerAccountEmail"]}
    [Return]    ${bind json["id"]}
    
Connect System to Cloud
    [Arguments]    ${auth}   ${server ip}    ${system name}    ${cloud email}    ${cloud password}    ${cloud host}=${ENV}    ${img}=${IMAGE}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    IF    '5' in $img
        ${system id}=   API Connect To Cloud    ${cloud auth}   ${server ip}    ${cloud host}    ${system name}
        Return From Keyword    ${system id}
    ELSE
        &{bind json}=    Bind System    ${cloud auth}    ${cloud host}    ${system name}
        Sleep    5
        ${Setup Cloud System json}=    Save Cloud System Credentials
        ...    ${auth}
        ...    ${server ip}
        ...    ${bind json["authKey"]}
        #...    ${bind json["name"]}
        ...    ${bind json["id"]}
        ...    ${bind json["ownerAccountEmail"]}
        Return From Keyword    ${bind json["id"]}
    END

Log Out via API
    [Arguments]    ${validate}=${True}
    ${cookies}=   Get Cookies    as_dict = True
    ${status}=   API Log Out    ${cookies}[sessionid]    ${cookies}[csrftoken]
    Should Be Equal as Strings    ${status}    200
    Sleep    2
    Reload Page
    Sleep    5
    Go To    ${ENV}
    Run Keyword If    ${validate}    Validate Log Out
    [Return]    ${status}

Get container IP by name
    [Arguments]    ${name}
    Acquire Lock    get_id_lock
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${ip}=   Execute Command    docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${name}
    Close Connection
    Release Lock    get_id_lock
    [Return]    ${ip}


# header-resource
Validate Header Button Text
    [Arguments]    ${expected text}    ${systems}=${True}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Sleep    5
    ${actual text}=   Get Text    ${SYSTEMS DROPDOWN}/span
    Run Keyword If    ${systems}    Should be equal as strings    ${expected text}${SPACE}${SYSTEMS TITLE TEXT}    ${actual text}
        ...    ELSE    Should be equal as strings    ${expected text}    ${actual text}

# system-server-resource
Verify on Servers Page
    [Arguments]    ${timeout}=${selenium_timeout}
    Wait Until Elements Are Visible with Retry
    #...    ${PORT INPUT}
    ...    ${RESTART SERVER BUTTON}
    ...    ${SERVER DETAILED INFO BUTTON}
    ...    ${IP}       
    ...    ${OS}       
    ...    ${VERSION}  
    ...    timeout=${timeout}

Log in to user and system
    [Arguments]    ${user}    ${system id}    ${verify}=True    ${password}=${BASE PASSWORD}
    Log in    ${user}    ${password}
    Sleep    1
    Go To    ${ENV}/systems/${system id}
    Sleep    1
    #Run Keyword If    '${user}'=='${EMAIL OWNER}' and ${verify}==True    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    #Run Keyword If    '${user}'=='${EMAIL ADMIN}' and ${verify}==True   Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    #Run Keyword Unless    '${user}'=='${EMAIL OWNER}' or '${user}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}


# 2fa-resource
Generate totp and login
    [arguments]    ${email}
    ${totp}=    Get 2fa Verification Code    ${2fa key value}
    Wait Until Element Is Visible    ${2FA AUTH CODE FIELD}
    2fa log in verification code form validations    ${email}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${2FA AUTH CODE FIELD}    ${totp}
    Click Element    ${2FA AUTH CODE LOG IN BTN}

2fa log in verification code form validations
    [arguments]    ${email}
    Element Should Be Visible    ${2FA CLOUD ILLUSTRATION}
    Element Should Be Visible    ${2FA LOG IN CLOUD}
    Element Should Be Visible    //nx-authorize-component//nx-authorize-auth-code-component//span[text()="${email}"]
    Element Should Be Visible    ${2FA AUTH CODE FIELD}
    Element Should Be Visible    ${2FA CODE INSTRUCTIONS}
    Element Should Be Visible    ${2FA BACK BTN}
    Element Should Be Visible    ${2FA BACKUP CODE BTN}
    Element Should Be Visible    ${2FA LOG IN BTN}

Type in backup code and login
    [Arguments]    ${2fa backup code}    ${email}
    Wait Until Element Is Visible    ${2FA BACKUP CODE BTN}
    2fa log in verification code form validations    ${email}
    Click Element    ${2FA BACKUP CODE BTN}
    Wait Until Element Is Visible    ${2FA BACKUP CODE FIELD}
    2fa log in backup code form validations    ${email}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${2FA BACKUP CODE FIELD}   ${2fa backup code}
    Click Element    ${2FA BACKUP CODE LOG IN BTN}

2fa log in backup code form validations
    [arguments]    ${email}
    Element Should Be Visible    ${2FA BK CLOUD ILLUSTRATION}
    Element Should Be Visible    ${2FA BK LOG IN CLOUD}
    Element Should Be Visible    //nx-authorize-component//nx-authorize-backup-code-component//span[text()="${email}"]
    Element Should Be Visible    ${2FA BK CODE FIELD}
    Element Should Be Visible    ${2FA BK CODE HELP}
    Element Should Be Visible    ${2FA BK CODE CONTACT}
    Element Should Be Visible    ${2FA BK BACK BTN}
    Element Should Be Visible    ${2FA AUTH CODE BTN}
    Element Should Be Visible    ${2FA BK LOG IN BTN}


# system admin resource
Close Modal If There
    ${modal is visible}=   Run keyword and return status    Element Should Be Visible    ${COMMON CLOSE BUTTON}
    Run Keyword If     ${modal is visible}    Run Keywords
        ...    Click Element    ${COMMON CLOSE BUTTON}   AND
        ...    Wait until element is not visible    ${COMMON CLOSE BUTTON}


# system-user-resource
Remove User Permissions
    [Arguments]    ${user email address}
    ${User In List}=   Select user in Users List    ${user email address}
    Wait Until Element Is Visible    ${REMOVE USER BUTTON}
    Click Button    ${REMOVE USER BUTTON}
    Wait Until Element Is Visible    ${REMOVE BUTTON}
    Click Button    ${REMOVE BUTTON}
#    ${PERMISSIONS WERE REMOVED FROM EMAIL}    Replace String    ${PERMISSIONS WERE REMOVED FROM}    %email%    ${user email address}
    Wait Until Elements Are Not Visible    ${User In List}    ${REMOVE USER MODAL}

Select user in Users List
    [Arguments]    ${user email address}
    ${status}=   Run Keyword And Return Status    Wait Until Element Is Visible   ${ADD USER BUTTON SYSTEMS}   5
    IF    ${status} == ${False}
        Go To Users List
    END
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${user email address}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Element Is Visible    ${USER EMAIL}
    Wait Until Element Contains    ${USER EMAIL}    ${user email address}
    [Return]    ${user email address}

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
    ...    ${ADD USER PERMISSIONS HINT ADMINISTRATOR}
    Run Keyword If    '${permissions}'=='${ADV VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${ADD USER PERMISSIONS HINT ADVANCED VIEWER}
    Run Keyword If    '${permissions}'=='${VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${ADD USER PERMISSIONS HINT VIEWER}
    Run Keyword If    '${permissions}'=='${LIVE VIEWER TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${ADD USER PERMISSIONS HINT LIVE VIEWER}
    Run Keyword If    '${permissions}'=='${CUSTOM TEXT}'
    ...    Element Text Should Be    ${HELP BLOCK}
    ...    ${ADD USER PERMISSIONS HINT CUSTOM}

    Set Selenium Timeout    ${original timeout}

Skip If Image Is
    [Arguments]    @{unsupported images}    ${msg}
    FOR    ${item}    IN    @{unsupported images}
        Skip If    '${IMAGE}' == '${item}'    ${msg}
    END

Check Page Text Language
    ${elements} =   Get WebElements    tag:span
    ${elements2} =    Get WebElements    tag:a
    ${elements} =    Combine Lists   ${elements}     ${elements2}
    FOR    ${element}    IN    @{elements}
        ${text} =   Get Text    ${element}
        IF    '${text}' != '${EMPTY}'
             ${lang} =    Detect Language     ${text}
             ${lang} =    Convert To String     ${lang}
             ${en detected} =   Run Keyword And Return Status    Should Contain    ${lang}    lang=en
             ${autoqa detected} =   Run Keyword And Return Status    Should Not Contain    ${text}    noptixautoqa
             IF     ${en detected} and ${autoqa detected}
                Capture Element Screenshot    ${element}
                Run Keyword And Continue On Failure    Should Not Contain    ${lang}    lang=en
             END
        END
    END

Click
    [Documentation]     Acceptible types: Element, Button, Link.  This kw ensures that no stale element errors occur.
    [Arguments]     ${type}     ${locator}
    Wait Until Element Is Visible    ${locator}
    Wait Until Element is Enabled    ${locator}
    IF    '${type}' == 'Button'
        Wait Until Keyword Succeeds   10    .1   Click Button    ${locator}
    ELSE IF   '${type}' == 'Element'
        Wait Until Keyword Succeeds   10    .1   Click Element    ${locator}
    ELSE IF   '${type}' == 'Link'
        Wait Until Keyword Succeeds   10    .1   Click Link      ${locator}
    ELSE
        Fail    Button, Element or Link are the only allowed types.
    END

Dismiss New Feature Modal
    Wait Until Element Is Visible    ${NEW FEATURE CLOSE BUTTON}    timeout=2
    Click Button    ${NEW FEATURE CLOSE BUTTON}

QA Video Recording Start
    [Arguments]     ${fps}=15      ${width}=1200    ${monitor}=2
    ${test case} =     Fetch From Left     ${TEST_NAME}   .
    IF    ${video_recording}
        ScreenCapLibrary.Set Screenshot Directory    videos
        Start Video Recording     alias=${TEST_NAME}    name=${SUITE_NAME}_${test case}    fps=${fps}    embed_width=${width}    monitor=${monitor}
    END

QA Video Recording Stop
    IF    ${video_recording}
        Run Keyword If Test Failed      Stop Video Recording   alias=${TEST_NAME}
        Run Keyword And Ignore Error    Stop Video Recording   alias=${TEST_NAME}    save_to_disk=${False}
    END