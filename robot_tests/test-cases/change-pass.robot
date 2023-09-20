*** Settings ***
Resource          ../Resources/front-end-resources/change-pass-resource.robot
Suite Setup       change-pass-resource.Setup
Test Setup        Run Keywords    QA Video Recording Start      change-pass-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop    Change Pass Test Teardown
Suite Teardown    Run Keyword and Ignore Error    change-pass-resource.Clean up
Force Tags        Threaded


*** Test Cases ***
2. password can be changed
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Sleep    1
    Wait Until Element is Not Visible    ${CHANGE PASS NO CHANGES}
    Wait Until Elements Are Visible   ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Wait Until Elements Are Not Visible    ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}

6. more than 255 symbols can be entered in new password field and then are cut to 255
    [Tags]    Threaded
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${300CHARS}
    Input Text    ${NEW PASSWORD INPUT}    ${300CHARS}
    Textfield Should Contain    ${CURRENT PASSWORD INPUT}    ${255CHARS}
    Textfield Should Contain    ${NEW PASSWORD INPUT}    ${255CHARS}
    Click Button    ${ACCOUNT CANCEL}

10. Password can't be changed if current password is not provided or incorrect
    [tags]    C41577
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${EMPTY}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Delete All Text    ${NEW PASSWORD INPUT}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Discard Changes and Log Out
    Go To  ${url}
    Api Log In       ${email}    ${BASE PASSWORD}

11. should open change password page in anonymous state
    [tags]    anonymous
    Open page anonymously    ${url}/account/password    ${REGISTER TITLE TEXT}
    Wait Until Element Is Visible    ${LOG IN MODAL}

    Check Log In    button=None
