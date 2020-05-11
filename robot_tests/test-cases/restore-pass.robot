*** Settings ***
Resource          ../resource.robot

Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Restart
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Register Random User
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}
    [Return]    ${email}

Send "Restore Password" Email
    [Arguments]    ${email}
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Click Button    ${RESET PASSWORD BUTTON}

Get Restore Code and Open the Link
    [Arguments]    ${email}    ${restore}=${False}    ${new password}=${EMPTY}
    @{auth}=   Create List   ${BASE EMAIL}    ${password}
    ${code}=   Get Code From Email    ${url}    ${auth}    ${email}    restore_password
    Go To    ${url}/restore_password/${code}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Run Keyword If    ${restore} == ${True} and '${new password}' != '${EMPTY}'  Run Keywords
    ...    Input Text    ${RESET PASSWORD INPUT}    ${new password}
    ...    AND    Click Button    ${SAVE PASSWORD}
    ...    AND    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS LOG IN LINK}
    [Return]    ${code}

*** Test Cases ***
Restores password
    [Tags]    email    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
    Location Should Be    ${url}/restore_password/sent

Can still log in if you don't finish the process
    [Tags]    C41873
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Log In    ${email}    ${password}
    Log Out
    Get Restore Code and Open the Link    ${email}
    Log In    ${email}    ${password}

Should not allow to access /restore_password/sent /restore_password/success by direct input
    [Tags]    Threaded
    Go To    ${url}/restore_password/sent
    Wait Until Element Is Visible    ${JUMBOTRON}
    Go To    ${url}/restore_password/success
    Wait Until Element Is Visible    ${JUMBOTRON}

Should be able to set new password (which is same as old), redirect
    [Tags]    email    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${password}

Should set new password, login with new password
    [Tags]    email    C26260
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${ALT PASSWORD}

    Click Link    ${RESET SUCCESS LOG IN LINK}
    Log In    ${email}    ${password}    validate=${False}    button=None
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
    Log In    ${email}    ${ALT PASSWORD}    button=None

Displays password masked, shows password and changes eye icon when clicked
    [Tags]    C26260    Threaded
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

Should not allow to use one restore link twice
    [Tags]    email    C42079
    ${email}=   Register Random User
    Send "Restore Password" Email    ${email}
    ${code}=   Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${ALT PASSWORD}

    Go To    ${url}/restore_password/${code}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${ALT PASSWORD}
    Click Button    ${SAVE PASSWORD}
    Check For Alert Dismissable    ${CANNOT SAVE PASSWORD}${SPACE}${SPACE}${CODE USED/INCORRECT}

Should make not-activated user active by restoring password
    [Tags]    email    C41871    Threaded
    ${email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/register
    Register    mark    hamill    ${email}    ${password}
    Validate Register Email Received    ${email}
    Send "Restore Password" Email    ${email}
    Get Restore Code and Open the Link    ${email}    restore=${True}    new password=${ALT PASSWORD}
    Click Link    ${RESET SUCCESS LOG IN LINK}
    Log In    ${email}    ${ALT PASSWORD}    button=None

Should allow logged in user visit restore password page
    [Tags]    email
    ${email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/register
    Register    mark    hamill    ${email}    ${password}
    Activate Account    ${email}    ${password}
    Log In    ${email}    ${password}
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}

Should prompt log user out if he visits restore password link from email
    [Tags]    email    Threaded    C63394
    ${email}=   Register Random User
    Log In    ${email}    ${password}
    Send "Restore Password" Email    ${email}

    ${RESET EMAIL SENT MESSAGE TEXT}    Replace String    ${RESET EMAIL SENT MESSAGE TEXT}    %email%    ${email}
    Wait Until Element Is Visible    ${RESET EMAIL SENT MESSAGE}
    ${text}    Get Text    ${RESET EMAIL SENT MESSAGE}
    ${replaced}    Replace String    ${text}    \n    ${SPACE}
    Should Match    ${replaced}    ${RESET EMAIL SENT MESSAGE TEXT}

    ${code}=   Get Restore Code and Open the Link    ${email}
    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}

    Go To    ${url}/restore_password/${code}
    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN LOG OUT BUTTON}
    Click Button    ${LOGGED IN LOG OUT BUTTON}
    Validate Log Out
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}

Should handle click I forgot my password link at restore password page
    [Tags]    Threaded
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${EMAIL INPUT}    ${PASSWORD INPUT}    ${LOG IN BUTTON}    ${REMEMBER ME CHECKBOX VISIBLE}    ${FORGOT PASSWORD}    ${LOG IN CLOSE BUTTON}
    Click Link    ${FORGOT PASSWORD}
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}

Check restore password email links, colors, cloud name, and open link in new tab
    [Tags]    C26260    Threaded
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${user}=   Register Random User
    ${email}    Wait For Email    recipient=${user}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    delete email    ${email}
    Send "Restore Password" Email    ${user}
    ${email}    Wait For Email    recipient=${user}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore
    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}
    Check Email Subject    ${email}    ${RESET PASSWORD EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/restore_password
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

