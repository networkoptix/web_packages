*** Settings ***
Resource          ../resource.robot
Suite Setup       login-form-validation-resource.Restart
Test Teardown     Run Keyword If Test Failed    login-form-validation-resource.Restart
Test Template     Test Login Invalid
Suite Teardown    Run Keyword and Ignore Error    Close Browser
Force Tags        form    Threaded 

*** Test Cases ***            EMAIL                         PASS
1. Empty Email                   ${EMPTY}                      ${good password}
2. Empty Password                ${good email}                 ${EMPTY}
3. Invalid Email 1               noptixqagmail.com             ${good password}
4. Invalid Email 2               @gmail.com                    ${good password}
5 Invalid Email 3               noptixqa@gmail..com           ${good password}
6. Invalid Email 4               noptixqa@192.168.1.1.0        ${good password}
7. Invalid Email 5               noptixqa.@gmail.com           ${good password}
8. Invalid Email 6               noptixq..a@gmail.c            ${good password}
9. Invalid Email 7               noptixqa@-gmail.com           ${good password}
10. Invalid Password              ${good email}                 ${bad password}
    [tags]    C41869
11. Valid Email Unregistered      ${good email unregistered}    ${good password}
    [tags]    C41868
