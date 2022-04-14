*** Settings ***
Resource    ../smoke_check_resource.robot
Suite Setup       Merge Suite Setup
Suite Teardown    Merge Suite Teardown
Force Tags    merge_and_licenses

*** Keywords ***
Merge Suite Setup
    Open Browser and go to URL    ${ENV}    False    False
    # Register test users
    ${merge owner}=   Get Random Email    ${email base}
    Register and activate account    SmokeCheck    MergeOwner    ${merge owner}    ${password}
    Set Suite Variable    ${merge owner}    ${merge owner}
    ${owner auth}=   Create List    ${merge owner}    ${password}
    Set Suite Variable    ${owner auth}    ${owner auth}
    ${merge 1 admin}=   Get Random Email    ${email base}
    Register and activate account    SmokeCheck    Admin    ${merge 1 admin}    ${password}
    ${merge 2 adviewer}=   Get Random Email    ${email base}
    Register and activate account    SmokeCheck    AdViewer    ${merge 2 adviewer}    ${password}
    ${common user}=      Get Random Email    ${email base}
    Register and activate account    SmokeCheck    Common   ${common user}    ${password}
    Set Suite Variable    ${merge 1 admin}    ${merge 1 admin}
    Set Suite Variable    ${merge 2 adviewer}    ${merge 2 adviewer}
    Set Suite Variable    ${common user}    ${common user}

    # Setup test systems
    ${merge 1}=   Setup Remote System    ${ssh auth}    ciqa    merge1    ${ssh host ip}    ${merge 1 port}
    Change License Portal Host    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${LM HOST}
    Set Suite Variable    ${merge 1}    ${merge 1}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${merge 1}[ip]:${merge 1}[port]    ${merge 1}[name]    ${merge owner}    ${password}    ${ENV}
    Set To Dictionary    ${merge 1}    id=${cloud id}

    ${merge 2}=   Setup Remote System    ${ssh auth}    ciqa    merge2    ${ssh host ip}    ${merge 2 port}
    Change License Portal Host    ${local auth}    https://${merge 2}[ip]:${merge 2}[port]    ${LM HOST}
    Set Suite Variable    ${merge 2}    ${merge 2}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${merge 2}[ip]:${merge 2}[port]   ${merge 2}[name]    ${merge owner}    ${password}    ${ENV}
    Set To Dictionary    ${merge 2}    id=${cloud id}

    # Verify systems are connected to cloud
    ${systems}=   Get Account Systems    ${merge owner}    ${password}
    ${ids}=   Evaluate    [sys['id'] for sys in $systems]
    ${sys 1 connected}=   Run keyword and return status    Should Contain    ${ids}    ${merge 1}[id]
    ${sys 2 connected}=   Run keyword and return status    Should Contain    ${ids}    ${merge 2}[id]
    IF    ${sys_1_connected} == ${False} or ${sys_2_connected} == ${False}
        Fatal Error    One or more system is not connected to cloud
    END
    Sleep   90

Merge Suite Teardown
    Acquire Lock    teardown_lock
    Open Connection    ${ssh host ip}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    Execute Command    docker rm -f ${merge 1}[cont] ${merge 2}[cont]
    Close All Connections
    Release Lock    teardown_lock
    Close Browser


*** Test Cases ***
Add users and licenses to the systems
    Save User
    ...    ${local auth}
    ...    https://${merge 1}[ip]:${merge 1}[port]
    ...    system_1_admin
    ...    ${permissions}[cloudAdmin]
    ...    ${merge 1 admin}
    ...    SmokeCheck Admin
    ...    ${password}
    ...    is cloud=${True}

    Save User
    ...    ${local auth}
    ...    https://${merge 2}[ip]:${merge 2}[port]
    ...    system_2_adviewer
    ...    ${permissions}[advancedViewer]
    ...    ${merge 2 adviewer}
    ...    SmokeCheck AdViewer
    ...    ${password}
    ...    is cloud=${True}

    Save User
    ...    ${local auth}
    ...    https://${merge 1}[ip]:${merge 1}[port]
    ...    common_user
    ...    ${permissions}[viewer]
    ...    ${common user}
    ...    SmokeCheck Viewer
    ...    ${password}
    ...    is cloud=${True}

    ${user data}=   Save User
    ...    ${local auth}
    ...    https://${merge 2}[ip]:${merge 2}[port]
    ...    common_user
    ...    ${permissions}[cloudAdmin]
    ...    ${common user}
    ...    SmokeCheck Admin
    ...    ${password}
    ...    is cloud=${True}
    Set Suite Variable    ${del user id}    ${user data}[id]

    ${perm client}=   Generate Licenses    license_type=videowall    n_cameras=20
    ${exp ts}=   Get Current Date    time_zone=UTC    increment=60d    result_format=datetime
    ${saas client}=   Generate Licenses    order_type=saas    n_cameras=10    fixed_expiration_ts=${exp ts}

    Set Suite Variable    ${perm client}    ${perm client}
    Set Suite Variable    ${saas client}    ${saas client}

    Activate License    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${perm client}
    Activate License    ${local auth}    https://${merge 2}[ip]:${merge 2}[port]    ${saas client}

