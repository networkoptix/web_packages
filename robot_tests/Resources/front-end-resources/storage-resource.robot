*** Keywords ***
Storage Suite Setup
    # ${value} sets the correct value needed to Turn On Analytics based on server version (currently the script below only supporting 4.3 and 4.1)
    ${value} =    Set Variable If    '${IMAGE}' == '${IMAGE 4.3}'    [\"{beee013e-d913-8f47-144f-2092371ee118}\"]    [\"{687611a2-fd30-94e7-7f4c-8705642b0bcc}\"]
    Set Suite Variable     ${value}    ${value}
    ${random} =	   Evaluate	    random.randint(0, sys.maxsize)
    Set Suite Variable     ${random}    ${random}
    ${loglevel} =    Set Loglevel    INFO
    ${ignore} =    Set Loglevel    ${loglevel}
    ${console} =    Set Variable If    '${loglevel}' != 'INFO'    yes    no
    Set Suite Variable    ${console}    ${console}
    # @{disk size} =    Create List    160000    40000    40000    12000    12000
    
    Log    Storage Suite Setup    DEBUG      console=${console}
    
    # FOR    ${account}    IN    owner    viewer    adv viewer    live viewer    not owner    admin    custom
        # ${random email} =    Register and activate account with random email    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${BASE PASSWORD}
        # Set Suite Variable    ${${account}}          ${random email}
    # END
    
    ${owner} =    Register and activate account with random email    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${BASE PASSWORD}
    Log    owner created ..... | PASS |    DEBUG      console=${console}
    
    # @{system names} =    Create List
    # ...    ${AUTO TESTS}
    # ...    ${AUTO TESTS 2}
    # ...    Auto Tests 3

    # @{auth}=    Create List    ${owner}    ${password}
    # Set Suite Variable    ${auth}    ${auth}



    # @{server auth}=   Create List    admin    qweasd 123
    # Set Suite Variable    ${server auth}    ${server auth}   
    
   
    #${storage string} =    Set Variable    -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v /data/:/opt/networkoptix/mediaserver/var -v /video:/recordings
    Make Directory    disk-invalid
    Log    disk-invalid created ..... | PASS |    DEBUG      console=${console}
    
    @{disk} =    Create List    ${EMPTY}    ${EMPTY}    ${EMPTY}    ${EMPTY}    ${EMPTY}
    Set Suite Variable    @{disk}    @{disk}
    FOR    ${n}    IN RANGE    5
        ${new disk} =     Create Virtual Disk    ${disk location}    disk${n}-${random}    ${disk size[${n}]}    disk${n}
        Set List Value    ${disk}    ${n}    ${new disk}
        Log    disk${n} mounted ..... | PASS |    DEBUG      console=${console}
        Run Keyword If    ${n} < 4     Catenate Storages One    ${disk[${n}]}[string]
        ...    ELSE     Catenate Storages Two    ${disk[${n}]}[string]
    END

    #${storage string 1} =    Get Substring    ${storage string 1}    1
    ${storage string 2} =    Get Substring    ${storage string 2}    1
    
    ${server 1} =    Create Base System    storage0-${random}    owner=${owner}    storage string=${storage string 1}
    Set Suite Variable    ${server 1}    ${server 1}
    # ${port} =    Create Docker Server    storage0-${random}    4.1_test    ${storage string 1}
    # Set Suite Variable    ${port0}    ${port['port']}
    # Sleep     10
    Log    docker ${server 1['name']} created ..... | PASS |    DEBUG      console=${console}
    # Setup Local System    https://${QA BURBANK IP}:${port0}    ${BASE PASSWORD}    ${system names[0]}
    # ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port0}    ${system names[0]}    ${owner}    ${BASE PASSWORD}
    # Set Suite Variable    ${sysId0}    ${sysId}
    # Sleep    10
    # Close Connection
    Log    ${server 1['name']} system created ..... | PASS |    DEBUG      console=${console}

    ${server 2} =    Create Base System    storage1-${random}    owner=${owner}    add users=${False}    storage string=${storage string 2}
    Set Suite Variable    ${server 2}    ${server 2}
    # ${port} =    Create Docker Server    storage1-${random}    4.1_test    ${storage string 2}
    # Set Suite Variable    ${port1}    ${port['port']}
    # Sleep     10
    Log    docker ${server 2['name']} created ..... | PASS |    DEBUG      console=${console}
    # Setup Local System    https://${QA BURBANK IP}:${port1}    ${BASE PASSWORD}    ${system names[1]}
    # ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port1}    ${system names[1]}    ${owner}    ${BASE PASSWORD}
    # Set Suite Variable    ${sysId1}    ${sysId}
    # Sleep    10
    # Close Connection
    Log   ${server 2['name']} system created ..... | PASS |    DEBUG      console=${console}

    ${server 3} =    Create Base System    storage2-${random}    owner=${owner}    add users=${False}
    Set Suite Variable    ${server 3}    ${server 3}
    # ${port} =    Create Docker Server    storage2-${random}    4.1_test
    # Set Suite Variable    ${port2}    ${port['port']}
    # Sleep     10
    Log    docker ${server 3['name']} created ..... | PASS |    DEBUG      console=${console}
    # Setup Local System    https://${QA BURBANK IP}:${port2}    ${BASE PASSWORD}    ${system names[2]}
    # ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port2}    ${system names[2]}    ${owner}    ${BASE PASSWORD}
    # Set Suite Variable    ${sysId2}    ${sysId}
    # Sleep    10
    # Close Connection
    Log    ${server 3['name']} system created ..... | PASS |    DEBUG      console=${console}

    # ${SUITE AUTO TESTS USERS} =    Create Dictionary
    # ...    ${viewer}=viewer
    # ...    ${adv viewer}=advancedViewer
    # ...    ${live viewer}=liveViewer
    # ...    ${not owner}=viewer
    # ...    ${admin}=cloudAdmin
    # ...    ${custom}=custom

    # Set Suite Variable    ${SUITE AUTO TESTS USERS}    ${SUITE AUTO TESTS USERS}

    # FOR    ${user email}   ${user role}    IN ZIP   ${SUITE AUTO TESTS USERS.keys()}     ${SUITE AUTO TESTS USERS.values()}
        # Add user to cloud system if not there    ${sysId0}    ${user role}    ${user email}    ${auth}
    # END
    Log    users added to ${server 1['name']} ..... | PASS |    DEBUG      console=${console}

    @{disabled} =    Create List    disk2    disk3
    @{backups} =    Create List    disk1
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}
    Log    default storage config set .....| PASS |    DEBUG      console=${console}

    Activate License    ${server 1['local auth']}    https://${QA BURBANK IP}:${server 1['port']}    ${TRIAL LICENSE}
    Sleep    5
    Log    trial license activated .....| PASS |    DEBUG      console=${console}

    Add Analytics stub plugin   ${server 1['name']}
    ${results} =    Add Camera    https://${QA BURBANK IP}:${server 1['port']}    ${camera user}    ${camera password}    ${camera}    ${camera url}    ${camera manufacturer}
    Log    ${results}
    Log    camera added ..... | PASS |    DEBUG      console=${console}

    Sleep    15
    # restarting server and creating inaccessible disk
    Restart Server    https://${QA BURBANK IP}:${server 1['port']}    ${server 1['cloud auth']}
    Sleep    3
    
    Remove Directory    disk-invalid
    Log    disk-invalid deleted ..... | PASS |    DEBUG      console=${console}
    Sleep    90
    
    Log    server restarted ..... | PASS |    DEBUG      console=${console}
    # ${results}    Execute Command    docker container port storage0-${random}
    # @{portnew}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    # Close Connection
    # Set Suite Variable    ${port0}    ${portnew[0]}

    # Sleep    30

    Open Browser and go to URL    ${url}
    Turn On Recording    ${server 1['owner']}    ${server 1['cloud id']}

    Verify Storages    ${server 1['owner']}    ${server 1['cloud id']}    5
    Verify Storages    ${server 1['owner']}    ${server 2['cloud id']}    1

