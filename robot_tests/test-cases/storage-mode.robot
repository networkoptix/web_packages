*** Settings ***
Resource          ../Resources/front-end-resources/storage-resource.robot
Suite Setup       Storage Suite Setup
#Test Setup        Server Settings Test Setup    qaburbank@gmail.com    ${AUTO TESTS SYSTEM ID}
Test Teardown     storage-resource.Restart
Suite Teardown    Run Keyword and Ignore Error   Storage Suite Teardown
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
@{disk size}    80000    30000    30000    12000    12000
${networkdisk}    //${QA BURBANK IP}/networkdisk
${drives}    5

*** Test Cases ***
1. Disabling storage warnings aren't shown - Main storages
    [Tags]    C81570    mode
    [Setup]     Test Setup      disk3    disk1
    [Documentation]    This test case will likely fail when run along with others in the suite. Running it by itself should garauntee empty disks
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}
    ${files disk0} =    Verify Recorded Video Files    disk0

    Log    Step 2
    Delete Recorded Video Files    disk2
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}
    Sleep    4

    Element Should Not Be Visible    ${RECORDING STOP WARNING}
    ${files 2 disk0} =    Verify Recorded Video Files    disk2
    Log    ${files 2 disk0}
    
    Log    Step 3
    # Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}    ${STORAGE DELETION ALERT ICON}
    Wait Until Elements Are Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}

    Log    Step 4
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk2} =    Verify Recorded Video Files    disk2
    Should Be True    ${files 3 disk2} == 0 or ${files 3 disk2} == ${files 2 disk0}

2. Disabling storage warnings aren't shown - Backup storages
    [Tags]    C81571    mode
    [Setup]     Test Setup      disk3    disk1 disk2
    [Documentation]    This test case will likely fail when run along with others in the suite. Running it by itself should garauntee empty disks
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    ${files disk0} =    Verify Recorded Video Files    disk0

    Log    Step 2
    Delete Recorded Video Files    disk2
    Wait Until Recorded Files Deleted    disk2    100
    Wait Until Element is Visible with Retry    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Click Button      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}
    Sleep    2
    ${files 2 disk0} =    Verify Recorded Video Files    disk2
    Log    ${files 2 disk0}
    Element Should Not Be Visible    ${RECORDING STOP WARNING}

    Log    Step 3
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}    ${STORAGE DELETION ALERT ICON}
    Wait Until Elements Are Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 2}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}

    Log    Step 4
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk2} =    Verify Recorded Video Files    disk2
    Should Be True    ${files 3 disk2} == 0

3. Change storage mode: Main -> Backup
    [Tags]    C81541    mode
    [Setup]     Test Setup      disk3    disk2
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

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
    Wait Until Elements Are Visible    ${STORAGE ENABLED BACKUP}    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}
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
    Wait Until Elements Are Visible    ${STORAGE ENABLED BACKUP}    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 7
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 8
    Wait Until Elements Are Visible    ${STORAGE ENABLED BACKUP}    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE ENABLED BACKUP}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${COLOR DARK9 RGB}
    

    Log    Step 9
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files 2 disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files 2 disk1} or ${files 3 disk1} < ${files 2 disk1}

4. Change storage mode: Backup -> Main
    [Tags]    C81542    mode
    [Setup]     Test Setup      config storage=${False}
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}

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
    Wait Until Elements Are Visible    
    ...    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    
    ...    ${SAVE BUTTON}    
    ...    ${CANCEL BUTTON}

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
    Wait Until Elements Are Visible    
    ...    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    
    ...    ${SAVE BUTTON}    
    ...    ${CANCEL BUTTON}

    Log    Step 7
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 8
    Wait Until Elements Are Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${COLOR DARK9 RGB}

    Log    Step 9
    ${files 4 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 4 disk0} > ${files 3 disk0}
    ${files 4 disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files 4 disk1} > ${files 3 disk1}

