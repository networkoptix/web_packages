*** Settings ***
Resource          ../Resources/front-end-resources/login-everywhere-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        login-everywhere-resource.Restart
Test Teardown     Run Keyword If Test Failed    login-everywhere-resource.Open New Browser On Failure
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***
1. works at registration page before submit
    Go To   ${url}/authorize/register
    Check Log In    button=${REGISTER LOG IN BUTTON}

2. works at registration page after submit success
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email Robot    ${BASE EMAIL}
    Register    mark    hamill    ${random email}    ${password}
    Validate Register Success
    Check Log In    button=${LOG IN BTN REGISTER ACCOUNT PAGE}

3. works at registration page after submit with alert error message
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email Robot    ${BASE EMAIL}
    Register    mark    hamill    ${email}    ${password}
    Wait Until Element Is Visible    ${EMAIL ALREADY REGISTERED}
    resource.Log In    user=${email}    password=${password}    button=${LOG IN BTN CREATE ACCOUNT PAGE}

4. works at registration page on account activation success
    [tags]    email
    Go To    ${url}/authorize/register
    ${random email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register    mark    hamill    ${random email}    ${password}
    Activate    ${random email}
    resource.Log In    user=${random email}    password=${password}    button=${LOG IN BTN ACTIVATE ACCOUNT PAGE}    reset=True

5. works at registration page on account activation error
# need to raise a defect, on the second time reloading the activation page error should appear account already activated
    [tags]    email
    ${random email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/authorize/register
    Register    'mark'    'hamill'    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    resource.Log In    user=${random email}    password=${password}    button=${LOG IN BTN ACTIVATE ACCOUNT PAGE}    reset=True

6. works at restore password page with email input - after submit success
    Go To    ${url}/authorize/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}    ${RESET PASSWORD COMP HEADER}
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
    resource.Log In    user=${email}    password=${password}    button=${LOG IN BTN RESET PASSWORD PAGE}    reset=True

7. Works at restore password page with password input - before submit
    [tags]    email
    ${new password}=    Set Variable    qweasd 1234
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}
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
    resource.Log In    user=${random email}    password=${new password}    button=${LOG IN BTN SET NEW PASSWORD PAGE}    reset=True

8. Works at restore password page with password input - after submit error
    [tags]    email
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}
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

9. Works at restore password page with password input - after submit success
    [tags]    email
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/authorize/register
    Register    mark    hamill    ${random email}    ${password}
    ${link}    Get Email Link    ${random email}    activate
    ${link}    Strip String    ${link}
    Go To    ${link}
    Wait Until Element Is Visible    ${ACTIVATION SUCCESS}
    Go To    ${url}/authorize/restore_password
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}
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
    resource.Log In    user=${random email}    password=${password}    button=${LOG IN BTN SET NEW PASSWORD PAGE}    reset=True

10. Works at IPVD page
    Go To IPVD Page
    Check Log In
