*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup    Pages Suite Setup
Suite Teardown   Skip    Customization settings on CI hosts are broken

*** Keywords ***
Pages Suite Setup
    Skip    Customization settings on CI hosts are broken
    Open browser and go to url    ${ENV}    False    False

*** Test Cases ***
#About
#    [Tags]    C30820    pages
#    Wait Until Element Is Visible    ${FOOTER ABOUT LINK}
#    Click Link    ${FOOTER ABOUT LINK}
#    Wait Until Location Contains    /content/about
#    Wait Until Elements Are Visible
#    ...    ${LOGO ICON}
#    ...    ${WELCOME CAPTION}
#    ...    //landing-display-component
#    ...    ${CREATE ACCOUNT BODY}
#
#Download Page
#    [Tags]    C30821    pages
#    Log    Step 1: Click on Downloads link, log in and validate Downloads page
#    Wait Until Element Is Visible    ${DOWNLOAD LINK}
#    CLick Link    ${DOWNLOAD LINK}
#
#    ${os}=   Get OS
#    ${os}=   Convert To Lowercase    ${os}
#    Location Should Contain    download/${os}
#    Wait Until Elements Are Visible
#    ...    ${DOWNLOADS HEADER}
#    ...    ${WINDOWS TAB}
#    ...    ${LINUX TAB}
#    ...    ${MAC OS TAB}
#    ...    ${ARM TAB}
#    ...    ${SDK TAB}
#    ...    ${PLAY STORE DOWNLOAD BUTTON}
#    ...    ${ITUNES STORE DOWNLOAD BUTTON}
#
#    Log    Step 2: Check download link
#    FOR    ${os}    IN    WINDOWS    LINUX    MAC OS
#        Click Link    ${${os} TAB}
#        Wait Until Element Is Visible    ${DOWNLOAD ${os} VMS TEXT}
#        ${url}=   Get Element Attribute    ${DOWNLOAD ${os} VMS LINK}    href
#        Check File Exists    ${url}
#    END
#
#    Log    Step 3: Check AppStore and GooglePlay buttons
#    ${url}=   Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
#    Should Be Equal As Strings    ${url}    ${ITUNES STORE LINK}
#
#    ${url}=   Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
#    Should Be Equal As Strings    ${url}    ${PLAY STORE LINK}

#Terms
#    [Tags]    C30824    pages
#    Wait Until Element Is Visible    ${FOOTER TERMS LINK}
#    ${terms url}=   Get Element Attribute    ${FOOTER TERMS LINK}    href
#    Should Contain    ${terms url}    eula
#
#Support
#    [Tags]    C30823    pages
#    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
#    ${support url}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    href
#    Should Be Equal As Strings    ${support url}    https://support.networkoptix.com/
#    ${support target}=   Get Element Attribute    ${FOOTER SUPPORT LINK}    target
#    Should Be Equal As Strings    ${support target}    _blank
#
#Privacy
#    [Tags]    C34452    pages
#    Wait Until Element Is Visible    ${FOOTER PRIVACY LINK}
#    ${privacy url}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    href
#    Should Contain    ${privacy url}    www.networkoptix.com/privacy-policy
#    ${privacy target}=   Get Element Attribute    ${FOOTER PRIVACY LINK}    target
#    Should Be Equal As Strings    ${privacy target}    _blank
