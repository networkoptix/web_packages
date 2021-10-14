*** Settings ***
Resource          resource.robot
Library           RequestsLibrary
Library           NoptixLibrary/Encode.py

*** Variables ***
${default name}    API made system
${customization}    default

*** Keywords ***
# Keywords which use Cloud and cloud Portal API
Merge Systems
    [Documentation]    Merge two cloud systems which have the same owner via cdb API
    [Arguments]    ${auth}    ${primary id}    ${secondary id}
    ${data}=   Create Dictionary    systemId=${secondary id}
    Create Digest Session    merge session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    merge session    /cdb/system/${primary id}/merged_systems/    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Merge Systems Local
    [Documentation]    Merge two systems via server commands
    [Arguments]    ${primary auth}    ${secondary auth}    ${primary url}    ${secondary url}    ${currentPassword}=${BASE PASSWORD}
    ${data}=   Create Dictionary    currentPassword=${current password}    dryRun=${False}    url=https://${secondary auth}@${secondary url}
    Create Digest Session    local merge session    ${primary url}    auth=${primary auth}    disable_warnings=1
    ${resp}=   Post Request    local merge session    /api/mergeSystems    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Bind System
    [Arguments]    ${auth}    ${cloud url}    ${name}=${default name}
    &{data}=   Create Dictionary    name=${name}    customization=${customization}
    Create Session    bind session    ${cloud url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    bind session    /cdb/system/bind    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Unbind System
    [Arguments]    ${auth}    ${cloud url}    ${system id}
    &{data}=   Create Dictionary    systemId=${system id}
    Create Digest Session    unbind session    ${cloud url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    unbind session    /cdb/system/unbind    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Create system and attach to cloud
    [Arguments]    ${server url}    ${server port}    ${system name}    ${cloud email}    ${cloud password}=${BASE PASSWORD}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    @{default auth}=    Create List    admin    admin
    &{bind json}=    Bind System    ${cloud auth}    ${ENV}    name=${system name}
    sleep    5
    &{Setup Cloud System json}=    Setup Cloud System
    ...    ${default auth}
    ...    ${server url}:${server port}
    ...    ${bind json["authKey"]}
    ...    ${bind json["name"]}
    ...    ${bind json["id"]}
    ...    ${bind json["ownerAccountEmail"]}
    [Return]    ${bind json["id"]}

Connect System to Cloud
    [Arguments]    ${auth}   ${server ip}    ${system name}    ${cloud email}    ${cloud password}    ${cloud host}=${ENV}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    &{bind json}=    Bind System    ${cloud auth}    ${cloud host}    ${system name}
    Sleep    5
    ${Setup Cloud System json}=    Save Cloud System Credentials
    ...    ${auth}
    ...    ${server ip}
    ...    ${bind json["authKey"]}
    ...    ${bind json["name"]}
    ...    ${bind json["id"]}
    ...    ${bind json["ownerAccountEmail"]}
    [Return]    ${bind json["id"]}

Rename System
    [Arguments]    ${auth}    ${system id}    ${new name}
    &{data}=   Create Dictionary    systemId=${system id}    name=${new name}
    Create Session    Rename System session    ${ENV}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Rename System session    /cdb/system/rename    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Share
    [Arguments]    ${auth}    ${system id}    ${access role}    ${account email}
    &{data}=   Create Dictionary    systemId=${system id}    accessRole=${access role}    accountEmail=${account email}
    Create Session    Share session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Share session    /cdb/system/share    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Get Cloud System Settings
    [Arguments]    ${auth}    ${system id}
    Create Session    Get System Settings session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get System Settings session   /cdb/system/get?systemId=${system id}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()['systems'][0]}

Get Cloud System Users
    [Arguments]    ${auth}    ${system id}
    ${data}=   Create Dictionary    systemId=${system id}
    Create Session    Get Cloud Users session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Cloud Users session    /cdb/system/getCloudUsers    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()['sharing']}

