*** Settings ***
Resource    ../resource.robot

Suite Setup       Merge Suite Setup
Suite Teardown    Merge Suite Teardown

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977
    Log    C70976: "Merge with Another System" button is available only for owner
    Log    Set Up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port}=   Set Variable    7021
    ${system}=   Set Variable    ${IMAGE 4.0}_${port}
    ${cont}=   Run Container    ${IMAGE 4.0}    ${port}
    Append To List    ${test containers}    ${cont}
    ${sys id}=   Create system and attach to cloud    ${LOCALHOST}    ${port}    ${system}    ${owner email}
    @{auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    &{users}=   Create Dictionary
    FOR    ${role}    IN    cloudAdmin    viewer    custom
        ${email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
        Set To Dictionary    ${users}    ${role}=${email}
        Share    ${auth}    ${sys id}    ${role}    ${email}
    END

    Log    Step 1: Log in as owner
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id}
    Wait until element is visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Steps 2-4: Log in as admin, viewer, custom
    FOR    ${user}    IN    @{users.keys()}
        Log In    ${users}[${user}]    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id}
        Wait until element is visible    ${DISCONNECT FROM MY ACCOUNT}
        Reload Page     # to get info from the server faster
        Wait until element is not visible    ${MERGE BUTTON SYSTEM}    timeout=30
        Log Out
    END

    Stop Container    ${cont}    remove=True
    Remove Values From List    ${test containers}    ${cont}
#    Go To    ${ENV}/systems/${sys id}
#    Log    C70977: "Merge with Another System" button is disabled if system is offline
#    Stop Container    ${cont}

