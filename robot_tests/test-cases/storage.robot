*** Settings ***
Resource          ../Resources/front-end-resources/storage-resource.robot
Suite Setup       Storage Suite Setup
Test Setup        Storage Test Setup     config storage=${False}
Test Teardown     Run Keywords    QA Video Recording Stop       storage-resource.Restart
Suite Teardown    Run Keyword and Ignore Error   Storage Suite Teardown
Force Tags        storage

*** Test Cases ***
1. Loading State of Storage Locations Block
    [Tags]    C81803
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS PLACEHOLDER}    ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled    ${STORAGE ADD BUTTON}
    ${width}    ${height} =    Get Element Size    ${STORAGE LOCATIONS BLOCK}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be Equal As Integers    ${height}    259

2. Detailed Info in Storage Locations block
    [Tags]    C81534
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    Wait Until Element Is Visible    ${STORAGE INFO BUTTON}
    Click    Button    ${STORAGE INFO BUTTON}
    Wait Until Location Contains    health/storages
    Wait Until Element Is Visible    ${HM STORAGE TABLE}
    ${count} =    Get Element Count    ${HM STORAGE DISK}
    Should Be Equal as Numbers    5    ${count}

3. Analytics DB Storage dropdown is not visible
    [Tags]    C81740    Analytics     
    [Setup]     Storage Test Setup      email=${server 2['owner']}     system=${server 2['cloud id']}     config storage=${False}
    Verify on Servers Page
    Wait Until Element Is Not Visible    ${ANALYTICS DROPDOWN}

4. Scrolling on small resolutions in Storage Locations block
    [Tags]    C81535
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    Verify No Horizontal Scrollbar    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table
    Set Window Size    600    1080
    Sleep    1
    Verify Horizontal Scrollbar Exists    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table
    Verify One Element Above the Other    ${STORAGE LOCATIONS TABLE}/table    ${STORAGE ADD BUTTON}
    Verify Element Does Not Scroll    ${STORAGE ADD BUTTON}    ${STORAGE SCROLLBAR}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Verify Element Does Not Scroll    //header//h4[contains(text(),"${STORAGE LOCATIONS TEXT}")]   ${STORAGE SCROLLBAR}
    Set Window Size    1920    1080
    Sleep    1
    Verify No Horizontal Scrollbar    ${STORAGE LOCATIONS TABLE}    ${STORAGE LOCATIONS TABLE}/table

5. Alphabetical sorting in Storage Locations Table
    [Tags]    C81537
    @{menu order}    Create List
    @{sorted}        Create List
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}
    @{storages} =    Get WebElements    ${STORAGE ITEM}
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${menu order}    ${disk}
    END
    ${sorted} =    Set Variable    ${menu order}
    Sort List    ${sorted}
    Lists Should Be Equal    ${menu order}    ${sorted}

6. Enabled, disabled and inaccessible storages appearance
    [Tags]    C81540
    Wait Until Elements Are Visible With Retry
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

7. Width of mode column
    [Documentation]    In order to verify Step 5 of the testrail testcase, run this test case in another language. robot -V getvars.py:default:ru_RU -i C81555 test-cases
    [Tags]    C81555
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ITEM}    ${STORAGE DISABLED NOT IN USE}     ${STORAGE ENABLED MAIN}
    ${width}    ${height} =    Get Element Size    ${STORAGE DISABLED NOT IN USE}/ancestor::td
    Click    Button    ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click     Link    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Element is Visible    ${STORAGE DISK 2}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE BACKUP MODE}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 2}    ${height 2} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 2}
    Click    Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click     Link     ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Element is Visible    ${STORAGE DISK 2}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 3}    ${height 3} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 3}
    Click    Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${width 4}    ${height 4} =    Get Element Size    ${STORAGE DISK 2}/parent::td/following-sibling::td
    Should Be Equal As Integers    ${width}    ${width 4}

