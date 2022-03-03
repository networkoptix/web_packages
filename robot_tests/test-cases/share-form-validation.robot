*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Share Dialog
Test Template     share-form-validation-resource.Test Email Invalid
Test Teardown     Run Keyword If Test Failed    share-form-validation-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Share Form Tear Down
Force Tags        email    form    Threaded


*** Test Cases ***      EMAIL
1. Empty Email                               ${EMPTY}
    [tags]    C78227
2. Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41902
3. Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41902
4. Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41902
5. Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41902
6. Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41902
7. Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41902
8. Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41902
9. Invalid Email 8 myemail                   myemail
    [tags]    C41902
10. Invalid Email 9 myemail@                  myemail@
    [tags]    C41902
11. Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41902
12. Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41902
13. Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41902
14. Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41902
15. Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41902
16. Space Email                               ${SPACE}
17. Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C47296
18. Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C47296
19. Valid Email                               myemail@gmail.com
    [tags]    C47296