Get Account Info
    [Arguments]    ${email}    ${password}=${BASE PASSWORD}
    ${auth}=   Create List    ${email}    ${password}
    Create Session    Get Account Info    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Account Info    /cdb/account/get
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

# Alternative way to reset Account password - via cdb directly.
# "Change Account Password" keyword is preferred.
Set Account Password
    [Arguments]    ${email}    ${old_password}    ${new_password}
    ${passwordHa1}=   Encode.Get Ha1 Password    ${email}    ${new_password}
    ${passwordHa1Sha256}=   Encode.Get Ha1 Sha256 Password     ${email}    ${new_password}

    &{params}=   Create Dictionary    passwordHa1=${passwordHa1}    passwordHa1Sha256=${passwordHa1Sha256}
    @{auth}=   Create List    ${email}    ${old_password}
    Create Digest Session    Set New Password session   ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Set New Password session    /cdb/account/update    json=${params}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Integration Store is Enabled
    [Arguments]    ${auth}
    Create Digest Session    Get Integration Store status    ${ENV}    ${auth}    disable_warnings=1
    ${resp}=    Get Request    Get Integration Store status    /api/utils/cloudCapabilities/
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()['integrationStoreEnabled']}

Register Account
    [Arguments]    ${first name}    ${last name}    ${email}   ${password}
    &{data}=    Create Dictionary
    ...    email=${email}
    ...    password=${password}
    ...    first_name=${first name}
    ...    last_name=${last name}
    @{auth}=   Create List    ${BASE EMAIL}    ${BASE PASSWORD}
    Create Digest Session    Register Account session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Register Account session    /api/account/register    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Activate Account
    [Arguments]    ${email}    ${password}
    @{auth}=   Create List    ${BASE EMAIL}    ${BASE PASSWORD}
    @{new user auth}=   Create List    ${email}    ${password}
    ${code}=   Get Code From Email   ${ENV}    ${auth}    ${email}    activate_account
    ${code}=   Convert Code    ${code}
    &{data}=   Create Dictionary    code=${code}
    Create Digest Session    Activate Account session    ${ENV}    auth=${new user auth}    disable_warnings=1
    ${resp}=    Post Request    Activate Account session    /api/account/activate    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    CloudPortalAPI.Log In    ${ENV}    ${email}    ${password}
    Return From Keyword    ${resp.json()}

Log Out via API
    [Arguments]    ${validate}=${True}
    ${cookies}=   Get Cookies    as_dict = True
    ${status}=   CloudPortalAPI.Log Out    ${ENV}    ${cookies}[sessionid]    ${cookies}[csrftoken]
    Should Be Equal as Strings    ${status}    200
    Sleep    2
    Reload Page
    Sleep    5
    Go To    ${ENV}
    Run Keyword If    ${validate}    Validate Log Out
    [Return]    ${status}

Disconnect Server via API
    [Arguments]    ${auth}    ${sysId}    ${password}    ${email}
    &{data}=    Create Dictionary    password=${password}    system_id=${sysid}    email=${email}
    Create Digest Session    disconnectServer   ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    disconnectServer    /api/systems/disconnect    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

# Keywords which use System/Server API
Cookie Logout
    [Arguments]    ${auth}    ${server url}
    ${cookies}=    Create Dictionary    x-runtime-guid=_DELETED_COOKIE_VALUE_
    ${data}=    Create Dictionary
    Create Digest Session    cookieLogout   ${server url}    auth=${auth}    cookies=${cookies}
    ${resp}=   Post Request    cookieLogout    /api/cookieLogout    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200

Setup Local System
    [Arguments]    ${server url}    ${new password}    ${system name}
    @{auth}=   Create List    admin    admin
    &{data}=    Create Dictionary    password=${new password}    systemName=${system name}
    Create Digest Session    Setup System session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Setup System session    /api/setupLocalSystem    json=${data}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    ${auth}=   Create List    admin    ${new password}
    Set System Settings via API    ${auth}    ${server url}    statisticsAllowed    false
    Set System Settings via API    ${auth}    ${server url}    trafficEncryptionForced    false
    [Return]    ${resp.json()}

