*** Settings ***
Resource          ../Resources/front-end-resources/share-form-validation-resource.robot
Suite Setup       Open Share Dialog
Test Template     share-form-validation-resource.Test Email Invalid
Test Teardown     Run Keyword If Test Failed    share-form-validation-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Share Form Tear Down
Force Tags        email    form    Threaded


*** Test Cases ***      EMAIL
1. Share Empty Email                               ${EMPTY}
    [tags]    C78227
2. Share Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41902
3. Share Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41902
4. Share Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41902
5. Share Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41902
6. Share Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41902
7. Share Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41902
8. Share Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41902
9. Share Invalid Email 8 myemail                   myemail
    [tags]    C41902
10. Share Invalid Email 9 myemail@                  myemail@
    [tags]    C41902
11. Share Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41902
12. Share Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41902
13. Share Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41902
14. Share Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41902
15. Share Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41902
16. Share Space Email                               ${SPACE}
17. Share Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C47296
18. Share Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C47296
19. Share Valid Email                               myemail@gmail.com
    [tags]    C47296