Catenate Storages One
    [Arguments]    ${string}
    ${storage string 1} =    Catenate    ${storage string 1}    ${string}
    Set Suite Variable    ${storage string 1}    ${storage string 1}

Catenate Storages Two
    [Arguments]    ${string}
    ${storage string 2} =    Catenate    ${storage string 2}    ${string}
    Set Suite Variable    ${storage string 2}    ${storage string 2}

Storage Suite Teardown
    Delete Base System    ${server 1}
    Delete Base System    ${server 2}
    Delete Base System    ${server 3}
    # Disconnect Server via API    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${password}    ${owner}
    # Disconnect Server via API    ${server 2['cloud auth']}    ${server 2['cloud id']}    ${password}    ${owner}
    # Disconnect Server via API    ${server 3['cloud auth']}    ${server 3['cloud id']}    ${password}    ${owner}
    # Open Connection    ${QA BURBANK IP}
    # SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # ${results}    Execute Command    docker container stop storage0-${random} storage1-${random} storage2-${random}
    # ${results}    Execute Command    docker container rm storage0-${random} storage1-${random} storage2-${random}
    # Close Connection
    FOR    ${n}    IN RANGE    5
        Delete Virtual Disk    ${disk[${n}]}[img]    ${disk[${n}]}[folder]
    END
    Remove Directory    networkdisk/*
    Remove All Files    networkdisk/*
    # Open Connection    ${QA BURBANK IP}
    # SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # ${results}    Execute Command     rm -r networkdisk/*     sudo=True    sudo_password=${QA BURBANK PASS}
    # ${results}    Execute Command     rm networkdisk/*     sudo=True    sudo_password=${QA BURBANK PASS}
    # Close Connection

    # FOR    ${user email}   IN ZIP  ${SUITE AUTO TESTS USERS.keys()}
        # Delete Account    ${ENV}    ${user email}    ${password}
    # END

    Close All Browsers

Verify Storages
    [Arguments]    ${owner}    ${system}    ${storages number}
    Log in to user and system    ${owner}     ${system}
    Wait Until Element is Visible with Retry    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Wait Until Element is Visible    //span[contains(text(),"disk") and @class="ellipsis"]
    ${disks} =    Get Element Count    //span[contains(text(),"HD Witness Media") and @class="ellipsis"]
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Should be Equal as Numbers    ${disks}    ${storages number}
    Log Out
    Log    ${storages number} storage(s) for ${system} verified .....| PASS |    DEBUG      console=${console}

Turn on Recording
    [Arguments]    ${owner}    ${system}
    Log in to user and system    ${owner}     ${system}
    Go To Cameras
    Wait Until Element is Visible with Retry    ${ENABLED RECORDING SLIDER}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Toggle Recording
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Verify Recording Options are Visible
    Click Element    ${RECORD ALWAYS RADIO BUTTON}/..
    Wait Until Element is Visible    ${SAVE BUTTON}
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Sleep    2
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Log Out
    Log    recording turned on ..... | PASS |    DEBUG      console=${console}

Set Default Storage Config
    [Arguments]    ${server url}    ${disabled}    ${backups}
    ${storages} =    Get Storages via API    ${server url}
    Should Not Be Empty    ${storages}
    ${storages string} =    Convert To String    ${storages}
    ${storages string} =    Replace String    ${storages string}    '    "
    ${storages string} =    Replace String    ${storages string}    False    "False"
    ${storages string} =    Replace String    ${storages string}    True    "True"
    ${storages dict} =    Evaluate    json.loads("""${storages string}""")    json
    FOR    ${n}    IN RANGE    5
        ${url} =    Set variable    ${storages dict[${n}]['url']}
        ${disabled disk} =    Run Keyword And Return Status    Should Contain Any    ${url}    @{disabled}
        ${backup} =    Run Keyword And Return Status    Should Contain Any   ${url}    @{backups}
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
    # Verify changes are correct
    Sleep    2
    ${storages string 1} =    Convert To String    ${storages dict}
    ${storages} =    Get Storages via API    ${server url}
    ${storages string 2} =    Convert To String    ${storages}
    # ${storages string} =    Replace String    ${storages string}    '    "
    # ${storages string} =    Replace String    ${storages string}    False    "False"
    # ${storages string} =    Replace String    ${storages string}    True    "True"
    # ${storages dict 2} =    Evaluate    json.loads("""${storages string}""")    json
    Should Be Equal     ${storages string 1}     ${storages string 2}
    
Reset to Default Storage Config
    @{disabled} =    Create List    disk2    disk3
    @{backups} =    Create List    disk1
    Set Default Storage Config    https://${QA BURBANK IP}:${server 1['port']}    ${disabled}    ${backups}

Add Analytics stub plugin
    [Arguments]    ${server name}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    docker exec -dt ${server name} sh -c "mv /opt/networkoptix/mediaserver/bin/plugins_optional/libstub_analytics_plugin.so /opt/networkoptix/mediaserver/bin/plugins/"     return_stdout=False	return_rc=True    output_during_execution=True
    Should Be Equal As Integers    ${results}    0
    # ${results}    Execute Command    docker container restart ${server name}
    # ${results}    Execute Command    docker container port ${server name}
    # @{port1}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Close Connection
    # [Return]    ${port1}
    Log    analytics stub plugin added ..... | PASS |    DEBUG      console=${console}

Check Analytics Data is Present
    [Arguments]    ${disk}    ${camera}    ${server name}    ${keep}=${FALSE}
    # ${date} =    Get Current Date
    # ${year} =    Get Substring    ${date}    0    4
    # ${month} =    Get Substring    ${date}    5    7
    Verify File Exists    ${disk}-${random}    object_detection.sqlite
    # Run Keyword Unless    '${IMAGE}' == '${IMAGE 4.3}' or ${keep}    Verify File Exists    ${disk}-${random}    analytics_detailed_data.bin
    # Run Keyword Unless    '${IMAGE}' == '${IMAGE 4.3}' or ${keep}    Verify File Exists    ${disk}-${random}    analytics_detailed_index.bin
    Run Keyword Unless    ${keep}    Verify File Exists    ${disk}-${random}    analytics_detailed_data.bin
    Run Keyword Unless    ${keep}    Verify File Exists    ${disk}-${random}    analytics_detailed_index.bin

    # Open Connection    ${QA BURBANK IP}
    # SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # Run Keyword If    '${IMAGE}' == '${IMAGE 4.1}'    Run Keywords
    # ...    ${results 4.1} =   Execute Command    test -f ${disk}-${random}/'HD Witness Media'/object_detection.sqlite && echo "exists"    AND
    # ...    Should Be Equal As Strings    ${results 4.1}    exists
    # ...    ELSE    Run Keywords
    # ...    ${results 4.3} =   Execute Command    test -f ${disk}-${random}/'HD Witness Media'/*/object_detection.sqlite && echo "exists"    AND
    # ...    Should Be Equal As Strings    ${results 4.3}    exists
    # ${results}    Execute Command    test -f ${disk}-${random}/'HD Witness Media'/archive/metadata/${camera}/${year}/${month}/analytics_detailed_data.bin && echo "exists"    #return_stdout=False    return_rc=True    output_during_execution=True
    # Run Keyword Unless    ${keep}    Should Be Equal As Strings    ${results}    exists
    # ${results}    Execute Command    test -f ${disk}-${random}/'HD Witness Media'/archive/metadata/${camera}/${year}/${month}/analytics_detailed_index.bin && echo "exists"     #return_stdout=False	return_rc=True    output_during_execution=True
    # Run Keyword Unless    ${keep}    Should Be Equal As Strings    ${results}    exists
    # Close Connection

