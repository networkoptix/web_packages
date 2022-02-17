*** Settings ***
Resource    ../../resource.robot

*** Keywords ***
Register Random User
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}
    [Return]    ${email}

Send "Restore Password" Email
    [Arguments]    ${email}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Elements Are Visible    ${FORGOT PASSWORD BUTTON}
    Click Element    ${FORGOT PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Wait Until Elements Are Visible      ${RESET PASSWORD BUTTON}
    Click Button    ${RESET PASSWORD BUTTON}

Get Restore Code and Open the Link
    [Arguments]    ${email}    ${restore}=${False}    ${new password}=${EMPTY}
    @{auth}=   Create List   ${BASE EMAIL}    ${password}
    ${code}=   Get Code From Email    ${email}    restore_password
    Go To    ${url}/authorize/restore_password/${code}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${RESET NEXT BUTTON}
    Run Keyword If    ${restore} == ${True} and '${new password}' != '${EMPTY}'  Run Keywords
    ...    Input Text    ${RESET PASSWORD INPUT}    ${new password}
    ...    AND    Click Button    ${RESET NEXT BUTTON}
    ...    AND    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS INSTRUCTION}    ${RESET LOGIN BUTTON}
    [Return]    ${code}