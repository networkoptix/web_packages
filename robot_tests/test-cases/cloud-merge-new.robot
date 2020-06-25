*** Settings ***
Resource    ../resource.robot

Suite Setup       Merge Suite Setup
Suite Teardown    Merge Suite Teardown

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977
    Log    C70976: "Merge with Another System" button is available only for owner
    Log    Test set up
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

    Log    Steps 2-4: Log in as administrator, viewer, custom
    FOR    ${user}    IN    @{users.keys()}
        Log In    ${users}[${user}]    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id}
        Wait until element is visible    ${DISCONNECT FROM MY ACCOUNT}
        Reload Page     # to get info from the server faster
        Wait until element is not visible    ${MERGE BUTTON SYSTEM}    timeout=30
        Log Out
    END

    Log    C70977: "Merge with Another System" button is disabled if system is offline
    Stop Container    ${cont}
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id}
    Wait until element is visible    ${MERGE BUTTON SYSTEM DISABLED}

    Log    Test teardown
    Log Out
    Stop Container    ${cont}    remove=True
    Remove Values From List    ${test containers}    ${cont}

# Positive scenarios
Positive scenario with selected cloud system (selected system is secondary)
    [Tags]    C70930    deb
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7031
    ${port 2}=   Set Variable    7032
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}
#    Append To List    ${test containers}    ${cont 1}
#    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 2 id}
    Reload Page
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
#    Log    Step 2: Press merge button and check the dialog state
#
#    Log    Step 3: Select System 2
#    Stop Container    ${cont 1}    remove=True
#    Stop Container    ${cont 2}    remove=True
#    Remove Values From List    ${test containers}    ${cont 1}
#    Remove Values From List    ${test containers}    ${cont 2}
