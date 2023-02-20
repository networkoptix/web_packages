*** Settings ***
Resource          ../../resource.robot
Resource          system-user-resource.robot
Resource          system-admin-resource.robot

*** Keywords ***

Verify Server Buttons Are Enabled
    Wait Until Elements are Enabled
    ...    ${PORT INPUT}
    ...    ${RESTART SERVER BUTTON}


Verify Rename Dialog
    Wait Until Elements are Visible
    ...    ${RENAME SERVER FORM}
    ...    ${RENAME SAVE BUTTON}
    ...    ${RENAME CANCEL BUTTON}
    ...    ${RENAME CLOSE BUTTON}
    ...    ${RENAME SERVER INPUT}

Verify Restart Dialog
    Wait Until Elements Are Visible  
    ...    ${RESTART DIALOG CLOSE BUTTON}  
    ...    ${RESTART DIALOG CANCEL BUTTON} 
    ...    ${RESTART DIALOG RESTART BUTTON}  

Select Server By Name
    [Arguments]    ${server name}
    Verify on Servers Page
    Wait Until Element is Visible    //nx-level-3-item/a//span/nx-search-highlight[contains(text(),"${server name}")]    120
    Sleep    5
    Click Link    //nx-level-3-item/a//span/nx-search-highlight[contains(text(),"${server name}")]/../../..
    Verify on Servers Page

Change Port To
    [Arguments]    ${port}
    Input Text    ${PORT INPUT}    ${port}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL} 
    
Test Every Loglevel Option
    [Arguments]    ${dropdown}    ${id}    ${server url}
    FOR    ${option}    IN    @{LOGLEVEL OPTIONS}
        Set Log Level Option    ${dropdown}    ${id}    ${option}
        Evaluate Log Level via API    ${server['local auth']}    ${server url}    ${id}    ${option}
    END

Set Log Level Option
    [Arguments]    ${dropdown}    ${id}    ${option}
    Click Element    ${dropdown}
    Click Element    //div[@aria-labelledby="${id}"]//a/span[text()="${option}"]
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}

Verify Storage Elements
    Wait Until Elements are Visible
    ...    ${STORAGE LOCATIONS BLOCK}
    ...    ${STORAGE ADD BUTTON}
    ...    ${STORAGE REINDEXING BLOCK}
    ...    ${STORAGE REINDEX MAIN BUTTON}

Verify Add Storage Dialog
    Wait Until Elements Are Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${ADD EXTERNAL STORAGE HEADER}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL URL INPUT}
    ...    ${AS MODAL LOGIN INPUT}
    ...    ${AS MODAL PASSWORD INPUT}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}

Server Advanced Settings Suite Setup
    Open Browser and go to URL    ${url}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Set Suite Variable    ${server}     ${servers}[0]
    Go to    ${url}
    Run Keyword If    '''${mode}'''=='''cloud'''    Set Suite Variable     ${user in charge}    ${server}[cloudOwner]
    ...    ELSE   Set Suite Variable     ${user in charge}    admin
    Sleep    20

Advanced Server Settings Test Setup
    [Arguments]    ${server}=&{server}    ${user}=${user in charge}    ${verify}=${True}
    Skip If Irrelevant
    IF    '''${mode}'''=='''cloud'''
        Cloud Test Setup System Servers Advanced    ${server}    ${user}    ${verify}
    ELSE
        Web Admin Test Setup System Servers Advanced    ${server}    ${user}    ${verify}
    END

Cloud Test Setup System Servers Advanced
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to system new   ${server}    ${user}    validate=${True}
    Wait Until Element is Visible    ${SERVERS LINK}
    Sleep    1
    Click Link    ${SERVERS LINK}
    Verify on Servers Page

Web Admin Test Setup System Servers Advanced
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to system    ${server}    ${user}    validate=${True}
    Wait Until Element is Visible    ${SERVERS LINK}
    Sleep    1
    Click Link    ${SERVERS LINK}
    Verify on Servers Page

Advanced Server Test Teardown
    Log out

Server Advanced Settings Suite Teardown
    Close All Browsers
    Teardown Servers    ${servers}

