*** Keywords ***
Storage Suite Setup
    ${loglevel} =    Set Loglevel    INFO
    ${ignore} =    Set Loglevel    ${loglevel}
    ${console} =    Set Variable If    '${loglevel}' != 'INFO'    yes    no
    Set Suite Variable    ${console}    ${console}    
    Log    Storage Suite Setup    DEBUG      console=${console}  
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
    Set Suite Variable    ${server auth}    ${server auth}   
    
    @{size} =    Create List    30000    20000    20000    12000    12000

    #${storage string} =    Set Variable    -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v /data/:/opt/networkoptix/mediaserver/var -v /video:/recordings
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}        
    ${results}    Execute Command    mkdir disk-invalid    sudo=True    sudo_password=${QA BURBANK PASS}
    Close Connection 
    Log    disk-invalid created ..... | PASS |    DEBUG      console=${console}  

    Log    users created ..... | PASS |    DEBUG      console=${console}  
    FOR    ${n}    IN RANGE    5
        Open Connection    ${QA BURBANK IP}
        SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}        
        ${results}    Execute Command     dd if=/dev/zero of=${disk location}/disk${n}-${random}.img bs=1M count=${size[${n}]}    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mkfs -t ext4 ${disk location}/disk${n}-${random}.img    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mkdir disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mount -t auto -o loop ${disk location}/disk${n}-${random}.img disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}    return_stdout=False    return_rc=True
        Should Be Equal As Integers   ${results}    0 
        Close Connection 
        Log    disk${n} mounted ..... | PASS |    DEBUG      console=${console}  
        Run Keyword If    ${n} < 4     Catenate Storages One    ${n}
        ...    ELSE     Catenate Storages Two    ${n} 
    END
    
    #${storage string 1} =    Get Substring    ${storage string 1}    1     
    ${storage string 2} =    Get Substring    ${storage string 2}    1

    ${port} =    Create Docker Server    storage0-${random}    4.1_test    ${storage string 1}    
    Set Suite Variable    ${port0}    ${port[0]}    
    Sleep     10
    Log    docker storage0-${random} created ..... | PASS |    DEBUG      console=${console}  
    Setup Local System    https://${QA BURBANK IP}:${port0}    ${BASE PASSWORD}    ${system names[0]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port0}    ${system names[0]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId0}    ${sysId}
    Sleep    10
    Close Connection
    Log    ${system names[0]} system created ..... | PASS |    DEBUG      console=${console}  
         
    ${port} =    Create Docker Server    storage1-${random}    4.1_test    ${storage string 2}  
    Set Suite Variable    ${port1}    ${port[0]}
    Sleep     10
    Log    docker storage1-${random} created ..... | PASS |    DEBUG      console=${console}  
    Setup Local System    https://${QA BURBANK IP}:${port1}    ${BASE PASSWORD}    ${system names[1]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port1}    ${system names[1]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId1}    ${sysId}
    Sleep    10
    Close Connection    
    Log   ${system names[1]} system created ..... | PASS |    DEBUG      console=${console}  
    
    ${port} =    Create Docker Server    storage2-${random}    4.1_test      
    Set Suite Variable    ${port2}    ${port[0]}
    Sleep     10
    Log    docker storage1-${random} created ..... | PASS |    DEBUG      console=${console}  
    Setup Local System    https://${QA BURBANK IP}:${port2}    ${BASE PASSWORD}    ${system names[2]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port2}    ${system names[2]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId2}    ${sysId}
    Sleep    10
    Close Connection    
    Log   ${system names[2]} system created ..... | PASS |    DEBUG      console=${console}  
    
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
    Log    users added to ${system names[0]} ..... | PASS |    DEBUG      console=${console}  
    
    @{disabled} =    Create List    disk2    disk3
    @{backups} =    Create List    disk1 
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}
    Log    default storage config set .....| PASS |    DEBUG      console=${console}  
    
    Activate License    ${server auth}    https://${QA BURBANK IP}:${port0}    ${TRIAL LICENSE} 
    Sleep    5
    Log    trial license activated .....| PASS |    DEBUG      console=${console}  
    
    Add Analytics stub plugin   storage0-${random}
    ${results} =    Add Camera    https://${QA BURBANK IP}:${port0}    admin    admin    ${camera}    http://10.1.5.116:80/onvif/device_service    Digital Watchdog
    Log    ${results}
    Log    camera added ..... | PASS |    DEBUG      console=${console}  
    
    Sleep    15
    # restarting server and creating inaccessible disk
    Restart Server    https://${QA BURBANK IP}:${port0}    ${auth}
    Sleep    3
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS} 
    ${results}    Execute Command    rm -r disk-invalid    sudo=True    sudo_password=${QA BURBANK PASS}
    Log    disk-invalid deleted ..... | PASS |    DEBUG      console=${console}  
    Sleep    90
    Log    server restarted ..... | PASS |    DEBUG      console=${console}  
    ${results}    Execute Command    docker container port storage0-${random}
    @{portnew}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Close Connection
    Set Suite Variable    ${port0}    ${portnew[0]}
    
    # Sleep    30
    
    Open Browser and go to URL    ${url}
    Turn On Recording    ${sysId0}  
    
    Verify Storages    ${sysId0}    5
    Verify Storages    ${sysId1}    1
    
