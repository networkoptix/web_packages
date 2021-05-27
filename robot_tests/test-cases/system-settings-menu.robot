*** Settings ***
Resource          ../resource.robot
Suite Setup       System Settings Menu Suite Setup
Test Setup        Restart
#Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
#Suite Teardown    Close All Browsers
Suite Teardown    System Settings Menu Suite Tear Down
Force Tags        system    left-menu    threaded

*** Variables ***
${email}                ${EMAIL OWNER}
${password}             ${BASE PASSWORD}
@{cloud auth}           ${EMAIL OWNER}    ${BASE PASSWORD}
${url}                  ${ENV}
${impossible search}    velociraptor
${nothing found}        Nothing found
${simple criteria}      s
${and criteria}         s a
${or criteria}          s|a

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    Log in to user and system    ${owner}      ${server0['full id']}
    @{local users} =   Reset Local Users    ${auth}    https://${QA BURBANK IP}:${server0['port']}

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
    FOR    ${user email}   ${user role}    IN ZIP   ${AUTO TESTS USERS.keys()}     ${AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${cloud system id}    ${user role}    ${user email}
    END
    Open Browser and go to URL    ${url}
    
System Settings Menu Suite Setup
    FOR    ${account}    IN    owner    viewer    adv viewer    live viewer    not owner    admin    custom
        ${random email} =    Register and activate account with random email    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${BASE PASSWORD}
        Set Suite Variable    ${${account}}          ${random email}
    END

    @{system names} =    Create List    
    ...    ${AUTO TESTS}
    ...    ${AUTO TESTS 2}
    ...    Auto Tests 3
       
    @{auth}=    Create List    ${owner}    ${password}
    Set Suite Variable    ${auth}    ${auth}   
     
    ${random} =	   Evaluate	    random.randint(0, sys.maxsize)
    Set Suite Variable     ${random}    ${random}
    
    @{server auth}=   Create List    admin    qweasd 123
    
    FOR    ${n}    IN RANGE    3
        ${server} =    Create Docker Server    system-menu${n}-${random}    VMS=new
        Set Suite Variable    ${server${n}}    ${server}
        Sleep     10
        Setup Local System    https://${QA BURBANK IP}:${server['port']}    ${BASE PASSWORD}    ${system names[${n}]}
        ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${server['port']}    ${system names[${n}]}    ${owner}    ${BASE PASSWORD}
        Set To Dictionary    ${server${n}}    full id    ${sysId}

        Sleep    10
    END
    
    ${SUITE AUTO TESTS USERS} =    Create Dictionary
    ...    ${viewer}=viewer
    ...    ${adv viewer}=advancedViewer
    ...    ${live viewer}=liveViewer
    ...    ${not owner}=viewer
    ...    ${admin}=cloudAdmin
    ...    ${custom}=custom

    Set Suite Variable    ${SUITE AUTO TESTS USERS}    ${SUITE AUTO TESTS USERS} 
    
    FOR    ${user email}   ${user role}    IN ZIP   ${SUITE AUTO TESTS USERS.keys()}     ${SUITE AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${server0['full id']}    ${user role}    ${user email}    ${auth}
    END
    
    Open Browser and go to URL    ${url}
    Log in to user and system    ${owner}      ${server0['full id']}
    
    FOR    ${system}    IN    ${server0['full id']}    ${server1['full id']}    ${server2['full id']}
        Go To    ${ENV}/systems/${system}
        Wait Until Element is Visible    ${SERVERS LINK}
        Click Link    ${SERVERS LINK}
        Verify on Servers Page    timeout=120
    END
    
    Merge Systems Local    ${server auth}    ${server auth}    http://10.1.5.238:${server0['port']}    http://10.1.5.238:${server1['port']}
    Go To    ${ENV}/systems/${server0['full id']}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=150
    Merge Systems Local    ${server auth}    ${server auth}    http://10.1.5.238:${server0['port']}    http://10.1.5.238:${server2['port']}
    Go To    ${ENV}/systems/${server0['full id']}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=150
    
System Settings Menu Suite Tear Down  
    Disconnect Server via API    ${auth}    ${server0['full id']}    ${password}    ${owner}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop system-menu0-${random} system-menu1-${random} system-menu2-${random}
    ${results}    Execute Command    docker container rm system-menu0-${random} system-menu1-${random} system-menu2-${random}
    Close Connection
    Close All Browsers

*** Test Cases ***
Should login as "viewer" and should have no ability to "search" in left menu
    Common Restart Logout    ${url}
    Log in to user and system    ${viewer}      ${server0['full id']}
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Page Does Not Contain Element    ${LEFT MENU SEARCH INPUT}
    
Should have selected LEVEL-1 node (check specs)
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Page Contains Element    ${LEFT MENU LEVEL1 ADMIN}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       font-size           ${MENU L1 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-left        ${MENU L1 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-right       ${MENU L1 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ADMIN}       font-family         ${FONT MEDIUM}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ICON}        color               ${COLOR DARK9 RGB}

Should have LEVEL-3 node (check specs)
    Wait Until Page Contains Element            ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 USERS}       background-color    ${COLOR ALIGHT3 RGB}
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR ALIGHT2 RGB}

Should have LEVEL-3 selected node (check specs)
    Go To Users List
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Page Contains Element    ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       font-size           ${MENU L3 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-left        ${MENU L3 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-right       ${MENU L3 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL3 USER1}       font-family         ${FONT MEDIUM}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

Should have LEVEL-3 selected node (check specs - hover) 
    Go To Users List
    Wait Until Page Contains Element            ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

Should have LEVEL-3 not selected node (check specs)
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

Should have LEVEL-3 not selected node (check specs - hover)
    Go To Users List
    Wait Until Page Contains Element            ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL3 USER2}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT6 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

Should have search component
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU SEARCH INPUT}

Should have search component (check specs)
    Go To Users List
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR TRANSPARENT RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       height              ${SEARCH HEIGHT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       font-size           ${SEARCH FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-left        ${SEARCH PLEFT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-right       ${SEARCH PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU SEARCH INPUT}       font-family         ${FONT REGULAR}

Shoud allow search input chars
    Go To Users List
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}

Should have button CLEAR for search
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Page Contains Element    ${LEFT MENU SEARCH CLEAR}
    Wait Until Element Has Style        ${LEFT MENU SEARCH CLEAR}       height              ${SEARCH HEIGHT}

Should clear search input
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}
    Textfield Should Contain            ${LEFT MENU SEARCH INPUT}       ${EMPTY}

Should display Nothing found
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${impossible search}
    ${count}=    Get Element Count      ${LEFT MENU}/div[contains(@class,'nx-menu')]/div
    Should Be True  ${count} == 1
    Element Text Should Be              ${LEFT MENU NO RESULT}          ${nothing found}    ignore_case=True
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should hide menu buttons on search
    Wait Until Page Contains Element            ${LEFT MENU}  
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Page Contains Element    ${LEFT MENU BUTTONS}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Page Does Not Contain Element    ${LEFT MENU BUTTONS}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should perform search with single criteria
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    ${matches} =    Get WebElements     ${LEFT MENU SEARCH MATCHES}
    FOR    ${match}    IN    @{matches}
        ${text} =    Get Text    ${match}
        Run Keyword Unless    '${text}' == '${EMPTY}'  
        ...    Should Be Equal As Strings    ${text}    ${simple criteria}    ignore_case=True
    END

Should perform search with 'AND' criteria
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${and criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Check if Match AND Criteria         ${LEFT MENU MATCHES CONTENT}    ${and criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should perform search with 'OR' criteria
    Wait Until Page Contains Element            ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Check if Match OR Criteria          ${LEFT MENU MATCHES CONTENT}    ${or criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should navigate with up/down arrows when search criteria is entered
    Wait Until Page Contains Element            ${LEFT MENU}
    Click Element                       ${LEFT MENU LEVEL1 ADMIN}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Log     Fist item should be selected (by default)
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     color               ${COLOR LIGHT1 RGB}
    Log     Keyboard novigation to next item
    Press keys                          NONE                            ARROW_DOWN
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT8 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR DARK9 RGB}
    Log     Select next item
    Press keys                          NONE                            ENTER
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR LIGHT1 RGB}
    Log     Keyboard focus should move to next item
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     background-color    ${COLOR LIGHT8 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     color               ${COLOR DARK9 RGB}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

# Should show system settings with left menu with 18 systems
    # [Tags]    system settings    left_menu    threaded
    # Log in to user and system    ${owner large}    ${server0['full id']}
    # # @{local users} =    Local User Start   ${owner large}    ${auth}    https://${QA BURBANK IP}:${port0}    ${server0['full id']}
    # @{local users} =   Reset Local Users    ${auth}    https://${QA BURBANK IP}:${port0} 
    # Wait Until Page Contains Element    ${LEFT MENU}
    # Verify Menu Developers Test
    # Verify Number of Systems in Menu Correct    15
    # Click Button    ${SYSTEMS DROPDOWN}
    # Wait Until Element Is Visible    //*[contains(text(),"+ 3 Systems")]
    # Click Element   //*[contains(text(),"+ 3 Systems")]
    # Wait Until Elements Are Visible
    # ...    ${SYSTEMS SEARCH INPUT}
    # ...    ${ACCOUNT DROPDOWN}
    # ...    ${SYSTEMS TILE}
    # ...    ${AUTO TESTS TITLE}
    # ...    ${AUTO TESTS USER}
    # ...    ${AUTO TESTS OPEN NX}
    # Verify Number of System Tiles Correct    18    
    # Click Element   //*[text()="Auto Tests")]
    # Wait Until Element Is Visible    ${EDITABLE TITLE}
    # Navigate to All The Systems and Verify
    

# Should show system settings with left menu with 5 systems
    # [Tags]    system settings    left_menu    threaded
    # Log in to user and system    ${owner middle}    ${sysId18}
    # # @{local users} =    Local User Start   ${owner middle}    ${auth middle}    https://${QA BURBANK IP}:${port18}    ${sysId18}
    # @{local users} =   Reset Local Users    ${auth middle}    https://${QA BURBANK IP}:${port18}
    # Wait Until Page Contains Element    ${LEFT MENU}
    # Verify Menu Developers Test
    # Verify Number of Systems in Menu Correct    5
    # Navigate to All The Systems and Verify
    
# Should show system settings with left menu with 1 system
    # [Tags]    system settings    left_menu    threaded
    # Log in to user and system    ${owner one}    ${sysId23}
    # # @{local users} =    Local User Start   ${owner one}     ${auth one}    https://${QA BURBANK IP}:${port23}    ${sysId23}
    # @{local users} =   Reset Local Users    ${auth one}    https://${QA BURBANK IP}:${port23}
    # Wait Until Page Contains Element    ${LEFT MENU}
    # Verify Menu Developers Test
    # Verify Number of Systems in Menu Correct    0
    # Navigate to All The Systems and Verify