Merge systems and check the users and the licenses
    ${merge data}=   Merge Cloud Systems    ${merge 1}[id]    ${merge 2}[id]    ${merge owner}    ${password}
    Should be equal as strings    ${merge data}[resultCode]    ok

    ${lic remained}=    License Is Activated    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${perm client}
    Should Be True    ${lic remained}
    ${lic remained}=    License Is Activated    ${local auth}    https://${merge 2}[ip]:${merge 2}[port]    ${saas client}
    Should Be True    ${lic remained}

    # Users have correct permissions after the merge
    ${local users}=   Get Users    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]" == "${merge 1 admin}"    Run Keywords
                ...    Should Be Equal As Strings    ${obj}[isCloud]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isEnabled]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isAdmin]       False    AND
                ...    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[cloudAdmin]
            ...    ELSE IF    "${obj}[email]" == "${merge 2 adviewer}"    Run Keywords
                ...    Should Be Equal As Strings    ${obj}[isCloud]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isEnabled]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isAdmin]       False    AND
                ...    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[advancedViewer]
            ...    ELSE IF    "${obj}[email]" == "${common user}"    Run Keywords
                ...    Should Be Equal As Strings    ${obj}[isCloud]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isEnabled]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isAdmin]       False    AND
                ...    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[viewer]
    END

    ${cloud users}=   Get Cloud System Users    ${owner auth}    ${merge 1}[id]
    FOR    ${user}    IN    @{cloud users}
        Run Keyword If    "${user}[accountEmail]" == "${merge 1 admin}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[cloudAdmin]
        ...    ELSE IF    "${user}[accountEmail]" == "${merge 2 adviewer}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[cloudAdmin]
        ...    ELSE IF    "${user}[accountEmail]" == "${common user}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[viewer]
    END

Add and delete users
    # Add new - portal
    ${new cloud user}=   Get Random Email    ${email base}
    Share    ${owner auth}    ${merge 1}[id]    ${ACCESS ROLES}[liveViewer]    ${new cloud user}    ${permissions}[liveViewer]

    # Delete existing
    ${data}=   Create Dictionary    id=${del user id}
    Create Digest Session    Remove User session    https://${merge 1}[ip]:${merge 1}[port]    auth=${owner auth}    disable_warnings=1
    ${resp}=   Post Request    Remove User session    /ec2/removeUser    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.json()}[id]    ${del user id}

    # Check system
    ${local users}=   Get Users    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]
    ${is deleted}=   Set Variable    ${True}
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]" == "${new cloud user}"    Run Keywords
            ...    Should Be Equal As Strings    ${obj}[isCloud]     True    AND
            ...    Should Be Equal As Strings    ${obj}[isEnabled]     True    AND
            ...    Should Be Equal As Strings    ${obj}[isAdmin]       False    AND
            ...    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[liveViewer]
        ...    ELSE IF    "${obj}[email]" == "${common user}"    Set Variable    ${is deleted}    ${False}
    END
    Should be True    ${is deleted}

    # Remove from system - check portal
    Remove User By Email    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${new cloud user}
    ${cloud users}=   Get Cloud System Users    ${owner auth}    ${merge 1}[id]
    ${is deleted}=   Set Variable    ${True}
    FOR    ${user}    IN    @{cloud users}
        Run Keyword If    "${user}[accountEmail]" == "${new cloud user}"    Run Keywords
            ...    Set Variable    ${is deleted}    ${False}     AND
            ...    Exit For Loop
    END
    Should be True    ${is deleted}

Activate licenses on portal
    Go To    ${ENV}/systems/${merge 1}[id]
    Log In    ${merge owner}    ${password}    validate=False    button=None
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    ...    ${MERGE BUTTON SYSTEM}
    ...    ${LICENSES LINK}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}

    Click Link    ${LICENSES LINK}
    Validate Licenses Page    several servers=True    trial left=True    clean=False
    ${new perm}=   Generate Licenses    license_type=analogencoder   n_cameras=4
    Activate Key    ${new perm}
    ${activated}=   License Is Activated    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${new perm}

    ${exp ts}=   Get Current Date    time_zone=UTC    increment=365d    result_format=datetime
    ${new saas}=   Generate Licenses    order_type=saas    license_type=iomodule    fixed_expiration_ts=${exp ts}
    Activate Key    ${new saas}
    ${activated}=   License Is Activated    ${local auth}    https://${merge 1}[ip]:${merge 1}[port]    ${new saas}
    Log Out

Disconnect system from cloud
    ${disconnect data}=   Disconnect    ${ENV}    ${merge owner}    ${password}    ${merge 1}[id]
    Should be equal as strings    ${disconnect data}[resultCode]    ok
    Slow    Restart Server    https://${merge 1}[ip]:${merge 1}[port]    ${local auth}    timeout=10
    Wait until keyword succeeds    5x    2s    Ping Server    https://${merge 1}[ip]:${merge 1}[port]    ${local auth}

    ${settings}=   Get System Settings From Server    ${local auth}    https://${merge 1}[ip]:${merge 1 port}
    Should be equal as strings    ${settings}[cloudSystemID]    ${EMPTY}
