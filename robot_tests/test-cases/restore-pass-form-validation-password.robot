*** Settings ***
Resource          ../Resources/front-end-resources/restore-pass-resource.robot
Suite Setup       Open Restore Password Dialog With Code
Test Template     Test Password Invalid
Test Teardown     Run Keyword If Test Failed    Restart Restore Pass Form Password
Suite Teardown    Run Keyword and Ignore Error    Close Browser
Force Tags        email    form

*** Test Cases ***                                    NEW PW
1. Restore Empty New Password                                    ${EMPTY}
    [tags]    C26260    Password
2. Restore Password Too Short asdfghj                            ${7char password}
    [tags]    C41876    Password
3. Restore Common Password qweasd123                             ${common password}
# "s" added below to handle weird badge issue
    [tags]    C41876    Password
4. Restore Cyrillic Password Кенгшщзх                            ${CYRILLIC TEXT}s
    [tags]    C41876    Password
5. Restore Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★                       ${SMILEY TEXT}s
    [tags]    C41876    Password
6. Restore Glyph Password 您都可以享受源源不絕的好禮及優惠            ${GLYPH TEXT}s
    [tags]    C41876    Password
7. Restore TM Password qweasdzxc123®™                            ${TM TEXT}s
    [tags]    C41876    Password    CLOUD-8457
8. Restore Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    ${symbol password}
    [tags]    C41876    Password
9. Restore Leading Space Password                                ${SPACE}${BASE PASSWORD}
    [tags]    C41876    Password
10. Restore Trailing Space Password                              ${BASE PASSWORD}${SPACE}
    [tags]    C41876    Password    CLOUD-8457

11. Restore Weak 1 Lowercase Password adrhartjad                  ${lowercase password}
    [tags]    C41876    Password    CLOUD-8457
12. Restore Weak 2 Uppercase Password ADRHARTJAD                  ${uppercase password}
    [tags]    C41876    Password    CLOUD-8457
13. Restore Weak 3 Numbers Password 13462344                      ${numbers password}
    [tags]    C41876    Password    CLOUD-8457
14. Restore Weak 4 Symbol only Password !@#$%^&*()_-+=            ${symbol only password}
    [tags]    C41876    Password    CLOUD-8457

15. Restore Fair 1 Lower and Uppercase                            ${lower upper password}
    [tags]    C41876    Password
16. Restore Fair 2 Lowercase and numbers                          ${lower number password}
    [tags]    C41876    Password
17. Restore Fair 3 Lowercase and Symbols                          ${lower symbol password}
    [tags]    C41876    Password
18. Restore Fair 4 Uppercase and numbers                          ${upper number password}
    [tags]    C41876    Password
19. Restore Fair 5 Uppercase and Symbols                          ${upper symbol password}
    [tags]    C41876    Password
20. Restore Fair 6 Numbers and Symbols                            ${number symbol password}
    [tags]    C41876    Password

21. Restore Good 1 qweASD123                                      ${lower uppper number password}
    [tags]    C41876    Password
22. Restore Good 2 qweASD!@#                                      ${lower upper symbol password}
    [tags]    C41876    Password
23. Restore Good 3 qwe123!@#                                      ${lower number symbol password}
    [tags]    C41876    Password
24. Restore Good 4 QWE123!@#                                      ${upper number symbol password}
    [tags]    C41876    Password
