*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Share Dialog
Test Template     Test Email Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Share Form Tear Down
Force Tags        email    form    Threaded

*** Variables ***
${url}    ${ENV}
${password}     ${BASE PASSWORD}
#${email}    ${server['owner']}

*** Test Cases ***      EMAIL
Empty Email                               ${EMPTY}
    [tags]    C78227
Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41902
Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41902
Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41902
Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41902
Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41902
Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41902
Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41902
Invalid Email 8 myemail                   myemail
    [tags]    C41902
Invalid Email 9 myemail@                  myemail@
    [tags]    C41902
Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41902
Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41902
Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41902
Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41902
Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41902
Space Email                               ${SPACE}
Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C47296
Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C47296
Valid Email                               myemail@gmail.com
    [tags]    C47296

*** Keywords ***
Share Form Setup
    ${random}=    Generate Random String
    ${owner}=   Register and activate account with random email    mark    hamill    ${BASE PASSWORD}
    ${server} =    Create Base System      shareform-${random}    owner=${owner}
    Set Suite Variable    &{server}    &{server}
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Open Browser and Go To URL    ${url}
    ...    AND    Log in to user and system     ${server['owner']}    ${server['cloud id']}    password=${password}
    ...    AND    Sleep    10
    ...    AND    Wait Until Element is Visible    ${SERVERS LINK}    300
    ...    AND    Sleep    5
    ...    AND    Click Link    ${SERVERS LINK}
    ...    AND    Verify on Servers Page    timeout=120
    ...    AND    Log Out
    
Share Form Tear Down
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server['cloud id']}    ${password}    ${server['owner']}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server}[id]
    ${results}    Execute Command    docker container rm ${server}[id]
    FOR    ${user}    IN    @{server['cloud users'].values()}
         Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${user}          ${password}  
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
    # Run Keyword Unless    '${email}' == '${EMAIL OWNER}' or '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element Is Enabled    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element Is Visible    ${ADD USER BUTTON MODAL}

Test Email Invalid
    [Arguments]   ${email}
    Wait Until Element Is Visible    ${ADD USER EMAIL}
    Input Text    ${ADD USER EMAIL}    ${email}
    Click Element    ${ADD USER MODAL}
    Run Keyword If    '${email}' == '${EMPTY}'    Click Button    ${ADD USER BUTTON MODAL}
    Run Keyword Unless    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'    Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-bottom-color    ${ERROR COLOR WITH OPACITY}
    Run Keyword Unless    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'    Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-top-color       ${ERROR COLOR WITH OPACITY}
    Run Keyword Unless    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'    Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-left-color      ${ERROR COLOR WITH OPACITY}
    Run Keyword Unless    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'    Wait Until Element Has Style    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-invalid")]/input    border-right-color     ${ERROR COLOR WITH OPACITY}
    Run Keyword If    '${email}' == '${SPACE}myemail@gmail.com' or '${email}' == 'myemail@gmail.com${SPACE}' or '${email}' == 'myemail@gmail.com'     Wait Until Element Is Visible    //form[@name='addUserForm']//nx-email-input[@id='addUserEmail' and contains(@class,"ng-valid")]
