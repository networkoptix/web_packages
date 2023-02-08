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

2. Can still log in if you don't finish the process
    [Tags]    C41873
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Log In    ${email}    ${password}     button=${RESET LOGIN BUTTON}
    Log Out
    Get Restore Code and Open the Link    ${email}
    Go To    ${url}
    Log In    ${email}    ${password}

3. Should not allow to access /restore_password/sent /restore_password/success by direct input
    Skip    Not applicable for new forms in 21.1
#    Go To    ${url}/restore_password/sent
#    Wait Until Element Is Visible    ${JUMBOTRON}
#    Go To    ${url}/restore_password/success
#    Wait Until Element Is Visible    ${JUMBOTRON}

4. Should be able to set new password (which is same as old), redirect
    [Tags]    email    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${password}

5. Should set new password, login with new password
    [Tags]    email    C26260    smoke    ci
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${ALT PASSWORD}
    Log In    ${email}    ${password}    validate=${False}    button=${RESET LOGIN BUTTON}    api=${False}
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
    Log In    ${email}    ${ALT PASSWORD}    validate=${True}    button=${LOG IN BUTTON}    reset=${True}    api=${False}

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

7. Should not allow to use one restore link twice
    [Tags]    email    C42079    CLOUD-8434
    # Failing due to CLOUD-8434
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    ${restore url}=   Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${ALT PASSWORD}

    Go To    ${restore url}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}     ${RESET NEXT BUTTON}
    Input Text    ${RESET PASSWORD INPUT}    ${ALT PASSWORD}
    Click Button    ${RESET NEXT BUTTON}
    Check For Alert    ${CANNOT SAVE PASSWORD}:${SPACE}${CODE USED/INCORRECT}

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

12. Check restore password email links, colors, cloud name, and open link in new tab
    [Tags]    C26260     deb    smoke    ci
    # We open the mailbox to first delete the activation email so that the restore password email is easily found and not confused
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${user}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${user}    ${BASE PASSWORD}
    ${email}    Wait For Email    recipient=${user}    timeout=120
    Activate   ${user}    ${BASE PASSWORD}    fromEmail=${True}
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    # Now for the actual email we are testing...
    Send "Restore Password" Email    ${user}
    ${email}    Wait For Email    recipient=${user}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore
    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}
    Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${links}    Get Links fromEmail    ${email}
    @{expected links}    Set Variable    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/restore_password
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