5. Enable storage: Not in use -> Main
    [Tags]    C81543    mode
    [Setup]     Test Setup      config storage=${False}
    Log    Step 1
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED NOT IN USE}
    ${files disk2} =    Verify Recorded Video Files    disk2
    
    Log    Step 2
    ${files 2 disk2} =    Wait Until Files Are Recorded    disk2    15
    Should Be True    ${files 2 disk2} == ${files disk2}

    Log    Step 3
    Click Button      ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 5
    Wait Until Elements Are Visible    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 2}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 2}/ancestor::tr${STORAGE MAIN MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 2}    color    ${COLOR DARK9 RGB}

    Log    Step 6
    ${files 3 disk2} =    Wait Until Files Are Recorded    disk2    100
    Should Be True    ${files 3 disk2} > ${files 2 disk2}

6. Enable storage: Not in use -> Backup
    [Tags]    C81544    mode    archive
    [Setup]     Test Setup      disk1 disk2 disk3
    Skip If Image Is    4.3_test    5.0_test      Backup Archive not supported with 5.0_test
#    @{disabled} =    Create List    disk1    disk2    disk3
#    @{backups} =    Create List
#    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log    Step 1
#    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
#    Go To Servers
    Wait Until Elements Are Visible With Retry    ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE DISABLED NOT IN USE}

    Log    Step 2
    ${files disk0} =    Verify Recorded Video Files    disk0
    ${files disk2} =    Verify Recorded Video Files    disk2
    ${files 2 disk0} =    Wait Until Files Are Recorded    disk0    100
    ${files 2 disk2} =    Verify Recorded Video Files    disk2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should Be True    ${files 2 disk0} > ${files disk0}
    Should Be True    ${files disk2} == ${files 2 disk2}
    Log    Step 3
    Wait Until Storages Are Outdated and Refresh
    Click Button      ${STORAGE DISABLED NOT IN USE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Click Link      ${STORAGE DISABLED NOT IN USE}/parent::button/following-sibling::div/ul/li${STORAGE BACKUP MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 2}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    # Wait Until Storages Are Outdated and Refresh
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Enable Archive Backup
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Set Backup Setting To    BackupManual    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['local auth']}
    Reload Page
    Wait Until Element Is Not Visible    ${ARCHIVE BACKUP SWITCH ENABLED}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    
    Log    Step 5
    Wait Until Elements Are Visible    
    ...    ${STORAGE DISK 2}/ancestor::tr${STORAGE BACKUP MODE}
    ...    ${ARCHIVE BACKUP CHECK BOX}
    # ...    ${ARCHIVE BACKUP STREAMS MSG}
    # ...    ${ARCHIVE BACKUP CLIENT MSG}
    ...    timeout=35

    Log    Step 6
    ${files 2 disk2} =    Verify Recorded Video Files    disk2
    Sleep    20
    ${files 3 disk2} =    Verify Recorded Video Files   disk2
    Should Be True    ${files 3 disk2} == ${files 2 disk2} or ${files 3 disk2} < ${files 2 disk2}

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

7. Disable storage: Main -> Not in use
    [Tags]    C81545    mode
    [Setup]     Test Setup      disk3    disk2
    Log    Step 1
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Storages Are Outdated and Refresh
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    
    ...    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}    
    ...    ${SAVE BUTTON}    
    ...    ${CANCEL BUTTON}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 5
    Wait Until Elements Are Visible     ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

8. Disable storage: Backup -> Not in use
    [Tags]    C81546    mode    archive
    [Setup]     Test Setup      config storage=${False}
    Skip If Image Is    4.3_test    5.0_test      Backup Archive not supported with 5.0_test
#    Log    Step 1
#    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
    Go to Servers
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}
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
    Wait Until Element is Visible with Retry    ${STORAGE ENABLED BACKUP}/parent::button
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}

    Log    Step 4
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot

    Log    Step 5
    Wait Until Elements Are Visible     ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Sleep    15
    ${files 3 disk1} =    Verify Recorded Video Files    disk1
    Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

9. Changing mode state - reload page
    [Tags]    C81558    mode
    [Setup]     Test Setup      config storage=${False}
    Log    Step 1
#    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
#    Go to Servers
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}

    Log    Step 2
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE MAIN MODE}/parent::a
    Sleep    2
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    Log    Step 3
    Reload Page
    Wait Until Elements Are Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    timeout=35
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${COLOR DARK9 RGB}

10. Disabling storage warnings - Main storages
    [Tags]    C81562    mode
    [Setup]     Test Setup      disk3    disk2
#    @{disabled} =    Create List    disk3
#    @{backups} =    Create List     disk2
#    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

    Log    Step 1
