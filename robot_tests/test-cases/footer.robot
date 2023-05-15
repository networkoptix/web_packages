*** Settings ***
Resource          ../Resources/front-end-resources/footer-resource.robot
Suite Setup       Footer Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Footer Test Setup
Test Teardown        Run Keywords    QA Video Recording Stop         Footer Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags    threaded

*** Test Cases ***
1. "API documentation" link leads to proper page
    [Tags]    Threaded    webadmin
    Wait Until Element is Visible    ${FOOTER API DOCUMENTATION LINK}
    Sleep    1
    Click Link    ${FOOTER API DOCUMENTATION LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    Wait Until Location Contains   ${url}${REST API URL}

2. "Download SDK" link leads to proper page
    [Tags]    Threaded    webadmin
    Wait Until Element is Visible    ${FOOTER DOWNLOAD SDK LINK}
    Sleep    1
    Click Link    ${FOOTER DOWNLOAD SDK LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    Wait Until Location Contains   ${ENV}${SDK URL}

3. Support leads to the proper support site
    [Tags]    C41544    Threaded    C30823    webadmin    cloud    smoke
    Wait Until Element is Visible    ${FOOTER SUPPORT LINK}
    Sleep    1
    Click Link    ${FOOTER SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    Wait Until Location Contains    ${SUPPORT URL}

4. Copyright leads to the proper site
    [Tags]    C41547    Threaded    webadmin    cloud    smoke
    Wait Until Element is Visible    ${FOOTER COPYRIGHT LINK}
    Sleep    1
    Click Link    ${FOOTER COPYRIGHT LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    Wait Until Location Is    ${COPYRIGHT URL}

5. Terms leads to the proper EULA site    
    [Tags]    C41545    Threaded    C30824     cloud    smoke
    Wait Until Element is Visible    ${FOOTER TERMS LINK}
    Sleep    1
    Click Link    ${FOOTER TERMS LINK}
    #Wait Until Number Of Tabs Are Open    2
    #Switch Window    NEW
    Wait Until Location Is    ${ENV}${TERMS URL}

6. Privacy leads to the proper page
    [Tags]    C41546    Threaded    C34452    cloud    smoke
    Wait Until Element is Visible    ${FOOTER PRIVACY LINK}
    Sleep    1
    Click Link    ${FOOTER PRIVACY LINK}
    #Wait Until Number Of Tabs Are Open    2
    #Switch Window    NEW
    Wait Until Location Is    ${PRIVACY POLICY URL FULL}