8. Active Mode Lines
    [Tags]    C81557
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}    ${STORAGE DISABLED NOT IN USE}

    Log    Step 2
    Click    Button    ${STORAGE ENABLED MAIN}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE DISABLED}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE DISABLED}/parent::a
    ...    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}

    Log    Step3
    Run Keyword and Expect Error    *    Click     Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE DISABLED}/parent::a
    Run Keyword and Expect Error    *    Click     Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE DISABLED}/parent::a

    Log    Step 4
    Click     Link    ${STORAGE ENABLED MAIN}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE ENABLED MAIN}

    Log    Step 5
    Click    Button    ${STORAGE ENABLED BACKUP}/parent::button
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
    Click     Link    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}

    Log    Step 7
    Click    Button    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click     Link    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td[@class="disabled-label"]/following-sibling::td${STORAGE NOT IN USE MODE}
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}

    Log    Step 8
    Click    Button    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click     Link    ${STORAGE DISK 1}/parent::td/following-sibling::td${STORAGE NOT IN USE MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${STORAGE ENABLED BACKUP}    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 9
    Click    Button    ${STORAGE DISABLED NOT IN USE}/parent::button
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
    Click     Link    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}

    Log    Step 11
    Click    Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click     Link    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE BACKUP MODE}
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}

    Log    Step 12
    Click    Button    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    ...    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE MODE LINE}
    Click     Link    ${STORAGE DISK 2}/parent::td/following-sibling::td${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISABLED NOT IN USE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

9. Reserved Non-System storage tooltip
    [Tags]    C81566
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED RESERVED}
    Mouse Over   ${STORAGE RESERVED TOOLTIP ICON}
    Wait Until Element is Visible    ${STORAGE RESERVED TOOLTIP}

10. Changing of reserved space is shown in the table
    [Tags]    C81569     CLOUD-9076
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE POPOVER}     #${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window
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
    Click    Button    ${SAVE BUTTON}
    Sleep    2
    Reload Page
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE POPOVER}       #${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window
    ${reserved} =    Get Text    ${RESERVED SPACE}
    Should Contain  ${reserved}    10

11. No Size Tooltip when Inaccessble
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED INACCESSIBLE}
    Mouse Over    ${STORAGE INACCESSIBLE SIZE}
    Sleep    1
    Element Should Not Be Visible    ${STORAGE INACCESSIBLE SIZE}/following-sibling::ngb-popover-window

12. Storage Locations Table without control buttons
    [Tags]    C81572
    [Setup]     Storage Test Setup       email=${server 2['owner']}     system=${server 2['cloud id']}     config storage=${False}
    Wait Until Elements Are Visible With Retry
    ...    ${STORAGE LOCATIONS BLOCK}
    ...    ${STORAGE ADD BUTTON}
    ...    ${STORAGE LOCATIONS FIRST ROW}
    ...    ${STORAGE ADDRESS COLUMN}
    ...    ${STORAGE MODE COLUMN}
    ...    ${STORAGE SPACE COLUMN}
    ${count} =    Get Element Count    ${STORAGE LOCATIONS TABLE}//th
    Should Be Equal As Integers    ${count}    3

13. Not able to load storage information
    [Tags]    C84518
    [Setup]     Storage Test Setup       email=${server 3['owner']}     system=${server 3['cloud id']}     config storage=${False}
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE LOCATIONS PLACEHOLDER}    ${STORAGE NOT ABLE TO LOAD}
    Wait Until Element is Enabled    ${STORAGE ADD BUTTON}
    ${width}    ${height} =    Get Element Size    ${STORAGE LOCATIONS BLOCK}
    Should Be Equal As Integers    ${height}    259

14. Storages order in "Analytics DB Storage" dropdown
    [Tags]    C81757    Analytics
    @{menu order}    Create List
    @{dropdown order}    Create List
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Click    Button    ${ANALYTICS DROPDOWN}
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
    @{sorted} =    Set Variable    ${dropdown order}
    Sort List     ${sorted}
    Lists Should Be Equal    ${sorted}    ${dropdown order}

