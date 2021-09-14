*** Settings ***
Resource          ../resource.robot
Suite Setup       Storage Suite Setup
#Test Setup        Server Settings Test Setup    qaburbank@gmail.com    ${AUTO TESTS SYSTEM ID}
Test Teardown     Restart
Suite Teardown    Storage Suite Teardown
Force Tags        storage

*** Variables ***
${QA BURBANK IP}     10.1.5.239
${password}    ${BASE PASSWORD}
${url}         ${ENV}
${storage string 1}    --mount type=bind,source="/home/qaburbank/disk-invalid",target=/invalid
${storage string 2}    ${EMPTY}
${camera}      D8-D4-3C-60-F0-D3
${camera url}    http://192.168.0.27/
${camera manufacturer}    Sony
${camera user}    admin
${camera password}    QAbur777$
${camera resourceId}    {a836b98b-65e2-2304-57e9-a09fc55a50a4}
${disk location}    /media/nxwitness-storages/disk1
${backup initialized}    ${FALSE}
${change focus}    //h4[contains(text(),"Storage")]
@{disk size}    160000    40000    40000    12000    12000
${networkdisk}    //${QA BURBANK IP}/networkdisk
${drives}    5

*** Keywords ***
Restart
    # ${status} =    Run Keyword And Return Status    Element Should Not Be Visible    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Common Restart Logout    ${url}
    Reset to Default Storage Config

*** Test Cases ***
Loading State of Storage Locations Block
    [Tags]    C81803    
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS PLACEHOLDER}    ${STORAGE ADD BUTTON}
    ${width}    ${height} =    Get Element Size    ${STORAGE LOCATIONS BLOCK}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be Equal As Integers    ${height}    259

Detailed Info in Storage Locations block
    [Tags]    C81534
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    Wait Until Element Is Visible    ${STORAGE INFO BUTTON}
    Click Button    ${STORAGE INFO BUTTON}
    Location Should Contain    health/storages
    Wait Until Element Is Visible    ${HM STORAGE TABLE}
    
Analytics DB Storage dropdown is not visible
    [Tags]    C81740    Analytics    
    Log in to user and system    ${server 2['owner']}     ${server 2['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element Is Not Visible    ${ANALYTICS DROPDOWN}
    
Disabling storage warnings aren't shown - Main storages
    [Tags]    C81570    mode
    [Documentation]    This test case will likely fail when run along with others in the suite. Running it by itself should garauntee empty disks
    @{disabled} =    Create List    disk3
    @{backups} =    Create List     disk1
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}
    ${files disk0} =    Verify Recorded Video Files    disk0

    Log    Step 2
    Delete Recorded Video Files    disk2
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Sleep    2
    ${files 2 disk0} =    Verify Recorded Video Files    disk2
    Log    ${files 2 disk0}
    Element Should Not Be Visible    ${RECORDING STOP WARNING}

    Log    Step 3
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}

    Log    Step 4
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk2} =    Verify Recorded Video Files    disk2
    Should Be True    ${files 3 disk2} == 0

Disabling storage warnings aren't shown - Backup storages
    [Tags]    C81571    mode
    [Documentation]    This test case will likely fail when run along with others in the suite. Running it by itself should garauntee empty disks
    @{disabled} =    Create List    disk3    disk1
    @{backups} =    Create List     disk2
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}   ${disabled}    ${backups}

    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    ${files disk0} =    Verify Recorded Video Files    disk0

    Log    Step 2
    Delete Recorded Video Files    disk2
    Wait Until Recorded Files Deleted    disk2    100
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Sleep    2
    ${files 2 disk0} =    Verify Recorded Video Files    disk2
    Log    ${files 2 disk0}
    Element Should Not Be Visible    ${RECORDING STOP WARNING}

    Log    Step 3
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}

    Log    Step 4
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk2} =    Verify Recorded Video Files    disk2
    Should Be True    ${files 3 disk2} == 0

Scrolling on small resolutions in Storage Locations block
    [Tags]    C81535
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    Verify No Horizontal Scrollbar    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table
    Set Window Size    600    1080
    Sleep    1
    Verify Horizontal Scrollbar Exists    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table
    Set Window Size    1920    1080
    Sleep    1
    Verify No Horizontal Scrollbar    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table

Alphabetical sorting in Storage Locations Table
    [Tags]    C81537
    @{menu order}    Create List
    @{sorted}        Create List
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    @{storages} =    Get WebElements    ${STORAGE ITEM}
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${menu order}    ${disk}
    END
    ${sorted} =    Set Variable    ${menu order}
    Sort List    ${sorted}
    Lists Should Be Equal    ${menu order}    ${sorted}

