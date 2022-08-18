*** Settings ***
Resource          ../Resources/front-end-resources/activate-resource.robot
# Suite Setup       Clear Emails
Test Setup        Run Keywords    activate-resource.Restart     QA Video Recording Start
Test Teardown     Run Keywords    QA Video Recording Stop      Activate Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded    activate


*** Test Cases ***
1. Register and Activate
    [Tags]    email    C24211    C41862    smoke
    ${email}    Get Random Email Robot    ${BASE EMAIL}    send email=${True}
    Register And Activate Account    mark    hamill    ${email}    ${password}    from email=${True}
    Go to    ${url}
    Log In    ${email}    ${password}

2. Allows register, activate, login with curly text in First and Last name fields
    [Tags]    C41863
    @{curly names}=   Create List    ${CYRILLIC TEXT}    ${SMILEY TEXT}    ${GLYPH TEXT}     ${SYMBOL TEXT}
    FOR    ${name}    IN    @{curly names}
        Register and activate account with random email    ${name}    ${name}    ${password}
    END

3. Allows register, activate, login with +!#$%'*-/=\?^_`{\|}~ in email field
#ampersand was removed from this test because imaplib could not handle it
    [Tags]
    ${email}=   Get Random Email Robot    ${BASE EMAIL}    symbols=${True}
    Register And Activate Account    mark    hamill    ${email}    ${password}

4. Allows register, activate, login with with leading space in email
    [Tags]    C41864
    ${email}=   Get Random Email Robot    ${BASE EMAIL}    
    Register And Activate Account    mark    hamill    ${SPACE}${email}    ${password}

5. Allows register, activate, login with with trailing space in email
    [Tags]    C41864
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}${SPACE}    ${password}

6. Allows register, activate, login with pass!@#$%^&*()_-+=;:'\"`~,./\|?[]{} password
    [Tags]    C41861
    Register and activate account with random email    mark    hamill    ${symbol password}

7. Should show activation success if same link is used twice
    [Tags]    email    C41566
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register Account    mark    hamill    ${email}    ${password}
    ${link}=   Get Email Link    ${email}    activate
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}

8. Should save user data to user account correctly
    [Tags]    email
    ${email}=   Register and activate account with random email    mark    hamill    ${password}
    ${user data}=   Get Account Data    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    mark
    Should be equal as strings    ${user data}[last_name]    hamill

9. Should allow to enter more than 255 symbols in First and Last names and cut it to 255
    [Tags]    email
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register and activate account    ${300CHARS}    ${300CHARS}    ${email}    ${password}    reg=ui
    ${user data}=   Get Account Data    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    ${255CHARS}
    Should be equal as strings    ${user data}[last_name]    ${255CHARS}

10. Should trim leading and trailing spaces
    [Tags]    email
    ${email}=  Get Random Email Robot    ${BASE EMAIL}
    Register and activate account    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    reg=ui
    ${user data}=   Get Account Data    ${email}    ${password}
    Should be equal as strings    ${user data}[first_name]    mark
    Should be equal as strings    ${user data}[last_name]    hamill

11. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=desktop
    [Tags]    email
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    view type=desktop
    Activate    ${email}    ${password}

12. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=mobile
    [Tags]    email
    ${email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${FROM EMAIL DEFAULT}
    Register    ${SPACE}mark${SPACE}    ${SPACE}hamill${SPACE}    ${email}    ${password}    view type=mobile
    Activate    ${email}    ${password}

13. Link works and suggests to log out user, if he was logged in, buttons operate correctly
    [Tags]    email    C41564
    [Setup]       No Operation
    [Teardown]    No Operation
    Skip    Not sure if this is necessary anymore.
    ${email1}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${FROM EMAIL DEFAULT}
    Register Account    mark    hamill    ${email1}    ${password}
    ${code1}=   Get Email Link    ${email1}    activate_account

    ${email2}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${FROM EMAIL DEFAULT}
    Register Account   mark    hamill    ${email2}    ${password}
    ${code2}=   Get Email Link    ${email2}    activate_account

    Log In    ${EMAIL OWNER}    ${password}
    Go To    ${url}/authorize/activate/${code1}
    Wait Until Element Is Visible    ${LOGGED IN STAY LOGGED IN BUTTON}
    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
    # Wait Until Page Contains Element    ${ACTIVATION SUCCESS}
    Validate Login    ${EMAIL OWNER}
    Log Out

    Log In    ${email1}    ${password}
    Go To    ${url}/authorize/activate/${code2}   
    Wait Until Element Is Visible    ${LOGGED IN CANCEL BUTTON}
    Click Button    ${LOGGED IN CANCEL BUTTON}
    Wait Until Page Contains Element    ${ACTIVATION SUCCESS}
    Validate Log Out
    Log In    ${email2}    ${password}

#This is identical to "redirects to /activate and shows non-activated
#user message when not activated; Resend activation button sends email"
#in login-dialog
14. Logging in before activation shows resend email link and email can be sent again
    [Tags]    email
    ${email}=    Get Random Email Robot    ${BASE EMAIL}
    Register Account   mark    hamill    ${email}    ${password}
    ${code}=   Get Email Link   ${email}    activate
    Should not be equal as strings    ${code}    Does not exist
    Wait Until Element is Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}    
    Input Text    ${EMAIL INPUT}    ${email}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${RESEND ACTIVATION LINK BUTTON}
    Click Element    ${RESEND ACTIVATION LINK BUTTON}
    ${code}=   Get Email Link    ${email}    activate
    Should not be equal as strings    ${code}    Does not exist