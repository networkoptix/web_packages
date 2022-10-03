*** Settings ***
Resource          ../Resources/front-end-resources/restore-pass-resource.robot
Suite Setup       Restore Pass Validation Setup
Test Template     restore-pass-resource.Test Email Invalid
Test Teardown     Run Keyword If Test Failed    restore-pass-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Restore Pass Validation Teardown
Force Tags        email    form    Threaded


*** Test Cases ***                        EMAIL
1. Restore Empty Email                               ${EMPTY}
    [tags]    C26260   CLOUD-8445
2. Restore Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41875
3. Restore Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41875
4. Restore Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41875
5. Restore Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41875    CLOUD-8445
6. Restore Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41875
7. Restore Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41875
8. Restore Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41875
9. Restore Invalid Email 8 myemail                   myemail
    [tags]    C41875
10. Restore Invalid Email 9 myemail@                  myemail@
    [tags]    C41875
11. Restore Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41875    CLOUD-8445
12. Restore Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41875
13. Restore Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41875
14. Restore Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41875
15. Restore Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41875
16. Restore Space Email                               ${SPACE}
    [tags]    CLOUD-8445
17. Restore Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C41875
18. Restore Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C41875   CLOUD-8445
19. Restore Unregistered Email                        ${EMAIL UNREGISTERED}
    [tags]    C41870
