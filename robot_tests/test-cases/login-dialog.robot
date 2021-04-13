*** Settings ***
Resource          ../resource.robot
Suite Setup       Setup
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        Threaded

*** Variables ***
${email}    ${EMAIL OWNER}
${email invalid}    aodehurgjaegir
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Setup
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${login user}    ${user}

Restart
    Go To    ${url}
    Common Restart Logout    ${url}

*** Test Cases ***
Can be opened in anonymous state
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${LOG IN MODAL}

Can be closed by clicking on the X
    [tags]    C24212    
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements are Visible
    ...    ${LOG IN MODAL}
    ...    ${BACKDROP}
    ...    ${LOG IN BUTTON}
    ...    ${EMAIL INPUT}
    ...    ${PASSWORD INPUT}
    ...    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Page Does Not Contain Element    ${LOG IN MODAL}

Allows to log in with existing credentials and to log out
    [tags]    C24212    C24213    
    Log In    ${login user}    ${password}
    Log Out

Redirects to systems after log In
    Log In    ${login user}    ${password}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Location Should Be    ${url}/systems

After log In, display user's email and menu in top right corner
    Set Window Size    1920    1080
    Log In    ${login user}    ${password}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}/span[text()="${login user}"]

Allows log in with existing email in uppercase
    ${email uppercase}    Convert To Uppercase    ${login user}
    Log In    ${email uppercase}    ${password}    validate=${False}
    Wait Until Element Contains    ${ACCOUNT DROPDOWN}    ${login user}

Allows log in with 'Remember Me checkmark' switched off
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements are Visible
    ...    ${REMEMBER ME CHECKBOX VISIBLE}
    ...    ${EMAIL INPUT}
    ...    ${PASSWORD INPUT}
    ...    ${LOG IN BUTTON}
    Click Element    ${REMEMBER ME CHECKBOX VISIBLE}
    Checkbox Should Not Be Selected    ${REMEMBER ME CHECKBOX REAL}
    Log In    ${login user}    ${password}    button=None

Contains 'I forgot password' link that leads to Restore Password page with pre-filled email from log In form
    Log In    ${login user}    'aderhgadehf'    validate=${False}
    Wait Until Elements are Visible
    ...    ${REMEMBER ME CHECKBOX VISIBLE}
    ...    ${EMAIL INPUT}
    ...    ${PASSWORD INPUT}
    ...    ${LOG IN BUTTON}
    ...    ${FORGOT PASSWORD}
    Sleep    1
    Click Link    ${FORGOT PASSWORD}
    Wait Until Element is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    Textfield Should Contain    ${RESTORE PASSWORD EMAIL INPUT}    ${login user}

Passes email from email input to Restore password page, even without clicking 'Log in' button
    [tags]    C41872    
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${login user}
# the transition animations causes bad targeting on the link.  This is tentative.
    sleep    .15
    Wait Until Element is Visible    ${FORGOT PASSWORD}
    Click Link    ${FORGOT PASSWORD}
    Wait Until Element is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    Textfield Should Contain    ${RESTORE PASSWORD EMAIL INPUT}    ${login user}

Shows non-activated user message when not activated at login; Resend activation button sends email
    [tags]    email    C41865    
    Go To    ${url}/register
    ${random email}    get random email    ${BASE EMAIL}
    Register    'mark'    'hamill'    ${random email}    ${password}
    Wait Until Elements are Visible
    ...    ${ACCOUNT CREATION SUCCESS}
    ...    ${ACCOUNT CREATION SUCCESS ICON}
    ...    ${ACCOUNT CREATION CONFIRMATION}
    Log In    ${random email}    ${BASE PASSWORD}    validate=${False}
    Wait Until Element is Visible    ${RESEND ACTIVATION LINK BUTTON}
    Validate Register Email Received    ${random email}
    Click Link    ${RESEND ACTIVATION LINK BUTTON}
    Activate    ${random email}
    Log In    ${random email}    ${password}

Displays password masked
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${PASSWORD INPUT}
    ${input type}    Get Element Attribute    ${PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'

Requires log In, if the user has just logged out and pressed back button in browser
    Log In    ${login user}    ${password}
    Log Out
    Go Back
    Wait Until Element is Visible    ${LOG IN MODAL}

Handles more than 255 symbols email and password
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}
    Input Text    ${EMAIL INPUT}    ${300CHARS}
    Input Text    ${PASSWORD INPUT}    ${300CHARS}
    Textfield Should Contain    ${EMAIL INPUT}    ${255CHARS}
    Textfield Should Contain    ${PASSWORD INPUT}    ${255CHARS}

Logout refreshes page
    Log In    ${login user}    ${password}
    Log Out

# We don't actually allow copy of the password field at log in.
Allows copy-paste in input fields
    ${system} =    Evaluate    platform.system()    platform
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    Copy Paste Test
    Copy Text    ${EMAIL INPUT}
    Clear Element Text    ${EMAIL INPUT}
    Paste Text    ${EMAIL INPUT}
    Textfield Should Contain    ${EMAIL INPUT}    Copy Paste Test

Should respond to Esc key and close dialog
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${PASSWORD INPUT}
    Press Keys    ${PASSWORD INPUT}    ESCAPE
    Wait Until Element Is Not Visible    ${LOG IN MODAL}
    Element Should Not Be Visible    ${LOG IN MODAL}

