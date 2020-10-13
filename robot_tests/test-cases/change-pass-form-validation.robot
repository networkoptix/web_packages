*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Change Password Dialog
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Teardown
Force Tags        form    Threaded

*** Variables ***
${url}    ${ENV}
${valid email}          noptixqa+valid@gmail.com

${CURRENT PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]

*** Test Cases ***              OLD PW                    NEW PW
Incorrect Old Password          ${7char password}         ${BASE PASSWORD}
    [tags]    C41577    Password
Empty Old password              ${EMPTY}                  ${BASE PASSWORD}
    [tags]    C41577    Password
Short New Password              ${BASE PASSWORD}          ${7char password}
    [tags]    C41578    Password
Cyrillic New Password           ${BASE PASSWORD}          ${CYRILLIC TEXT}
    [tags]    C41578    Password
Smiley New Password             ${BASE PASSWORD}          ${SMILEY TEXT}
    [tags]    C41578    Password
Glyph New Password              ${BASE PASSWORD}          ${GLYPH TEXT}
    [tags]    C41578    Password
TM New Password                 ${BASE PASSWORD}          ${TM TEXT}
    [tags]    C41578    Password
Leading Space New Password      ${BASE PASSWORD}          ${SPACE}${BASE PASSWORD}
    [tags]    C41578    Password
Trailing Space New Password     ${BASE PASSWORD}          ${BASE PASSWORD}${SPACE}
    [tags]    C41578    Password
Empty New Password              ${BASE PASSWORD}          ${EMPTY}
    [tags]    C41832    Password
Empty Both                      ${EMPTY}                  ${EMPTY}
    [tags]    C41832    Password

Weak 1 Lowercase Password adrhartjad           ${BASE PASSWORD}       ${lowercase password}
    [tags]    C41578    Password
Weak 2 Uppercase Password ADRHARTJAD           ${BASE PASSWORD}       ${uppercase password}
    [tags]    C41578    Password
Weak 3 Numbers Password 13462344                ${BASE PASSWORD}      ${numbers password}
    [tags]    C41578    Password
Weak 4 Symbol only Password !@#$%^&*()_-+=     ${BASE PASSWORD}       ${symbol only password}
    [tags]    C41578    Password

Fair 1 Lower and Uppercase                      ${BASE PASSWORD}      ${lower upper password}
    [tags]    C41578    Password
Fair 2 Lowercase and numbers                   ${BASE PASSWORD}       ${lower number password}
    [tags]    C41578    Password
Fair 3 Lowercase and Symbols                   ${BASE PASSWORD}       ${lower symbol password}
    [tags]    C41578    Password
Fair 4 Uppercase and numbers                  ${BASE PASSWORD}        ${upper number password}
    [tags]    C41578    Password
Fair 5 Uppercase and Symbols                  ${BASE PASSWORD}        ${upper symbol password}
    [tags]    C41578    Password
Fair 6 Numbers and Symbols                     ${BASE PASSWORD}       ${number symbol password}
    [tags]    C41578    Password

Good 1 qweASD123                              ${BASE PASSWORD}        ${lower uppper number password}
    [tags]    C41578    Password
Good 2 qweASD!@#                                ${BASE PASSWORD}      ${lower upper symbol password}
    [tags]    C41578    Password
Good 3 qwe123!@#                               ${BASE PASSWORD}       ${lower number symbol password}
    [tags]    C41578    Password
Good 4 QWE123!@#                              ${BASE PASSWORD}        ${upper number symbol password}
    [tags]    C41578    Password

*** Keywords ***
Test Passwords Invalid
    [Arguments]    ${old pw}    ${new pw}
    Reload Page
    Wait Until Elements Are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Change Password Form Validation    ${old pw}    ${new pw}
    Run Keyword Unless    "${old pw}" == "${BASE PASSWORD}" or "${old pw}" == "${7char password}"
    ...    Check Old Password Outline
    Run Keyword Unless    '''${new pw}''' == "${BASE PASSWORD}"    Check New Password Outline and Error Message    ${new pw}    //h4    ${NEW PASSWORD INPUT}     newPassword
    Run Keyword If    "${old pw}" == "${7char password}"    Check Old Password Alert
    
Restart
    Close Browser
    Open Change Password Dialog
    
Teardown
    Restore Password using API    ${EMAIL VIEWER}    ${BASE PASSWORD}
    Close Browser