Enabled, disabled and inaccessible storages appearance
    [Tags]    C81540
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible
    ...    ${STORAGE LOCATIONS BLOCK}
    ...    ${STORAGE ADD BUTTON}
    ...    ${STORAGE ITEM}
    ...    ${STORAGE DISABLED INACCESSIBLE}
    ...    ${STORAGE DISABLED NOT IN USE}
    ...    ${STORAGE DISABLED RESERVED}
    ...    ${STORAGE ENABLED MAIN}
    Element Style Should Be    ${STORAGE DISABLED INACCESSIBLE}            color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${STORAGE DISABLED INACCESSIBLE ICON}       color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED INACCESSIBLE ADDRESS}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED RESERVED}                color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED RESERVED ICON}           color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED RESERVED ADDRESS}        color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED NOT IN USE ICON}         color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED NOT IN USE ADDRESS}      color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISABLED NOT IN USE}              color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE ENABLED MAIN}                     color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE ENABLED MAIN ICON}                color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE ENABLED MAIN ADDRESS}             color    ${COLOR DARK9 RGB}

Width of mode column
    [Tags]    C81555
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}    ${STORAGE DISABLED NOT IN USE}     ${STORAGE ENABLED MAIN}
    ${width}    ${height} =    Get Element Size    ${STORAGE DISABLED NOT IN USE}/ancestor::td
    Click Button    ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 2}    ${height 2} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 2}
    Click Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link     ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 3}    ${height 3} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 3}
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 4}    ${height 4} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 4}

Active Mode Lines
    [Tags]    C81557
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers

    Log    Step 1
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}    ${STORAGE DISABLED NOT IN USE}

    Log    Step 2
    Click Button    ${STORAGE ENABLED MAIN}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE DISABLED}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE DISABLED}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}

    Log    Step3
    Run Keyword and Expect Error    *    Click Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE DISABLED}/parent::a
    Run Keyword and Expect Error    *    Click Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE DISABLED}/parent::a

    Log    Step 4
    Click Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE ENABLED MAIN}

    Log    Step 5
    Click Button    ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    ${class} =    Get Element Attribute    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}    class
    Should Be Equal    ${class}    ${EMPTY}
    ${class} =    Get Element Attribute    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}    class
    Should Be Equal    ${class}    ${EMPTY}
    ${class} =    Get Element Attribute    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a    class
    Should Contain    ${class}    selected

    Log    Step 6
    Click Link    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 7
    Click Button    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click Link    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 8
    Click Button    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click Link    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 9
    Click Button    ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    ${class} =    Get Element Attribute    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}    class
    Should Be Equal    ${class}    ${EMPTY}
    ${class} =    Get Element Attribute    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}    class
    Should Be Equal    ${class}    ${EMPTY}
    ${class} =    Get Element Attribute    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a    class
    Should Contain    ${class}    selected

    Log    Step 10
    Click Link    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 11
    Click Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click Link    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 12
    Click Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click Link    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

Reserved System storage tooltip
    [Tags]    C81566
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED RESERVED}
    Mouse Over   ${STORAGE RESERVED TOOLTIP ICON}
    Wait Until Element is Visible    ${STORAGE RESERVED TOOLTIP}

Changing of reserved space is shown in the table
    [Tags]    C81569
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window
    ${reserved} =    Get Text    ${RESERVED SPACE}
    ${reserved} =    Get Substring    ${reserved}    0    2
    ${location} =    Get Location
    Go To    ${location}${ADVANCED SETTINGS}
    Wait Until Element is Visible    ${RESERVED SPACE ADVANCED}
    ${reserved advanced} =    Get Value    ${RESERVED SPACE ADVANCED}
    Should Be Equal As Strings    ${reserved}    ${reserved advanced}
    ${new reserved} =    Set Variable    5
    Input Text    ${RESERVED SPACE ADVANCED}    ${new reserved}
    Wait Until Element Is Visible    ${SAVE BUTTON}
    Click Button    ${SAVE BUTTON}
    Sleep    2
    Reload Page
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window
    ${reserved} =    Get Text    ${RESERVED SPACE}
    Should Contain  ${reserved}    5.0

No Size Tooltip when Inaccessble
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED INACCESSIBLE}
    Mouse Over    ${STORAGE INACCESSIBLE SIZE}
    Sleep    1
    Element Should Not Be Visible    ${STORAGE INACCESSIBLE SIZE}/following-sibling::ngb-popover-window