#    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
#    Go to Servers
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    #Sleep    90
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100    3
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Storages Are Outdated and Refresh
    Wait Until Element is Visible with Retry    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Click Button      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE DISK 1}/ancestor::tr${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Element is Visible     ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}
    Element Style Should Be    ${RECORDING STOP WARNING}    color    ${ERROR COLOR WITH OPACITY}

    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}     ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}  
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    
    Log    Step 5
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT ICON}
    Mouse Over    ${STORAGE DELETION ALERT ICON}
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT TOOLTIP}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Verify New Files Are Not Recorded    disk1    30
    # ${files 3 disk1} =    Verify Recorded Video Files    disk1
    # Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

11. Disabling storage warnings - Backup storages
    [Tags]    C81564    mode    archive
    [Setup]     Test Setup      config storage=${False}
    Skip If Image Is    4.3_test    5.0_test      Backup Archive not supported with 5.0_test
    Log    Step 1
#    Log in to user and system    ${server 1['owner']}     ${server 1['cloud id']}
#    Go to Servers
    Wait Until Elements Are Visible With Retry   ${STORAGE LOCATIONS BLOCK}    ${STORAGE ADD BUTTON}    ${STORAGE ENABLED MAIN}    ${STORAGE ENABLED BACKUP}
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    ${status} =    Run Keyword And Return Status     Page Should Not Contain Element    ${ARCHIVE BACKUP STREAMS MSG}
    Run Keyword If    ${status}    Run Keywords
    ...    Click Element    ${ARCHIVE BACKUP CHECK BOX}    AND
    ...    Wait Until Elements Are Visible    ${ARCHIVE BACKUP STREAMS MSG}    ${ARCHIVE BACKUP CLIENT MSG}    ${SAVE BUTTON}    ${CANCEL BUTTON}    AND
    ...    Click Element    ${SAVE BUTTON}

    Log    Step 2
    ${files disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files disk0} > 0
    # Sleep    120
    ${files disk1} =    Wait Until Files Are Recorded    disk1    100    3
    Should Be True    ${files disk1} > 0

    Log    Step 3
    Wait Until Storages Are Outdated and Refresh
    Wait Until Element is Visible with Retry    ${STORAGE ENABLED BACKUP}/parent::button
    Click Button      ${STORAGE ENABLED BACKUP}/parent::button
    Wait Until Element is Visible    ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Click Link      ${STORAGE ENABLED BACKUP}/parent::button/following-sibling::div/ul/li${STORAGE NOT IN USE MODE}/parent::a
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${RECORDING STOP WARNING}    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}
    Element Style Should Be    ${RECORDING STOP WARNING}    color    ${ERROR COLOR WITH OPACITY}
    
    Log    Step 4
    Sleep    2
    Click Button    ${SAVE BUTTON}
    Run Keyword and Continue on Failure    Wait Until Elements Are Visible    ${STORAGE LOADING ICON}    ${STORAGE CHANGING MODE}   timeout=5
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE LOADING ICON}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE CHANGING MODE}    color    ${DISABLED STORAGE COLOR}
    Run Keyword and Continue on Failure    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}     ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}
    Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}     ${RECORDING STOP WARNING}
    Element Style Should Be    ${STORAGE DISK 1}/preceding-sibling::${STORAGE LOCAL ICON}    color    ${DISABLED STORAGE COLOR}
    Element Style Should Be    ${STORAGE DISK 1}/ancestor::tr${STORAGE NOT IN USE MODE}/parent::button    color    ${COLOR DARK9 RGB}
    Element Style Should Be    ${STORAGE DISK 1}    color    ${DISABLED STORAGE COLOR}
    
    Log    Step 5
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT ICON}
    Mouse Over    ${STORAGE DELETION ALERT ICON}
    Wait Until Element Is Visible    ${STORAGE DELETION ALERT TOOLTIP}

    Log    Step 6
    ${files 3 disk0} =    Wait Until Files Are Recorded    disk0    100
    Should Be True    ${files 3 disk0} > ${files disk0}
    Verify New Files Are Not Recorded    disk1    30
    # Sleep    15
    # ${files 3 disk1} =    Verify Recorded Video Files    disk1
    # Should Be True    ${files 3 disk1} == ${files disk1} or ${files 3 disk1} < ${files disk1}

