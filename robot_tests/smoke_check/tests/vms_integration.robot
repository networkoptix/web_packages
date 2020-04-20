*** Settings ***
Resource         ../resources/vars.robot
Resource         ../../resource.robot
Resource         ../../APIresource.robot

Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - User Management
Suite Teardown   Run Keyword and Ignore Error    Detach From Cloud    ${server url}    ${cloud auth}

*** Variables ***
${server url}     https://10.1.5.114:7001
${system name}    vpc2ub18
@{cloud auth}     ${email vms}    ${base password}
@{default auth}   admin    admin

*** Keywords ***
Setup System and Attach to Cloud
    &{bind data}=   Bind System    ${cloud auth}    ${ENV}    ${system name}
    Sleep    10s
    Log Dictionary    ${bind data}
    &{setup system data}=   Setup Cloud System
    ...    ${default auth}
    ...    ${server url}
    ...    ${bind data}[authKey]
    ...    ${bind data}[name]
    ...    ${bind data}[id]
    ...    ${bind data}[ownerAccountEmail]
    Sleep    5s
    Restart Server     ${server url}    ${cloud auth}

*** Test Cases ***
#Log in to VMS as cloud owner
#    [Tags]    C30825

Connect System To Cloud - Client
    [Tags]    vms    C30443
    Setup System and Attach to Cloud
    Sleep    10s
#    &{users data}=   Get Cloud Users

#Check System State On Cloud Portal
#    [Tags]    C30826
    # Verify system is displayed correctly on portal

Disconnect System From Cloud - Client
    [Tags]    vms    C30444
#    Check what API is used for disconnection system from cloud
    Detach From Cloud    ${server url}    ${cloud auth}
#    Check that system disconnected from the account
    Sleep    5s

Disconnect System From Cloud - Portal
    [Tags]    vms    C30777
    Setup System and Attach to Cloud
    Sleep    5s
    Open Browser    ${URL}/systems    headlesschrome
    Log In    ${email vms}    ${base password}    validate=${False}    button=None
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT PASSWORD INPUT}     ${DISCONNECT FORM DISCONNECT BUTTON}
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}
    Click Button    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FROM NX}
    Close Browser
    Run keyword and ignore error    Restart Server    ${server url}    ${cloud auth}
    ${is connected to cloud}=   Run keyword and return status    Get System Settings    ${cloud auth}    ${server url}
    Should Not Be True    ${is connected to cloud}

# System is disconnected from cloud after owner deletes the account