Storage Locations Table without control buttons
    [Tags]    C81572
    Log in to user and system    ${server 2['owner']}     ${server 2['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE LOCATIONS FIRST ROW}
    ${count} =    Get Element Count    ${STORAGE LOCATIONS TABLE}//th
    Should Be Equal As Integers    ${count}    3

Not able to load storage information
    [Tags]    C84518
    Log in to user and system    ${server 3['owner']}     ${server 3['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE LOCATIONS PLACEHOLDER}    ${STORAGE NOT ABLE TO LOAD}
    ${width}    ${height} =    Get Element Size    ${STORAGE LOCATIONS BLOCK}
    Should Be Equal As Integers    ${height}    259

Storages order in "Analytics DB Storage" dropdown
    [Tags]    C81757    Analytics
    @{menu order}    Create List
    @{dropdown order}    Create List
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Click Button    ${ANALYTICS DROPDOWN}
    @{storages} =    Get WebElements    //a[@tabindex="0"]/span[contains(text(),"disk")]
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${dropdown order}    ${disk}
    END
    Wait Until Element is Visible    //span[contains(text(),"disk3") and @class="ellipsis"]
    @{storages} =    Get WebElements    ${STORAGE ITEM}
    Wait Until Element is Visible    //div[contains(text(),"${INACCESSIBLE}")]/ancestor::td/preceding-sibling::td${STORAGE ITEM}
    @{remove} =    Get WebElements    //div[contains(text(),"${INACCESSIBLE}")]/ancestor::td/preceding-sibling::td${STORAGE ITEM}
    Remove Values From List    ${storages}    @{remove}
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${menu order}    ${disk}
    END 
    Lists Should Be Equal    ${menu order}    ${dropdown order}

Cancel Changing "Analytics DB Storage"
    [Tags]    C81778    Analytics
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1
    Wait Until Element Contains    ${ANALYTICS DROPDOWN}    disk0
    Log    Step 2
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Log    Step 3
    Wait Until Element is Visible     ${CANCEL BUTTON}
    Click Button    ${CANCEL BUTTON}

Successful changing Analytics DB Storage plus confirmation dialog
    [Tags]    C81779    C81775    C81776    C81777    Analytics    C81754    C81755    
    @{disabled} =    Create List    disk3
    @{backups} =    Create List    disk3
    ${normal} =    Set Selenium Speed    0.25
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    //span[contains(text(),"disk") and @class="ellipsis"]
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1 - C81779
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk0
    Log    Step 2 - C81779
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Log    Step 3 - C81779
    Wait Until Element is Visible     ${SAVE BUTTON}
    Click Button    ${SAVE BUTTON}
    Log    Step 4 - C81779
    Turn On Analytics    https://${QA BURBANK IP}:${server 1['port']}    ${value}    ${camera resourceId}
    Reload Page
    Log    C81754
    Wait Until Element is Visible with Retry    ${ANALYTICS DROPDOWN}
    Log To Console    C81754 ....... | PASS |
    Log    Step 5 - C81779
    Wait Until Analytics Data Exists    30    30    disk1    ${camera}    ${server 1['name']}
    Log To Console    C81779 ....... | PASS |
    Reload Page
    Log    C81755
    Wait Until Element is Visible with Retry    ${ANALYTICS DROPDOWN}
    Log To Console    C81755 ....... | PASS |
    # Sleep    600
    # Reload Page
    Log    Step 1 - C81775
    Wait Until Element is Visible with Retry    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains   ${ANALYTICS DROPDOWN}    disk1
    Log    Step 2 - C81775
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Wait For Analytics Move Dialog    disk2
    Wait Until Elements Are Visible
    ...    ${CHANGE ANALYTICS MODAL}
    ...    ${CS MODAL CLOSE BUTTON}
    ...    ${CS MODAL DELETE BUTTON}
    ...    ${CS MODAL KEEP BUTTON}
    ...    ${CS MODAL CANCEL BUTTON}
    ...    ${CS MODAL PARAGRAPH}
    ...    ${CS MODAL CONTACT}
    ...    ${CS MODAL SUPPORT LINK}
    ${link} =    Get Element Attribute    ${CS MODAL SUPPORT LINK}    href
    ${footer} =    Get Element Attribute   ${FOOTER SUPPORT LINK}    href
    Should Be Equal As Strings    ${link}    ${footer}
    Log    Step 3 - C81775
    Click Link    ${CS MODAL SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    ${tabs}=   Get Window Handles
    Switch Window    ${tabs}[1]
    Wait Until Location Contains    ${SUPPORT URL}
    Log    Step 4 - C81775
    Close Window
    Switch Window    ${tabs}[0]
    Wait Until Element is Visible    ${CS MODAL CLOSE BUTTON}
    Click Button    ${CS MODAL CLOSE BUTTON}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 5 - C81775
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Wait Until Elements Are Visible
    ...    ${CHANGE ANALYTICS MODAL}
    ...    ${CS MODAL CLOSE BUTTON}
    ...    ${CS MODAL DELETE BUTTON}
    ...    ${CS MODAL KEEP BUTTON}
    ...    ${CS MODAL CANCEL BUTTON}
    ...    ${CS MODAL PARAGRAPH}
    ...    ${CS MODAL CONTACT}
    ...    ${CS MODAL SUPPORT LINK}
    Log    Step 6 - C81775
    Click Button    ${CS MODAL CANCEL BUTTON}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log To Console    C81775 ....... | PASS |
    Log    Step 1,2,3 - C81776 - already done above
    Log    Step 4 - C81776
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Wait For Analytics Move Dialog    disk2
    Wait Until Elements Are Visible
    ...    ${CHANGE ANALYTICS MODAL}
    ...    ${CS MODAL CLOSE BUTTON}
    ...    ${CS MODAL DELETE BUTTON}
    ...    ${CS MODAL KEEP BUTTON}
    ...    ${CS MODAL CANCEL BUTTON}
    ...    ${CS MODAL PARAGRAPH}
    ...    ${CS MODAL CONTACT}
    ...    ${CS MODAL SUPPORT LINK}
    Log    Step 5 - C81776
    Click Button    ${CS MODAL KEEP BUTTON}
    Wait Until Element Is Not Visible     ${CHANGE ANALYTICS MODAL}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk2
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 6 - C81776
    Check Analytics Data is Present    disk2    ${camera}    ${server 1['name']}    keep=${TRUE}
    Log To Console    C81776 ....... | PASS |
    Log    Step 1 - C81777 - done above
    Sleep    5
    Log    Step 2 - C81777
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Wait For Analytics Move Dialog    disk1
    Wait Until Elements Are Visible
    ...    ${CHANGE ANALYTICS MODAL}
    ...    ${CS MODAL CLOSE BUTTON}
    ...    ${CS MODAL DELETE BUTTON}
    ...    ${CS MODAL KEEP BUTTON}
    ...    ${CS MODAL CANCEL BUTTON}
    ...    ${CS MODAL PARAGRAPH}
    ...    ${CS MODAL CONTACT}
    ...    ${CS MODAL SUPPORT LINK}
    Log    Step 3 - C81777
    Click Button     ${CS MODAL DELETE BUTTON}
    Wait Until Element Is Not Visible     ${CHANGE ANALYTICS MODAL}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 4 - C81777
    Sleep    5
    Check Analytics Data is Present    disk1    ${camera}    ${server 1['name']}
    Run Keyword and Expect Error    *    Check Analytics Data is Present    disk2    ${camera}    ${server 1['name']}
    Log To Console    C81777 ....... | PASS |
    Set Selenium Speed    ${normal}

Change storage mode: Main -> Backup
    [Tags]    C81541    mode
    @{disabled} =    Create List    disk3
    @{backups} =    Create List     disk2
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 5
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 2 disk0} > ${files disk0}
    ${files 2 disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files 2 disk1} > ${files disk1}

    Log    Step 6
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 7
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 8
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}    timeout=35

    Log    Step 9
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files 2 disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files 2 disk1} or ${files 3 disk1} < ${files 2 disk1}

Change storage mode: Backup -> Main
    [Tags]    C81542    mode
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}

    Log    Step 2
    ${files disk0} =    Verify Recorded Video Files    disk0
    ${files disk1} =    Verify Recorded Video Files    disk1
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 2 disk0} > ${files disk0}
    Sleep    30
    ${files 2 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 2 disk1} == ${files disk1} or ${files 2 disk1} < ${files disk1}

    Log    Step 3
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Sleep    2
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE ENABLED BACKUP}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 5
    ${files 3 disk0} =     Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files 2 disk0}
    Sleep    30
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

    Log    Step 6
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Sleep    2
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 7
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 8
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    timeout=35

    Log    Step 9
    ${files 4 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 4 disk0} > ${files 3 disk0}
    ${files 4 disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files 4 disk1} > ${files 3 disk1}

