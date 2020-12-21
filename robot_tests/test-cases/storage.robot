*** Settings ***
Resource          ../resource.robot
Suite Setup       Storage Suite Setup
#Test Setup        Server Settings Test Setup    qaburbank@gmail.com    ${AUTO TESTS SYSTEM ID}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Storage Suite Teardown
Force Tags        storage

*** Variables ***
${email}       qaburbank@gmail.com
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}
${storage string}    ${EMPTY}

*** Keywords ***
Server Settings Test Setup
    [Arguments]    ${email}    ${system id}
    Log in to user and system    ${email}    cdd3a885-5d66-4f49-b708-84ab99828da6
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}

Storage Suite Setup
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
    
    FOR    ${n}    IN RANGE    5
        Open Connection    ${QA BURBANK IP}
        SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
        ${results}    Execute Command     dd if=/dev/zero of=disk${n}-${random}.img bs=1M count=12000    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mkfs -t ext4 disk${n}-${random}.img    sudo=True    sudo_password=${QA BURBANK PASS}    
        ${results}    Execute Command     mkdir disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mount -t auto -o loop disk${n}-${random}.img disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}
        Close Connection 
        Exit For Loop if    ${n} > 3        
        ${storage string} =    Catenate    ${storage string}    --mount type=bind,source="/home/qaburbank/disk${n}-${random}",target=/disk${n}  
    END
    
    ${storage string} =    Get Substring    ${storage string}    1     

    ${port} =    Create Docker Server    storage0-${random}    4.1_test    ${storage string}    
    Set Suite Variable    ${port0}    ${port[0]}
    Sleep     10
    Setup Local System    https://${QA BURBANK IP}:${port0}    ${BASE PASSWORD}    ${system names[0]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port0}    ${system names[0]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId0}    ${sysId}
    Sleep    10
    Close Connection
    
    ${port} =    Create Docker Server    storage1-${random}    4.1_test    --mount type=bind,source="/home/qaburbank/disk4-${random}",target=/disk4  
    Set Suite Variable    ${port1}    ${port[0]}
    Sleep     10
    Setup Local System    https://${QA BURBANK IP}:${port1}    ${BASE PASSWORD}    ${system names[1]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port1}    ${system names[1]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId1}    ${sysId}
    Sleep    10
    Close Connection    
    
    ${SUITE AUTO TESTS USERS} =    Create Dictionary
    ...    ${viewer}=viewer
    ...    ${adv viewer}=advancedViewer
    ...    ${live viewer}=liveViewer
    ...    ${not owner}=viewer
    ...    ${admin}=cloudAdmin
    ...    ${custom}=custom

    Set Suite Variable    ${SUITE AUTO TESTS USERS}    ${SUITE AUTO TESTS USERS} 
    
    FOR    ${user email}   ${user role}    IN ZIP   ${SUITE AUTO TESTS USERS.keys()}     ${SUITE AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${sysId0}    ${user role}    ${user email}    ${auth}
    END
    
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}
    
    Open Browser and go to URL    ${url}
    
    Verify Storages    ${sysId0}    4
    Verify Storages    ${sysId1}    1
    
    
    

Storage Suite Teardown
    Disconnect Server via API    ${auth}    ${sysId0}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId1}    ${password}    ${owner}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop storage0-${random} storage1-${random}
    ${results}    Execute Command    docker container rm storage0-${random} storage1-${random}
    Close Connection
    FOR    ${n}    IN RANGE    5
        Open Connection    ${QA BURBANK IP}
        SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
        ${results}    Execute Command     umount disk${n}-${random}     sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     rm disk${n}-${random}.img     sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     rm -d disk${n}-${random}/     sudo=True    sudo_password=${QA BURBANK PASS}
        Close Connection
    END 
    
    FOR    ${user email}   IN ZIP  ${SUITE AUTO TESTS USERS.keys()}     
        Delete Account    ${ENV}    ${user email}    ${password}   
    END
    
    Close All Browsers
        
Verify Storages
    [Arguments]    ${system}    ${storages number}
    Log in to user and system    ${owner}     ${system}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Wait Until Element is Visible    //span[contains(text(),"disk") and @class="ellipsis"]
    ${disks} =    Get Element Count    //span[contains(text(),"disk") and @class="ellipsis"]
    Should be Equal as Numbers    ${disks}    ${storages number} 
    Capture Page Screenshot
    Log Out

