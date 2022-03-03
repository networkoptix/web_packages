*** Settings ***
Resource          ../resource.robot
Suite Setup       Start
Test Template     Check Details Panel Alerts
#Test Teardown     Run Keyword If Test Failed    Start
Suite Teardown    Run Keyword and Ignore Error    Health Monitor Details Tear Down
Force Tags        email    form    Threaded    hm

*** Test Cases ***                 TYPE     HARDWARE      NAME                         CATEGORY     METRIC
#errors
1. One Error On Server                error    Server        testserver error         Activity     Transactions/s
2. Error with Warning on server       error    Server        testserver both          Activity     Active plugins list
3. Two Errors On Server A             error    Server        testserver 2 errors      Load         Server threads
4. Two Errors On Server B             error    Server        testserver 2 errors      Load         Decoding speed

5. One Error On Camera                error    Camera        test error                   Info         Server
6. Error with Warning On Camera       error    Camera        test both                    Info         Firmware
7. Two Errors On Camera A             error    Camera        test 2 errors                Info         IP
8. Two Errors On Camera B             error    Camera        test 2 errors                Info         Vendor

9. One Error On Storage               error    Storage       test storage error           Space        Total
10. Error with Warning On Storage      error    Storage       test storage both            Activity     Read Rate
11. Two Errors On Storage A            error    Storage       test storage 2 errors        Activity     Write Rate
12. Two Errors On Storage B            error    Storage       test storage 2 errors        Space        Total

13. One Error On Interface             error    Interface    test network error            Info         State
14. Error with Warning On Interface    error    Interface    test network both             Info         IP
15. Two Errors On Interface A          error    Interface    test network 2 errors         Info         Server
16. Two Errors On Interface B          error    Interface    test network 2 errors         I/O Rates    OUT Rate

#warnings
17. One Warning On Server              warning    Server        testserver warning         Load         CPU (VMS Server) %
18. Warning with Error on server       warning    Server        testserver both            Activity     API Calls/s
19. Two Warnings On Server A           warning    Server        testserver 2 warnings      Load         RAM %
20. Two Warnings On Server B           warning    Server        testserver 2 warnings      Activity     Rules Activations/s

21. One Warning On Camera              warning    Camera        test camera warning        Info         Type
22. Warning with Error On Camera       warning    Camera        test both                  Info         Model
23. Two Warnings On Camera A           warning    Camera        test two warnings          Info         Type
24. Two Warnings On Camera B           warning    Camera        test two warnings          Info         Recording

25. One Warning On Storage             warning    Storage       test storage warning       Activity     Read Rate
26. Warning with Error On Storage      warning    Storage       test storage both          Info         Type
27. Two Warnings On Storage A          warning    Storage       test storage 2 warnings    State        Status
28. Two Warnings On Storage B          warning    Storage       test storage 2 warnings    Activity     Write Rate

29. One Warning On Interface           warning    Interface     test network warning       I/O Rates    IN Rate
30. Warning with Error Interface       warning    Interface     test network both          I/O Rates    IN Rate
31. Two Warnings On Interface A        warning    Interface     test network 2 warnings    Info         State
32. Two Warnings On Interface B        warning    Interface     test network 2 warnings    I/O Rates    OUT Rate
