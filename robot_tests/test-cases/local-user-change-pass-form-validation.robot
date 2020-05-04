*** Settings ***
Resource          ../resource.robot
Resource          ../resources/change-pass-form-validation-resource.robot
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

*** Test Cases ***              OLD PW                    NEW PW
# Incorrect Old Password          ${7char password}         ${BASE PASSWORD}

# Empty Old password              ${EMPTY}                  ${BASE PASSWORD}

Short New Password              ${BASE PASSWORD}          ${7char password}

Cyrillic New Password           ${BASE PASSWORD}          ${CYRILLIC TEXT}

Smiley New Password             ${BASE PASSWORD}          ${SMILEY TEXT}

Glyph New Password              ${BASE PASSWORD}          ${GLYPH TEXT}

TM New Password                 ${BASE PASSWORD}          ${TM TEXT}

Leading Space New Password      ${BASE PASSWORD}          ${SPACE}${BASE PASSWORD}

Trailing Space New Password     ${BASE PASSWORD}          ${BASE PASSWORD}${SPACE}

Empty New Password              ${BASE PASSWORD}          ${EMPTY}

Empty Both                      ${EMPTY}                  ${EMPTY}


Weak 1 Lowercase Password adrhartjad           ${BASE PASSWORD}       ${lowercase password}

Weak 2 Uppercase Password ADRHARTJAD           ${BASE PASSWORD}       ${uppercase password}

Weak 3 Numbers Password 13462344                ${BASE PASSWORD}      ${numbers password}
 
Weak 4 Symbol only Password !@#$%^&*()_-+=     ${BASE PASSWORD}       ${symbol only password}
    

Fair 1 Lower and Uppercase                      ${BASE PASSWORD}      ${lower upper password}

Fair 2 Lowercase and numbers                   ${BASE PASSWORD}       ${lower number password}

Fair 3 Lowercase and Symbols                   ${BASE PASSWORD}       ${lower symbol password}

Fair 4 Uppercase and numbers                  ${BASE PASSWORD}        ${upper number password}

Fair 5 Uppercase and Symbols                  ${BASE PASSWORD}        ${upper symbol password}

Fair 6 Numbers and Symbols                     ${BASE PASSWORD}       ${number symbol password}


Good 1 qweASD123                              ${BASE PASSWORD}        ${lower uppper number password}

Good 2 qweASD!@#                                ${BASE PASSWORD}      ${lower upper symbol password}

Good 3 qwe123!@#                               ${BASE PASSWORD}       ${lower number symbol password}

Good 4 QWE123!@#                              ${BASE PASSWORD}        ${upper number symbol password}


*** Keywords ***
Test Passwords Invalid
    [Tags]    local user
    [Arguments]    ${old pw}    ${new pw}
    ${user} =    Set Variable    cloudAdmin
    Log    Change password for ${user}
    Click Element    //span[text()="Local+${user}"]
    Wait Until Elements Are Visible
    ...    ${LOCAL USER LOGIN}
    Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON} 
    Input Text    //input[@id="newPassword"]    ${new pw}
    Check New Password Outline    ${new pw}
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