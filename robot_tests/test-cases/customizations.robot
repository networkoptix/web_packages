*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Teardown     customizations-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded    Customizations

*** Test Cases ***
1. Verify List of Available Languages
    [Tags]    C43008
    ${dict} =    Get Lang List
    @{CUST LANGUAGE LIST} =    Get Dictionary Keys    ${dict}       
    Wait Until Element is Visible    ${LANGUAGE DROPDOWN}
    Click Element    ${LANGUAGE DROPDOWN}    
    FOR    ${lang}    IN    @{CUST LANGUAGE LIST}
        Wait Until Element is Visible    //header//nx-header-language-select//span[@lang='${lang}']
    END
    
2. Verify Default language for Cloud Portal
    [Tags]    C43009
    Run Keyword Unless     '${LANGUAGE}' != 'en_US'    Wait Until Element is Visible    ${LANGUAGE DROPDOWN}/span[@lang='${DEFAULT LANGUAGE}']
    
3. Verify About Product Name
    [Tags]    C43010
    Log    Step 1 
    Wait Until Element is Visible    ${WELCOME CAPTION}
    Element Text Should Be    ${WELCOME CAPTION}    ${PRODUCT NAME}
    Wait Until Element is Visible    ${FOOTER ABOUT LINK}
    Element Text Should Be    ${FOOTER ABOUT LINK}    ${ABOUT}
    Log    Step 2
    Click Link    ${FOOTER ABOUT LINK}
    Wait Until Location Is    ${ENV}${ABOUT URL}
          
4. Verify Download VMS Name
    [Tags]    C43015
    Log    Step 1 
    Wait Until Element is Visible    ${WELCOME CAPTION}
    Element Text Should Be    ${WELCOME CAPTION}    ${PRODUCT NAME}
    Wait Until Element is Visible    ${FOOTER ABOUT LINK}
    Element Text Should Be    ${DOWNLOAD LINK}      ${DOWNLOAD TITLE TEXT}

    Log    Step 2
    Click Link    ${DOWNLOAD LINK}
    ${os}=   Get OS
    ${os}    Convert To Lowercase    ${os}
    Wait Until Location Is    ${url}/download/${os}
    Wait Until Element is Visible    ${DOWNLOAD VMS NAME}
    ${link url} =    Get Element Attribute    ${DOWNLOAD VMS NAME}/ancestor::a    href
    ${version} =    Get Text    ${DOWNLOAD VERSION NUMBER} 
    Should Contain    ${link url}    ${os}
    Should Contain    ${link url}    ${version}

    Log    Step 3
    Click Link    ${WHATS NEW LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW    
    Wait Until Location Is    ${RELEASE NOTES URL}

    ${RELEASE NOTES LATEST}=   Replace String    ${RELEASE NOTES LATEST}    %version%    ${version}
    Wait Until Element is Visible    ${RELEASE NOTES LATEST}
    Close Window

    Log    Step 4
    Switch Window    MAIN    
    ${itunes url} =    Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
    ${play store url} =    Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
    Should Be Equal   ${itunes url}    ${ITUNES STORE LINK}      
    Should Be Equal   ${play store url}    ${PLAY STORE LINK}  
    
5. Verify Support Page
    [Tags]    C43017
    Wait Until Element is Visible    ${FOOTER SUPPORT LINK}
    Click Link    ${FOOTER SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    ${SUPPORT URL} =    Get Substring    ${SUPPORT URL}     6
    Wait Until Location Contains   ${SUPPORT URL}    
    Close Window
    Switch Window    MAIN
    
6. Verify Terms Page
    [Tags]    C43018
    Wait Until Element is Visible    ${FOOTER TERMS LINK} 
    Click Link    ${FOOTER TERMS LINK}
    Page Should Contain    ${COMPANY}

7. Verify Privacy Page
    [Tags]    C43019
    Wait Until Element is Visible    ${FOOTER PRIVACY LINK}
    Click Link    ${FOOTER PRIVACY LINK}
    Wait Until Number Of Tabs Are Open    2
    Switch Window    NEW
    Wait Until Location Is    ${PRIVACY POLICY URL FULL}
    Close Window
    Switch Window    MAIN
        
8. Verify Copyrights
    [Tags]    C43020
    Wait Until Element is Visible    ${FOOTER COPYRIGHT LINK}
    ${link} =    Get Element Attribute     ${FOOTER COPYRIGHT LINK}    href
    Should Be Equal    ${link}    ${COPYRIGHT URL}            
    
9. Verify 503 page
    [Tags]    C43022
    Go To    ${503 URL}
    Page Should Contain    ${PRODUCT NAME}    
    Page Should Contain    ${VMS_NAME}