Setup Cloud System
    [Arguments]    ${auth}    ${server url}    ${auth key}    ${system name}    ${cloud system id}    ${owner email}
    &{data}=   Create Dictionary    cloudAuthKey=${auth key}    systemName=${system name}    cloudSystemID=${cloud system id}    cloudAccountName=${owner email}
    Create Digest Session    Setup System session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Setup System session    /api/setupCloudSystem    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    ${cloud auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    Disable Stat Reports    ${cloud auth}    ${server url}
    [Return]    ${resp.json()}

Save Cloud System Credentials
    [Arguments]    ${auth}    ${server url}    ${auth key}    ${system name}    ${cloud system id}    ${owner email}
    &{data}=   Create Dictionary    cloudAuthKey=${auth key}    cloudSystemID=${cloud system id}    cloudAccountName=${owner email}
    Create Digest Session    Save Cloud Credentials session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Save Cloud Credentials session    /api/saveCloudSystemCredentials    json=${data}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Ping Server
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Ping Server session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Get Request    Ping Server session     /api/ping    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Restart Server
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Restart Server session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Get Request    Restart Server session     /api/restart    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Restore Factory Defaults
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}
    Create Digest Session    Restore Server session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Restore Server session     /api/restoreState    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Detach Server From System
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}
    Create Session    Detach From System session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Detach From System session     /api/detachFromSystem    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Detach Server From Cloud
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}    password=${BASE PASSWORD}
    Create Digest Session    Detach From Cloud session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Detach From Cloud session     /api/detachFromCloud    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get Server Name
    [Arguments]    ${system url}    ${system auth}
    Create Digest Session    Get Server Name session    ${system url}    auth=${system auth}    disable_warnings=1
    ${resp}=   Get Request    Get Server Name session     /ec2/getMediaServersEx    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    ${net address}=   Replace String    ${system url}    https://    ${EMPTY}
    ${net address}=   Replace String    ${net address}    http://     ${EMPTY}
    FOR    ${server}    IN    @{resp.json()}
        ${status}=   Run Keyword and return status    Should Contain    ${server}[networkAddresses]    ${net address}
        ${name}=   Set Variable If    ${status}    ${server}[name]
        Return From Keyword If    ${status}    ${name}
    END

Get Server Id
    [Arguments]    ${system url}    ${system auth}    ${server name}=${None}
    # Pass server name if there is more than one server ins the system
    Create Digest Session    Get Server Id session    ${system url}    auth=${system auth}    verify=False    disable_warnings=1
    ${resp}=   Get Request    Get Server Id session     /ec2/getMediaServersEx    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    ${data}=   Evaluate    $resp.json()

    Return From Keyword If   not $server_name    ${data}[0][id]
    FOR    ${server}    IN    @{data}
        Return From Keyword If    "${server name}" == "${server}[name]"    ${server}[id]
    END

Rename Server
    [Arguments]    ${system url}    ${system auth}    ${new name}
    ${old name}=   Get Server Name    ${system url}    ${system auth}
    ${id}=   Get Server Id    ${system url}    ${system auth}    ${old name}
    ${data}=   Create Dictionary    serverId=${id}    serverName=${new name}
    Create Digest Session    Rename Server session    ${system url}    auth=${system auth}    disable_warnings=1
    ${resp}=   Post Request    Rename Server session     ec2/saveMediaServerUserAttributes    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Remove Resource From System
    [Arguments]    ${system url}    ${system auth}    ${resource id}
    &{data}=   Create Dictionary    id=${resource id}
    Create Digest Session    Remove Resource session    ${system url}    auth=${system auth}    verify=False    disable_warnings=1
    ${resp}=   Post Request    Remove Resource session     /ec2/removeResource    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Remove Server From System
    [Arguments]    ${system url}    ${system auth}    ${server url}    ${server auth}    ${server name}
    Detach Server From System    ${server url}    ${server auth}
    ${id}=    Get Server Id    ${system url}    ${system auth}    ${server name}
    Remove Resource From System    ${system url}    ${system auth}    ${id}

