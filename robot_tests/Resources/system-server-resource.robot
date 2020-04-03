*** Keywords ***
Verify on Servers Page
    Wait Until Elements are Visible
    ...    ${PORT INPUT}
    ...    ${CHECK STATUS BUTTON}
    ...    ${RENAME SERVER BUTTON}
    ...    ${RESTART SESRVER BUTTON}
    ...    ${RESET SERVER TO DEFAULTS}
    ...    ${FULL INFO BUTTON}

Log in to user and system
    [Arguments]    ${user}    ${system id}
    Log in    ${user}    ${password}
    Go To    ${url}/systems/${system id}
    Run Keyword If    '${user}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${user}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${user}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