Enable storage: Not in use -> Main
    [Tags]    C81543    mode    
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED NOT IN USE}
    ${files disk2} =    Verify Recorded Video Files    disk2
    
    Log    Step 2
    ${files 2 disk2} =    Wait Until Files Are Recorded    disk2    15
    Should Be True    ${files 2 disk2} == ${files disk2}

    Log    Step 3
    Click Button      ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 5
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}    timeout=35

    Log    Step 6
    ${files 3 disk2} =    Wait Until Files Are Recorded    disk2    100
    Should Be True    ${files 3 disk2} > ${files 2 disk2}

Enable storage: Not in use -> Backup
    [Tags]    C81544    mode    archive
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    @{disabled} =    Create List    disk1    disk2    disk3
    @{backups} =    Create List
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go To Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED NOT IN USE}

    Log    Step 2
    ${files disk0} =    Verify Recorded Video Files    disk0
    ${files disk2} =    Verify Recorded Video Files    disk2
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    ${files 2 disk2} =    Verify Recorded Video Files    disk2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be True    ${files 2 disk0} > ${files disk0}
    Should Be True    ${files disk2} == ${files 2 disk2}
    Log    Step 3
    Click Button      ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure     Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure     Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Reload Page
    Wait Until Element Is Not Visible    ${ARCHIVE BACKUP SWITCH ENABLED}
    ${files 2 disk2} =    Verify Recorded Video Files    disk2
    
    Log    Step 5
    Wait Until Elements Are Visible    
    ...    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    ...    ${ARCHIVE BACKUP CHECK BOX}
    # ...    ${ARCHIVE BACKUP STREAMS MSG}
    # ...    ${ARCHIVE BACKUP CLIENT MSG}
    ...    timeout=35

    Log    Step 6
    ${files 3 disk2} =    Verify Recorded Video Files   disk2
    Should Be True    ${files 3 disk2} == ${files disk2} or ${files 3 disk2} < ${files 2 disk2}

    Log    Step 7
    # Turn On Backup For Camera    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    # Reload Page
    # Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    # Enable Archive Backup
    # Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}
    # Click Element    ${SAVE BUTTON}
    # Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    # Reload Page
    # Wait Until Element Is Not Visible    ${ARCHIVE BACKUP SWITCH ENABLED}

    # ${files disk0} =     Wait Until Files Are Recorded    disk0    100
    # ${files 4 disk2} =    Verify Recorded Video Files    disk2
    # Sleep    60
    # ${files 5 disk2} =    Verify Recorded Video Files    disk2
    # Should Be True    ${files 5 disk2} == ${files 4 disk2}

    # Log    Step 8
    ${files disk0} =    Verify Recorded Video Files    disk0
    Set Backup Setting To    BackupRealTime    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Reload Page
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    ${backup initialized} =    Set Variable    ${TRUE}
    Set Suite Variable    ${backup initialized}
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    ${files 6 disk2} =    Wait Until Files Are Recorded    disk2    100
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be True    ${files 2 disk0} > ${files disk0}
    Should Be True    ${files 6 disk2} > ${files 3 disk2}