Set Default Storage Config
    [Arguments]    ${server url}
    ${storages} =    Get Storages via API    ${server url}
    ${storages string} =    Convert To String    ${storages}
    ${storages string} =    Replace String    ${storages string}    '    "
    ${storages string} =    Replace String    ${storages string}    False    "False"
    ${storages string} =    Replace String    ${storages string}    True    "True"
    ${storages dict} =    Evaluate    json.loads("""${storages string}""")    json
    FOR    ${n}    IN RANGE    4
        ${url} =    Set variable    ${storages dict[${n}]['url']}
        ${disabled disk} =    Run Keyword And Return Status    Should Contain Any    ${url}    disk2    disk3    
        ${backup} =    Run Keyword And Return Status    Should Contain    ${url}    disk1
        Run Keyword If    ${disabled disk}   Run Keywords    
        ...    Set To Dictionary    ${storages dict[${n}]}    usedForWriting    ${FALSE}    AND
        ...    Set To Dictionary    ${storages dict[${n}]}    isBackup    ${FALSE}    
        ...    ELSE IF    ${backup}    Run Keywords
        ...    Set To Dictionary    ${storages dict[${n}]}    isBackup     ${TRUE}    AND
        ...    Set To Dictionary    ${storages dict[${n}]}    usedForWriting    ${TRUE}
        ...    ELSE    Run Keywords    
        ...    Set To Dictionary    ${storages dict[${n}]}    usedForWriting    ${TRUE}    AND
        ...    Set To Dictionary    ${storages dict[${n}]}    isBackup    ${FALSE}   
    END 
    Save Storages via API    ${storages dict}    ${server url}

*** Test Cases ***


    
# Analytics DB Storage Dropdown Warning Shows FUTURE (a system storage needs to be chosen)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Wait Until Element is Visible    ${ANALYTICS WARNING}

# Change Storage used for Analytics data FUTURE (need other storages to select)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Click Button     ${ANALYTICS DROPDOWN}
#     ${new storage url}=      /someOther/storageUrl
#     Click Link      ${ANALYTICS DROPDOWN}/following-sibling::div/ul/li/a/span[contains(text(), "${new storage url}")]
#     Wait Until Element is Visible     ${STORAGE CHANGING MODE}/span[contains(text(), "${new storage url}")]

# Change Storage for Analytics Data with Existing Analytics Data Close Button FUTURE (need a storage with existing analytics data)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Click Button     ${ANALYTICS DROPDOWN}
#     ${new storage url}=      /currentStorage/HasAnalyticsData
#     Click Link      ${ANALYTICS DROPDOWN}/following-sibling::div/ul/li/a/span[contains(text(), "${new storage url}")]
#     Wait Until Element is Visible     ${CHANGE ANALYTICS MODAL}
#     Click Button    ${CS MODAL CLOSE BUTTON}
#     Wait Until Element Is Not Visible    ${CHANGE ANALYTICS MODAL}

# Change Storage for Analytics Data with Existing Analytics Data Cancel Button FUTURE (need a storage with existing analytics data)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Click Button     ${ANALYTICS DROPDOWN}
#     ${new storage url}=      /currentStorage/HasAnalyticsData
#     Click Link      ${ANALYTICS DROPDOWN}/following-sibling::div/ul/li/a/span[contains(text(), "${new storage url}")]
#     Wait Until Element is Visible     ${CHANGE ANALYTICS MODAL}
#     Click Button    ${CS MODAL CANCEL BUTTON}
#     Wait Until Element Is Not Visible    ${CHANGE ANALYTICS MODAL}

# Change Storage for Analytics Data with Existing Analytics Data Keep Button FUTURE (need a storage with existing analytics data)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Click Button     ${ANALYTICS DROPDOWN}
#     ${new storage url}=      /currentStorage/HasAnalyticsData
#     Click Link      ${ANALYTICS DROPDOWN}/following-sibling::div/ul/li/a/span[contains(text(), "${new storage url}")]
#     Wait Until Element is Visible     ${CHANGE ANALYTICS MODAL}
#     Click Button    ${CS MODAL KEEP BUTTON}
#     # can also check that metadataStorageChangePolicy = 'keep' in /api/systemSettings
#     Wait Until Element Is Not Visible    ${CHANGE ANALYTICS MODAL}

# Change Storage for Analytics Data with Existing Analytics Data Keep Button FUTURE (need a storage with existing analytics data)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
#     Click Button     ${ANALYTICS DROPDOWN}
#     ${new storage url}=      /currentStorage/HasAnalyticsData
#     Click Link      ${ANALYTICS DROPDOWN}/following-sibling::div/ul/li/a/span[contains(text(), "${new storage url}")]
#     Wait Until Element is Visible     ${CHANGE ANALYTICS MODAL}
#     Click Button    ${CS MODAL DELETE BUTTON}
#     # can also check that metadataStorageChangePolicy = 'remove' in /api/systemSettings
#     Wait Until Element Is Not Visible    ${CHANGE ANALYTICS MODAL}

# Storage Location Table Reserved Tooltip Shows FUTURE (need a reserved type storage - one that's too small)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${STORAGE RESERVED MODE}
#     Mouse Over    ${STORAGE RESERVED MODE}/following-sibling::svg-icon
#     Wait Until Element Is Visible    ${STORAGE SYSTEM TOOLTIP}

Storage Location Table Space Legend Tooltip Shows 
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}
    Mouse Over    ${STORAGE LOCATIONS FIRST SPACE}
    Wait Until Element is Visible    ${STORAGE LOCATIONS FIRST SPACE}/following-sibling::ngb-popover-window