15. Cancel Changing "Analytics DB Storage"
    [Tags]    C81778    Analytics
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1
    Wait Until Element Contains    ${ANALYTICS DROPDOWN}    disk0
    Log    Step 2
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Wait Until Element Contains    ${ANALYTICS DROPDOWN}    disk1
    Log    Step 3
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click    Button    ${CANCEL BUTTON}
    Wait Until Element Contains    ${ANALYTICS DROPDOWN}    disk0
    Wait Until Elements Are Not Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}

16. Successful changing Analytics DB Storage plus confirmation dialog
    [Tags]    C81779    C81775    C81776    C81777    Analytics    C81754    C81755    CLOUD-9079
    [Setup]     Storage Test Setup       disk3    disk3
    ${normal} =    Set Selenium Speed    0.25
    Verify on Servers Page
    Wait Until Element is Visible    //span[contains(text(),"disk") and @class="ellipsis"]
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1 - C81779
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk0
    Log    Step 2 - C81779
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Log    Step 3 - C81779
    Wait Until Element is Visible     ${SAVE BUTTON}
    Click    Button    ${SAVE BUTTON}
    Log    Step 4 - C81779
    Turn On Analytics    https://${QA BURBANK IP}:${server 1['port']}    ${value}    ${camera resourceId}     ${server 1['local auth']}
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
    Log    Step 1 - C81775
    Wait Until Element is Visible with Retry    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains   ${ANALYTICS DROPDOWN}    disk1
    Log    Step 2 - C81775
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
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
    Click     Link    ${CS MODAL SUPPORT LINK}
    Wait Until Number Of Tabs Are Open    2
    ${tabs}=   Get Window Handles
    Switch Window    ${tabs}[1]
    Wait Until Location Contains    ${SUPPORT URL}
    Log    Step 4 - C81775
    Close Window
    Switch Window    ${tabs}[0]
    Wait Until Element is Visible    ${CS MODAL CLOSE BUTTON}
    Click    Button    ${CS MODAL CLOSE BUTTON}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 5 - C81775
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
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
    Click    Button    ${CS MODAL CANCEL BUTTON}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element Contains     ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log To Console    C81775 ....... | PASS |
    Log    Step 1,2,3 - C81776 - already done above
    Log    Step 4 - C81776
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk2")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk2")]
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
    Click    Button    ${CS MODAL KEEP BUTTON}
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
    Click    Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click     Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
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
    Click    Button     ${CS MODAL DELETE BUTTON}
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

17. Storage Location Table Space Legend Tooltip Shows
    [Tags]
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE POPOVER}     #${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window

18. Backup Option Disabled when only One Main Storage
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE MAIN MODE}
    Click    Button      ${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE BACKUP MENU ITEM}
    Wait Until Elements Are Visible
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and contains(text(),"${BACKUP}")]
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and contains(text(),"${NOT IN USE}")]

19. Change Storage from Main to Backup
    [Setup]     Storage Test Setup       disk3    disk1
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}
    Click    Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click     Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Element is Visible    ${SAVE BUTTON}
    Click    Button    ${SAVE BUTTON}
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}

20. Change Storage from Backup to Not in Use
    [Setup]     Storage Test Setup       disk3    disk1 disk2
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    Click    Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click     Link     ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Element is Visible    ${SAVE BUTTON}
    Click    Button    ${SAVE BUTTON}
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}

21. Add Storage Close button works
    [Tags]    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click    Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

22. Add Storage Cancel button works
    [Tags]    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

23. Detailed Info button works system has multiple storages
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click    Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//table[contains(@class, "nx-table")]

24. Detailed Info button works (system has one storage)
    [Tags]
    [Setup]     Storage Test Setup       email=${server 2['owner']}     system=${server 2['cloud id']}
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click    Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//nx-single-entity//header//span[contains(text(), "${STATE TEXT}")]

25. Add external storage: Close dialog and Cancel
    [Tags]    C81583    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     some storage url
    Click    Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Verify Storages    5
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     some storage url
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Verify Storages    5

26. Add external storage: empty URL
    [Tags]    C81584    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL REQUIRED}
    Element Style Should Be    ${AS MODAL URL REQUIRED}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL URL INPUT ERROR}    border-color    ${ERROR COLOR}
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

