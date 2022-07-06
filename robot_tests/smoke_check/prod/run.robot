*** Settings ***
Documentation    "robot -d smoke_check/prod/res -v ENV:https://nxvms.com smoke_check/prod/ru.sh from /robot_tests"
Resource         resource.robot

Suite Setup      Smoke Check Setup
#Test Teardown    Run Keyword if Test Failed    Fatal Error - Smoke Check Failed
Suite Teardown   Smoke Check Teardown

*** Keywords ***
Smoke Check Setup
    Open Browser   ${URL}    headlesschrome
    Setup Local System    https://${system 1}[ip]:${system 1}[port]    ${password}    ${system 1}[name]
    Change License Portal Host    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${LM HOST}
    Sleep    5
    ${cloud system 1 id}=   Connect System to Cloud    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${system 1}[name]    ${email base}    ${password}
    Set To Dictionary    ${system 1}    id=${cloud system 1 id}

    Setup Local System    https://${system 2}[ip]:${system 2}[port]    ${password}    ${system 2}[name]
    Change License Portal Host    ${local auth}    https://${system 2}[ip]:${system 2}[port]    ${LM HOST}
    Sleep    5
    ${cloud system 2 id}=   Connect System to Cloud    ${local auth}    https://${system 2}[ip]:${system 2}[port]    ${system 2}[name]    ${email base}    ${password}
    Set To Dictionary    ${system 2}    id=${cloud system 2 id}

    Sleep    90

Smoke Check Teardown
    ${system 1 restored}=   Run keyword and return status   Restore Factory Defaults     https://${system 1}[ip]:${system 1}[port]    ${local auth}
    ${system 2 restored}=   Run keyword and return status   Restore Factory Defaults     https://${system 2}[ip]:${system 2}[port]    ${local auth}
    Close Browser

*** Test Cases ***
Add users and licenses to the systems
    ${system 1 admin}=   Get Random Email Robot    ${email base}
    ${system 2 adviewer}=   Get Random Email Robot    ${email base}
    ${common user}=      Get Random Email Robot    ${email base}
    Set Suite Variable    ${system 1 admin}    ${system 1 admin}
    Set Suite Variable    ${system 2 adviewer}    ${system 2 adviewer}
    Set Suite Variable    ${common user}    ${common user}
    Save User
    ...    ${local auth}
    ...    https://${system 1}[ip]:${system 1}[port]
    ...    system_1_admin
    ...    ${permissions}[cloudAdmin]
    ...    ${system 1 admin}
    ...    SmokeCheck Admin
    ...    ${password}
    ...    is cloud=${True}

    Save User
    ...    ${local auth}
    ...    https://${system 2}[ip]:${system 2}[port]
    ...    system_2_adviewer
    ...    ${permissions}[advancedViewer]
    ...    ${system 2 adviewer}
    ...    SmokeCheck AdViewer
    ...    ${password}
    ...    is cloud=${True}

    Save User
    ...    ${local auth}
    ...    https://${system 1}[ip]:${system 1}[port]
    ...    common_user
    ...    ${permissions}[viewer]
    ...    ${common user}
    ...    SmokeCheck Viewer
    ...    ${password}
    ...    is cloud=${True}

    ${user data}=   Save User
    ...    ${local auth}
    ...    https://${system 2}[ip]:${system 2}[port]
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

    Activate License    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${perm client}
    Activate License    ${local auth}    https://${system 2}[ip]:${system 2}[port]    ${saas client}