Backup Option Disabled when only One Main Storage
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE MAIN MODE}
    Click Button      ${STORAGE MAIN MODE}/parent::button
    Wait Until Element is Visible    ${STORAGE BACKUP MENU ITEM}
    Wait Until Elements Are Visible    
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and text()="Backup"]
    ...    ${STORAGE DROPDOWN}//span[contains(@class, "disabled") and text()="Not in use"]

# Change Storage from Main to Backup FUTURE (need multiple storages for one to be changed to backup)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${STORAGE MAIN MODE}
#     Click Button      ${STORAGE MAIN MODE}/parent::button
#     Wait Until Element is Visible    ${STORAGE BACKUP MENU ITEM}
#     Click Button      ${STORAGE BACKUP MENU ITEM}
#     Wait Until Element is Visible    ${STORAGE CHANGING MODE}
#     Wait Until Element is Visible    ${STORAGE BACKUP MODE}
#     # may need to make this one wait a while?
#     Element Text Should Be    ${BACKUP}  Backup

# Change Storage from Backup to Not in Use FUTURE (need multiple storages; also need to figure out which row it would be in and add that targeting)
#     Verify on Servers Page
#     Wait Until Element is Visible    ${STORAGE BACKUP MODE}
#     Click Button      ${STORAGE BACKUP MODE}/parent::button
#     Wait Until Element is Visible    ${STORAGE NOT IN USE MENU ITEM}
#     Click Button      ${STORAGE NOT IN USE MENU ITEM}
#     Wait Until Element is Visible    ${STORAGE CHANGING MODE}
#     Wait Until Element is Visible    ${STORAGE NOT IN USE MODE}
#     # may need to make this one wait a while?
#     Element Text Should Be    ${NOT IN USE}  Not in use

Add Storage Close button works
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

Add Storage Cancel button works
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Click Button    ${AS MODAL CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${ADD STORAGE MODAL}

# Detailed Info button works (system has multiple storages) FUTURE
#     Verify on Servers Page
#     Wait Until Element is Visible       ${STORAGE INFO BUTTON}
#     Click Button     ${STORAGE INFO BUTTON}
#     Wait Until Element is Visible      //nx-system-metrics-component//table[contains(@class, "nx-table")]

Detailed Info button works (system has one storage)
    Log in to user and system    ${owner}     ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//nx-single-entity//header/span[contains(text(), ${STATE TEXT})]

Add External Storage validation
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    Click Button    ${STORAGE ADD BUTTON}
    Verify Add Storage Dialog
    Log    All Required Check
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Elements are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL REQUIRED}
    ...    ${AS MODAL LOGIN INPUT ERROR}
    ...    ${AS MODAL LOGIN REQUIRED}
    ...    ${AS MODAL PASSWORD INPUT ERROR}
    ...    ${AS MODAL PASSWORD REQUIRED}
    Log    Valid URL check
    Press Keys     ${AS MODAL URL INPUT}     //ComputerNameNoFolder
    Wait Until Elements Are Visible
    ...    ${AS MODAL URL INPUT ERROR}
    ...    ${AS MODAL URL INVALID}
    Delete All Text     ${AS MODAL URL INPUT}
    Press Keys      ${AS MODAL URL INPUT}        //ComputerName/FolderName
    Wait Until Element is Visible     ${AS MODAL URL NOT INVALID}
    Log    Invalid login and/or password with non-existent url
    Press Keys      ${AS MODAL LOGIN INPUT}      pi
    Press Keys      ${AS MODAL PASSWORD INPUT}     ${password}
    Click Button    ${AS MODAL SUBMIT BUTTON}
    Wait Until Element is Visible       ${AS FAILED TO ADD TOAST}
    Wait Until Elements Are Not Visible
    ...     //nx-modal-add-storage
    ...     //app-toasts
    # Only if valid url input
    # Wait Until Elements are Visible
    # ...     ${AS MODAL PASSWORD INVALID}
    # ...     ${AS MODAL PASSWORD INPUT ERROR}

# Add External Storage Success FUTURE (need valid URL/login/password to add)
#     Verify on Servers Page
#     Wait Until Element is Visible     ${STORAGE ADD BUTTON}
#     Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
#     Click Button    ${STORAGE ADD BUTTON}
#     Verify Add Storage Dialog
#     Press Keys      ${AS MODAL URL INPUT}        //ComputerName/FolderName
#     Press Keys      ${AS MODAL LOGIN INPUT}      pi
#     Press Keys      ${AS MODAL PASSWORD INPUT}     ${password}
#     Click Button    ${AS MODAL SUBMIT BUTTON}
#     # url text should have one less "/" in the start than when added
#     Wait Until Elements Are Visible
#     ...     not(${ADD STORAGE MODAL})
#     ...     ${STORAGE LOCATIONS TABLE}//tbody/tr/td[1]/span[contains(text(), "/ComputerName/FolderName")]

Reindexing Main Archive Tooltip Shows
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${STORAGE REINDEXING BLOCK}
    Sleep    2
    Mouse Over    ${STORAGE REINDEX MAIN BUTTON}
    Wait Until Element Is Visible    ${STORAGE REINDEXING BLOCK}//div[contains(@class, "tooltip-inner")]/p[contains(text(), "${REINDEX TOOLTIP FIRST}")]

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
