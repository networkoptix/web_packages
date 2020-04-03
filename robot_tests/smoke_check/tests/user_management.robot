*** Settings ***
Resource         ../resources/vars.robot
Resource         ../../resource.robot
Resource         ../../APIresource.robot

Suite Setup      Open Browser    ${ENV}    headlesschrome
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - User Management
Suite Teardown   Clean Up


*** Variables ***
${server url}    http://10.1.5.148:7001
${system id}     36148fb9-589b-489d-b25a-725fb3c68b07
${cloud system id}    7fd4b6e1-b22f-4131-a789-bc02d6ee10fa
@{auth}    ${email owner}    ${base password}


*** Keywords ***
Clean Up
    ${user id}=   Get User Id    ${server url}    ${auth}    ${email existing user}
#    Remove User From System    ${auth}    ${server url}    ${user id}
    Remove Not Owners From Cloud    ${server url}    ${auth}    ${email owner}


*** Test Cases ***
Portal - Share - existing user
    [Tags]    C30445    user_management
    Go To    ${URL}/systems
    Log In    ${email owner}    ${base password}    validate=${False}    button=None

    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${SHARE BUTTON SYSTEMS}
    Wait Until Element Is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element Is Visible    ${SHARE BUTTON MODAL}
    Input Text    ${SHARE EMAIL}    ${email existing user}
    Click Button    ${SHARE BUTTON MODAL}
    Wait Until Element Is Visible    ${REMOVE USER BUTTON}

    Sleep    10s
    ${is in}=   User Is In System    ${server url}    ${auth}    ${email existing user}
    Should Be True    ${is in}


Client - Share with non-existing user, then Delete the User
    [Tags]    C30447    C30727    user_management
    ${new user email}=    Get Random Email    ${email base}
    &{user data}=   Create Dictionary
    ...    name=newuser
    ...    permissions=GlobalViewArchivePermission|GlobalAccessAllMediaPermission
    ...    email=${new user email}
    ...    isEnabled=${True}
    ...    isCloud=${True}
    ...    fullName=SmokeCheck NewUser
    ...    password=${base password}
    Sleep    5s

    Log    C30447: Share System
    &{new user data}=   Save User to System    ${server url}    ${auth}    ${user data}
    Sleep    10s
    ${is on portal}=   Is in user list on portal    ${URL}    ${auth}    ${cloud system id}    ${new user email}
    Should Be True    ${is on portal}

    Log    C30727: Delete User
    Remove User From System    ${auth}    ${server url}    &{new user data}[id]
    Sleep    10s
    ${is in system}=   User Is In System    ${server url}    ${auth}    ${new user email}
    Should Not Be True    ${is in system}
    ${is on portal}=   Is in user list on portal    ${URL}    ${auth}    ${cloud system id}    ${new user email}
    Should Not Be True    ${is on portal}