Merge systems and check the users and the licenses
    ${merge data}=   Merge Cloud Systems    ${URL}    ${system 1}[id]    ${system 2}[id]    ${email base}    ${password}
    Should be equal as strings    ${merge data}[resultCode]    ok

    ${lic remained}=    License Is Activated    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${perm client}
    Should Be True    ${lic remained}
    ${lic remained}=    License Is Activated    ${local auth}    https://${system 2}[ip]:${system 2}[port]    ${saas client}
    Should Be True    ${lic remained}

    # Users have correct permissions after the merge
    ${local users}=   Get Users    ${local auth}    https://${system 1}[ip]:${system 1}[port]
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]" == "${system 1 admin}"    Run Keywords
                ...    Should Be Equal As Strings    ${obj}[isCloud]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isEnabled]     True    AND
                ...    Should Be Equal As Strings    ${obj}[isAdmin]       False    AND
                ...    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[cloudAdmin]
            ...    ELSE IF    "${obj}[email]" == "${system 2 adviewer}"    Run Keywords
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

    ${cloud users}=   Get Cloud System Users    ${cloud owner auth}    ${system 1}[id]
    FOR    ${user}    IN    @{cloud users}
        Run Keyword If    "${user}[accountEmail]" == "${system 1 admin}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[cloudAdmin]
        ...    ELSE IF    "${user}[accountEmail]" == "${system 2 adviewer}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[cloudAdmin]
        ...    ELSE IF    "${user}[accountEmail]" == "${common user}"    Should Be Equal As Strings    ${user}[customPermissions]     ${permissions}[viewer]
    END

Add and delete users
    # Add new - portal
    ${new cloud user}=   Get Random Email Robot    ${email base}
    Share    ${cloud owner auth}    ${system 1}[id]    ${ACCESS ROLES}[liveViewer]    ${new cloud user}     ${permissions}[liveViewer]

    # Delete existing - relay
    ${data}=   Create Dictionary    id=${del user id}
    Create Digest Session    Remove User session    https://${system 1}[id].${relay}    auth=${cloud owner auth}    disable_warnings=1
    ${resp}=   Post Request    Remove User session    /ec2/removeUser    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.json()}[id]    ${del user id}

    # Check system
    ${local users}=   Get Users    ${local auth}    https://${system 1}[ip]:${system 1}[port]
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
    Remove User By Email    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${new cloud user}
    ${cloud users}=   Get Cloud System Users    ${cloud owner auth}    ${system 1}[id]
    ${is deleted}=   Set Variable    ${True}
    FOR    ${user}    IN    @{cloud users}
        Run Keyword If    "${user}[accountEmail]" == "${new cloud user}"    Run Keywords
            ...    Set Variable    ${is deleted}    ${False}     AND
            ...    Exit For Loop
    END
    Should be True    ${is deleted}

Activate licenses on portal
    Go To    ${URL}/systems/${system 1}[id]
    Log In    ${email base}    ${password}    validate=False    button=None
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    ...    ${MERGE BUTTON SYSTEM}
    ...    ${LICENSES LINK}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}

    Click Link    ${LICENSES LINK}
    Validate Licenses Page    several servers=True    trial left=False    clean=False
    ${new perm}=   Generate Licenses    license_type=analogencoder   n_cameras=4
    Activate Key    ${new perm}    server name=${system 1}[server_name]
    ${activated}=   License Is Activated    ${local auth}    https://${system 1}[ip]:${system 1}[port]    ${new perm}

    ${exp ts}=   Get Current Date    time_zone=UTC    increment=365d    result_format=datetime
    ${new saas}=   Generate Licenses    order_type=saas    license_type=iomodule    fixed_expiration_ts=${exp ts}
    Activate Key    ${new saas}    server name=${system 2}[server_name]
    ${activated}=   License Is Activated    ${local auth}    https://${system 2}[ip]:${system 2}[port]    ${new saas}
    Log Out

Disconnect system from cloud
    ${disconnect data}=   Disconnect    ${URL}    ${email base}    ${password}    ${system 1}[id]
    Should be equal as strings    ${disconnect data}[resultCode]    ok
    Restart Server    https://${system 1}[ip]:${system 1}[port]    ${local auth}
    Wait until keyword succeeds    5x    10s    Ping Server    https://${system 1}[ip]:${system 1}[port]    ${local auth}

    ${settings}=   Get System Settings From Server    ${local auth}    https://${system 1}[ip]:${system 1}[port]
    Should be equal as strings    ${settings}[cloudSystemID]    ${EMPTY}
