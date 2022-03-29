*** Settings ***
Resource          ../Resources/front-end-resources/change-pass-form-validation-resource.robot
Suite Setup       Open Change Password Dialog
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    change-pass-form-validation-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Teardown
Force Tags        form    Threaded


*** Test Cases ***              OLD PW                    NEW PW
1. Incorrect Old Password          ${7char password}         ${BASE PASSWORD}
    [tags]    C41577    Password
2. Empty Old password              ${EMPTY}                  ${BASE PASSWORD}
    [tags]    C41577    Password
3. Short New Password              ${BASE PASSWORD}          ${7char password}
    [tags]    C41578    Password
# "s" added below for wierd badge issue
4. Cyrillic New Password           ${BASE PASSWORD}          ${CYRILLIC TEXT}s
    [tags]    C41578    Password
5. Smiley New Password             ${BASE PASSWORD}          ${SMILEY TEXT}s
    [tags]    C41578    Password
6. Glyph New Password              ${BASE PASSWORD}          ${GLYPH TEXT}s
    [tags]    C41578    Password
7. TM New Password                 ${BASE PASSWORD}          ${TM TEXT}s
    [tags]    C41578    Password
8. Leading Space New Password      ${BASE PASSWORD}          ${SPACE}${BASE PASSWORD}
    [tags]    C41578    Password
9. Trailing Space New Password     ${BASE PASSWORD}          ${BASE PASSWORD}${SPACE}
    [tags]    C41578    Password
10. Empty New Password              ${BASE PASSWORD}          ${EMPTY}
    [tags]    C41832    Password
# This is no longer testable with the current design
#Empty Both                      ${EMPTY}                  ${EMPTY}
#    [tags]    C41832    Password

11. Weak 1 Lowercase Password adrhartjad           ${BASE PASSWORD}    ${lowercase password}
    [tags]    C41578    Password
12. Weak 2 Uppercase Password ADRHARTJAD           ${BASE PASSWORD}    ${uppercase password}
    [tags]    C41578    Password
13. Weak 3 Numbers Password 13462344               ${BASE PASSWORD}    ${numbers password}
    [tags]    C41578    Password
14. Weak 4 Symbol only Password !@#$%^&*()_-+=     ${BASE PASSWORD}    ${symbol only password}
    [tags]    C41578    Password

15. Fair 1 Lower and Uppercase                     ${BASE PASSWORD}    ${lower upper password}
    [tags]    C41578    Password
16. Fair 2 Lowercase and numbers                   ${BASE PASSWORD}    ${lower number password}
    [tags]    C41578    Password
17. Fair 3 Lowercase and Symbols                   ${BASE PASSWORD}    ${lower symbol password}
    [tags]    C41578    Password
18. Fair 4 Uppercase and numbers                   ${BASE PASSWORD}    ${upper number password}
    [tags]    C41578    Password 
19. Fair 5 Uppercase and Symbols                   ${BASE PASSWORD}    ${upper symbol password}
    [tags]    C41578    Password
20. Fair 6 Numbers and Symbols                     ${BASE PASSWORD}    ${number symbol password}
    [tags]    C41578    Password

21. Good 1 qweASD123                               ${BASE PASSWORD}    ${lower uppper number password}
    [tags]    C41578    Password
22. Good 2 qweASD!@#                               ${BASE PASSWORD}    ${lower upper symbol password}
    [tags]    C41578    Password
23. Good 3 qwe123!@#                               ${BASE PASSWORD}    ${lower number symbol password}
    [tags]    C41578    Password
24. Good 4 QWE123!@#                               ${BASE PASSWORD}    ${upper number symbol password}
    [tags]    C41578    Password

