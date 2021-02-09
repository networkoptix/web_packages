*** Settings ***
Resource          ../resource.robot
Suite Setup       Storage Suite Setup
#Test Setup        Server Settings Test Setup    qaburbank@gmail.com    ${AUTO TESTS SYSTEM ID}
Test Teardown     Restart
Suite Teardown    Storage Suite Teardown
Force Tags        storage

*** Variables ***
${password}    ${BASE PASSWORD}    
${url}         ${ENV}
${storage string 1}    ${EMPTY}
${storage string 2}    ${EMPTY}
${camera}      00-0D-F1-20-B5-02
${disk location}    /media/nxwitness-storages/disk1

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    Reset to Default Storage Config

*** Test Cases ***
Analytics DB Storage dropdown is not visible
    [Tags]    C81740    Analytics
    Log in to user and system    ${owner}     ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}    timeout=120
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element Is Not Visible    ${ANALYTICS DROPDOWN}
    
# Analytics DB Storage Dropdown is Visible Analytics Plugin Enabled
    # [Tags]    C81754    Analytics
    # ${response} =    Turn On Analytics    https://${QA BURBANK IP}:${port0}
    # Log    ${response}
    # Log in to user and system    ${owner}     ${sysId0}
    # Wait Until Element is Visible    ${SERVERS LINK}    timeout=120
    # Click Link    ${SERVERS LINK}
    # Verify on Servers Page
    # Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    
# Analytics DB Storage Dropdown is Visible Analytics Data Exists
    # ${response} =    Turn On Analytics    https://${QA BURBANK IP}:${port0}
    # Log    ${response}
    # Wait Until Analytics Data Exists    30    30    disk0    ${camera}    storage0-${random}
    # [Tags]    C81755    Analytics             
    # Log in to user and system    ${owner}     ${sysId0}
    # Wait Until Element is Visible with Retry    ${SERVERS LINK}    
    # Click Link    ${SERVERS LINK}
    # Verify on Servers Page
    # Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    # Element Should Contain    ${ANALYTICS DROPDOWN}    disk0

    
Storages order in "Analytics DB Storage" dropdown
    [Tags]    C81757    Analytics
    @{menu order}    Create List    
    @{dropdown order}    Create List  
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}    timeout=120
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //span[contains(text(),"disk3") and @class="ellipsis"]
    @{storages} =    Get WebElements    //span[contains(text(),"disk") and @class="ellipsis"]
    # @{reserved} =    Get WebElements    //span[contains(text(),"Reserved")]/ancestor::td/preceding-sibling::td//span[contains(text(),"disk") and @class="ellipsis"]
    # Remove Values From List    ${storages}    @{reserved}
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${menu order}    ${disk}
    END  
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Click Button    ${ANALYTICS DROPDOWN}
    @{storages} =    Get WebElements    //a[@tabindex="0"]/span[contains(text(),"disk")]
    FOR    ${storage}    IN    @{storages}
        ${disk} =    Get Text    ${storage}
        Append To List    ${dropdown order}    ${disk}
    END  
    Lists Should Be Equal    ${menu order}    ${dropdown order}
    
Cancel Changing "Analytics DB Storage"
    [Tags]    C81778    Analytics
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}    timeout=120
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk0
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
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}    timeout=120
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Log    Step 1 - C81779
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk0
    Log    Step 2 - C81779
    Click Button    ${ANALYTICS DROPDOWN}
    Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Click Element    //a[@tabindex="0"]/span[contains(text(),"disk1")]
    Log    Step 3 - C81779
    Wait Until Element is Visible     ${SAVE BUTTON} 
    Click Button    ${SAVE BUTTON} 
    Log    Step 4 - C81779
    ${response} =    Turn On Analytics    https://${QA BURBANK IP}:${port0}
    Log    ${response}
    Reload Page
    Log    C81754
    Wait Until Element is Visible with Retry    ${ANALYTICS DROPDOWN}
    Log To Console    C81754 ....... | PASS |
    Log    Step 5 - C81779
    Wait Until Analytics Data Exists    30    30    disk1    ${camera}    storage0-${random}
    Log To Console    C81779 ....... | PASS | 
    Log    ${response}
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
    Select Window    ${tabs}[1]
    Wait Until Location Contains    ${SUPPORT URL}
    Log    Step 4 - C81775
    Close Window
    Select Window    ${tabs}[0]
    Wait Until Element is Visible    ${CS MODAL CLOSE BUTTON}    
    Click Button    ${CS MODAL CLOSE BUTTON}
    Wait Until Element is Visible    ${ANALYTICS DROPDOWN}
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk1
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
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk1
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
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk2
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 6 - C81776
    Check Analytics Data is Present    disk2    ${camera}    storage0-${random}    keep=${TRUE}
    Log To Console    C81776 ....... | PASS |
    Log    Step 1 - C81777 - done above
    # Sleep    600
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
    Element Should Contain    ${ANALYTICS DROPDOWN}    disk1
    Elements Should Not Be Visible
    ...    ${SAVE BUTTON}
    ...    ${CANCEL BUTTON}
    Log    Step 4 - C81777
    Sleep    20
    Check Analytics Data is Present    disk1    ${camera}    storage0-${random}
    Run Keyword and Expect Error    *    Check Analytics Data is Present    disk2    ${camera}    storage0-${random}
    Log To Console    C81777 ....... | PASS |
    
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

