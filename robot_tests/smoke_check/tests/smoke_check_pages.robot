*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Open browser and go to URL    ${ENV}    False    False
Suite Teardown   Close Browser


*** Test Cases ***
About
    [Tags]    C30820    pages
    Wait Until Element Is Visible    ${FOOTER ABOUT LINK}
    Click Link    ${FOOTER ABOUT LINK}
    Wait Until Location Contains    /content/about
    Wait Until Elements Are Visible
    ...    ${LOGO LINK}
    ...    ${WELCOME CAPTION}
    ...    //landing-display-component
    ...    ${CREATE ACCOUNT BODY}

Download Page
    [Tags]    C30821    pages
    Log    Step 1: Click on Downloads link, log in and validate Downloads page
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    CLick Link    ${DOWNLOAD LINK}

    ${os}=   Get OS
    ${os}=   Convert To Lowercase    ${os}
    Location Should Contain    download/${os}
    Wait Until Elements Are Visible
    ...    ${DOWNLOADS HEADER}
    ...    ${WINDOWS TAB}
    ...    ${LINUX TAB}
    ...    ${MAC OS TAB}
    ...    ${ARM TAB}
    ...    ${SDK TAB}
    ...    ${PLAY STORE DOWNLOAD BUTTON}
    ...    ${ITUNES STORE DOWNLOAD BUTTON}

    Log    Step 2: Check download link
    FOR    ${os}    IN    WINDOWS    LINUX    MAC OS
        Click Link    ${${os} TAB}
        Wait Until Element Is Visible    ${DOWNLOAD ${os} VMS TEXT}
        ${url}=   Get Element Attribute    ${DOWNLOAD ${os} VMS LINK}    href
        Check File Exists    ${url}
    END

    Log    Step 3: Check AppStore and GooglePlay buttons
    ${url}=   Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
    Should Be Equal As Strings    ${url}    ${ITUNES STORE LINK}

    ${url}=   Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
    Should Be Equal As Strings    ${url}    ${PLAY STORE LINK}

Download History
    [Tags]    C81199    pages
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    CLick Link    ${DOWNLOAD LINK}
    Wait Until Element Is Not Visible    ${RELEASE HISTORY BUTTON}
    Log In    ${email pages}    ${password}
    Wait Until Element Is Visible    ${RELEASE HISTORY BUTTON}
    Click Link    ${RELEASE HISTORY BUTTON}
    Wait Until Location Is    ${ENV}/downloads/releases
    Wait Until Elements Are Visible
    ...    ${RELEASE NOTES HEADER}
    ...    ${PATCHES TAB}
    ...    ${RELEASES TAB}
    ...    ${BETAS TAB}
    ${url}=   Get Element Attribute    //li[contains(text(), "Ubuntu x64 - Client installer")]/a    href
    Run keyword and continue on failure    Check File Exists    ${url}
    Click Link    ${PATCHES TAB}
    ${url}=   Get Element Attribute    //li[contains(text(), "Windows x64 - Client & Server")]/a    href
    Run keyword and continue on failure    Check File Exists    ${url}
    Click Link    ${BETAS TAB}
    ${url}=   Get Element Attribute    //li[contains(text(), "Mac OS - Client installer")]/a    href
    Run keyword and continue on failure    Check File Exists    ${url}

Terms
    [Tags]    C30824    pages
    Wait Until Element Is Visible    ${FOOTER TERMS LINK}
    ${terms url}=   Get Element Attribute    ${FOOTER TERMS LINK}    href
    Should Contain    ${terms url}    eula

Support
    [Tags]    C30823    pages
    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    ${support url}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    href
    Should Be Equal As Strings    ${support url}    https://support.networkoptix.com/
    ${support target}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    target
    Should Be Equal As Strings    ${support target}    _blank

Privacy
    [Tags]    C34452    pages
    Wait Until Element Is Visible    ${FOOTER PRIVACY LINK}
    ${privacy url}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    href
    Should Contain    ${privacy url}    www.networkoptix.com/privacy-policy
    ${privacy target}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    target
    Should Be Equal As Strings    ${privacy target}    _blank

Integrations
    [Tags]    C57508    pages
    ${is enabled}=   Integration Store is Enabled    ${auth}

    Run keyword If    ${is enabled}==${True}    Run Keywords
    ...    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    ...    AND    Click Link    ${FOOTER INTEGRATIONS LINK}
    ...    AND    Wait Until Location Contains    /integrations
    ...    AND    Wait Until Elements Are Visible
                  ...    ${LOGO IMG}
                  ...    ${INTEGRATIONS SEARCH}
                  ...    ${INTEGRATIONS SEARCH FILTER}
                  ...    ${INTEGRATIONS CATALOG}

Supported Devices
    [Tags]    C57509    pages
    Wait Until Element Is Visible    ${FOOTER SUPPORTED DEVICES LINK}
    Click Link    ${FOOTER SUPPORTED DEVICES LINK}
    Wait Until Location Contains    ipvd
    Wait Until Elements Are Visible
    ...    ${LOGO IMG}
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    ...    ${IPVD LANDING PAGE TEXT}
    ...    ${IPVD SUBMIT A REQUEST}