Activate License
    [Arguments]    ${auth}    ${server url}    ${license}
    ${data}=   Create Dictionary    licenseKey=${license}
    Create Digest Session    Activate License session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Post Request    Activate License session   /api/activateLicense    json=${data}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Remove License
    [Arguments]    ${auth}    ${server url}    ${license}
    ${data}=   Create Dictionary    key=${license}
    Create Digest Session    Activate License session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Post Request    Activate License session   /ec2/removeLicense    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Add License
    [Documentation]    Generate activation file on license portal and activate it in client
    [Arguments]    ${auth}    ${server url}    ${license}    ${hwid}
    ${lic block}=   Manual Activate    ${license}    ${hwid}
    ${act obj}=   Create Dictionary    key=${license}    licenseBlock=${lic block}
    ${data}=   Create List    ${act obj}
    Create Digest Session    Add License session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Post Request    Add License session   /ec2/addLicenses    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get Licenses
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Licenses session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Get Request    Get Licenses session   /ec2/getLicenses
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

License Is Activated
    [Arguments]    ${auth}    ${server url}    ${license}
    ${licenses}=   Get Licenses    ${auth}    ${server url}
    FOR    ${lic}    IN    @{licenses}
        Run Keyword If    '${lic}[key]'=='${license}'    Return From Keyword    ${True}
    END
    [Return]    ${False}

Change License Portal Host
    [Arguments]    ${auth}    ${server url}    ${new host}
    Create Digest Session    Change License host session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Get Request    Change License host session   /api/systemSettings?licenseServer=${new host}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get Server HWIDs
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Server hwids session    ${server url}    auth=${auth}    verify=False    disable_warnings=1
    ${resp}=    Get Request    Get Server hwids session   /api/getHardwareIds
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}[reply]

Get System Settings
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get System Settings session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Get Request    Get System Settings session   /ec2/getSettings
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Get System Settings From Server
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get System Settings session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Get Request    Get System Settings session   /api/systemSettings
    Should Be Equal As Strings    ${resp.status_code}    200
    Should Be Equal As Strings    ${resp.json()}[error]    0
    Return From Keyword    ${resp.json()}[reply][settings]

Get Log Level
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Log Level session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Get Request    Get Log Level session   /api/logLevel
    Should Be Equal As Strings    ${resp.status_code}    200
    Should Be Equal As Strings    ${resp.json()}[error]    0
    Return From Keyword    ${resp.json()}[reply]

Get Users
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Users session   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Users session    /ec2/getUsers
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Set System Name
    [Arguments]    ${server url}    ${auth}    ${new name}
    Create Digest Session    Rename System Session   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Rename System Session    /api/systemSettings?systemName=${new name}
    Should Be Equal As Strings    ${resp.status_code}    200