# reserved tooltip not seen by selenium
# Storage Location Table Reserved Tooltip Shows
    # Log in to user and system    ${owner}     ${sysId0}
    # Wait Until Element is Visible    ${SERVERS LINK}
    # Click Link    ${SERVERS LINK}
    # Verify on Servers Page
    # Wait Until Element is Visible    ${STORAGE RESERVED MODE}
    # Sleep    5
    # Mouse Over    ${STORAGE RESERVED MODE}/following-sibling::svg-icon
    # Wait Until Element Is Visible    ${STORAGE SYSTEM TOOLTIP}

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

Change Storage from Main to Backup
    @{disabled} =    Create List    disk3
    @{backups} =    Create List    disk1 
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}  
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Main")]
    Click Button      //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Main")]/parent::button
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Main")]/parent::button/following-sibling::div/ul/li//span[contains(text(), "Backup")]/parent::a
    Click Link      //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Main")]/parent::button/following-sibling::div/ul/li//span[contains(text(), "Backup")]/parent::a
    Wait Until Element is Visible    //button[text()='${SAVE BUTTON TEXT}']
    Click Button    //button[text()='${SAVE BUTTON TEXT}'] 
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Backup")]

Change Storage from Backup to Not in Use 
    @{disabled} =    Create List    disk3
    @{backups} =    Create List    disk1    disk2 
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}  
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Backup")]
    Click Button      //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Backup")]/parent::button
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Backup")]/parent::button/following-sibling::div/ul/li//span[contains(text(), "Not in use")]/parent::a
    Click Link     //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Backup")]/parent::button/following-sibling::div/ul/li//span[contains(text(), "Not in use")]/parent::a 
    Wait Until Element is Visible    //button[text()='${SAVE BUTTON TEXT}']
    Click Button    //button[text()='${SAVE BUTTON TEXT}']   
    Wait Until Element is Visible    ${STORAGE CHANGING MODE}
    Wait Until Element is Visible    //span[contains(text(),"disk2")]/ancestor::tr//span[contains(text(), "Not in use")]


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

Detailed Info button works system has multiple storages
    Log in to user and system    ${owner}     ${sysId0}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//table[contains(@class, "nx-table")]

Detailed Info button works (system has one storage)
    Log in to user and system    ${owner}     ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element is Visible       ${STORAGE INFO BUTTON}
    Click Button     ${STORAGE INFO BUTTON}
    Wait Until Element is Visible      //nx-system-metrics-component//nx-single-entity//header/span[contains(text(), ${STATE TEXT})]

# Add External Storage validation FUTURE (need to figure out how to add external storage)
    # Log in to user and system    ${owner}     ${sysId0}
    # Wait Until Element is Visible    ${SERVERS LINK}
    # Click Link    ${SERVERS LINK}
    # Verify on Servers Page
    # Wait Until Element is Visible     ${STORAGE ADD BUTTON}
    # Wait Until Element is Enabled     ${STORAGE ADD BUTTON}
    # Click Button    ${STORAGE ADD BUTTON}
    # Verify Add Storage Dialog
    # Log    All Required Check
    # Click Button    ${AS MODAL SUBMIT BUTTON}
    # Wait Until Elements are Visible
    # ...    ${AS MODAL URL INPUT ERROR}
    # ...    ${AS MODAL URL REQUIRED}
    # ...    ${AS MODAL LOGIN INPUT ERROR}
    # ...    ${AS MODAL LOGIN REQUIRED}
    # ...    ${AS MODAL PASSWORD INPUT ERROR}
    # ...    ${AS MODAL PASSWORD REQUIRED}
    # Log    Valid URL check
    # Press Keys     ${AS MODAL URL INPUT}     //ComputerNameNoFolder
    # Wait Until Elements Are Visible
    # ...    ${AS MODAL URL INPUT ERROR}
    # ...    ${AS MODAL URL INVALID}
    # Delete All Text     ${AS MODAL URL INPUT}
    # Press Keys      ${AS MODAL URL INPUT}        //ComputerName/FolderName
    # Wait Until Element is Visible     ${AS MODAL URL NOT INVALID}
    # Log    Invalid login and/or password with non-existent url
    # Press Keys      ${AS MODAL LOGIN INPUT}      pi
    # Press Keys      ${AS MODAL PASSWORD INPUT}     ${password}
    # Click Button    ${AS MODAL SUBMIT BUTTON}
    # Wait Until Element is Visible       ${AS FAILED TO ADD TOAST}
    # Wait Until Elements Are Not Visible
    # ...     //nx-modal-add-storage
    # ...     //app-toasts
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
    Wait Until Element is Visible with Retry    ${SERVERS LINK}
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