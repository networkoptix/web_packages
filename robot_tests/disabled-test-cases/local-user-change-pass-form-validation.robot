*** Settings ***
Resource          ../resource.robot
Suite Setup       Setup
Suite Teardown    Users Suite Teardown
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Force Tags        form    Threaded

*** Variables ***
${url}    ${ENV}
${valid email}          noptixqa+valid@gmail.com
${password}               ${BASE PASSWORD}
${email}                  ${EMAIL OWNER}
${CURRENT PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]

*** Test Cases ***               NEW PW
Short New Password              ${7char password}
    [Tags]    Password

Cyrillic New Password           ${CYRILLIC TEXT}
    [Tags]    Password

Smiley New Password             ${SMILEY TEXT}
    [Tags]    Password

Glyph New Password              ${GLYPH TEXT}
    [Tags]    Password

TM New Password                 ${TM TEXT}
    [Tags]    Password

Leading Space New Password      ${SPACE}${BASE PASSWORD}
    [Tags]    Password

Trailing Space New Password     ${BASE PASSWORD}${SPACE}
    [Tags]    Password

Empty New Password              ${EMPTY}
    [Tags]    Password
    
Weak 1 Lowercase Password adrhartjad           ${lowercase password}
    [Tags]    Password
    
Weak 2 Uppercase Password ADRHARTJAD           ${uppercase password}
    [Tags]    Password
    
Weak 3 Numbers Password 13462344                ${numbers password}
     [Tags]    Password
     
Weak 4 Symbol only Password !@#$%^&*()_-+=     ${symbol only password}
     [Tags]    Password
        

Fair 1 Lower and Uppercase                      ${lower upper password}
    [Tags]    Password
    
Fair 2 Lowercase and numbers                   ${lower number password}
    [Tags]    Password
    
Fair 3 Lowercase and Symbols                   ${lower symbol password}
    [Tags]    Password
    
Fair 4 Uppercase and numbers                  ${upper number password}
    [Tags]    Password
    
Fair 5 Uppercase and Symbols                  ${upper symbol password}
    [Tags]    Password
    
Fair 6 Numbers and Symbols                     ${number symbol password}
    [Tags]    Password
    

Good 1 qweASD123                              ${lower uppper number password}
    [Tags]    Password
    
Good 2 qweASD!@#                                ${lower upper symbol password}
    [Tags]    Password
    
Good 3 qwe123!@#                               ${lower number symbol password}
    [Tags]    Password
    
Good 4 QWE123!@#                             ${upper number symbol password}
    [Tags]    Password
    

*** Keywords ***
Test Passwords Invalid
    [Tags]    local user
    [Arguments]    ${new pw}
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List    ${system['owner']}    admin
    @{new locals} =    Create List
    @{local users} =    Reset Local Users    ${server 1['local auth']}   ${server 1['token']}    https://${QA BURBANK IP}:${server 1['port']}
    ${user} =    Set Variable    cloudAdmin
    Log in To User and System    ${server 1['cloud users']}[cloudAdmin]    ${server 1['cloud id']}
    Go to Users List
    Log    Change password for ${user}
    Wait Until Element is Visible    //span[text()="Local+${user}"]
    Click Element    //span[text()="Local+${user}"]
    Wait Until Elements Are Visible
    ...    ${LOCAL USER LOGIN}
    Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON} 
    Input Text    ${LOCAL USER PASSWORD INPUT}    ${new pw}
    Run Keyword If    '''${new pw}'''!='''${EMPTY}'''     Check Password Badge    ${new pw}    //label[@for="newPassword"]  
    Check New Password Outline and Error Message    ${new pw}    //label[@for="newPassword"]    ${LOCAL USER PASSWORD INPUT}    newPassword
    Click Button    //form[@name="changePasswordForm"]//button[text()="${CANCEL BUTTON TEXT}"]
    
Restart
    Click Button    //form[@name="changePasswordForm"]//button[text()="${CANCEL BUTTON TEXT}"]
    Common Restart Logout    ${url}
    Setup
    
Setup
    Users Suite Setup
   