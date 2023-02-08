*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Share Form Setup
    Open Browser and go to URL    ${url}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Set Suite Variable    ${server}    ${servers}[0]
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Go to    ${url}
    ...    AND    Log in to user and system     ${server['cloudOwner']}    ${server['id']}    password=${password}
    ...    AND    Sleep    10
    ...    AND    Wait Until Element is Visible    ${SERVERS LINK}    300
    ...    AND    Sleep    5
    ...    AND    Go To Servers
    ...    AND    Verify on Servers Page    timeout=120
    ...    AND    Log Out
    
Share Form Tear Down
    Teardown Servers    ${servers}
    FOR    ${user}    IN    @{server['cloud users'].values()}
         Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${user}      ${password}  
    END
    Close All Connections
    Close All Browsers
    
Restart
    Close Browser
    Open Share Dialog

Open Share Dialog
    Share Form Setup
        Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Go To   ${url}/systems/${server['id']}
    ...    AND    Log In     ${server['cloudOwner']}    ${password}    button=None
    ...    ELSE    Run Keywords
    ...    Open Browser and Go To URL    https://${QA BURBANK IP}:${server}[port][0]
    ...    AND    Log In     ${server['localAuth'][0]}    ${server['localAuth'][1]}    button=None
    # Run Keyword If    '${email}' == '${server['cloudOwner']}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}
    # Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Sleep    .25
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element Is Enabled    ${ADD USER BUTTON SYSTEMS}
    Sleep    .25
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element Is Visible    ${ADD USER BUTTON MODAL}

Test Email Invalid
    [Arguments]   ${email}
    Wait Until Element Is Visible    ${ADD USER EMAIL}
    Input Text    ${ADD USER EMAIL}    ${email}
    Click Element    ${ADD USER MODAL}
    Run Keyword If    '${email}' == '${EMPTY}'    Click Button    ${ADD USER BUTTON MODAL}
    IF    '${email}' != '${SPACE}myemail@gmail.com' and '${email}' != 'myemail@gmail.com${SPACE}' and '${email}' != 'myemail@gmail.com'
        Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-bottom-color    ${ERROR COLOR WITH OPACITY}
        Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-top-color       ${ERROR COLOR WITH OPACITY}
        Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-left-color      ${ERROR COLOR WITH OPACITY}
        Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-right-color     ${ERROR COLOR WITH OPACITY}
    END
    Run Keyword If    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'     Wait Until Element Is Visible    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-valid")]
