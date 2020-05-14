*** Settings ***
Resource          ../resource.robot
Resource          ../resources/restore-pass-form-validation-password-resource.robot
Suite Setup       Open Restore Password Dialog With Link
Test Template     Test Password Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        email    form    Threaded File

*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}
${existing email}       ${EMAIL VIEWER}

${FORM WITH ERROR}             //form[@name='restorePasswordWithCode']//nx-password-input[contains(@class,'ng-invalid')]//input

*** Test Cases ***                                    NEW PW
Empty New Password                                    ${EMPTY}
    [tags]    C26260    Password
Password Too Short asdfghj                            ${7char password}
    [tags]    C41876    Password
Common Password qweasd123                             ${common password}
    [tags]    C41876    Password
Cyrillic Password Кенгшщзх                            ${CYRILLIC TEXT}
    [tags]    C41876    Password
Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★                  ${SMILEY TEXT}
    [tags]    C41876    Password
Glyph Password 您都可以享受源源不絕的好禮及優惠          ${GLYPH TEXT}
    [tags]    C41876    Password
TM Password qweasdzxc123®™                            ${TM TEXT}
    [tags]    C41876    Password
Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    ${symbol password}
    [tags]    C41876    Password
Leading Space Password                                ${SPACE}${BASE PASSWORD}
    [tags]    C41876    Password
Trailing Space Password                               ${BASE PASSWORD}${SPACE}    
    [tags]    C41876    Password

Weak 1 Lowercase Password adrhartjad                  ${lowercase password}
    [tags]    C41876    Password
Weak 2 Uppercase Password ADRHARTJAD                  ${uppercase password}
    [tags]    C41876    Password
Weak 3 Numbers Password 13462344                      ${numbers password}
    [tags]    C41876    Password
Weak 4 Symbol only Password !@#$%^&*()_-+=            ${symbol only password}
    [tags]    C41876    Password

Fair 1 Lower and Uppercase                            ${lower upper password}
    [tags]    C41876    Password
Fair 2 Lowercase and numbers                          ${lower number password}
    [tags]    C41876    Password
Fair 3 Lowercase and Symbols                          ${lower symbol password}
    [tags]    C41876    Password
Fair 4 Uppercase and numbers                          ${upper number password}
    [tags]    C41876    Password
Fair 5 Uppercase and Symbols                          ${upper symbol password}
    [tags]    C41876    Password
Fair 6 Numbers and Symbols                            ${number symbol password}
    [tags]    C41876    Password

Good 1 qweASD123                                      ${lower uppper number password}
    [tags]    C41876    Password
Good 2 qweASD!@#                                      ${lower upper symbol password}
    [tags]    C41876    Password
Good 3 qwe123!@#                                      ${lower number symbol password}
    [tags]    C41876    Password
Good 4 QWE123!@#                                      ${upper number symbol password}
    [tags]    C41876    Password

*** Keywords ***
Test Password Invalid
    [Arguments]   ${new pw}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${new pw}
    #Check New Password Badge    ${new pw}
    Check Password Badge    ${new pw}    //label[@for="newPassword"]
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Click Button    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Check New Password Outline    ${new pw}    ${RESET PASSWORD FORM}    ${RESET PASSWORD INPUT}    newPassword
    
Restart
    Close Browser
    Open Restore Password Dialog With Link