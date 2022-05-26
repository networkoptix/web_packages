*** Settings ***
Resource          ../Resources/front-end-resources/ipvd-resource.robot
Suite Setup       Open IPVD Page
Test Template     Test Submit Request Message
Test Teardown     
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        form    Threaded

*** Test Cases ***                   Expect Success     Your Name       Email                  Message
1. IPVD Valid email with all required data        True          ${name}         ${EMAIL OWNER}         ${message}
    [tags]    C48969    Valid    IPVD
2. IPVD Invalid email with all required data 1    False         ${name}         myemail                ${message}
    [tags]    C48969    Invalid    IPVD
3. IPVD Invalid email with all required data 2    False         ${name}         myemail@               ${message}
    [tags]    C48969    Invalid    IPVD
4. IPVD Invalid email with all required data 3    False         ${name}         myemail@gmail          ${message}
    [tags]    C48969    Invalid    IPVD
5. IPVD Invalid email with all required data 4    False         ${name}         my@email@gmail.com     ${message}
    [tags]    C48969    Invalid    IPVD
6. IPVD Invalid email with all required data 5    False         ${name}         myemail@ gmail.com     ${message}
    [tags]    C48969    Invalid    IPVD
7. IPVD Invalid email with all required data 6    False         ${name}         myemail@ gmail.com$    ${message}
    [tags]    C48969    Invalid    IPVD
