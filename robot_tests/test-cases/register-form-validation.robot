*** Settings ***
Resource          ../Resources/front-end-resources/register-form-validation-resource.robot
Suite Setup       Open Browser and go to URL    ${url}/authorize?client_type=create
Test Template     Test Register Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Run Keyword and Ignore Error    Close Browser
Force Tags        form    Threaded

*** Test Cases ***                              FIRST       LAST        EMAIL                     PASS                               CHECKED
1. Register Invalid Email 1 noptixqagmail.com               mark        hamill      noptixqagmail.com         ${BASE PASSWORD}                   True
    [tags]    C41557
2. Register Invalid Email 2 @gmail.com                      mark        hamill      @gmail.com                ${BASE PASSWORD}                   True
    [tags]    C41557
3. Register Invalid Email 3 noptixqa@gmail..com             mark        hamill      noptixqa@gmail..com       ${BASE PASSWORD}                   True
    [tags]    C41557
4. Register Invalid Email 4 noptixqa@192.168.1.1.0          mark        hamill      noptixqa@192.168.1.1.0    ${BASE PASSWORD}                   True
    [tags]    C41557
5. Register Invalid Email 5 noptixqa.@gmail.com             mark        hamill      noptixqa.@gmail.com       ${BASE PASSWORD}                   True
    [tags]    C41557
6. Register Invalid Email 6 noptixq..a@gmail.c              mark        hamill      noptixq..a@gmail.c        ${BASE PASSWORD}                   True
    [tags]    C41557
7. Register Invalid Email 7 noptixqa@-gmail.com             mark        hamill      noptixqa@-gmail.com       ${BASE PASSWORD}                   True
    [tags]    C41557
8. Register Invalid Email 8 space                           mark        hamill      ${SPACE}                  ${BASE PASSWORD}                   True
    [tags]    C41557
9. Register Invalid Email 9 myemail@                        mark        hamill      myemail@                  ${BASE PASSWORD}                   True
    [tags]    C41557
10. Register Invalid Email 10 myemail@gmail                  mark        hamill      myemail@gmail             ${BASE PASSWORD}                   True
    [tags]    C41557
11. Register Invalid Email 11 myemail@.com                   mark        hamill      myemail@.com              ${BASE PASSWORD}                   True
    [tags]    C41557
12. Register Invalid Email 12 my@email@gmail.com             mark        hamill      my@email@gmail.com        ${BASE PASSWORD}                   True
    [tags]    C41557
13. Register Invalid Email 13 myemail@ gmail.com             mark        hamill      myemail@ gmail.com        ${BASE PASSWORD}                   True
    [tags]    C41557
14. Register Invalid Email 14 myemail@gmail.com;             mark        hamill      myemail@gmail.com;        ${BASE PASSWORD}                   True
    [tags]    C41557
15. Register Empty Email                                     mark        hamill      ${EMPTY}                  ${BASE PASSWORD}                   True
    [tags]    C41556
16. Register Registered Email                                mark        hamill      ${existing email}         ${BASE PASSWORD}                   True


17. Register Short Password asdfghj                          mark        hamill      ${valid email}            ${7char password}                  True
    [tags]    C41860    Password
18. Register Weak 1 Lowercase Password adrhartjad            mark        hamill      ${valid email}            ${lowercase password}              True
    [tags]    C41860    Password
19. Register Weak 2 Uppercase Password ADRHARTJAD            mark        hamill      ${valid email}            ${uppercase password}              True
    [tags]    C41860    Password
20. Register Weak 3 Numbers Password 13462344                mark        hamill      ${valid email}            ${numbers password}                True
    [tags]    C41860    Password
21. Register Weak 4 Symbol only Password !@#$%^&*()_-+=      mark        hamill      ${valid email}            ${symbol only password}            True
    [tags]    C41860    Password

22. Register Fair 1 Lower and Uppercase                      mark        hamill      ${valid email}            ${lower upper password}            True
    [tags]    C41860    Password
23. Register Fair 2 Lowercase and numbers                    mark        hamill      ${valid email}            ${lower number password}           True
    [tags]    C41860    Password
24. Register Fair 3 Lowercase and Symbols                    mark        hamill      ${valid email}            ${lower symbol password}           True
    [tags]    C41860    Password
25. Register Fair 4 Uppercase and numbers                    mark        hamill      ${valid email}            ${upper number password}           True
    [tags]    C41860    Password
26. Register Fair 5 Uppercase and Symbols                    mark        hamill      ${valid email}            ${upper symbol password}           True
    [tags]    C41860    Password
27. Register Fair 6 Numbers and Symbols                      mark        hamill      ${valid email}            ${number symbol password}          True
    [tags]    C41860    Password

28. Register Good 1 qweASD123                                mark        hamill      ${valid email}            ${lower uppper number password}    True
    [tags]    C41860    Password
29. Register Good 2 qweASD!@#                                mark        hamill      ${valid email}            ${lower upper symbol password}     True
    [tags]    C41860    Password
30. Register Good 3 qwe123!@#                                mark        hamill      ${valid email}            ${lower number symbol password}    True
    [tags]    C41860    Password
31. Register Good 4 QWE123!@#                                mark        hamill      ${valid email}            ${upper number symbol password}    True
    [tags]    C41860    Password

32. Register Common Password qweasd123                       mark        hamill      ${valid email}            ${common password}                 True
    [tags]    C41860    Password
33. Register Cyrillic Password Кенгшщзх                      mark        hamill      ${valid email}            ${CYRILLIC TEXT}s                  True
    [tags]    C41860    Password
34. Register Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★            mark        hamill      ${valid email}            ${SMILEY TEXT}s                    True
    [tags]    C41860    Password
35. Register Glyph Password 您都可以享受源源不絕的好禮及優惠    mark        hamill      ${valid email}            ${GLYPH TEXT}s                     True
    [tags]    C41860    Password
36. Register TM Password qweasdzxc123®™                      mark        hamill      ${valid email}            ${TM TEXT}s                        True
    [tags]    C41860    Password
37. Register Leading Space Password                          mark        hamill      ${valid email}            ${SPACE}${BASE PASSWORD}           True
    [tags]    C41860    Password
38. Register Trailing Space Password                         mark        hamill      ${valid email}            ${BASE PASSWORD}${SPACE}           True
    [tags]    C41860    Password
39. Register Middle Space Password qweasd 123                mark        hamill      ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41862    Password
40. Register Empty Password                                  mark        hamill      ${valid email}            ${EMPTY}                           True
    [tags]    C41556    Password
41. Register Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    mark        hamill      ${valid email}            ${symbol password}           True
    [tags]    C41861    Password


42. Register Invalid First Name                              ${SPACE}    hamill      ${valid email}            ${BASE PASSWORD}                   True

43. Register Empty First Name                                ${EMPTY}    hamill      ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41556
44. Register Invalid Last Name                               mark        ${SPACE}    ${valid email}            ${BASE PASSWORD}                   True

45. Register Empty Last Name                                 mark        ${EMPTY}    ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41556
46. Register Invalid All                                     ${SPACE}    ${SPACE}    noptixqagmail.com         ${7char password}                  True
    [tags]    C41556
47. Register Terms Unchecked                                 mark        hamill      ${valid email}            ${BASE PASSWORD}                   False
    [tags]    C41556
48. Register Empty All                                       ${EMPTY}    ${EMPTY}    ${SPACE}                  ${EMPTY}                           False
    [tags]    C41556