Disable storage: Main -> Not in use
    [Tags]    C81545    mode
    @{disabled} =    Create List    disk3
    @{backups} =    Create List     disk2
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 5
    Wait Until Element Is Visible     ${STORAGE DISK 1}/parent::td[@class="disabled-label"]//*[name()="svg-icon" and @data-src="/static/images/icons/standard/storage_local.svg"]

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

Disable storage: Backup -> Not in use
    [Tags]    C81546    mode    archive
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    ${status} =    Run Keyword And Return Status     Page Should Not Contain Element    ${ARCHIVE BACKUP STREAMS MSG}
    Run Keyword If    ${status}    Run Keywords
    ...    Click Element    ${ARCHIVE BACKUP CHECK BOX}    AND
    ...    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}    AND
    ...    Click Element    ${SAVE BUTTON}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE ENABLED BACKUP} /parent::button
    Click Button      ${STORAGE ENABLED BACKUP} /parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP} /parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP} /parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 5
    Wait Until Element Is Visible with Retry     ${STORAGE DISK 1}/parent::td[@class="disabled-label"]//*[name()="svg-icon" and @data-src="/static/images/icons/standard/storage_local.svg"]    timeout=30

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

Changing mode state - reload page
    [Tags]    C81558    mode
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}

    Log    Step 2
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Sleep    2
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 3
    Reload Page
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    timeout=35

Disabling storage warnings - Main storages
    [Tags]    C81562    mode
    @{disabled} =    Create List    disk3
    @{backups} =    Create List     disk2
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    Sleep    60
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}
    Element Style Should Be    ${RECORDING STOP WARNING}    color    ${ERROR COLOR WITH OPACITY}

    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}

    Log    Step 5
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT ICON}
    Mouse Over    ${STORAGE DELETION ALERT ICON}
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT TOOLTIP}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

Disabling storage warnings - Backup storages
    [Tags]    C81564    mode    archive
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Log    Step 1
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    ${status} =    Run Keyword And Return Status     Page Should Not Contain Element    ${ARCHIVE BACKUP STREAMS MSG}
    Run Keyword If    ${status}    Run Keywords
    ...    Click Element    ${ARCHIVE BACKUP CHECK BOX}    AND
    ...    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}    AND
    ...    Click Element    ${SAVE BUTTON}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    Sleep    120
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE ENABLED BACKUP} /parent::button
    Click Button      ${STORAGE ENABLED BACKUP} /parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP} /parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP} /parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}

    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Element is Visible    ${STORAGE CHANGING MODE}    timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}

    Log    Step 5
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT ICON}
    Mouse Over    ${STORAGE DELETION ALERT ICON}
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT TOOLTIP}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

Storage Location Table Space Legend Tooltip Shows
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window

Backup Option Disabled when only One Main Storage
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE MAIN MODE}
    Click Button      ${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE BACKUP MENU ITEM}
    Wait Until Elements Are Visible
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and text()="${BACKUP}"]
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and text()="${NOT IN USE}"]

Change Storage from Main to Backup
    @{disabled} =    Create List    disk3
    @{backups} =    Create List    disk1
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Element is Visible    ${SAVE BUTTON}
    Click Button    ${SAVE BUTTON}
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}

Change Storage from Backup to Not in Use
    @{disabled} =    Create List    disk3
    @{backups} =    Create List    disk1    disk2
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link     ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Element is Visible    ${SAVE BUTTON}
    Click Button    ${SAVE BUTTON}
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}