Wait For Analytics Move Dialog
    [Arguments]    ${disk}
    ${status} =    Run Keyword and Return Status
    ...    Wait Until Element Is Visible    ${CHANGE ANALYTICS MODAL}
    Run Keyword Unless    ${status}    Retry For Analytics Move Dialog    30    30    ${disk}

Retry For Analytics Move Dialog
    [Arguments]    ${attempts}    ${interval}    ${disk}
    FOR    ${attempt}    IN RANGE   ${attempts}
    Log    attempt ${attempt} to get dialog box    DEBUG    console=True
        Run Keyword and Continue on Failure    Click Button    ${CANCEL BUTTON}
        #Sleep    ${interval}
    	Click Button    ${ANALYTICS DROPDOWN}
    	Wait Until Element is Visible    //a[@tabindex="0"]/span[contains(text(),"${disk}")]
    	Click Element    //a[@tabindex="0"]/span[contains(text(),"${disk}")]
    	${status} =    Run Keyword and Return Status
        ...    Wait Until Element Is Visible    ${CHANGE ANALYTICS MODAL}    timeout=${interval}
        Exit For Loop If    ${status}
    END

Wait Until Analytics Data Exists
    [Arguments]    ${attempts}    ${interval}    ${disk}    ${camera}    ${server name}
    FOR    ${attempt}    IN RANGE     ${attempts}
        ${status} =    Run Keyword And Return Status    Check Analytics Data is Present     ${disk}    ${camera}    ${server name}
        Run Keyword Unless    ${status}    Sleep    ${interval}
        Exit For Loop If     ${status}
    END
    Check Analytics Data is Present     ${disk}    ${camera}    ${server name}

