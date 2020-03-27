*** Settings ***
Library           ../NoptixLibrary/__init__.py
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Teardown     Restart
Suite Teardown    Close All Browsers

*** Variables ***
${email}           ${EMAIL OWNER}
${password}        ${BASE PASSWORD}
${url}             ${ENV}

*** Keywords ***
Restart
    Close Browser
    Open Browser and go to URL    ${url}

*** Test Cases ***
About page is correctly displayed
    [tags]    C41541    Threaded    C30820    smoke
    Wait Until Elements are Visible
    ...    ${FOOTER ABOUT LINK}
    ...    ${CREATE ACCOUNT BODY}
    ...    ${FOOTER ABOUT LINK}
    Wait Until Element Has Style
    ...    ${CREATE ACCOUNT BODY}
    ...    background-color
    ...    ${THEME COLOR RGB}
    Click Link    ${FOOTER ABOUT LINK}
    Location Should Be    ${ENV}${ABOUT URL}
    Wait Until Elements are Visible
    ...    ${FOOTER ABOUT LINK}
    ...    ${CREATE ACCOUNT BODY}
    ...    ${FOOTER ABOUT LINK}
    Wait Until Element Has Style
    ...    ${CREATE ACCOUNT BODY}
    ...    background-color
    ...    ${THEME COLOR RGB}

Integrations leads to the proper support site
    [tags]    Threaded    C57508    smoke
    Wait Until Element is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Wait Until Location Is    ${ENV}/integrations

Supported devices leads to the proper page
    [tags]    Threaded    C57509    smoke
    Wait Until Element is Visible    ${FOOTER SUPPORTED DEVICES LINK}
    Click Link    ${FOOTER SUPPORTED DEVICES LINK}
    Wait Until Location Is    ${ENV}/ipvd

Support leads to the proper support site
    [tags]    C41544    Threaded    C30823    smoke
    Wait Until Element is Visible    ${FOOTER SUPPORT LINK}
    Sleep    1
    Click Link    ${FOOTER SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    ${tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Contains    ${SUPPORT URL}

Terms leads to the proper EULA site
    [tags]    C41545    Threaded    C30824    smoke
    Wait Until Element is Visible    ${FOOTER TERMS LINK}
    Sleep    1
    Click Link    ${FOOTER TERMS LINK}
    Wait Until Number Of Tabs Are Open    2
    @{tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Is    ${ENV}${TERMS URL}

Privacy leads to the proper page
    [tags]    C41546    Threaded    C34452    smoke
    Wait Until Element is Visible    ${FOOTER PRIVACY LINK}
    Sleep    1
    Click Link    ${FOOTER PRIVACY LINK}
    Wait Until Number Of Tabs Are Open    2
    @{tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Is    ${ENV}${PRIVACY POLICY URL HREF}

Copyright leads to the proper site
    [tags]    C41547    Threaded
    Wait Until Element is Visible    ${FOOTER COPYRIGHT LINK}
    Sleep    1
    Click Link    ${FOOTER COPYRIGHT LINK}
    Wait Until Number Of Tabs Are Open    2
    ${tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Is    ${COPYRIGHT URL}