Catenate Storages One
    [Arguments]    ${n}
    ${storage string 1} =    Catenate    ${storage string 1}    --mount type=bind,source="/home/qaburbank/disk${n}-${random}",target=/disk${n}
    Set Suite Variable    ${storage string 1}    ${storage string 1}
    
Catenate Storages Two
    [Arguments]    ${n}
    ${storage string 2} =    Catenate    ${storage string 2}    --mount type=bind,source="/home/qaburbank/disk${n}-${random}",target=/disk${n}
    Set Suite Variable    ${storage string 2}    ${storage string 2}
    
Storage Suite Teardown
    Disconnect Server via API    ${auth}    ${sysId0}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId1}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId2}    ${password}    ${owner}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop storage0-${random} storage1-${random} storage2-${random}
    ${results}    Execute Command    docker container rm storage0-${random} storage1-${random} storage2-${random}
    Close Connection
    FOR    ${n}    IN RANGE    5
        Open Connection    ${QA BURBANK IP}
        SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
        ${results}    Execute Command     umount disk${n}-${random}     sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     rm ${disk location}/disk${n}-${random}.img     sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     rm -r disk${n}-${random}     sudo=True    sudo_password=${QA BURBANK PASS}
        Close Connection
    END 
    
    FOR    ${user email}   IN ZIP  ${SUITE AUTO TESTS USERS.keys()}     
        Delete Account    ${ENV}    ${user email}    ${password}   
    END
    
    Close All Browsers
        
Verify Storages
    [Arguments]    ${system}    ${storages number}
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
    [Arguments]    ${system}    
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

Reset to Default Storage Config
    @{disabled} =    Create List    disk2    disk3
    @{backups} =    Create List    disk1 
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}

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
    ${date} =    Get Current Date
    ${year} =    Get Substring    ${date}    0    4
    ${month} =    Get Substring    ${date}    5    7
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    ${results}    Execute Command    test -f ${disk}-${random}/'HD Witness Media'/object_detection.sqlite && echo "exists" 
    Should Be Equal As Strings    ${results}    exists
    ${results}    Execute Command    test -f ${disk}-${random}/'HD Witness Media'/archive/metadata/${camera}/${year}/${month}/analytics_detailed_data.bin && echo "exists"    #return_stdout=False    return_rc=True    output_during_execution=True          
    Run Keyword Unless    ${keep}    Should Be Equal As Strings    ${results}    exists
    ${results}    Execute Command    test -f ${disk}-${random}/'HD Witness Media'/archive/metadata/${camera}/${year}/${month}/analytics_detailed_index.bin && echo "exists"     #return_stdout=False	return_rc=True    output_during_execution=True
    Run Keyword Unless    ${keep}    Should Be Equal As Strings    ${results}    exists
    Close Connection
    
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
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS} 
    ${results}    Execute Command    find ${disk}-${random} -iname "*mkv" -printf "%f "
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