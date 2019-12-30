*** Settings ***
Resource          resource.robot
Library           RequestsLibrary
Library           NoptixLibrary/Encode.py


*** variables ***
${default name}    API made system
${customization}    default
@{sys auth}    admin    qweasd 123

*** Keywords ***
Bind System
    [Arguments]    ${auth}    ${cloud url}    ${name}=${default name}
    &{data}=    Create Dictionary    name=${name}    customization=${customization}
    Create Digest Session    bind session    ${cloud url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    bind session    /cdb/system/bind    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Setup Cloud System
    [Arguments]    ${auth}    ${server url}    ${auth key}    ${name}    ${id}    ${owner email}
    &{data}=    Create Dictionary    cloudAuthKey=${auth key}    systemName=${name}    cloudSystemID=${id}    cloudAccountName=${owner email}
    Create Digest Session    Setup System session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Setup System session    /api/setupCloudSystem    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Save User Role
    [Arguments]    ${auth}    ${server url}    ${name}    ${permissions}
    &{data}=    Create Dictionary    name=${name}    permissions=${permissions}
    Create Digest Session    Save User Role session    ${server url}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Save User Role session    /ec2/saveUserRole    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Share
    [Arguments]    ${auth}    ${system id}    ${access role}    ${account email}
    &{data}=    Create Dictionary    systemId=${system id}    accessRole=${access role}    accountEmail=${account email}
    Create Digest Session    Share session    ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    Share session    /cdb/system/share    json=${data}
    log    ${resp}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Get Users
    [Arguments]    ${auth}    ${server url}
    Create Digest Session    Get Users session   ${server url}    auth=${auth}
    ${resp}=    Get Request    Get Users session    /ec2/getUsers
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Save User
    [Arguments]    ${auth}    ${server url}    ${user id}    ${user role id}
    &{data}=    Create Dictionary    isCloud=${true}    id=${user id}    userRoleId=${user role id}
    Create Digest Session    Save User session    ${server url}    auth=${auth}
    ${resp}=    Post Request    Save User session    /ec2/saveUser    json=${data}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Integration Store is Enabled
    [Arguments]    ${auth}
    Create Digest Session    Get Integration Store status    ${ENV}    ${auth}
    ${resp}=    Get Request    Get Integration Store status    /api/utils/cloudCapabilities/
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()['integrationStoreEnabled']}

# Alternative way to reset Account password - via cdb directly.
# "Change Account Password" keyword is preferred.
Set Account Password
    [Arguments]    ${email}    ${old_password}    ${new_password}
    ${passwordHa1}=   Encode.Get Ha1 Password    ${email}    ${new_password}
    ${passwordHa1Sha256}=   Encode.Get Ha1 Sha256 Password     ${email}    ${new_password}

    &{params}=    Create Dictionary    passwordHa1=${passwordHa1}    passwordHa1Sha256=${passwordHa1Sha256}
    Log dictionary    ${params}
    @{auth}=   Create Dictionary    ${email}    ${old_password}
    Create Digest Session    set_new_password_session   ${ENV}    auth=${auth}    disable_warnings=1
    ${resp}=    Post Request    set_new_password_session    /cdb/account/update    json=${params}
    Should Be Equal As Strings    ${resp.status_code}    200
    Return From Keyword    ${resp.json()}

Log Out via API
    ${cookies}=   Get Cookies    as_dict = True
    ${status}=   CloudPortalAPI.Log Out    ${ENV}    &{cookies}[sessionid]    &{cookies}[csrftoken]
    Should Be Equal as Strings    ${status}    200
    Reload Page

Evaluate Auto System Settings via API
    [arguments]    ${setting}    ${selected}
    Create Digest Session    returnedSetting    ${AUTO SYS API}    ${AUTO SYS API AUTH}     disable_warnings=1
    ${systemSettings} =     Get Request    returnedSetting   /api/systemSettings   timeout=10
    ${string} =    Convert To String    ${systemSettings.json()}
    Should Contain    ${string}    ${setting}': '${selected}
    
    #&{bind json}=    bind system    ${auth}    ${ENV}    name=${system name}
    #&{Setup Cloud System json}=    Setup Cloud System
    #...    ${default auth}
    #...    https://localhost:${port}
    #...    ${bind json["authKey"]}
    #...    ${bind json["name"]}
    #...    ${bind json["id"]}
    #...    ${bind json["ownerAccountEmail"]}
    #[return]    ${bind json["id"]}
    