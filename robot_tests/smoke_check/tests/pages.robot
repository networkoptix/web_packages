*** Settings ***
Library          SeleniumLibrary
Resource         ../resources/vars.robot
Resource         ../../resource.robot
Resource         ../../APIresource.robot

Suite Setup      Open Browser    ${ENV}   headlesschrome
#Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - Cloud Pages
Suite Teardown   Close Browser


*** Test Cases ***
About
    [Tags]    T169289    pages
    Wait Until Element Is Visible    ${FOOTER ABOUT LINK}
    Click Link    ${FOOTER ABOUT LINK}
    Location Should Contain    /content/about


Download Page
    [Tags]    T169289    pages
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    CLick Link    ${DOWNLOAD LINK}
    Sleep    1s
    ${os}=   Get OS
    ${os}=   Convert To Lowercase    ${os}
    Location Should Contain    download/${os}
    Wait Until Elements Are Visible
    ...    ${DOWNLOADS HEADER}
    ...    ${WINDOWS TAB}
    ...    ${${os} TAB}
    ...    ${PLAY STORE DOWNLOAD BUTTON}
    ...    ${ITUNES STORE DOWNLOAD BUTTON}

    Click Link    ${${os} TAB}
    Wait Until Element Is Visible    ${DOWNLOAD ${os} VMS LINK}
    ${url}=    Get Element Attribute    ${DOWNLOAD ${os} VMS LINK}    href
    Check File Exists    ${url}

Terms
    [Tags]    C30824    pages
    Wait Until Element Is Visible    ${FOOTER TERMS LINK}
    Click Link    ${FOOTER TERMS LINK}
    Location Should Contain    content/eula

Support
    [Tags]    C34452    pages
    Wait Until Element Is Visible    ${FOOTER PRIVACY LINK}
    ${privacy url}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    href
    Run keyword and ignore error    Should Contain    ${privacy url}    content/privacy

Privacy
    [Tags]    C34452    pages
    ${os}=   Get OS
    Wait Until Element Is Visible    ${FOOTER PRIVACY LINK}
    ${privacy url}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    href
    Run keyword and ignore error    Should Contain    ${privacy url}    content/privacy

Integrations
    [Tags]    C57508    pages
    @{auth}=   Create List    ${email owner}    ${base password}
    ${is enabled}=   Integration Store is Enabled    ${auth}
    Run keyword If    ${is enabled} == ${True}    Wait Until Elements Are Visible
    ...    ${INTEGRATIONS SEARCH}
    ...    ${INTEGRATIONS SEARCH FILTER}
    ...    ${INTEGRATIONS CATALOG}

Supported Devices
    [Tags]    C57509    pages
    Wait Until Element Is Visible    ${FOOTER SUPPORTED DEVICES LINK}
    Click Link    ${FOOTER SUPPORTED DEVICES LINK}
    Location Should Contain    ipvd
    Wait until Elements are Visible
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    ...    ${IPVD LANDING PAGE TEXT}