Verify Recorded Video Files
    [Arguments]    ${disk}
    ${disk} =    Set Variable If    '${disk}' == 'networkdisk'    networkdisk    ${disk}-${random}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    find ${disk} -iname "*mkv" -printf "%f "
    ${files} =    Get Count    ${results}    .mkv
    Close Connection
    [Return]    ${files}

Delete Recorded Video Files
    [Arguments]    ${disk}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    find ${disk}-${random} -iname "*mkv" -type f -delete    sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection
    [Return]    ${results}

Wait Until Files Are Recorded
    [Arguments]    ${disk}    ${attempts}
    ${start files} =    Verify Recorded Video Files    ${disk}
    FOR    ${n}    IN RANGE    ${attempts}
        ${files} =    Verify Recorded Video Files    ${disk}
        Exit For Loop If    ${files} > ${start files}
        Sleep    8
    END
    [Return]    ${files}

Wait Until Recorded Files Deleted
    [Arguments]    ${disk}    ${attempts}
    FOR    ${n}    IN RANGE    ${attempts}
        ${files} =    Verify Recorded Video Files    ${disk}
        Exit For Loop If    ${files} == 0
        Sleep    8
    END

Turn On Backup For Camera
    [Arguments]    ${server}    ${server auth}
    ${camera attribs} =    Get Camera User Attributes    ${server}    ${server auth}
    Set To Dictionary    ${camera attribs[0]}     backupType     CameraBackupHighQuality|CameraBackupLowQuality
    Save Camera User Attributes    ${server}    ${server auth}     ${camera attribs}

