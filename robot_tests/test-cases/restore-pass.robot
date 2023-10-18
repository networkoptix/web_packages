*** Settings ***
Resource          ../Resources/front-end-resources/restore-pass-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Run Keywords    QA Video Recording Start     Restart Restore Pass
Test Teardown     Run Keywords    QA Video Recording Stop      Restore Pass Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags

*** Test Cases ***
1. Reset password email sent screen
    [Tags]    email    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    IF    "${LANGUAGE}"=="he_IL"
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
    ELSE
        Wait Until Element Is Visible     ${RESET PASSWORD EMAIL SENT}
    END
    Location Should Be    ${url}/authorize

3. Should not allow to access /restore_password/sent /restore_password/success by direct input
    Skip    Not applicable for new forms in 21.1
#    Go To    ${url}/restore_password/sent
#    Wait Until Element Is Visible    ${JUMBOTRON}
#    Go To    ${url}/restore_password/success
#    Wait Until Element Is Visible    ${JUMBOTRON}

6. Displays password masked, shows password and changes eye icon when clicked
    [Tags]    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}

    ${input type}    Get Element Attribute    ${RESET PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'
    Click Element    ${RESET EYE ICON CLOSED}
    Wait Until Element Is Visible    ${RESET EYE ICON OPEN}
    ${input type}    Get Element Attribute    ${RESET PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'text'
    Click Element    ${RESET EYE ICON OPEN}
    Wait Until Element Is Visible    ${RESET EYE ICON CLOSED}
    ${input type}    Get Element Attribute    ${RESET PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'

8. Non-activated user cannot get to password entry page to restore password
    [Tags]    email    C41871
    ${email}    Get Random Email    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/register
    Register    mark    hamill    ${email}    ${password}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Has Style    ${EMAIL INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Element Has Style    ${EMAIL INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Is Visible    ${REGISTER NOT ACTIVATED}


9. Should allow logged in user visit restore password page
    [Tags]    email
    ${email}    Get Random Email Robot    ${BASE EMAIL}
    Go To    ${url}/register
    Register    mark    hamill    ${email}    ${password}
    Activate    ${email}    ${password}
    Log In    ${email}    ${password}    button=${ACTIVATION SUCCESS LOG IN BUTTON}    reset=${True}
    Go To    ${url}/authorize/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}    ${RESET PASSWORD COMP HEADER}

10. Should prompt log user out if he visits restore password link from email
    [Tags]    email    C63394
    Skip    Not applicable anymore or unclear what to test
#    ${email}=   Register Random User
#    Log In    ${email}    ${password}
#    Send "Restore Password" Email    ${email}
#
##    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${email}
#    IF    "${LANGUAGE}"=="he_IL"
#        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
#        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE HEBREW}
#    ELSE
#        Wait Until Element is Visible    ${RESET PASSWORD EMAIL SENT}
#       ${text}    Get Text    ${RESET PASSWORD EMAIL SENT}
#    END
#    ${replaced}    Replace String    ${text}    \n    ${SPACE}
##    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}
#
#    ${code}=   Get Restore Code and Open the Link    ${email}
#    Go To   ${url}
#    Wait Until Element Is Not Visible    ${LOGGED IN STAY LOGGED IN BUTTON}
#    Go To    ${url}/authorize/restore_password/${code}
#    IF    "${LANGUAGE}"=="fr_FR"
#        Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${DISCONNECT MODAL BUTTON}
#    ELSE
#        Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN LOG OUT BUTTON}
#    END
#    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
#    Go To    ${url}/authorize/restore_password/${code}
#    IF    "${LANGUAGE}"=="fr_FR"
#        Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${DISCONNECT MODAL BUTTON}
#        Click Element    ${DISCONNECT MODAL BUTTON}
#    ELSE
#        Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN LOG OUT BUTTON}
#        Click Element    ${LOGGED IN LOG OUT BUTTON}
#    END
#    Validate Log Out
#    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}

11. Should handle click I forgot my password link at restore password page
    [Tags]
    ${email}=   Register Random User
    Go To    ${url}/authorize/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}    ${RESET PASSWORD COMP HEADER}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${EMAIL INPUT}    ${LOG IN NEXT BUTTON}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Elements Are Visible    ${FORGOT PASSWORD BUTTON}
    Click Element    ${FORGOT PASSWORD BUTTON}
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}    ${RESET PASSWORD COMP HEADER}
