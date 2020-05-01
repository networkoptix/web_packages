*** Keywords ***
Verify on Servers Page
    Wait Until Elements are Visible
    ...    ${PORT INPUT}
    ...    ${RENAME SERVER BUTTON}
    ...    ${RESTART SESRVER BUTTON}
    ...    ${SERVER DETAILED INFO BUTTON}

Verify Enabled
    Wait Until Element is Enabled    ${PORT INPUT}
    Wait Until Element is Enabled    ${RENAME SERVER BUTTON}
    Wait Until Element is Enabled    ${RESTART SESRVER BUTTON}
Log in to user and system
    [Arguments]    ${user}    ${system id}
    Log in    ${user}    ${password}
    Go To    ${url}/systems/${system id}
    Run Keyword If    '${user}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${user}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${user}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Verify Rename Dialog
    Wait Until Elements are Visible
    ...    ${RENAME SERVER FORM}
    ...    ${RENAME SAVE BUTTON}
    ...    ${RENAME CANCEL BUTTON}
    ...    ${RENAME CLOSE BUTTON}
    ...    ${$RENAME SERVER INPUT}

Select Server By Name
    [Arguments]    ${server name}
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${server name}")]
    Click Link    //nx-level-3-item/a//span[contains(text(),"${server name}")]/../..