27. Add external storage: wrong URL
    [Tags]    C81585    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     example.com
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Element Style Should Be    ${AS MODAL URL INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL URL INPUT ERROR}    border-color    ${ERROR COLOR}
    Delete All Text     ${AS MODAL URL INPUT}
    Press Keys     ${AS MODAL URL INPUT}     \example\com\
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Element Style Should Be    ${AS MODAL URL INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL URL INPUT ERROR}    border-color    ${ERROR COLOR}
    Delete All Text     ${AS MODAL URL INPUT}
    Press Keys     ${AS MODAL URL INPUT}     //example/
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Element Style Should Be    ${AS MODAL URL INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL URL INPUT ERROR}    border-color    ${ERROR COLOR}
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

28. Add external storage: Wrong login or password
    [Tags]    C81589    external
    # In order for the SMB external test cases to work you must have installed samba on your linux box and cofnigured it properly:
    # sudo apt-get install samba -y
    # sudo nano /etc/samba/smb.conf
    # Add the below text to the bottom of the .conf file:
#    [networkdisk]
#        path = /home/qaburbank/networkdisk
#        valid users = qaburbank
#        read only = no
    # you will also need to add the qaburbank user to samba:
    # sudo smbpasswd -a quburbank
    # New SMB password: QABurbank777$

    Verify on Servers Page

    Log    Step 1
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Input Text      ${AS MODAL URL INPUT}     ${networkdisk}
    Input Text      ${AS MODAL LOGIN INPUT}      qaburbank
    Input Text      ${AS MODAL PASSWORD INPUT}     incorrect
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 2
    Input Text      ${AS MODAL LOGIN INPUT}      incorrect    clear=True
    Input Text      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}    clear=True
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 3
    Delete All Text      ${AS MODAL LOGIN INPUT}
    Input Text      ${AS MODAL PASSWORD INPUT}     incorrect    clear=True
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 4
    Delete All Text      ${AS MODAL LOGIN INPUT}
    Input Text      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}    clear=True
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 5
    Input Text      ${AS MODAL LOGIN INPUT}      qaburbank   clear=True
    Delete All Text      ${AS MODAL PASSWORD INPUT}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 6
    Delete All Text      ${AS MODAL LOGIN INPUT}
    Delete All Text     ${AS MODAL PASSWORD INPUT}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${AS MODAL PASSWORD INVALID}
    Element Style Should Be    ${AS MODAL PASSWORD INVALID}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL LOGIN INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${AS MODAL PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}

29. Add external storage: invalid storage path
    [Tags]    C81597    external
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys     ${AS MODAL URL INPUT}     //10.1.5.239/incorrect
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL NOT FOUND}
    ...    ${ADD STORAGE MODAL}
    Element Style Should Be    ${AS MODAL URL NOT FOUND}    color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${AS MODAL URL INPUT ERROR}    border-color    ${ERROR COLOR}
    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Verify Storages    5

30. Failed to add external storage: server is offline
    [Tags]    C81600    external
    [Setup]     Storage Test Setup      system=${server 2['cloud id']}   config storage=${False}
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Stop Server    ${server 2['name']}
    Sleep    60
    Press Keys     ${AS MODAL URL INPUT}     ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS FAILED TO ADD TOAST}
    ...    ${ADD STORAGE MODAL}
    Click    Button    ${AS MODAL CANCEL BUTTON}
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

