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
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${server name}")]    120
    Sleep    5
    Click Link    //nx-level-3-item/a//span[contains(text(),"${server name}")]/../..
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
    ${random} =	   Generate Random String   length=5
    Set Suite Variable     ${random}    ${random}
    ${owner}=    Register and activate account with random email    mark    hamil    ${password}
    ${server} =    Create Base System    servers_advanced-${random}    owner=${owner}    storage string=-v recordings:/recordings  
    Set Suite Variable    &{server}    &{server} 
    Go to    ${url}
    Run Keyword If    '''${mode}'''=='''cloud'''    Set Suite Variable     ${user in charge}    ${server}[owner]
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
    Log in to system    ${server}    ${user}    validate=${True}
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
    Delete Base System    ${server}

Server Settings Suite Setup
    Open Browser and go to URL    ${url}
    ${owner}=    Register and activate account with random email    mark    hamil    ${password}
    Set Suite Variable    ${user in charge}    ${owner}
    @{auth}=    Create List    ${user in charge}    ${password}
    Set Suite Variable    ${auth}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # We setup one server manually here because we need 2 ports
    ${random}=    Generate Random String      length=5
    ${port 1}=   Get Random Available Port
    Set Suite Variable    ${port 1}
    ${extra port}=  Get Random Available Port
    Set Suite Variable    ${extra port}
    IF    '5.0' not in $image
        Set Local Variable   ${vms}    old
    ELSE
        Set Local Variable    ${vms}    new
    END
    ${ENV NO HTTP}=   Replace String    ${ENV}    https://    ${EMPTY}
    ${id}=   Execute Command    docker run -d --restart always -p ${port 1}:7001 -p ${extra port}:7002 --name servers1-${random} -e VMS=${vms} -e CLOUD_HOST=${ENV NO HTTP} ${IMAGE}
    ${cont id 1}=    Evaluate    $id[:12]
    Sleep    5
    Setup Local System    https://${QA BURBANK IP}:${port 1}    ${password}    servers1-${random}
    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${port 1}    ${server auth}    Server ${cont id 1}
    ${server 1}=   Create Dictionary    contId=${cont id 1}    port=${port 1}    serverId=${server 1 id}
    IF    '''${mode}'''=='''cloud'''
        ${server 2}=    Create Base System    servers2-${random}    owner=${user in charge}
    ELSE
        ${server 2}=    Create Base System    servers2-${random}
    END
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${server 2}[port]    ${server auth}    Server ${server 2}[id]
    IF    '''${mode}'''=='''cloud'''
        ${server 3}=    Create Base System    servers3-${random}    owner=${user in charge}
    ELSE
        ${server 3}=    Create Base System    servers3-${random}
    END
    Change server name via API    ${server auth}    server 1    ${server 1 id}    https://${QA BURBANK IP}:${port 1}
    Change server name via API    ${server 2}[local auth]    server 2    ${server 2 id}    https://${QA BURBANK IP}:${server 2}[port]
    FOR    ${i}    IN RANGE    1    4
        Set Suite Variable    ${server ${i}}
    END
    IF    '''${mode}'''=='''cloud'''
        system-server-resource.Cloud Suite Setup
    ELSE
        system-server-resource.Web Admin Suite Setup
    END

Web Admin Suite Setup
    Set Suite Variable    ${user in charge}    admin
    #sleep    120
    Merge Systems Local    ${server auth}    admin:${password}    https://${QA BURBANK IP}:${server 1}[port]   ${QA BURBANK IP}:${server 2}[port]    currentPassword=${password}
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

    @{local users}=   Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1}[port]    password=${password}
    Set Suite Variable    ${admin}          Local+${local users[1]}
    Set Suite Variable    ${viewer}         Local+${local users[4]}
    Set Suite Variable    ${live viewer}    Local+${local users[3]}
    Set Suite Variable    ${adv viewer}     Local+${local users[0]}
    Set Suite Variable    ${custom}         Local+${local users[2]}
    Execute Command Remotely    docker container stop ${server 2}[id]

Cloud Suite Setup
    Go to    ${ENV}

    ${sysId1}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${server 1}[port]    2serverstest1    ${user in charge}    ${password}
    Set To Dictionary    ${server 1}    sysId=${sysId1}
    Set To Dictionary    ${server 2}    sysId=${server 2}[cloud id]
    Set To Dictionary    ${server 3}    sysId=${server 3}[cloud id]

    Log in to user and system    ${user in charge}    ${server 1}[sysId]    password=${password}
    Go to Servers
    Verify on Servers Page    timeout=120

    Go To    ${ENV}/systems/${server 2}[sysId]
    Sleep    5
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Sleep    300
    Common Restart Logout    ${ENV}
    cdb Merge Cloud Systems    ${server 1}[sysId]    ${server 2}[cloud id]    ${server 2}[owner]    ${password}
    Sleep    120

    ${users}=    Register and Activate Generic Users    password=${password}
    Set Suite Variable    ${admin}          ${users}[cloudAdmin]
    Set Suite Variable    ${viewer}         ${users}[viewer]
    Set Suite Variable    ${live viewer}    ${users}[liveViewer]
    Set Suite Variable    ${adv viewer}     ${users}[advancedViewer]
    Set Suite Variable    ${custom}         ${users}[custom]
    Add user to cloud system if not there    ${server 1}[sysId]    cloudAdmin        ${admin}          auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    viewer            ${viewer}         auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    advancedViewer    ${adv viewer}     auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    custom            ${custom}         auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    liveViewer        ${live viewer}    auth=${auth}

    Log in to user and system    ${user in charge}    ${server 1}[sysId]    password=${password}
    Sleep    10
    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out

    Log in to user and system    ${user in charge}    ${server 3}[sysId]    password=${password}

    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out
    Open Browser and go to URL    ${ENV}
    Execute Command Remotely    docker container stop ${server 2}[id]


Server Settings Suite Tear Down
    FOR    ${i}    IN RANGE    1    4
        Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server ${i}}[sysId]    ${password}    ${user in charge}
    END

    Execute Command Remotely     docker container rm -f ${server 1}[contId] ${server 2}[id] ${server 3}[id]

    FOR    ${user}    IN    ${admin}    ${viewer}    ${live viewer}    ${adv viewer}    ${custom}
        Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${user}    ${password}
    END

    Close All Connections
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${server}=${server 1}    ${user}=${user in charge}    ${verify}=${True}
    Skip If Irrelevant
    IF    '''${mode}'''=='''cloud'''
        Cloud Test Setup System Servers    ${server}    ${user}    ${verify}
    ELSE
        Web Admin Test Setup System Servers    ${server}    ${user}    ${verify}
    END

Cloud Test Setup System Servers
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to user and system    ${user}    ${server}[sysId]    password=${password}
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
        ...    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]    AND
        ...    Execute Command Remotely    docker container stop ${server 2}[id]

Cloud Test Teardown
    Common Restart Logout    ${ENV}
    Run Keyword If Test Failed    Run Keywords
        ...    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]    AND
        ...    Execute Command Remotely    docker container stop ${server 2}[id]

Web Admin Test Teardown
    Close Browser