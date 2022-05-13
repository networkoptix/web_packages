*** Settings ***
Resource          ../Resources/front-end-resources/ipvd-resource.robot
Suite Setup       Open IPVD Page
Test Template     Test Submit Feedback Message
Test Teardown     
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        form    Threaded


*** Test Cases ***                   Expect Success     Your Name       Email                  Message
1. Feedback Valid email with all required data        True          ${name}         ${EMAIL OWNER}         ${message}
    [tags]    C54182    Valid    IPVD
2. Feedback Invalid email with all required data 1    False         ${name}         myemail                ${message}
    [tags]    C54182    Invalid    IPVD
3. Feedback Invalid email with all required data 2    False         ${name}         myemail@               ${message}
    [tags]    C54182    Invalid    IPVD
4. Feedback Invalid email with all required data 3    False         ${name}         myemail@gmail          ${message}
    [tags]    C54182    Invalid    IPVD
5. Feedback Invalid email with all required data 4    False         ${name}         my@email@gmail.com     ${message}
    [tags]    C54182    Invalid    IPVD
6. Feedback Invalid email with all required data 5    False         ${name}         myemail@ gmail.com     ${message}
    [tags]    C54182    Invalid    IPVD
7. Feedback Invalid email with all required data 6    False         ${name}         myemail@ gmail.com$    ${message}
    [tags]    C54182    Invalid    IPVD
