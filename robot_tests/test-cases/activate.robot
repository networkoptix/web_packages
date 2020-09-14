*** Settings ***
Resource          ../resource.robot
# Suite Setup       Clear Emails
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        Threaded File    activate

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}
${symbol password}    pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}
@{auth}        ${BASE EMAIL}    ${BASE PASSWORD}

*** Keywords ***
Clear emails
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${emails}    Run Keyword And Ignore Error    Wait For Email    timeout=120
    Run Keyword And Ignore Error    Delete all emails
    Close Mailbox

Restart
    Open Browser and go to URL    ${url}
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser

*** Test Cases ***
Register and Activate
    [Tags]    email    C24211    C41862
    ${email}    Get Random Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}    act=ui

Allows register, activate, login with curly text in First and Last name fields
    [Tags]    C41863
    @{curly names}=   Create List    ${CYRILLIC TEXT}    ${SMILEY TEXT}    ${GLYPH TEXT}     ${SYMBOL TEXT}
    FOR    ${name}    IN    @{curly names}
        Register and activate account with random email    ${name}    ${name}    ${password}
    END

Allows register, activate, login with +!#$%'*-/=?^_`{|}~ in email field
#ampersand was removed from this test because imaplib could not handle it
    [Tags]
    ${email}=   Get Random Symbol Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}

Allows register, activate, login with with leading space in email
    [Tags]    C41864
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register    mark    hamill    ${SPACE}${email}    ${password}
    Activate Account    ${email}    ${password}

Allows register, activate, login with with trailing space in email
    [Tags]    C41864
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register    mark    hamill    ${email}${SPACE}    ${password}
    Activate Account    ${email}    ${password}

Allows register, activate, login with pass!@#$%^&*()_-+=;:'"`~,./\|?[]{} password
    [Tags]    C41861
    Register and activate account with random email    mark    hamill    ${symbol password}

Should show error if same link is used twice
    [Tags]    email    C41566
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register Account    mark    hamill    ${email}    ${password}
    ${code}=   Get Code From Email    ${url}    ${auth}    ${email}    activate_account
    Go To    ${url}/activate/${code}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/activate/${code}
    Wait Until Element Is Visible    ${ALREADY ACTIVATED}

Should save user data to user account correctly
    [Tags]    email
    ${email}=   Register and activate account with random email    mark    hamill    ${password}
    ${user data}=   Get Account Data    ${url}    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    mark
    Should be equal as strings    ${user data}[last_name]    hamill

Should allow to enter more than 255 symbols in First and Last names and cut it to 255
    [Tags]    email
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register and activate account    ${300CHARS}    ${300CHARS}    ${email}    ${password}    reg=ui
    ${user data}=   Get Account Data    ${url}    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    ${255CHARS}
    Should be equal as strings    ${user data}[last_name]    ${255CHARS}

Should trim leading and trailing spaces
    [Tags]    email
    ${email}=  Get Random Email    ${BASE EMAIL}
    Register and activate account    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    reg=ui
    ${user data}=   Get Account Data    ${url}    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    mark
    Should be equal as strings    ${user data}[last_name]    hamill

Should allow activation, if user is registered by link /register/?from=client
    [Tags]    email
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    from=client
    Activate Account    ${email}    ${password}

Should allow activation, if user is registered by link /register/?from=mobile
    [Tags]    email
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    from=mobile
    Activate Account    ${email}    ${password}

Link works and suggests to log out user, if he was logged in, buttons operate correctly
    [Tags]    email    C41564
    ${email1}=   Get Random Email    ${BASE EMAIL}
    Register Account    mark    hamill    ${email1}    ${password}
    ${code1}=   Get Code From Email    ${url}    ${auth}    ${email1}    activate_account

    ${email2}=   Get Random Email    ${BASE EMAIL}
    Register Account   mark    hamill    ${email2}    ${password}
    ${code2}=   Get Code From Email    ${url}    ${auth}    ${email2}    activate_account

    Log In    ${EMAIL OWNER}    ${password}
    Go To    ${url}/activate/${code1}
    Wait Until Page Contains Element    ${ACTIVATION SUCCESS}
    Wait Until Element Is Visible    ${LOGGED IN STAY LOGGED IN BUTTON}
    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
    Validate Login    ${EMAIL OWNER}
    Log Out

    Log In    ${email1}    ${password}
    Go To    ${url}/activate/${code2}
    Wait Until Page Contains Element    ${ACTIVATION SUCCESS}
    Wait Until Element Is Visible    ${LOGGED IN CANCEL BUTTON}
    Click Button    ${LOGGED IN CANCEL BUTTON}
    Validate Log Out
    Log In    ${email2}    ${password}

#This is identical to "redirects to /activate and shows non-activated
#user message when not activated; Resend activation button sends email"
#in login-dialog
Logging in before activation shows resend email link and email can be sent again
    [Tags]    email
    ${email}=    Get Random Email    ${BASE EMAIL}
    Register Account   mark    hamill    ${email}    ${password}
    ${code}=   Get Code From Email   ${url}    ${auth}    ${email}    activate_account
    Should not be equal as strings    ${code}    Does not exist
    Log In    ${email}    ${password}    validate=${False}
    Wait Until Element Is Visible    ${RESEND ACTIVATION LINK BUTTON}
    Click Link    ${RESEND ACTIVATION LINK BUTTON}
    ${code}=   Get Code From Email   ${url}    ${auth}    ${email}    activate_account
    Should not be equal as strings    ${code}    Does not exist