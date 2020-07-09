*** Settings ***
Resource    ../resource.robot

Suite Setup       Merge Suite Setup
Test Teardown     Run Keyword If Test Failed    Merge Test Restart
Suite Teardown    Merge Suite Teardown

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977
    Log    C70976: "Merge with Another System" button is available only for owner
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port}=   Set Variable    7021
    ${system}=   Set Variable    ${IMAGE 4.0}_${port}
    ${cont}=   Run Container    ${IMAGE 4.0}    ${port}    network=bridge
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
    Reload Page
    Wait until element is visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Steps 2-4: Log in as administrator, viewer, custom
    FOR    ${user}    IN    @{users.keys()}
        Log In    ${users}[${user}]    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id}
        Reload Page     # to get info from the server faster
        Wait until element is visible    ${DISCONNECT FROM MY ACCOUNT}
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
    [Tags]    C70930
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7031
    ${port 2}=   Set Variable    7032
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 2 id}
    Reload Page
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    180    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 3: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 4: Keep primary system and press 'Next'
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 5: Enter correct password and press 'Merge Systems'
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}    ${system 2}

    Log    Test teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}

Positive scenario with selected cloud system (selected system is primary)
    [Tags]    C70931
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7041
    ${port 2}=   Set Variable    7042
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 2 id}
    Reload Page
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    180    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 3: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Log    Step 4: Select system 2 as primary an press 'Next'
    Choose Primary System   from target=True
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 5: Enter correct password and press 'Merge Systems'
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 2}    ${system 1}

    Log    Test teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}

Positive scenario with selected local autodiscovered system not connected to the cloud
    [Tags]    C70932    deb
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7051
    ${port 2}=   Set Variable    7052
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=host
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=host
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${r}=   Setup Local System    ${LOCALHOST}:${port 2}    ${base password}    ${system 2}
    ${sys 2 id}=   Set Variable    ${r}[reply][settings][localSystemId]

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    180    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Validate Confirm Merge Dialog
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}    ${system 2}

    Log    Test teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}

Positive scenario with selected non-autodiscovered system (dropdown + Server URL input)
    [Tags]    C76220    deb
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7061
    ${port 2}=   Set Variable    7062
    ${port 3}=   Set Variable    7063
    ${port 4}=   Set Variable    7064
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${system 3}=   Set Variable    ${IMAGE 4.0}_${port 3}
    ${system 4}=   Set Variable    ${IMAGE 4.0}_${port 4}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=host
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    ${cont 3}=   Run Container    ${IMAGE 4.0}    ${port 3}    network=host
    ${cont 4}=   Run Container    ${IMAGE 4.0}    ${port 4}    network=host
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    Append To List    ${test containers}    ${cont 3}
    Append To List    ${test containers}    ${cont 4}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${r}=   Setup Local System    ${LOCALHOST}:${port 2}    ${base password}    ${system 2}
    Setup Local System    ${LOCALHOST}:${port 3}    ${base password}    ${system 3}
    Setup Local System    ${LOCALHOST}:${port 4}    ${base password}    ${system 4}
    ${sys 2 id}=   Set Variable    ${r}[reply][settings][localSystemId]

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    180    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select Other System
    Choose System From Dropdown    ${OTHER SYSTEM}    target system ip=${LOCALHOST}    target system port=${port 2}    input url=${LOCALHOST}:${port 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Validate Confirm Merge Dialog
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}    ${system 2}

    Log    Test teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Stop Container    ${cont 3}    remove=True
    Stop Container    ${cont 4}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}
    Remove Values From List    ${test containers}    ${cont 3}
    Remove Values From List    ${test containers}    ${cont 4}