Add Storage Close button works
    [Tags]    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

Add Storage Cancel button works
    [Tags]    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

Detailed Info button works system has multiple storages
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//table[contains(@class, "nx-table")]

Detailed Info button works (system has one storage)
    Log in to user and system    ${server 2['owner']}     ${server 2['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//nx-single-entity//header/span[contains(text(), ${STATE TEXT})]

Add external storage: Close dialog and Cancel
    [Tags]    C81583    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

Add external storage: empty URL
    [Tags]    C81584    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL REQUIRED}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

Add external storage: wrong URL
    [Tags]    C81585    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     example.com
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Delete All Text     ${AS MODAL URL INPUT}
    Press Keys     ${AS MODAL URL INPUT}     \example\com\
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Delete All Text     ${AS MODAL URL INPUT}
    Press Keys     ${AS MODAL URL INPUT}     //example/
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

Add external storage: Wrong login or password
    [Tags]    C81589    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Input Text      ${AS MODAL URL INPUT}     ${networkdisk}
    Input Text      ${AS MODAL LOGIN INPUT}      incorrect
    Input Text      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL PASSWORD INVALID}

    # Input Text      ${AS MODAL URL INPUT}     ${EMPTY}    clear=True
    Input Text      ${AS MODAL LOGIN INPUT}      qaburbank    clear=True
    Input Text      ${AS MODAL PASSWORD INPUT}     incorrect    clear=True
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL PASSWORD INVALID}
    # Input Text      ${AS MODAL URL INPUT}     ${EMPTY}    clear=True
    Delete All Text      ${AS MODAL LOGIN INPUT}      
    Input Text      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}    clear=True
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL PASSWORD INVALID}

    # Input Text      ${AS MODAL URL INPUT}     ${EMPTY}    clear=True
    Input Text      ${AS MODAL LOGIN INPUT}      qaburbank   clear=True
    Delete All Text      ${AS MODAL PASSWORD INPUT}  
    Delete All Text      ${AS MODAL LOGIN INPUT}       
    Delete All Text     ${AS MODAL PASSWORD INPUT}     
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements are Visible
    ...    ${AS MODAL PASSWORD INVALID}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

Add external storage: invalid storage path
    [Tags]    C81597    external
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     //10.1.5.239/incorrect
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL NOT FOUND}
    ...    ${ADD STORAGE MODAL}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

Failed to add external storage: server is offline
    [Tags]    C81600    external
    Log in to user and system    ${server 1['owner']}     ${server 2['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Stop Server    ${server 2['name']}
    Sleep    60
    Press Keys     ${AS MODAL URL INPUT}     ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS FAILED TO ADD TOAST}
    ...    ${ADD STORAGE MODAL}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Start Server    ${server 2['name']}    2
    Sleep    60
    Reload Page
    Verify on Servers Page
    Wait Until Elements Are Not Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}

Add external storage: successful scenario with password
    [Tags]    C81599    C81587    C81595    C81596    External    
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    # url text should have one less "/" in the start than when added
    Wait Until Element Is Visible    ${ALERT}
    Element Text Should Be    ${ALERT}     ${EXTERNAL STORAGE ADDED TEXT}
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    Mouse Over    ${STORAGE SMB ICON}
    Wait Until Element Is Visible    ${STORAGE SMB TOOLTIP}
    Reload Page
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    Wait Until Files Are Recorded    networkdisk    100
    Log To Console    C81599 ....... | PASS |

    Log    path is already added to this server
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL ALREADY ADDED}
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Log To Console    C81587 ....... | PASS |

    Log    Add external storage: path is already added to another server - Cancel, Close, Back
    # ${server2} =    Get Server Id    https://${QA BURBANK IP}:${server 2}[port]    ${server auth}
    Merge Systems Local    ${LOCAL AUTH}    admin:${BASE PASSWORD}    https://${QA BURBANK IP}:${server 1}[port]    ${QA BURBANK IP}:${server 3}[port]    currentPassword=${BASE PASSWORD}
    Sleep    30
    Make Directory    disk-invalid
    Restart Docker Servers    ${server 1}[name]     ${server 3}[name]
    Sleep    90
    Remove Directory    disk-invalid
    Go To    ${ENV}/systems/${server 1['cloud id']}/servers/${server 3['id']}
    Select Server By Name    ${server 3['id']}
    #Wait Until Element is Visible With Retry    ${STORAGE MAIN MODE}
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Elements Are Not Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}

    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Elements Are Not Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}

    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click Button    ${AS MODAL BACK BUTTON}
    Verify Add Storage Dialog

    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Log To Console    C81595 ....... | PASS |

    Log    Add external storage: path is already added to another server - Add Storage
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${ALERT}
    Element Text Should Be    ${ALERT}     ${EXTERNAL STORAGE ADDED TEXT}
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    ${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    Log To Console    C81596 ....... | PASS |
    Cleanup External Drive
    
Cancel deleting storage
    [Tags]    C81573    deleting    
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Element Is Enabled    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Click Button    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}            
    ...    ${DELETE STORAGE CLOSE BUTTON}     
    ...    ${DELETE STORAGE CANCEL BUTTON}      
    ...    ${DELETE STORAGE DELETE BUTTON}    
    Click Button      ${DELETE STORAGE CLOSE BUTTON}
    Wait Until Elements Are Visible    ${STORAGE DISABLED INACCESSIBLE}    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Click Button    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}            
    ...    ${DELETE STORAGE CLOSE BUTTON}     
    ...    ${DELETE STORAGE CANCEL BUTTON}      
    ...    ${DELETE STORAGE DELETE BUTTON}    
    Click Button      ${DELETE STORAGE CANCEL BUTTON}
    Wait Until Elements Are Visible    ${STORAGE DISABLED INACCESSIBLE}    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    
