*** Keywords ***
Storage Suite Setup
    Log To Console    Storage Suite Setup
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
    Log To Console    users created ..... | PASS |
    FOR    ${n}    IN RANGE    5
        Open Connection    ${QA BURBANK IP}
        SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}        
        ${results}    Execute Command     dd if=/dev/zero of=${disk location}/disk${n}-${random}.img bs=1M count=${size[${n}]}    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mkfs -t ext4 ${disk location}/disk${n}-${random}.img    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mkdir disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}
        ${results}    Execute Command     mount -t auto -o loop ${disk location}/disk${n}-${random}.img disk${n}-${random}    sudo=True    sudo_password=${QA BURBANK PASS}
        Close Connection 
        Log To Console    disk${n} mounted ..... | PASS |
        Run Keyword If    ${n} < 4     Catenate Storages One    ${n}
        ...    ELSE     Catenate Storages Two    ${n} 
    END
    
    ${storage string 1} =    Get Substring    ${storage string 1}    1     
    ${storage string 2} =    Get Substring    ${storage string 2}    1

    ${port} =    Create Docker Server    storage0-${random}    4.1_test    ${storage string 1}    
    Set Suite Variable    ${port0}    ${port[0]}
    Sleep     10
    Log To Console    docker storage0-${random} created ..... | PASS |
    Setup Local System    https://${QA BURBANK IP}:${port0}    ${BASE PASSWORD}    ${system names[0]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port0}    ${system names[0]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId0}    ${sysId}
    Sleep    10
    Close Connection
    Log To Console    ${system names[0]} system created ..... | PASS |
         
    ${port} =    Create Docker Server    storage1-${random}    4.1_test    ${storage string 2}  
    Set Suite Variable    ${port1}    ${port[0]}
    Sleep     10
    Log To Console    docker storage1-${random} created ..... | PASS |
    Setup Local System    https://${QA BURBANK IP}:${port1}    ${BASE PASSWORD}    ${system names[1]}
    ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port1}    ${system names[1]}    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId1}    ${sysId}
    Sleep    10
    Close Connection    
    Log To Console    ${system names[1]} system created ..... | PASS |
    
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
    Log To Console    users added to ${system names[0]} ..... | PASS |
    @{disabled} =    Create List    disk2    disk3
    @{backups} =    Create List    disk1 
    Set Default Storage Config    https://${QA BURBANK IP}:${port0}    ${disabled}    ${backups}
    Log To Console    default storage config set .....| PASS |
    Open Browser and go to URL    ${url}
    
    Verify Storages    ${sysId0}    4
    Verify Storages    ${sysId1}    1
    
    Activate License    ${server auth}    https://${QA BURBANK IP}:${port0}    ${TRIAL LICENSE} 
    Sleep    5
    Log To Console    trial license activated .....| PASS |
    Add Analytics stub plugin   storage0-${random}
    ${results} =    Add Camera    https://${QA BURBANK IP}:${port0}    admin    admin    ${camera}    http://10.1.5.116:80/onvif/device_service    Digital Watchdog
    Log    ${results}
    Log To Console    camera added ..... | PASS |
    Sleep    15
    Restart Server    https://${QA BURBANK IP}:${port0}    ${auth}
    Sleep    90
    Log To Console    server restarted ..... | PASS |
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS} 
    ${results}    Execute Command    docker container port storage0-${random}
    @{portnew}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Close Connection
    Set Suite Variable    ${port0}    ${portnew[0]}
    
    Turn On Recording    ${sysId0}  
    
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
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop storage0-${random} storage1-${random}
    ${results}    Execute Command    docker container rm storage0-${random} storage1-${random}
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
    ${disks} =    Get Element Count    //span[contains(text(),"disk") and @class="ellipsis"]
    Should be Equal as Numbers    ${disks}    ${storages number} 
    Capture Page Screenshot
    Log Out
    Log To Console    ${storages number} storage(s) for ${system} verified .....| PASS |
    
Turn on Recording
    [Arguments]    ${system}    
    Log in to user and system    ${owner}     ${system}
    Go To Cameras
    #Sleep    30
    Wait Until Element is Visible with Retry    ${ENABLED RECORDING SLIDER}   
    Capture Page Screenshot
    Toggle Recording
    Capture Page Screenshot
    Verify Recording Options are Visible
    Click Element    ${RECORD ALWAYS RADIO BUTTON}/..   
    #Sleep    30
    Wait Until Element is Visible    ${SAVE BUTTON}
    Capture Page Screenshot
    Click Button    ${SAVE BUTTON}
    Sleep    2
    Capture Page Screenshot
    Log Out
    Log To Console    recording turned on ..... | PASS |

Set Default Storage Config
    [Arguments]    ${server url}    ${disabled}    ${backups}
    ${storages} =    Get Storages via API    ${server url}
    ${storages string} =    Convert To String    ${storages}
    ${storages string} =    Replace String    ${storages string}    '    "
    ${storages string} =    Replace String    ${storages string}    False    "False"
    ${storages string} =    Replace String    ${storages string}    True    "True"
    ${storages dict} =    Evaluate    json.loads("""${storages string}""")    json
    FOR    ${n}    IN RANGE    4
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
    Log To Console    analytics stub plugin added ..... | PASS |
    
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
        Log To Console    attempt ${attempt} to get dialog box
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
    