31. Add external storage: successful scenario with password
    [Tags]    C81599    C81587    C81595    C81596    External
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    # url text should have one less "/" in the start than when added
    Wait Until Element Is Visible    ${ALERT}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}
    Element Text Should Be    ${ALERT}     ${EXTERNAL STORAGE ADDED TEXT}
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    //${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    ...    ${STORAGE DISK NETWORK}/ancestor::tr${STORAGE SIZE CHART}
    ${address} =    Get Substring    ${networkdisk}    1
    Element Should Contain     ${STORAGE DISK NETWORK}    ${address}
    Element Style Should Be    ${STORAGE DISK NETWORK}/preceding-sibling::${STORAGE SMB ICON}    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK NETWORK}/ancestor::tr${STORAGE MAIN MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK NETWORK}    color    ${COLOR DARK9 RGB}
    Mouse Over    //${STORAGE SMB ICON}
    Wait Until Element Is Visible    ${STORAGE SMB TOOLTIP}
    Reload Page
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    //${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    Wait Until Files Are Recorded    networkdisk    100
    Log To Console    C81599 ....... | PASS |

    Log    path is already added to this server
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL ALREADY ADDED}
    Click    Button    ${AS MODAL CANCEL BUTTON}
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
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click    Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Elements Are Not Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${STORAGE DISK NETWORK}
    ...    //${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}

    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Elements Are Not Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${STORAGE DISK NETWORK}
    ...    //${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}

    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

    Click    Button    ${AS MODAL BACK BUTTON}
    Verify Add Storage Dialog

    Click    Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element is Not Visible    ${ADD STORAGE MODAL}
    Log To Console    C81595 ....... | PASS |

    Log    Add external storage: path is already added to another server - Add Storage
    Click    Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Press Keys      ${AS MODAL URL INPUT}        ${networkdisk}
    Press Keys      ${AS MODAL LOGIN INPUT}      qaburbank
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${QA BURBANK PASS}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements Are Visible
    ...    ${AS MODAL STORAGE USED BY ANOTHER SERVER}
    ...    ${AS MODAL NOT RECOMMENEDED}
    ...    ${AS MODAL ADD ANYWAY}
    ...    ${AS MODAL BACK BUTTON}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}
    Click    Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element Is Visible    ${ALERT}
    Element Text Should Be    ${ALERT}     ${EXTERNAL STORAGE ADDED TEXT}
    Wait Until Elements Are Visible
    ...    ${STORAGE DISK NETWORK}
    ...    //${STORAGE SMB ICON}
    ...    ${STORAGE DISK NETWORK}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
    ...    ${SMB STORAGE DELETE BUTTON}
    Log To Console    C81596 ....... | PASS |
    Cleanup External Drive

32. Cancel deleting storage
    [Tags]    C81573    deleting
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Element Is Enabled    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Sleep    .25
    Click    Button    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}
    ...    ${DELETE STORAGE CLOSE BUTTON}
    ...    ${DELETE STORAGE CANCEL BUTTON}
    ...    ${DELETE STORAGE DELETE BUTTON}
    Click    Button      ${DELETE STORAGE CLOSE BUTTON}
    Wait Until Elements Are Visible    ${STORAGE DISABLED INACCESSIBLE}    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Click    Button    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}
    ...    ${DELETE STORAGE CLOSE BUTTON}
    ...    ${DELETE STORAGE CANCEL BUTTON}
    ...    ${DELETE STORAGE DELETE BUTTON}
    Click    Button      ${DELETE STORAGE CANCEL BUTTON}
    Wait Until Elements Are Visible    ${STORAGE DISABLED INACCESSIBLE}    ${INACCESSIBLE STORAGE DELETE BUTTON}

33. Delete Inaccessible storage
    [Tags]    C81573    deleting    
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE LOCATIONS BLOCK}    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Element Is Enabled    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Sleep    .25
    Click    Button    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Wait Until Elements Are Visible
    ...    ${DELETE STORAGE MODAL}
    ...    ${DELETE STORAGE CLOSE BUTTON}
    ...    ${DELETE STORAGE CANCEL BUTTON}
    ...    ${DELETE STORAGE DELETE BUTTON}
    Sleep    .25
    Click    Button    ${DELETE STORAGE DELETE BUTTON}
    Wait Until Element Is Visible    ${ALERT}
    Element Text Should Be    ${ALERT}     ${INNACCESSIBLE STORAGE DELETED TOAST TEXT}
    Wait Until Element Is Visible    ${STORAGE LOCATIONS BLOCK}
    Element Should Not Be Visible    ${INACCESSIBLE STORAGE DELETE BUTTON}
    Set Suite Variable    ${drives}    4

34. Backup settings block availability for owner, administrator and other users
    [Tags]    C81804    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test     5.0    5.1    msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
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

