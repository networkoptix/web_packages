*** Settings ***
Resource          resource.robot
Library           RequestsLibrary
Library           NoptixLibrary/Encode.py

*** Variables ***
${default name}    API made system
${customization}    default

*** Keywords ***
# Keywords which use Cloud and cloud Portal API
Bind System
    [Arguments]    ${auth}    ${cloud url}    ${name}=${default name}
    &{data}=   Create Dictionary    name=${name}    customization=${customization}
    Create Digest Session    bind session    ${cloud url}    auth=${auth}    disable_warnings=1
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
    [Arguments]    ${server url}    ${server port}    ${system name}    ${cloud email}    ${cloud password}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    @{default auth}=    Create List    admin    admin
    &{bind json}=    Bind System    ${cloud auth}    ${ENV}    name=${system name}
    sleep    1
    &{Setup Cloud System json}=    Setup Cloud System
    ...    ${default auth}
    ...    ${server url}:${server port}
    ...    ${bind json["authKey"]}
    ...    ${bind json["name"]}
    ...    ${bind json["id"]}
    ...    ${bind json["ownerAccountEmail"]}
    [Return]    ${bind json["id"]}

Connect System to Cloud
    [Arguments]    ${auth}   ${server ip}    ${system name}    ${cloud email}    ${cloud password}
    @{cloud auth}=   Create List    ${cloud email}    ${cloud password}
    &{bind json}=    Bind System    ${cloud auth}    ${ENV}    ${system name}
    Log    ${bind json}
    Sleep    5
    &{Setup Cloud System json}=    Save Cloud System Credentials
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
    Create Digest Session    Rename System session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Rename System session    /cdb/system/rename    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Share
    [Arguments]    ${auth}    ${system id}    ${access role}    ${account email}
    &{data}=   Create Dictionary    systemId=${system id}    accessRole=${access role}    accountEmail=${account email}
    Create Digest Session    Share session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Share session    /cdb/system/share    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Get Cloud System Settings
    [Arguments]    ${auth}    ${system id}
    Create Digest Session    Get System Settings session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get System Settings session   /cdb/system/get?systemId=${system id}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()['systems'][0]}

Get Cloud System Users
    [Arguments]    ${auth}    ${system id}
    &{data}=   Create Dictionary    systemId=${system id}
    Create Digest Session    Get Cloud Users session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Get Cloud Users session    /cdb/system/getCloudUsers    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()['sharing']}

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

Register New User and Activate the Account
    [Arguments]    ${email}    ${password}    ${first_name}    ${last_name}
    @{auth}=   Create List    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}
    Register    ${ENV}    ${auth}    ${email}    ${password}    ${first_name}    ${last_name}
    Create Digest Session    Register Session    ${AUTO SYS API}    ${AUTO SYS API AUTH}     disable_warnings=1
    ${resp}=   Post Request    Register Session   /api/systemSettings   timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Log Out via API
    ${cookies}=   Get Cookies    as_dict = True
    ${status}=   CloudPortalAPI.Log Out    ${ENV}    ${cookies}[sessionid]    ${cookies}[csrftoken]
    Should Be Equal as Strings    ${status}    200
    Go To    ${ENV}
    Validate Log Out
    [Return]    ${status}

Evaluate Auto System Settings via API
    [Arguments]    ${setting}    ${selected}
    # This need to be fixed in CLOUD-4798
    Create Digest Session    returnedSetting    ${AUTO SYS IP}    auth=${AUTO SYS AUTH}     disable_warnings=1
    ${systemSettings}=   Get Request    returnedSetting   /api/systemSettings   timeout=10
    ${string}=   Convert To String    ${systemSettings.json()}
    Should Contain    ${string}    ${setting}': '${selected}

