*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        login-everywhere-resource.Restart
Test Teardown     Run Keyword If Test Failed    login-everywhere-resource.Open New Browser On Failure
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***
1. works at registration page before submit
    Go To   ${url}/authorize/register
    Check Log In    button=None

2. works at registration page after submit success
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email    ${BASE EMAIL}
    Register    mark    hamill    ${random email}    ${password}
    Validate Register Success
    Check Log In    button=${LOG IN BTN REGISTER ACCOUNT PAGE}

3. works at registration page after submit with alert error message
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email    ${BASE EMAIL}
    Register    mark    hamill    ${email}    ${password}
    Wait Until Element Is Visible    ${EMAIL ALREADY REGISTERED}
    Log In    user=${email}    password=${password}    button=${LOG IN BTN CREATE ACCOUNT PAGE}

4. works at registration page on account activation success
    [tags]    email
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email    ${BASE EMAIL}    sendemail=${True}
    Register    mark    hamill    ${random email}    ${password}
    Activate    ${random email}
    Log In    user=${random email}    password=${password}    button=${LOG IN BTN ACTIVATE ACCOUNT PAGE}    reset=True

5. works at registration page on account activation error
# need to raise a defect, on the second time reloading the activation page error should appear account already activated
    [tags]    email
    ${random email}    Get Random Email    ${BASE EMAIL}    extra=sendemail
    Go To    ${url}/authorize/register
    Register    'mark'    'hamill'    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Log In    user=${random email}    password=${password}    button=${LOG IN BTN ACTIVATE ACCOUNT PAGE}    reset=True

6. works at restore password page with email input - before submit
    Go To    ${url}/authorize/restore_password
    Check Log In    button=None

7. works at restore password page with email input - after submit error
    Skip    This test case is not supported anymore, there is no login button on reset password page
    #Go To    ${url}/authorize/restore_password
    #Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    #Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${EMAIL UNREGISTERED}
    #Click Button    ${RESET PASSWORD BUTTON}
    #Check For Alert Dismissable    ${CANNOT SEND CONFIRMATION EMAIL}${SPACE}${ACCOUNT DOES NOT EXIST}
    #Check Log In    button=None

8. works at restore password page with email input - after submit success
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${email}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${FORGOT PASSWORD}
    Click Element    ${FORGOT PASSWORD}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Click Button    ${RESET PASSWORD BUTTON}
    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${email}
    IF    "${LANGUAGE}"=="he_IL"
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE HEBREW}
    ELSE
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE}
    END
    ${replaced}    Replace String    ${text}    \n    ${SPACE}
    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}
    Log In    user=${email}    password=${password}    button=${LOG IN BTN RESET PASSWORD PAGE}    reset=True

9. Works at restore password page with password input - before submit
    [tags]    email
    ${new password}=    Set Variable    qweasd 1234
    ${random email}=   Get Random Email    ${BASE EMAIL}    extra=sendemail
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${random email}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${FORGOT PASSWORD}
    Click Element    ${FORGOT PASSWORD}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${random email}
    Click Button    ${RESET PASSWORD BUTTON}
    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${random email}
    IF    "${LANGUAGE}"=="he_IL"
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE HEBREW}
    ELSE
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE}
    END
    ${replaced}    Replace String    ${text}    \n    ${SPACE}
    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}
    ${link}    Get Email Link    ${random email}    restore_password
    Go To    ${link}
    Wait Until Element Is Visible    ${RESET PASSWORD INPUT}
    Input Text    ${RESET PASSWORD INPUT}    ${new password}
    Click Button    ${RESET PASSWORD NEXT BUTTON}
    Wait Until Element Is Visible    ${RESET SUCCESS MESSAGE}
    Log In    user=${random email}    password=${new password}    button=${LOG IN BTN SET NEW PASSWORD PAGE}    reset=True

10. Works at restore password page with password input - after submit error
    [tags]    email
    ${random email}=   Get Random Email    ${BASE EMAIL}    extra=sendemail
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${random email}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${FORGOT PASSWORD}
    Click Element    ${FORGOT PASSWORD}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${random email}
    Click Button    ${RESET PASSWORD BUTTON}
    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${random email}
    IF    "${LANGUAGE}"=="he_IL"
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE HEBREW}
    ELSE
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE}
    END
    ${replaced}    Replace String    ${text}    \n    ${SPACE}
    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}
    ${link}    Get Email Link    ${random email}    restore_password
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}
    Input Text    ${RESET PASSWORD INPUT}    ${EMPTY}
    Click Button    ${RESET PASSWORD NEXT BUTTON}
    Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}
    Go To    ${url}
    Check Log In

11. Works at restore password page with password input - after submit success
    [tags]    email
    ${random email}=   Get Random Email    ${BASE EMAIL}    extra=sendemail
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${random email}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${FORGOT PASSWORD}
    Click Element    ${FORGOT PASSWORD}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${random email}
    Click Button    ${RESET PASSWORD BUTTON}
    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${random email}
    IF    "${LANGUAGE}"=="he_IL"
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE HEBREW}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE HEBREW}
    ELSE
        Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
        ${text}    Get Text    ${RESET EMAIL SENT MESSAGE}
    END
    ${replaced}    Replace String    ${text}    \n    ${SPACE}
    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}
    ${link}    Get Email Link    ${random email}    restore_password
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}
    Input Text    ${RESET PASSWORD INPUT}    ${password}
    Click Button    ${RESET PASSWORD NEXT BUTTON}
    Wait Until Element Is Visible    ${RESET SUCCESS MESSAGE}
    Log In    user=${random email}    password=${password}    button=${LOG IN BTN SET NEW PASSWORD PAGE}    reset=True

12. Works at IPVD page
    Go To IPVD Page
    Check Log In
