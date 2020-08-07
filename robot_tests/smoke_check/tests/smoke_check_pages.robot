*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Open Browser    ${ENV}   headlesschrome
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - Cloud Pages
Suite Teardown   Close Browser


*** Test Cases ***
About
    [Tags]    T169289    pages

    Wait Until Element Is Visible    ${FOOTER ABOUT LINK}
    Click Link    ${FOOTER ABOUT LINK}
    Wait until LOcation Contains    /content/about

Download Page
    [Tags]    T169289    pages

    Log    Step 1: Click on Downloads link, log in and validate Downloads page
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    CLick Link    ${DOWNLOAD LINK}
    Wait Until Elements Are Visible    ${LOGIN MODAL}    ${EMAIL INPUT}   ${PASSWORD INPUT}    ${LOG IN BUTTON}
    Input Text    ${EMAIL INPUT}    ${email pages}
    Input Text    ${PASSWORD INPUT}    ${password}
    Click Button    ${LOG IN BUTTON}

    ${os}=   Get OS
    ${os}=   Convert To Lowercase    ${os}
    Location Should Contain    download/${os}
    Wait Until Elements Are Visible
    ...    ${DOWNLOADS HEADER}
    ...    ${WINDOWS TAB}
    ...    ${${os} TAB}
    ...    ${PLAY STORE DOWNLOAD BUTTON}
    ...    ${ITUNES STORE DOWNLOAD BUTTON}

    Log    Step 2: Check download link
    Click Link    ${${os} TAB}
    Wait Until Element Is Visible    ${DOWNLOAD ${os} VMS LINK}
    ${url}=    Get Element Attribute    ${DOWNLOAD ${os} VMS LINK}    href
    Check File Exists    ${url}

    Log    Step 3: Check AppStore and GooglePlay buttons
    ${url}=    Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
    Should Contain    ${url}    https://apps.apple.com/

    ${url}=    Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
    Should Contain    ${url}    https://play.google.com/

Terms
    [Tags]    C30824    pages

    Wait Until Element Is Visible    ${FOOTER TERMS LINK}
    ${terms url}=   Get Element Attribute    ${FOOTER TERMS LINK}    href
    Should Be Equal As Strings    ${terms url}    ${ENV}/content/eula


Support
    [Tags]    C34452    pages

    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    ${support url}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    href
    Should Be Equal As Strings    ${support url}    https://support.networkoptix.com/

Privacy
    [Tags]    C34452    pages

    Wait Until Element Is Visible    ${FOOTER PRIVACY LINK}
    ${privacy url}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    href
    Should Be Equal As Strings    ${privacy url}    https://www.networkoptix.com/privacy-policy/

Integrations
    [Tags]    C57508    pages

    ${is enabled}=   Integration Store is Enabled    ${auth}

    Run keyword If    ${is enabled}==${True}    Run Keywords
    ...    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    ...    AND    Click Link    ${FOOTER INTEGRATIONS LINK}
    ...    AND    Wait Until Elements Are Visible
                  ...    ${INTEGRATIONS SEARCH}
                  ...    ${INTEGRATIONS CATALOG}

Supported Devices
    [Tags]    C57509    pages

    Wait Until Element Is Visible    ${FOOTER SUPPORTED DEVICES LINK}
    Click Link    ${FOOTER SUPPORTED DEVICES LINK}
    Wait Until Location Contains    ipvd
    Wait until Elements are Visible
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    ...    ${IPVD LANDING PAGE TEXT}