Delete Inaccessible storage
    [Tags]    C81573    deleting    deb
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Wait Until Element Is Enabled    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Sleep    .25
    Click Button    ${INACCESSIBLE STORAGE DELETE BUTTON} 
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}            
    ...    ${DELETE STORAGE CLOSE BUTTON}     
    ...    ${DELETE STORAGE CANCEL BUTTON}      
    ...    ${DELETE STORAGE DELETE BUTTON}    
    Sleep    .25
    Click Button    ${DELETE STORAGE DELETE BUTTON}
    Wait Until Element Is Visible    ${ALERT}
    Element Text Should Be    ${ALERT}     ${INNACCESSIBLE STORAGE DELETED TOAST TEXT}
    Wait Until Element Is Visible    ${STORAGE LOCATIONS BLOCK} 
    Element Should Not Be Visible    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Set Suite Variable    ${drives}    4
    
Backup settings block availability for owner, administrator and other users
    [Tags]    C81804    archive    deb
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}        
    FOR    ${account}    IN    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]        
        Log in to user and system    ${account}     ${server 1['cloud id']}
        Go To Servers
        Verify on Servers Page
        Select Server By Name    ${server 1['id']}
        Wait Until Elements Are Visible    ${ARCHIVE BACKUP CHECK BOX}    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG} 
        Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
        Log Out
    END
    FOR    ${account}    IN    ${server 1}[cloud users][advancedViewer]    ${server 1}[cloud users][liveViewer]    ${server 1}[cloud users][viewer]    ${server 1}[cloud users][custom]
        Log in to user and system    ${account}     ${server 1['cloud id']}
        Sleep     2
        Element Should Not Be Visible    ${SERVERS LINK}
        Log Out
    END
    
Backup settings block is not shown if no one storage is assigned “Backup” mode
    [Tags]    C81810    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    @{disabled} =    Create List    disk3    disk1    disk2 
    @{backups} =    Create List    
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}  
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Page Should Not Contain Element    ${ARCHIVE BACKUP CHECK BOX} 

Backup off
    [Tags]    C81807    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    # @{disabled} =    Create List    disk3    disk2 
    # @{backups} =    Create List    disk1
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    
Backup on – default settings
    [Tags]    C81808    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupRealTime    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page  
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP CHECK BOX}    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    
Backup on – custom settings
    [Tags]    C81809    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupSchedule    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page  
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible   
    ...    ${ARCHIVE BACKUP CHECK BOX} 
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    
It is not necessary to apply changes to make the backup settings block appear
    [Tags]    C81811    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    @{disabled} =    Create List    disk3    disk1    disk2 
    @{backups} =    Create List    
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}  
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Page Should Not Contain Element    ${ARCHIVE BACKUP CHECK BOX} 
    Log    Step 2
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a  
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX} 
    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a  
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX} 
    Log    Step 4
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a  
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX} 
    Log    Step 5
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a  
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    
Cancel Backup enabling
    [Tags]    C83183    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}   
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    
Cancel Backup disabling - default settings
    [Tags]    C83184    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupRealTime    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP CHECK BOX}    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}   
    Click Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}        
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}     ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}   
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
        
Cancel Backup disabling - custom settings
    [Tags]    C83185    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupSchedule    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible     
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON}   
    Click Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}        
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
     
Cancel resetting backup settings for system of 1 server
    [Tags]    C83328    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupSchedule    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click Button    ${BACKUP RESET BUTTON} 
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}               
    ...    ${RESET BACKUP MODAL TITLE}          
    ...    ${RESET BACKUP RESET BUTTON}        
    ...    ${RESET BACKUP CLOSE BUTTON}        
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click Button     ${RESET BACKUP CLOSE BUTTON}
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON}   
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click Button    ${BACKUP RESET BUTTON} 
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}               
    ...    ${RESET BACKUP MODAL TITLE}          
    ...    ${RESET BACKUP RESET BUTTON}        
    ...    ${RESET BACKUP CLOSE BUTTON}        
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click Button     ${RESET BACKUP CANCEL BUTTON} 
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON}   
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}       
    