Set Camera Attribute
    [Arguments]    ${server url}    ${auth}    ${camera id}    ${attribute}    ${value}
    &{data} =    Create Dictionary
    ...    cameraId=${camera id}
    ...    ${attribute}=${value}
    Create Digest Session    Save camera attribute    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save camera attribute     /ec2/saveCameraUserAttributes    json=${data}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Set All Camera Attributes
    [Arguments]    ${server url}    ${auth}    ${camera json}
    Create Digest Session    Save camera attributes    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save camera attributes     /ec2/saveCameraUserAttributes    json=${camera json}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Set All Camera Add Params
    [Arguments]    ${server url}    ${auth}    ${camera json}
    Create Digest Session    Save camera add params    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save camera add params     /ec2/setResourceParams    json=${camera json}    timeout=30
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get User Roles
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Get user roles    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get user roles    /ec2/getUserRoles
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Save User
    [Arguments]
    ...    ${auth}
    ...    ${server url}
    ...    ${name}
    ...    ${permissions}
    ...    ${email}
    ...    ${full name}
    ...    ${password}
    ...    ${user id}=${EMPTY}
    ...    ${user role id}=${EMPTY}
    ...    ${is enabled}=${True}
    ...    ${is cloud}=${True}
    &{data}=   Create Dictionary    email=${email}    name=${name}    permissions=${permissions}    isCloud=${is cloud}    isEnabled=${is enabled}    password=${password}
    Run Keyword Unless    "${user id}"=="${EMPTY}"   Set To Dictionary    ${data}    id=${user id}
    Run Keyword Unless    "${is cloud}"=="${True}"   Set To Dictionary    ${data}    fullName=${full name}
    Run Keyword Unless    "${user role id}"=="${EMPTY}"   Set To Dictionary    ${data}    id=${user role id}
    Create Digest Session    Save User session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save User session    /ec2/saveUser    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Save User Existing
    [Arguments]    ${auth}    ${server url}    ${name}    ${permissions}   ${email}    ${user role id}    ${user id}
    &{data}=   Create Dictionary    email=${email}   id=${user id}   isCloud=${True}    isEnabled=${True}    name=${name}    permissions=${permissions}    userRoleId=${userRoleId}
    Create Digest Session    Save User session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save User session    /ec2/saveUser    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Save User Role
    [Arguments]    ${auth}    ${server url}    ${name}    ${permissions}
    &{data}=   Create Dictionary    name=${name}    permissions=${permissions}
    Create Digest Session    Save User Role session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save User Role session    /ec2/saveUserRole    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Remove User
    [Arguments]    ${auth}    ${server url}    ${user id}
    &{data}=   Create Dictionary    id=${user id}
    Create Digest Session    Remove User session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Remove User session    /ec2/removeUser    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Remove User By Email
    [Arguments]    ${auth}    ${server url}    ${email}
    ${users}=   Get Users    ${auth}    ${server url}
    FOR    ${user}     IN    @{users}
        Run Keyword If    "${user}[email]" == "${email}"    Run Keywords
           ...    Remove User    ${auth}    ${server url}    ${user}[id]    AND
           ...    Exit For Loop
    END

Get Cameras
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Cameras session   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Cameras session    /ec2/getCamerasEx
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Change server name via API
    [Arguments]    ${auth}    ${new name}    ${server id}    ${server url}
    &{data}=   Create Dictionary    serverId=${server id}    serverName=${new name}
    Create Digest Session    Change Name session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Change Name session    /ec2/saveMediaServerUserAttributes    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Change server port via API
    [Arguments]    ${auth}    ${server url}    ${new port}    ${server id}
    &{header}=   Create Dictionary    X-Server-guid=${server id}
    &{data}=   Create Dictionary    port=${new port}
    Create Digest Session    Change Port session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Change Port session    /api/configure    json=${data}    headers=${header}    timeout=10
    Return From Keyword    ${resp}

Disable Stat Reports
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Disable Statistics   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Disable Statistics    /api/systemSettings?statisticsAllowed=false&statisticsReportTimeCycle=null
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get Storages via API
    [Arguments]    ${server url}
    Create Digest Session    returnedStorages    ${server url}    auth=${AUTO SYS AUTH}     disable_warnings=1
    ${systemStorages}=   Get Request    returnedStorages   /ec2/getStorages  timeout=10
    [Return]    ${systemStorages.json()}

Save Storages via API
    [Arguments]    ${data}    ${server url}
    Create Digest Session    modifyStorage    ${server url}    auth=${AUTO SYS AUTH}    disable_warnings=1
    ${resp}=   Post Request    modifyStorage    /ec2/saveStorages   json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Set System Settings via API
    [Arguments]    ${auth}    ${server url}    ${setting key}    ${setting value}
    Create Digest Session    Set Setting Session    ${server url}    auth=${auth}     disable_warnings=1
    ${resp}=   Get Request    Set Setting Session   /api/systemSettings?${setting key}=${setting value}    timeout=10
    Should be equal as strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