35. Backup settings block is not shown if no one storage is assigned “Backup” mode
    [Tags]    C81810    archive
    [Setup]     Storage Test Setup     disk1 disk2 disk3
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    Verify on Servers Page
    Page Should Not Contain Element    ${ARCHIVE BACKUP CHECK BOX}

36. Backup off
    [Tags]    C81807    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}

37. Backup on – default settings
    [Tags]    C81808    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
    Set Backup Setting To    BackupRealTime    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP CHECK BOX}    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}

38. Backup on – custom settings
    [Tags]    C81809    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
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
    Wait Until Element is Enabled    ${BACKUP RESET BUTTON}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}

39. It is not necessary to apply changes to make the backup settings block appear
    [Tags]    C81811    archive     
    [Setup]     Storage Test Setup     disk1 disk2 disk3
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible With Retry
    ...    ${STORAGE ENABLED MAIN}
    ...    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}
    ...    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}
    Page Should Not Contain Element    ${ARCHIVE BACKUP CHECK BOX}
    Log    Step 2
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button
    Click    Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click     Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX}
    Log    Step 3
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button
    Click    Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click     Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}//parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX}
    Log    Step 4
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click    Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click     Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX}
    Log    Step 5
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click    Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click     Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE BACKUP MODE}//parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}

40. Cancel Backup enabling
    [Tags]    C83183    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click     Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click     Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click    Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}   ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}

41. Cancel Backup disabling - default settings
    [Tags]    C83184    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
    Set Backup Setting To    BackupRealTime    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP CHECK BOX}    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click     Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Click     Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click    Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}     ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}

42. Cancel Backup disabling - custom settings
    [Tags]    C83185    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
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
    Wait Until Element is Enabled    ${BACKUP RESET BUTTON}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click     Element    ${ARCHIVE BACKUP CHECK BOX}
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}
    ...    ${ARCHIVE BACKUP RESET MSG}
    ...    ${BACKUP RESET BUTTON}
    Click     Element    ${change focus}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${DISABLED SWITCH COLOR}
    Click    Button    ${CANCEL BUTTON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Elements Are Visible
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}
    ...    ${ARCHIVE BACKUP RESET MSG}
    ...    ${BACKUP RESET BUTTON}
    ...    ${NO UNSAVED CHANGES}
    Wait Until Element is Enabled    ${BACKUP RESET BUTTON}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}

43. Cancel resetting backup settings for system of 1 server
    [Tags]    C83328    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
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
    Click    Button    ${BACKUP RESET BUTTON}
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}
    ...    ${RESET BACKUP MODAL TITLE}
    ...    ${RESET BACKUP RESET BUTTON}
    ...    ${RESET BACKUP CLOSE BUTTON}
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click    Button     ${RESET BACKUP CLOSE BUTTON}
    Wait Until Elements Are Visible
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}
    ...    ${ARCHIVE BACKUP RESET MSG}
    ...    ${BACKUP RESET BUTTON}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}
    Click    Button    ${BACKUP RESET BUTTON}
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}
    ...    ${RESET BACKUP MODAL TITLE}
    ...    ${RESET BACKUP RESET BUTTON}
    ...    ${RESET BACKUP CLOSE BUTTON}
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click    Button     ${RESET BACKUP CANCEL BUTTON}
    Wait Until Elements Are Visible
    ...    ${ARCHIVE BACKUP CHECK BOX}
    ...    ${ARCHIVE BACKUP SET CLIENT MSG}
    ...    ${ARCHIVE BACKUP RESET MSG}
    ...    ${BACKUP RESET BUTTON}
    Element Style Should Be    ${ARCHIVE BACKUP SWITCH SLIDER}    background-color    ${ENABLED SWITCH COLOR}