Reset backup settings for system of 1 server
    [Tags]    C83330    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Run Keyword Unless     ${backup initialized}     Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    Set Backup Setting To    BackupSchedule    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Wait Until Element is Visible with Retry    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}    
    ...    ${ARCHIVE BACKUP RESET MSG}         
    ...    ${BACKUP RESET BUTTON} 
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    
    ${files disk0} =    Verify Recorded Video Files    disk0
    ${files disk1} =    Verify Recorded Video Files    disk1
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    ${files 2 disk1} =    Verify Recorded Video Files    disk1
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be True    ${files 2 disk0} > ${files disk0}
    Should Be True    ${files disk1} == ${files 2 disk1}    

    Click Button    ${BACKUP RESET BUTTON} 
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}               
    ...    ${RESET BACKUP MODAL TITLE}          
    ...    ${RESET BACKUP RESET BUTTON}        
    ...    ${RESET BACKUP CLOSE BUTTON}        
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click Button    ${RESET BACKUP RESET BUTTON} 
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}  
    
    ${files 3 disk1} =    Wait Until Files Are Recorded    disk1    100
    
Reindex archive block owerview: only Main storage
    [Tags]    C81605    
    @{disabled} =    Create List    disk2    disk3     
    @{backups} =    Create List    
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}  
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE REINDEXING BLOCK}    #${STORAGE REINDEXING MAIN}     ${STORAGE REINDEX MAIN BUTTON}
    Sleep    2
    Mouse Over    ${STORAGE REINDEX MAIN BUTTON}
    Wait Until Element Is Visible    ${STORAGE REINDEX TOOLTIP}
    
Reindex archive block owerview: Main and Backup storages
    [Tags]    C81606    archive    
    Skip If    '${IMAGE}' == '4.3_test'    Backup Archive not supported with 4.3
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    
    ...    ${STORAGE REINDEXING BLOCK}    
    #...    ${STORAGE REINDEXING MAIN}     
    ...    ${STORAGE REINDEX MAIN BUTTON}
    ...    ${STORAGE REINDEX BACKUP BUTTON}
    #...    ${STORAGE REINDEXING BACKUP}
    Sleep    2
    Mouse Over    ${STORAGE REINDEX MAIN BUTTON}
    Wait Until Element Is Visible    ${STORAGE REINDEX TOOLTIP}
    Mouse Over    ${change focus} 
    Mouse Over    ${STORAGE REINDEX BACKUP BUTTON}
    Wait Until Element Is Visible    ${STORAGE REINDEX TOOLTIP}
     
# Reindex Main Storage Successfully FUTURE (need to make sure there's an archive or else reindexing will go too quickly)
#     Verify on Servers Page
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEXING BLOCK}
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     Click Button     ${STORAGE REINDEX MAIN BUTTON}
#     Wait Until Elements Are Visible
#     ...     ${STORAGE REINDEXING MAIN}
#     ...     ${REINDEXING MAIN PERCENT}
#     ...     ${REINDEXING MAIN CANCEL BUTTON}
#     Sleep 60
#     Wait Until Element is Visible      ${STORAGE REINDEX MAIN BUTTON}

# Cancel Reindexing Main Storage FUTURE (need to make sure there's an archive or else reindexing will go too quickly)
#     Verify on Servers Page
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEXING BLOCK}
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     Click Button     ${STORAGE REINDEX MAIN BUTTON}
#     Wait Until Elements Are Visible
#     ...     ${STORAGE REINDEXING MAIN}
#     ...     ${REINDEXING MAIN PERCENT}
#     ...     ${REINDEXING MAIN CANCEL BUTTON}
#     Click Button      ${REINDEXING MAIN CANCEL BUTTON}
#     Wait Until Element is Visible      ${STORAGE REINDEX MAIN BUTTON}

# Reindex Main and Backup Storage at the same time Successfully FUTURE (need to make sure there's an archive or else reindexing will go too quickly)
#     Verify on Servers Page
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEXING BLOCK}
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     ...     ${STORAGE REINDEX BACKUP BUTTON}
#     Click Button     ${STORAGE REINDEX MAIN BUTTON}
#     Click Button     ${STORAGE REINDEX BACKUP BUTTON}
#     Wait Until Elements Are Visible
#     ...     ${STORAGE REINDEXING MAIN}
#     ...     ${REINDEXING MAIN PERCENT}
#     ...     ${REINDEXING MAIN CANCEL BUTTON}
#     ...     ${STORAGE REINDEXING BACKUP}
#     ...     ${REINDEXING BACKUP PERCENT}
#     ...     ${REINDEXING BACKUP CANCEL BUTTON}
#     Sleep 60
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     ...     ${STORAGE REINDEX BACKUP BUTTON}