# Misc
Get Customizations
    [Arguments]    ${auth}
    Create Digest Session    Get Customizations Session    https://ireg.hdw.mx    auth=${auth}     disable_warnings=1
    ${resp}=   Get Request    Get Customizations Session  /api/v1/public/products/nxcloud/instances/prod/    timeout=10
    Should be equal as strings    ${resp.status_code}    200
    ${instance customizations}=   Set Variable    ${resp.json()}[instance_customizations]
    ${customizations}=   Create List
    FOR    ${obj}    IN    @{instance customizations}
        Append To List    ${customizations}    ${obj}[domain]
    END
    [Return]    ${customizations}

Set System Settings
    [Arguments]    ${auth}    ${server url}    ${settings}
    Create Digest Session    Set Setting Session    ${server url}    auth=${auth}     disable_warnings=1
    ${query}=   Set Variable    /api/systemSettings?
    FOR    ${key}    ${val}    IN ZIP    ${settings.keys()}    ${settings.values()}
        ${query}=   Catenate    SEPARATOR=    ${query}    ${key}=${val}&
    END
    ${query}=   Evaluate    $query[:-1]    # remove last & from the query string
    ${resp}=   Get Request    Set Setting Session   ${query}    timeout=10
    Should be equal as strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Get Relays
    [Arguments]    ${auth}
    Create Digest Session    Get Relays Session    https://ireg.hdw.mx    auth=${auth}     disable_warnings=1
    ${resp}=   Get Request    Get Relays Session  /api/v1/public/products/traffic_relay/instances/?group__name=prod    timeout=10
    Should be equal as strings    ${resp.status_code}    200
    ${relays}=   Create List
    FOR    ${obj}    IN    @{resp.json()}
       Append To List    ${relays}    ${obj}[domain]
    END
    [Return]    ${relays}

Get Camera User Attributes
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Get Camera Attributes    ${server url}    auth=${auth}     disable_warnings=1
    ${resp}=   Get Request    Get Camera Attributes   ec2/getCameraUserAttributesList    timeout=10
    [Return]    ${resp.json()}

Save Camera User Attributes
    [Arguments]    ${server url}    ${auth}    ${data}
    Create Digest Session    Save Camera Attributes    ${server url}    auth=${auth}     disable_warnings=1
    ${resp}=   Post Request    Save Camera Attributes   ec2/saveCameraUserAttributesList   json=${data}     timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Get Media Server Attributes
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Get Media Server Attributes    ${server url}    auth=${auth}     disable_warnings=1
    ${resp}=   Get Request    Get Media Server Attributes   ec2/getMediaServerUserAttributesList    timeout=10
    [Return]    ${resp.json()}

Save Media Server Attributes
    [Arguments]    ${server url}    ${auth}    ${data}
    Create Digest Session    Save Media Server Attributes    ${server url}    auth=${auth}     disable_warnings=1
    ${resp}=   Post Request    Save Media Server Attributes   ec2/saveMediaServerUserAttributesList   json=${data}     timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Add Virtual Camera
    [Arguments]    ${server url}    ${auth}    ${camera name}    ${image}=${IMAGE}
    ${data}=   Create Dictionary    name=${camera name}

    Create Digest Session    Add Camera Session    ${server url}    auth=${auth}     disable_warnings=1
    IF    '5.0' in $image
        ${resp}=   Post Request    Add Camera Session   /api/virtualCamera/add   json=${data}     timeout=10
    ELSE
        ${resp}=   Post Request    Add Camera Session   /api/wearableCamera/add?name=${camera name}     timeout=10
    END
    Should Be Equal As Strings    ${resp.status_code}    200