Server Settings Suite Setup
    Open Browser and go to URL    ${url}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers}=    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Change server name via API    ${server auth}    server 1    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]
    Change server name via API    ${server auth}    server 2    ${servers}[1][id]    https://${QA BURBANK IP}:${servers}[1][port][0]
    IF    '''${mode}'''=='''cloud'''
        system-server-resource.Cloud Suite Setup
    ELSE
        system-server-resource.Web Admin Suite Setup
    END

Web Admin Suite Setup
    Set Suite Variable    ${user in charge}    admin
    #sleep    120
    Merge Systems Local    ${server auth}    admin:${password}    https://${QA BURBANK IP}:$${servers}[0][port]   ${QA BURBANK IP}:$${servers}[1][port]    currentPassword=${password}
    Sleep    120
    #Open Browser and go to URL    https://${QA BURBANK IP}:${server 1['port']}
    #Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]
    #Log In    admin    ${password}
    #Wait Until Element is Visible    ${SERVERS LINK}
    #Click Link    ${SERVERS LINK}
    #Sleep    5
    #Select Server By Name    server 1
    #Wait Until Element is Visible    //header//button[@id="accountSettingsSelect"]
    #click button    //header//button[@id="accountSettingsSelect"]
    #Wait Until Element Is Visible    //header//a/span[text()="Log Out"]
    #Click Link    //header//a/span[text()="Log Out"]/..

    @{local users}=   Reset Local Users    ${server auth}    $${servers}[0][token]    https://${QA BURBANK IP}:$${servers}[0][port]    password=${password}
    Set Suite Variable    ${admin}          Local+${local users[1]}
    Set Suite Variable    ${viewer}         Local+${local users[4]}
    Set Suite Variable    ${live viewer}    Local+${local users[3]}
    Set Suite Variable    ${adv viewer}     Local+${local users[0]}
    Set Suite Variable    ${custom}         Local+${local users[2]}
    Execute Command Remotely    docker container stop $${servers}[1][id]

Cloud Suite Setup
    Log in to user and system    ${servers}[0][cloudOwner]    ${servers}[0][id]    password=${password}
    Go to Servers
    Verify on Servers Page    timeout=120

    Go To    ${ENV}/systems/${servers}[1][id]
    Sleep    5
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Common Restart Logout    ${ENV}
    #Sleep    120

    Log in to user and system    ${servers}[0][cloudOwner]    ${servers}[0][id]    password=${password}
    Sleep    10
    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out

    Log in to user and system    ${servers}[0][cloudOwner]    ${servers}[2][id]    password=${password}

    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out
    Open Browser and go to URL    ${ENV}
    Execute Command Remotely    docker container stop ${servers}[1][name]


Server Settings Suite Tear Down
    teardown servers    ${servers}

    Close All Connections
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${server}=${servers}[0]    ${user}=${servers}[0][cloudOwner]    ${verify}=${True}
    Skip If Irrelevant
    IF    '''${mode}'''=='''cloud'''
        Cloud Test Setup System Servers    ${server}    ${user}    ${verify}
    ELSE
        Web Admin Test Setup System Servers    ${server}    ${user}    ${verify}
    END

Cloud Test Setup System Servers
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to user and system    ${user}    ${server}[id]    password=${password}
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Go To Servers
    Run Keyword If    ${verify}    Verify on Servers Page    timeout=120

Web Admin Test Setup System Servers
    [Arguments]    ${server}    ${user}    ${verify}
    Open Browser and go to URL    https://${QA BURBANK IP}:${server}[port]
    Log In Web Admin    ${user}    ${password}    ${verify}
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Click Link    ${SERVERS LINK}

Server Settings Test Teardown
    IF    '''${mode}'''=='''cloud'''
        Common Restart Logout    ${ENV}
    ELSE
        Close Browser
    END
    Run Keyword If Test Failed    Run Keywords
        ...    Change server name via API    ${server auth}    server 1    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]    AND
        ...    Execute Command Remotely    docker container stop ${servers}[1][id]

Cloud Test Teardown
    Common Restart Logout    ${ENV}
    Run Keyword If Test Failed    Run Keywords
        ...    Change server name via API    ${server auth}    server 1    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]    AND
        ...    Execute Command Remotely    docker container stop ${servers}[1][name]

Web Admin Test Teardown
    Close Browser