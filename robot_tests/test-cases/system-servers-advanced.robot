*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Server Settings Test Setup    ${EMAIL OWNER}    ${ADVANCED SETTINGS SYSTEM ID}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Close All Browsers
Force Tags        advanced server

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Keywords ***
Server Settings Test Setup
    [Arguments]    ${email}    ${system id}
    Log in to user and system    ${email}    ${system id}/servers

*** Test Cases ***
Advanced server settings availability
    [Tags]    C76558    threaded
    Log    Step 1
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 2
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 3
    Log Out
    Log in to user and system    ${EMAIL ADMIN}   ${ADVANCED SETTINGS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    ${location} =    Get Location    
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 4
    Log Out
    Log in to user and system    ${EMAIL ADV VIEWER}   ${ADVANCED SETTINGS SYSTEM ID}
    Elements Should Not Be Visible    ${SERVERS LINK}
    Go To    ${location}${ADVANCED SETTINGS}
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}

Advanced server settings for offline system
    [Tags]    C76559    threaded
    Log    Preconditions
    Log Out
    Log in to user and system    ${email}    ${AUTOTESTS 2 SERVER OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    ${location} =    Get Location
    Log    Step 1
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Element is Visible    ${PLACEHOLDER NO SETTINGS}
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}

"Hide Advanced Settings" button is available and functional
    [Tags]    C76571    threaded
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Click Element    ${HIDE ADVANCED SETTINGS BUTTON}
    Wait Until Elements Are Not Visible 
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}

Toggle switch functionality
    [Tags]    C76572    threaded   
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 1
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    false
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be    ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH DISABLED COLOR} 
    Click Button     ${STORAGE CANCEL BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be   ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH ENABLED COLOR}
    Log    Step 2
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    false   
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Click Element    ${STORAGE SAVE BUTTON}
    Wait Until Element is Visible    ${ADVANCED SETTINGS CLOSE BUTTON}
    Click Button    ${ADVANCED SETTINGS CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be   ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH DISABLED COLOR}
    Log    Step 3
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    true   
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Click Element   ${STORAGE SAVE BUTTON}
    Wait Until Element is Visible    ${ADVANCED SETTINGS CLOSE BUTTON}
    Click Button    ${ADVANCED SETTINGS CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be   ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH ENABLED COLOR}
    
Reserved space dropdown menu functionality
    [Tags]    C76576    threaded 
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    
    Log    Step 1
    Element Attribute Value Should Be    ${RESERVED SPACE INPUT}    type    number        
    
    Log    Step 2 (this will verify that max and min are respected, but can't click on arrows)
    ${min} =    Get Element Attribute   ${RESERVED SPACE INPUT}    min
    Clear Element Text     ${RESERVED SPACE INPUT} 
    Input Text    ${RESERVED SPACE INPUT}    0
    Click Element     ${STORAGE FREE SPACE VALUE}    #to shift focus
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Sleep    1
    Click Element    ${STORAGE SAVE BUTTON}
    Wait Until Element is Visible    ${ADVANCED SETTINGS CLOSE BUTTON}
    Click Button    ${ADVANCED SETTINGS CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Attribute Value Should Be    ${RESERVED SPACE INPUT}    value    0
    ${max} =    Get Element Attribute   ${RESERVED SPACE INPUT}    max
    ${free space} =    Get Text    ${STORAGE FREE SPACE VALUE}
    ${bytes} =    Get Text    ${RESERVED DROPDOWN SELECTED}
    Should Be Equal    '${free space}'     '${max} ${bytes}'     
    
    Log    Step 3 and 4
    Clear Element Text     ${RESERVED SPACE INPUT} 
    Input Text    ${RESERVED SPACE INPUT}    ${max}
    Click Element     ${STORAGE FREE SPACE VALUE}    #to shift focus
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Sleep    1
    Click Element    ${STORAGE SAVE BUTTON}
    Wait Until Element is Visible    ${ADVANCED SETTINGS CLOSE BUTTON}
    Click Button    ${ADVANCED SETTINGS CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    ${free space} =    Get Text    ${STORAGE FREE SPACE VALUE}
    ${free space} =    Get Substring    ${free space}    0    1
    ${bytes} =    Get Text    ${RESERVED DROPDOWN SELECTED}
    Should Be Equal    '${free space}'     '${min}'
    ${max plus} =    Evaluate    ${max} + 1
    Clear Element Text     ${RESERVED SPACE INPUT} 
    Input Text    ${RESERVED SPACE INPUT}    ${max plus}
    Click Element     ${STORAGE FREE SPACE VALUE}    #to shift focus
    Sleep    1
    Element Attribute Value Should Be    ${RESERVED SPACE INPUT}    value    ${max}  

    Log    Step 5 & 6
    Click Element    ${RESERVED SPACE DROPDOWN}
    Run Keyword If    '${bytes}' == 'GB'    Click Element    ${RESERVED DROPDOWN OPTION TB}
    ...    ELSE IF    '${bytes}' == 'TB'    Click Element    ${RESERVED DROPDOWN OPTION GB}
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Sleep    1
    Click Element    ${STORAGE SAVE BUTTON}
    Wait Until Element is Visible    ${ADVANCED SETTINGS CLOSE BUTTON}
    Click Button    ${ADVANCED SETTINGS CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    ${bytes 2} =    Get Text    ${RESERVED DROPDOWN SELECTED}
    ${times 1000} =    Evaluate    ${max} * 1000
    ${divide 1000} =    Evaluate    ${max} / 1000
    ${times 1000} =    Convert To String    ${times 1000}
    ${divide 1000} =    Convert To String    ${divide 1000}
    ${value} =    Get Element Attribute   ${RESERVED SPACE INPUT}    value
    Run Keyword If    '${bytes 2}' == 'TB'   Should Be Equal    ${value}    ${times 1000}
    ...    ELSE IF    '${bytes 2}' == 'GB'   Should Be Equal    ${value}    ${divide 1000}
    
Log settings functionality
    [Tags]    C76573    threaded    
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible     
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK}
    ...    @{LOG SETTINGS BLOCK}
    Log    The following will test every log level option for each one of the (5) dropdowns    
    FOR    ${dropdown}    IN    @{LOGLEVEL IDS}
       Wait Until Elements Are Visible    @{LOG SETTINGS BLOCK}
       ${id} =    Get Element Attribute    ${dropdown}    id
       ${original} =    Get Text    ${dropdown}/span
       ${original} =    Fetch From Left    ${original}    ( 
       Test Every Loglevel Option    ${dropdown}    ${id}
       Set Log Level Option    ${dropdown}    ${id}    ${original}
       Reload Page
    END     

    