Set Backup Setting To
    [Arguments]    ${backup setting}    ${server}    ${server auth}
    ${server id} =    Get Server Id    ${server}    ${server auth}
    ${media server attribs} =    Get Media Server Attributes     ${server}    ${server auth}
    # ${media server attribs} =    Set Variable If     ${media server attribs} == ${EMPTY}    ${media attributes dict}
    Set To Dictionary    ${media server attribs[0]}    backupType    ${backup setting}
    #Set To Dictionary    ${media server attribs}    serverId    ${server id}
    Save Media Server Attributes    ${server}    ${server auth}     ${media server attribs}
    ${media server attribs} =    Get Media Server Attributes     ${server}    ${server auth}
    Should Be Equal As Strings    ${media server attribs[0]}[backupType]    ${backup setting}

Stop Server
    [Arguments]    ${container name}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command     docker container stop ${container name}
    #Should Be Equal As Integers   ${results}    0
    Close Connection

Start Server
    [Arguments]    ${container name}    ${n}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    docker container start ${container name}
    ${results}    Execute Command    docker container port ${container name}
    @{portnew}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Close Connection
    Set Suite Variable    ${port${n}}    ${portnew[0]}

Initialize Backup for User and System
    [Arguments]    ${user}    ${system}
    Log in to user and system    ${user}    ${system}
    Wait Until Element is Visible with Retry    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Wait Until Element Is Visible    ${ARCHIVE BACKUP CHECK BOX}
    # Click Element    ${ARCHIVE BACKUP CHECK BOX}
    Enable Archive Backup
    # Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    # Click Element    ${SAVE BUTTON}
    Sleep    2
    ${backup initialized} =    Set Variable    ${TRUE} 
    Set Suite Variable    ${backup initialized}     ${backup initialized} 
    Log Out
    
Enable Archive Backup
    Click Element    ${ARCHIVE BACKUP CHECK BOX}
    ${status} =    Run Keyword And Return Status    Wait Until Element Is Visible    ${ARCHIVE BACKUP SWITCH ENABLED}    timeout=5
    Run Keyword If    '${console}' == 'yes'    Capture Page Screenshot
    Run Keyword Unless    ${status}    Click Element    ${ARCHIVE BACKUP CHECK BOX}
    Run Keyword and Continue on Failure    Wait Until Element Is Visible    ${ARCHIVE BACKUP SWITCH ENABLED}    timeout=15
    