*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Suite Teardown    Close All Browsers
Force Tags        Threaded    Customizations

*** Variables ***
${email}             ${EMAIL OWNER}
${password}          ${BASE PASSWORD}
${url}               ${ENV}
${503 URL}           ${url}/static/503.html

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
*** Test Cases ***
Verify List of Available Languages
    [Tags]    C43008
    Wait Until Element is Visible    ${LANGUAGE DROPDOWN}
    Click Element    ${LANGUAGE DROPDOWN}
    ${dict} =    Get Lang List
    @{CUST LANGUAGE LIST} =    Get Dictionary Keys    ${dict}        
    FOR    ${lang}    IN    @{CUST LANGUAGE LIST}
        Wait Until Element is Visible    //span[@lang='${lang}']
    END
    
Verify Default language for Cloud Portal
    [Tags]    C43009
    Wait Until Element is Visible    ${LANGUAGE DROPDOWN}/span[@lang='${DEFAULT LANGUAGE}']
    
Verify About Product Name
    [Tags]    C43010
    Log    Step 1 
    Wait Until Element is Visible    ${WELCOME CAPTION}
    Element Text Should Be    ${WELCOME CAPTION}    ${PRODUCT NAME}
    Wait Until Element is Visible    ${FOOTER ABOUT LINK}
    Element Text Should Be    ${FOOTER ABOUT LINK}    About ${PRODUCT NAME}
    Log    Step 2
    Click Link    ${FOOTER ABOUT LINK}
    Wait Until Location Is    ${ENV}${ABOUT URL}
          
Verify Download VMS Name
    [Tags]    C43015
    Log    Step 1 
    Wait Until Element is Visible    ${WELCOME CAPTION}
    Element Text Should Be    ${WELCOME CAPTION}    ${PRODUCT NAME}
    Wait Until Element is Visible    ${FOOTER ABOUT LINK}
    Element Text Should Be    ${DOWNLOAD LINK}      Download ${VMS_NAME}         
    Log    Step 2
    Click Link    ${DOWNLOAD LINK}
    Log In    ${email}    ${password}    button=None
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
    @{tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Is    ${RELEASE NOTES URL}
    Log    With Hanwha The wollowing keyword only passes in headless:false mode. 
    Run Keyword and Ignore Error   Wait Until Element is Visible    ${RELEASE NOTES LATEST}'${version}']
    Close Window
    Log    Step 4
    Select Window    @{tabs}[0]
    ${itunes url} =    Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
    ${play store url} =    Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
    Should Be Equal   ${itunes url}    ${ITUNES STORE LINK}      
    Should Be Equal   ${play store url}    ${PLAY STORE LINK}  
    
Verify Support Page
    [Tags]    C43017
    Wait Until Element is Visible    ${FOOTER SUPPORT LINK}
    Click Link    ${FOOTER SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    @{tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    ${SUPPORT URL} =    Get Substring    ${SUPPORT URL}     6
    Wait Until Location Contains   ${SUPPORT URL}    
    Close Window
    Select Window    @{tabs}[0]
    
Verify Terms Page
    [Tags]    C43018
    Wait Until Element is Visible    ${FOOTER TERMS LINK} 
    Click Link    ${FOOTER TERMS LINK}
    Page Should Contain    ${COMPANY}

Verify Privacy Page
    [Tags]    C43019
    Wait Until Element is Visible    ${FOOTER PRIVACY LINK}
    Click Link    ${FOOTER PRIVACY LINK}
    Wait Until Number Of Tabs Are Open    2
    @{tabs}=   Get Window Handles
    Select Window    @{tabs}[1]
    Wait Until Location Is    ${PRIVACY POLICY URL FULL}
    Close Window
    Select Window    @{tabs}[0]
        
Verify Copyrights
    [Tags]    C43020
    Wait Until Element is Visible    ${FOOTER COPYRIGHT LINK}
    ${link} =    Get Element Attribute     ${FOOTER COPYRIGHT LINK}    href
    Should Be Equal    ${link}    ${COPYRIGHT URL}            
    
Verify 503 page
    [Tags]    C43022
    Go To    ${503 URL}
    Page Should Contain    ${PRODUCT NAME}    
    Page Should Contain    ${VMS_NAME}