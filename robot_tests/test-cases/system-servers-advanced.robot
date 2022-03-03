*** Settings ***
Resource          ../resource.robot
Suite Setup       Server Advanced Settings Suite Setup
Test Setup        Advanced Server Settings Test Setup
Test Teardown     Advanced Server Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Server Advanced Settings Suite Teardown
Force Tags        advanced server


*** Test Cases ***
1. Advanced server settings availability
    [Tags]    C76558    threaded    cloud    webadmin
    Log    Step 1
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 2
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 3
    Log Out
    
    Run Keyword If    '''${mode}'''=='''cloud'''    Log in to system    ${server}    ${server}[cloud users][cloudAdmin]    
    ...    ELSE    Log in to system    ${server}    ${server}[local users][cloudAdmin][login]    validate=${True}
    Wait Until Element is Visible    ${SERVERS LINK}
    Sleep    1
    Click Element    ${SERVERS LINK}
    Verify on Servers Page
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    ${location} =    Get Location
    #sleep    5
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 4
    Log Out
    Run Keyword If    '''${mode}'''=='''cloud'''    Log in to system    ${server}    ${server}[cloud users][advancedViewer]    validate=${True}
    ...    ELSE    Log in to system    ${server}    ${server}[local users][advancedViewer][login]    validate=${True}
    sleep    5
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}


2. "Hide Advanced Settings" button is available and functional
    [Tags]    C76571    threaded    cloud    webadmin
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Click Element    ${HIDE ADVANCED SETTINGS BUTTON}
    Wait Until Elements Are Not Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}

3. Toggle switch functionality
    [Tags]    C76572    threaded    cloud    webadmin
    ${location} =    Get Location
    ##sleep    5
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Log    Step 1
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    false
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Capture Element Screenshot    ${STORAGE ENABLE SWITCH STYLE}
    # new color being used only for this line below - with your eyes the difference is not discernable
    Element Style Should Be    ${STORAGE ENABLE SWITCH STYLE}    background-color    ${SERVER ADVANCED DISABLED COLOR}
    Click Button     ${STORAGE CANCEL BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be   ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH ENABLED COLOR}
    Log    Step 2
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    false
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Click Element    ${STORAGE SAVE BUTTON}
    Wait Until Element Is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Capture Element Screenshot    ${STORAGE ENABLE SWITCH STYLE}
    Wait Until Element Has Style    ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH DISABLED COLOR}
    Log    Step 3
    Set Checkbox Value   ${STORAGE ENABLE SWITCH}    true
    Wait Until Elements Are Visible    ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Click Element   ${STORAGE SAVE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    Element Style Should Be   ${STORAGE ENABLE SWITCH STYLE}    background-color    ${STORAGE SWITCH ENABLED COLOR}
    Press Keys    None    ESC

4. Reserved space dropdown menu functionality
    [Tags]    C76576    threaded    cloud    webadmin
    ${location} =    Get Location
    ##sleep    5
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
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
    Wait Until Element Is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
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
    Wait Until Element Is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    ${free space} =    Get Text    ${STORAGE FREE SPACE VALUE}
    ${free space} =    Get Substring    ${free space}    0    1
    ${bytes} =    Get Text    ${RESERVED DROPDOWN SELECTED}
    Should Be Equal    '${free space}'     '${min}'
    ${max plus} =    Evaluate    ${max}1
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
    Wait Until Element Is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Wait Until Elements Are Not Visible     ${STORAGE SAVE BUTTON}    ${STORAGE CANCEL BUTTON}
    ${bytes 2} =    Get Text    ${RESERVED DROPDOWN SELECTED}
    ${times 1024} =    Evaluate    round(${max} * 1024, 3)
    ${divide 1024} =    Evaluate    round(${max} / 1024, 3)

    ${times 1024} =    Convert To String    ${times 1024}
    ${divide 1024} =    Convert To String    ${divide 1024}
    ${value} =    Get Element Attribute   ${RESERVED SPACE INPUT}    value
    Run Keyword If    '${bytes 2}' == 'TB'   Should Be Equal    ${value}    ${times 1024}
    ...    ELSE IF    '${bytes 2}' == 'GB'   Should Be Equal    ${value}    ${divide 1024}

5. Log settings functionality
    [Tags]    C76573    threaded    cloud    webadmin
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}
    Log    The following will test every log level option for each one of the (5) dropdowns
    FOR    ${dropdown}    IN    @{LOGLEVEL IDS}
       Wait Until Elements Are Visible    @{LOG SETTINGS BLOCK}
       ${id} =    Get Element Attribute    ${dropdown}    id
       ${original} =    Get Text    ${dropdown}/span
       ${original} =    Fetch From Left    ${original}    (
       Test Every Loglevel Option    ${dropdown}    ${id}    https://${QA BURBANK IP}:${server['port']}
       ${current} =    Get Text    ${dropdown}/span
       ${current} =    Fetch From Left    ${original}    (
       IF    '''${original}''' != '''${current}'''
           Set Log Level Option    ${dropdown}    ${id}    ${original}
       END
       Reload Page
    END

6. Advanced server settings for offline system
    [Tags]    C76559    threaded    cloud
    Log    Preconditions
    Verify on Servers Page
    Stop Docker Server    ${server}[id]
    ${location} =    Get Location

    Log    Step 1
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible    ${PLACEHOLDER NO SETTINGS}    ${THIS PAGE CANNOT BE LOADED}
    Elements Should Not Be Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}

    Log    Step 2: make sure settings are back after the server is back online
    Start Docker Server    ${server}[id]
    Wait Until Element Is Not Visible    ${THIS PAGE CANNOT BE LOADED}    timeout=300
    Wait Until Element is Visible    ${SERVERS LINK}    60
    Sleep    1
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Go To    ${location}${ADVANCED SETTINGS}
    Reload Page
    Wait Until Elements Are Visible
    ...    @{ADVANCED SETTINGS ALERT BAR}
    ...    @{STORAGE LOCATIONS BLOCK ITEMS}
    ...    @{LOG SETTINGS BLOCK}