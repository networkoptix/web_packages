*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Share Form Setup
    ${random}=    Generate Random String      length=5
    ${owner}=   Register and activate account with random email    mark    hamill    ${BASE PASSWORD}
    ${server} =    Create Base System      shareform-${random}    owner=${owner}
    Set Suite Variable    &{server}    &{server}
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Open Browser and Go To URL    ${url}
    ...    AND    Log in to user and system     ${server['owner']}    ${server['cloud id']}    password=${password}
    ...    AND    Sleep    10
    ...    AND    Wait Until Element is Visible    ${SERVERS LINK}    300
    ...    AND    Sleep    5
    ...    AND    Go To Servers
    ...    AND    Verify on Servers Page    timeout=120
    ...    AND    Log Out
    
Share Form Tear Down
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server['cloud id']}    ${password}    ${server['owner']}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server}[id]
    ${results}    Execute Command    docker container rm ${server}[id]
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
    ...    Go To   ${url}/systems/${server['cloud id']}
    ...    AND    Log In     ${server['owner']}    ${password}    button=None
    ...    ELSE    Run Keywords
    ...    Open Browser and Go To URL    https://${QA BURBANK IP}:${server['port']}
    ...    AND    Log In     ${server['local auth'][0]}    ${server['local auth'][1]}    button=None
    # Run Keyword If    '${email}' == '${server['owner']}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}
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
