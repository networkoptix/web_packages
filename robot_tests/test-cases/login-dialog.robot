*** Settings ***
Resource          ../Resources/front-end-resources/login-dialog-resource.robot
Suite Setup       login-dialog-resource.Setup
Test Setup        Run Keywords    QA Video Recording Start     login-dialog-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Login Dialog Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***

9. Passes email from email input to Restore password page, even without clicking 'Log in' button
    [tags]    C41872
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${login user}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element is Visible    ${FORGOT PASSWORD}
    Click Button    ${FORGOT PASSWORD}
    Wait Until Element is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    Textfield Should Contain    ${RESTORE PASSWORD EMAIL INPUT}    ${login user}

10. Shows non-activated user message when not activated at login; Resend activation button sends email
    [tags]    email    C41865
    Go To    ${url}/register
    ${random email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register    'mark'    'hamill'    ${random email}    ${password}
    Validate Register Success
    Wait Until Element Is Visible    ${LOG IN BTN REGISTER ACCOUNT PAGE}
    Click Element    ${LOG IN BTN REGISTER ACCOUNT PAGE}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${random email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element is Visible    ${RESEND ACTIVATION LINK BUTTON}
    Validate Register Email Received    ${random email}
    Click Element    ${RESEND ACTIVATION LINK BUTTON}
    Activate    ${random email}
    Click Element    ${LOG IN BUTTON}
    Wait Until Element Is Visible     ${PASSWORD INPUT}
    Input Text    ${PASSWORD INPUT}    ${password}
    Click Element    ${LOG IN BUTTON}
    Validate Log In    ${random email}

11. Displays password masked
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element is Visible    ${PASSWORD INPUT}
    ${input type}    Get Element Attribute    ${PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'

12. Requires log In, if the user has just logged out and pressed back button in browser
    Log In    ${login user}    ${password}  api=${False}
    Sleep   2
    Log Out
    Sleep   3
    Go Back
    Wait Until Element is Visible    ${LOG IN MODAL}

13. Handles more than 255 symbols email and password
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Input Text    ${EMAIL INPUT}    ${300CHARS}
    Textfield Should Contain    ${EMAIL INPUT}    ${255CHARS}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element is Visible    ${PASSWORD INPUT}
    Input Text    ${PASSWORD INPUT}    ${300CHARS}
    Textfield Should Contain    ${PASSWORD INPUT}    ${255CHARS}

14. Logout refreshes page
    Log In    ${login user}    ${password}    api=${False}
    Log Out

# We don't actually allow copy of the password field at log in.
15. Allows copy-paste in input fields
    ${system} =    Evaluate    platform.system()    platform
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    Copy Paste Test
    Copy Text    ${EMAIL INPUT}
    Clear Element Text    ${EMAIL INPUT}
    Paste Text    ${EMAIL INPUT}
    Textfield Should Contain    ${EMAIL INPUT}    Copy Paste Test

17. Should respond to Enter key and log in
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${login user}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${PASSWORD INPUT}
    Input Text    ${PASSWORD INPUT}    ${password}
    Wait Until Element is Visible    ${LOG IN BUTTON}
    Press Keys    ${PASSWORD INPUT}    ENTER
    Validate Log In    ${login user}

18. Should respond to Tab key
    [Tags]
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Element is Visible    ${EMAIL INPUT}
    Set Focus To Element    ${EMAIL INPUT}
    Press Keys    ${EMAIL INPUT}    TAB
    Element Should Be Focused    ${LOG IN CREATE ACCOUNT BUTTON}/parent::button
    Press Keys    ${EMAIL INPUT}    TAB   TAB
    Element Should Be Focused    ${LOG IN NEXT BUTTON}

20. Handles two tabs, updates second tab state if logout is done on first
    [Tags]
    Go To    ${url}/authorize?client_type=create
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
    Switch Window    ${tabs}[1]
    Set Window Size    1920    1080
    Location Should Be    ${url}/content/eula
    Go To    ${url}
    Validate Log Out
    # This is specifically for Ubuntu Firefox as the JS seems to
    # load slowly and doesn't redirect correctly after login.
    Sleep    5
    Log In    ${login user}    ${password}   api=${False}
    Switch Window    ${tabs}[0]
    Location Should Be    ${url}/authorize?client_type=create
    Go To   ${url}
#    Reload Page
#    Wait Until Element is Visible    ${LOGGED IN STAY LOGGED IN BUTTON}
#    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
#    Sleep    2
#    Wait Until Page Does Not Contain Elements    ${BACKDROP}    ${MODAL DIALOG}
    Validate Log In    ${login user}
    Log Out
    ${tabs}    Get Window Handles
    Switch Window    ${tabs}[1]
    Location Should Be    ${url}/systems
    Reload Page
    Wait Until Element is Visible    ${LOG IN MODAL}

21. Log in more than 5 times
    [tags]    C42075
    Go To    ${url}/authorize?client_type=create
    ${email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${email}    ${BASE PASSWORD}
    Activate    ${email}
    Wait Until Element Is Visible    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Click Button    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Wait Until Elements are Visible
    ...    ${LOG IN MODAL}
    ...    ${LOG IN BUTTON}
    ...    ${PASSWORD INPUT}
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

22. User is logged out of browser after a password change in another browser
    [tags]    C41837
    Close All Browsers
    Open Browser and go to URL    ${url}
    Log In    ${login user}    ${password}   api=${False}
    Open Browser and go to URL    ${url}
    Get Browser Ids
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

    Log In    ${login user}    ${ALT PASSWORD}    validate=${False}     api=${False}
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
