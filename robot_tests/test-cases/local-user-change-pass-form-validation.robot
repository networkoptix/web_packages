*** Settings ***
Resource          ../resource.robot
Suite Setup       Setup
Suite Teardown    Delete All Local Users
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Force Tags        form    Threaded File

*** Variables ***
${url}    ${ENV}
${valid email}          noptixqa+valid@gmail.com

${CURRENT PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]

*** Test Cases ***               NEW PW
Short New Password              ${7char password}

Cyrillic New Password           ${CYRILLIC TEXT}

Smiley New Password             ${SMILEY TEXT}

Glyph New Password              ${GLYPH TEXT}

TM New Password                 ${TM TEXT}

Leading Space New Password      ${SPACE}${BASE PASSWORD}

Trailing Space New Password     ${BASE PASSWORD}${SPACE}

Empty New Password              ${EMPTY}

Weak 1 Lowercase Password adrhartjad           ${lowercase password}

Weak 2 Uppercase Password ADRHARTJAD           ${uppercase password}

Weak 3 Numbers Password 13462344                ${numbers password}
 
Weak 4 Symbol only Password !@#$%^&*()_-+=     ${symbol only password}
    

Fair 1 Lower and Uppercase                      ${lower upper password}

Fair 2 Lowercase and numbers                   ${lower number password}

Fair 3 Lowercase and Symbols                   ${lower symbol password}

Fair 4 Uppercase and numbers                  ${upper number password}

Fair 5 Uppercase and Symbols                  ${upper symbol password}

Fair 6 Numbers and Symbols                     ${number symbol password}


Good 1 qweASD123                              ${lower uppper number password}

Good 2 qweASD!@#                                ${lower upper symbol password}

Good 3 qwe123!@#                               ${lower number symbol password}

Good 4 QWE123!@#                             ${upper number symbol password}


*** Keywords ***
Test Passwords Invalid
    [Tags]    local user
    [Arguments]    ${new pw}
    ${user} =    Set Variable    cloudAdmin
    Log    Change password for ${user}
    Click Element    //span[text()="Local+${user}"]
    Wait Until Elements Are Visible
    ...    ${LOCAL USER LOGIN}
    Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON} 
    Input Text    ${LOCAL USER PASSWORD INPUT}    ${new pw}
    Run Keyword If    '''${new pw}'''!='''${EMPTY}'''     Check Password Badge    ${new pw}    //label[@for="newPassword"]  
    Check New Password Outline    ${new pw}    //label[@for="newPassword"]    ${LOCAL USER PASSWORD INPUT}   
    Click Button    //form[@name="changePasswordForm"]//button[text()="Cancel"]
    
Restart
    Click Button    //form[@name="changePasswordForm"]//button[text()="Cancel"]
    Delete All Local Users
    Common Restart Logout    ${url}
    Setup
    
Setup
    Open Browser and go to URL    ${url}
    @{local users} =    Create List    cloudAdmin    viewer
    @{local users} =    Create Local Users via API    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${local users}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}     button=None
    Wait Until Element is Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}      