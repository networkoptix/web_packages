*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Restore Password Dialog With Link
Test Template     Test Password Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        email    form    Threaded

*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}
${existing email}       ${EMAIL VIEWER}

${FORM WITH ERROR}             //form[@name='restorePasswordWithCode']//nx-password-input[contains(@class,'ng-invalid')]//input

*** Test Cases ***                                    NEW PW
1. Empty New Password                                    ${EMPTY}
    [tags]    C26260    Password
2. Password Too Short asdfghj                            ${7char password}
    [tags]    C41876    Password
3. Common Password qweasd123                             ${common password}
    [tags]    C41876    Password
4. Cyrillic Password Кенгшщзх                            ${CYRILLIC TEXT}
    [tags]    C41876    Password
5. Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★                  ${SMILEY TEXT}
    [tags]    C41876    Password
6. Glyph Password 您都可以享受源源不絕的好禮及優惠          ${GLYPH TEXT}
    [tags]    C41876    Password
7. TM Password qweasdzxc123®™                            ${TM TEXT}
    [tags]    C41876    Password
8. Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    ${symbol password}
    [tags]    C41876    Password
9. Leading Space Password                                ${SPACE}${BASE PASSWORD}
    [tags]    C41876    Password
10. Trailing Space Password                               ${BASE PASSWORD}${SPACE}
    [tags]    C41876    Password

11. Weak 1 Lowercase Password adrhartjad                  ${lowercase password}
    [tags]    C41876    Password
12. Weak 2 Uppercase Password ADRHARTJAD                  ${uppercase password}
    [tags]    C41876    Password
13. Weak 3 Numbers Password 13462344                      ${numbers password}
    [tags]    C41876    Password
14. Weak 4 Symbol only Password !@#$%^&*()_-+=            ${symbol only password}
    [tags]    C41876    Password

15. Fair 1 Lower and Uppercase                            ${lower upper password}
    [tags]    C41876    Password
16. Fair 2 Lowercase and numbers                          ${lower number password}
    [tags]    C41876    Password
17. Fair 3 Lowercase and Symbols                          ${lower symbol password}
    [tags]    C41876    Password
18. Fair 4 Uppercase and numbers                          ${upper number password}
    [tags]    C41876    Password
19. Fair 5 Uppercase and Symbols                          ${upper symbol password}
    [tags]    C41876    Password
20. Fair 6 Numbers and Symbols                            ${number symbol password}
    [tags]    C41876    Password

21. Good 1 qweASD123                                      ${lower uppper number password}
    [tags]    C41876    Password
22. Good 2 qweASD!@#                                      ${lower upper symbol password}
    [tags]    C41876    Password
23. Good 3 qwe123!@#                                      ${lower number symbol password}
    [tags]    C41876    Password
24. Good 4 QWE123!@#                                      ${upper number symbol password}
    [tags]    C41876    Password

*** Keywords ***
Test Password Invalid
    [Arguments]   ${new pw}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${new pw}
    #Check New Password Badge    ${new pw}
    Check Password Badge    ${new pw}    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Click Button    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Check New Password Outline and Error Message    ${new pw}    ${RESET PASSWORD FORM}    ${RESET PASSWORD INPUT}    newPassword

Restart
    Close Browser
    Open Restore Password Dialog With Link