Disconnect Server via API
    [Arguments]    ${auth}    ${sysId}    ${password}
    Create Digest Session    disconnectServer   ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    disconnectServer    /api/systems/disconnect    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Set Auto System Settings via API
    [Arguments]    ${setting}    ${state}
    Create Digest Session    returnedSetting    ${AUTO SYS IP}    auth=${AUTO SYS AUTH}     disable_warnings=1
    ${systemSettings}=   Get Request    returnedSetting   /api/systemSettings?${setting}=${state}  timeout=10
    ${string}=   Convert To String    ${systemSettings.json()}
    Should Contain    ${string}    ${setting}': '${state}
    
Set 3 dot 2 System Settings via API
    [Arguments]    ${setting}    ${state}
    Create Digest Session    returnedSetting    https://10.1.5.158:7001    auth=${AUTO SYS AUTH}     disable_warnings=1
    ${systemSettings}=   Get Request    returnedSetting   /api/systemSettings?${setting}=${state}  timeout=10
    ${string}=   Convert To String    ${systemSettings.json()}
    Should Contain    ${string}    ${setting}': '${state}

# Keywords which use System/Server API
Setup Local System
    [Arguments]    ${server url}    ${new password}    ${system name}
    @{auth}=   Create List    admin    admin
    &{data}=    Create Dictionary    password=${new password}    systemName=${system name}
    Create Digest Session    Setup System session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Setup System session    /api/setupLocalSystem    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Setup Cloud System
    [Arguments]    ${auth}    ${server url}    ${auth key}    ${system name}    ${cloud system id}    ${owner email}
    &{data}=   Create Dictionary    cloudAuthKey=${auth key}    systemName=${system name}    cloudSystemID=${cloud system id}    cloudAccountName=${owner email}
    Create Digest Session    Setup System session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Setup System session    /api/setupCloudSystem    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Save Cloud System Credentials
    [Arguments]    ${auth}    ${server url}    ${auth key}    ${system name}    ${cloud system id}    ${owner email}
    &{data}=   Create Dictionary    cloudAuthKey=${auth key}    cloudSystemID=${cloud system id}    cloudAccountName=${owner email}
    Create Digest Session    Save Cloud Credentials session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save Cloud Credentials session    /api/saveCloudSystemCredentials    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Restart Server
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Restart Server session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Restart Server session     /api/restart    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Restore Factory Defaults
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}
    Create Digest Session    Restore Server session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Restore Server session     /api/restoreState    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200

Detach Server From System
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}
    Create Digest Session    Detach From System session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Detach From System session     /api/detachFromSystem    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

Detach Server From Cloud
    [Arguments]    ${server url}    ${auth}
    &{data}=   Create Dictionary    currentPassword=${auth[1]}    password=${BASE PASSWORD}
    Create Digest Session    Detach From Cloud session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Detach From Cloud session     /api/detachFromCloud    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}

# Local user management
Get System Settings
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get System Settings session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Get Request    Get System Settings session   /ec2/getSettings
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Get Users
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Users session   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Users session    /ec2/getUsers
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}
    
Check Allow Only Secure Connections
    [Arguments]    ${server url}    ${auth}
    Create Digest Session    Check HTTPS   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Check HTTPS    /static/index.html#/   
    Should Be Equal As Strings    ${resp.status_code}    200
    
Set Camera Name
    [Arguments]    ${server url}    ${auth}    ${camera id}    ${name}
    &{data} =    Create Dictionary
    ...    cameraId={${camera id}}
    ...    cameraName=${name}
    Create Digest Session    Save camera name    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Post Request    Save camera name     /ec2/saveCameraUserAttributesList    json=${data}    timeout=10
    Should Be Equal As Strings    ${resp.status_code}    200
    [Return]    ${resp.json()}
    
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
    &{data}=   Create Dictionary    name=${name}    permissions=${permissions}    email=${email}    isEnabled=${is enabled}    isCloud=${is cloud}    fullName=${full name}    password=${password}
    Run Keyword Unless    "${user id}"=="${EMPTY}"   Set To Dictionary    ${data}    id=${user id}
    Run Keyword Unless    "${user role id}"=="${EMPTY}"   Set To Dictionary    ${data}    id=${user role id}
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

Get Cameras
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Cameras session   ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Get Cameras session    /ec2/getCamerasEx
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}