44. Reset backup settings for system of 1 server
    [Tags]    C83330    archive
    [Setup]     QA Video Recording Start
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    IF    ${backup initialized} == ${False}
        Initialize Backup For User and System    ${server 1['owner']}     ${server 1['cloud id']}
    END
    Set Backup Setting To    BackupSchedule    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go To Servers
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

    Click    Button    ${BACKUP RESET BUTTON}
    Wait Until Elements Are Visible
    ...    ${RESET BACKUP MODAL}
    ...    ${RESET BACKUP MODAL TITLE}
    ...    ${RESET BACKUP RESET BUTTON}
    ...    ${RESET BACKUP CLOSE BUTTON}
    ...    ${RESET BACKUP CANCEL BUTTON}
    Click    Button    ${RESET BACKUP RESET BUTTON}
    Wait Until Element Is Not Visible    ${RESET BACKUP MODAL}
    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}

    ${files 3 disk1} =    Wait Until Files Are Recorded    disk1    100    3    directory='HD Witness Media/low_quality/'
    Verify New Files Are Not Recorded    disk1    30    directory='HD Witness Media/hi_quality/'

45. Reindex archive block owerview: only Main storage
    [Tags]    C81605
    [Setup]     Storage Test Setup     disk2 disk3
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible    ${STORAGE REINDEXING BLOCK}    ${STORAGE REINDEX MAIN BUTTON}    ${STORAGE REINDEX ARCHIVE HEADER}    ${STORAGE REINDEX ARCHIVE MSG}
    Sleep    2
    Mouse Over    ${STORAGE REINDEX MAIN BUTTON}
    Wait Until Elements Are Visible    ${STORAGE REINDEX TOOLTIP FIRST}    ${STORAGE REINDEX TOOLTIP SECOND}

46. Reindex archive block owerview: Main and Backup storages
    [Tags]    C81606    archive     
    Skip If Image Is    4.3_test    5.0_test      5.0      5.1     msg=Backup Archive not supported with ${IMAGE}
    Verify on Servers Page
    Select Server By Name    ${server 1['id']}
    Wait Until Elements Are Visible
    ...    ${STORAGE REINDEXING BLOCK}
    #...    ${STORAGE REINDEXING MAIN}
    ...    ${STORAGE REINDEX MAIN BUTTON}
    ...    ${STORAGE REINDEX BACKUP BUTTON}
    #...    ${STORAGE REINDEXING BACKUP}
    ...    ${STORAGE REINDEX ARCHIVE HEADER}
    ...    ${STORAGE REINDEX ARCHIVE MSG}
    Sleep    2
    Mouse Over    ${STORAGE REINDEX MAIN BUTTON}
    Wait Until Elements Are Visible    ${STORAGE REINDEX TOOLTIP FIRST}    ${STORAGE REINDEX TOOLTIP SECOND}
    Mouse Over    ${change focus}
    Mouse Over    ${STORAGE REINDEX BACKUP BUTTON}
    Wait Until Elements Are Visible    ${STORAGE REINDEX TOOLTIP FIRST}    ${STORAGE REINDEX TOOLTIP SECOND}

# Reindex Main Storage Successfully FUTURE (need to make sure there's an archive or else reindexing will go too quickly)
#     Verify on Servers Page
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEXING BLOCK}
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     Click    Button     ${STORAGE REINDEX MAIN BUTTON}
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
#     Click    Button     ${STORAGE REINDEX MAIN BUTTON}
#     Wait Until Elements Are Visible
#     ...     ${STORAGE REINDEXING MAIN}
#     ...     ${REINDEXING MAIN PERCENT}
#     ...     ${REINDEXING MAIN CANCEL BUTTON}
#     Click    Button      ${REINDEXING MAIN CANCEL BUTTON}
#     Wait Until Element is Visible      ${STORAGE REINDEX MAIN BUTTON}

# Reindex Main and Backup Storage at the same time Successfully FUTURE (need to make sure there's an archive or else reindexing will go too quickly)
#     Verify on Servers Page
#     Wait Until Elements are Visible
#     ...     ${STORAGE REINDEXING BLOCK}
#     ...     ${STORAGE REINDEX MAIN BUTTON}
#     ...     ${STORAGE REINDEX BACKUP BUTTON}
#     Click    Button     ${STORAGE REINDEX MAIN BUTTON}
#     Click    Button     ${STORAGE REINDEX BACKUP BUTTON}
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