Should respond to Enter key and log in
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements are Visible    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Input Text    ${EMAIL INPUT}    ${login user}
    Input Text    ${PASSWORD INPUT}    ${password}
    Wait Until Element is Visible    ${LOG IN BUTTON}
    Press Keys    ${PASSWORD INPUT}    ENTER
    Validate Log In    ${login user}

Should respond to Tab key
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Set Focus To Element    ${EMAIL INPUT}
    Press Keys    ${EMAIL INPUT}    TAB
    Element Should Be Focused    ${PASSWORD INPUT}

Should respond to Space key and toggle checkbox
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${REMEMBER ME CHECKBOX VISIBLE}
    Set Focus To Element    ${REMEMBER ME CHECKBOX REAL}
    Press Keys    None    SPACE
    Checkbox Should Not Be Selected    ${REMEMBER ME CHECKBOX REAL}
    Press Keys    None    SPACE
    Checkbox Should Be Selected    ${REMEMBER ME CHECKBOX REAL}

Handles two tabs, updates second tab state if logout is done on first
    Go To    ${url}/register
    Wait Until Elements are Visible
    ...    ${REGISTER FIRST NAME INPUT}
    ...    ${REGISTER LAST NAME INPUT}
    ...    ${REGISTER EMAIL INPUT}
    ...    ${REGISTER PASSWORD INPUT}
    ...    ${CREATE ACCOUNT BUTTON}
    Click Link    ${TERMS AND CONDITIONS LINK}
    # This is specifically for Ubuntu Firefox because the new page
    # isn't created fast enough and Get Window Handles only gets 1 item.
    Sleep    2
    ${tabs}    Get Window Handles
    Select Window    ${tabs}[1]
    Set Window Size    1920    1080
    Location Should Be    ${url}/content/eula
    Go To    ${url}
    Validate Log Out
    # This is specifically for Ubuntu Firefox as the JS seems to
    # load slowly and doesn't redirect correctly after login.
    Sleep    5
    Log In    ${login user}    ${password}
    Select Window    ${tabs}[0]
    Location Should Be    ${url}/register
    Reload Page
    Wait Until Element is Visible    ${LOGGED IN STAY LOGGED IN BUTTON}
    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
    Sleep    2
    Wait Until Page Does Not Contain Elements    ${BACKDROP}    ${MODAL DIALOG}
    Validate Log In    ${login user}
    Log Out
    ${tabs}    Get Window Handles
    Select Window    ${tabs}[1]
    Location Should Be    ${url}/systems
    Reload Page
    Wait Until Element is Visible    ${LOG IN MODAL}

Log in more than 5 times
    [tags]    C42075    
    Go To    ${url}/register
    ${email}    Get Random Email    ${BASE EMAIL}
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${email}    ${BASE PASSWORD}
    Activate    ${email}
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements are Visible
    ...    ${LOG IN MODAL}
    ...    ${BACKDROP}
    ...    ${LOG IN BUTTON}
    ...    ${EMAIL INPUT}
    ...    ${PASSWORD INPUT}
    ...    ${LOG IN CLOSE BUTTON}
    Input Text    ${EMAIL INPUT}    ${email}
    FOR  ${x}  IN RANGE  6
        Sleep    2
        Input Text    ${PASSWORD INPUT}    incorrect
        Wait Until Element is Visible    ${LOG IN BUTTON}
        Click Button    ${LOG IN BUTTON}
        Sleep    1
    END
    Wait Until Element is Visible    ${TOO MANY ATTEMPTS MESSAGE}
    Sleep    65
    Input Text    ${PASSWORD INPUT}    ${BASE PASSWORD}
    Wait Until Element is Visible    ${LOG IN BUTTON}
    Click Button    ${LOG IN BUTTON}
    Validate Log In    ${email}

User is logged out of browser after a password change in another browser
    [tags]    C41837
    Log In    ${login user}    ${password}
    Open Browser and go to URL    ${url}
    Switch Browser    1
    #Log In    ${email}    ${password}
    #Switch Browser    1
    Go To    ${url}/account/password
    Sleep    1
    Wait Until Elements are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${ALT PASSWORD}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Switch Browser    2
    # wait for server to disconnect user
    sleep    30

    Validate Log Out
    Sleep    1

    Log In    ${login user}    ${ALT PASSWORD}    validate=${False}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Sleep    2
    Go To    ${url}/account/password
    Sleep    1
    Wait Until Elements are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${ALT PASSWORD}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Click Button    ${CHANGE PASSWORD BUTTON}

# Remember Me Checkbox
# Commented out due to CQA-172
    # [Tags]    C41567
    # Log    Step 1
    # Log In With Remember Me    ${email}    ${password}
    # Log    Step 2
    # Persist Current Login State    ${url}
    # Validate Log In    ${email}
    # Log    Step 3
    # Log Out
    # Persist Current Login State    ${url}
    # Validate Log Out
    # Log In With Remember Me    ${login user}    ${password}     remember me=False
    # Log    Step 4
    # Validate Log In    ${login user}
    # Persist Current Login State    ${url}
    # Validate Log Out