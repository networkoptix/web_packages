*** Settings ***
Resource    ../resource.robot

Suite Setup       Merge Suite Setup
Test Teardown     Run Keyword If Test Failed    Merge Test Restart
Suite Teardown    Merge Suite Teardown

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977    pos
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
        Wait until element is visible    ${DISCONNECT FROM MY ACCOUNT}    timeout=30
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
    [Tags]    C70930    pos
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
    [Tags]    C70931    pos
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
    [Tags]    C70932        pos
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7051
    ${port 2}=   Set Variable    7052
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
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
    [Tags]    C76220    pos
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

Positive scenario with selected non-autodiscovered system (only Server URL input)
    [Tags]    C76221    pos
    Log    Test setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7071
    ${port 2}=   Set Variable    7072
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=host
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    Setup Local System    ${LOCALHOST}:${port 2}    ${base password}    ${system 2}

    Log    Step 1: Press Merge button and validate the dialog
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    120    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog    lonely=True

    Log    Step 2: Input System 2 url and press Next
    Input Text    ${MERGE FORM SERVER URL INPUT}    ${LOCALHOST}:${port 2}
    Click Button    ${MERGE NEXT BUTTON}
#    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Log    Step 3: Finish merge process
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
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

# Commented out due to CLOUD-5439
#Positive scenario with selected new system
#    [Tags]    C76269    pos
#    Log    Test set up
#    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
#    ${port 1}=   Set Variable    7081
#    ${port 2}=   Set Variable    7082
#    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
#    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
#    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=host
#    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=host
#    Append To List    ${test containers}    ${cont 1}
#    Append To List    ${test containers}    ${cont 2}
#    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
#    Setup Local System    ${LOCALHOST}:${port 2}    ${base password}    ${system 2}
#
#    Log    Step 1
#    Log In    ${owner email}    ${BASE PASSWORD}
#    Go To    ${ENV}/systems/${sys 1 id}
#    Reload Page
#    Sleep    120    # To avoid false negative tests
#    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
#
#    Log    Test teardown
#    Log Out
#    Stop Container    ${cont 1}    remove=True
#    Stop Container    ${cont 2}    remove=True
#    Remove Values From List    ${test containers}    ${cont 1}
#    Remove Values From List    ${test containers}    ${cont 2}

Positive scenario with back button use (on choosing primary system)
    [Tags]    C76270    pos
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7091
    ${port 2}=   Set Variable    7022
    ${port 3}=   Set Variable    7093
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${system 3}=   Set Variable    ${IMAGE 4.0}_${port 3}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    ${cont 3}=   Run Container    ${IMAGE 4.0}    ${port 3}    network=bridge
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    Append To List    ${test containers}    ${cont 3}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}
    ${sys 3 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 3}    ${system 3}    ${owner email}

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    180    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Choose Primary Dialog

    Log    Step 2
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 3
    Choose System From Dropdown    ${system 3}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 4
    Choose Primary System    from target=True
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 5
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Choose Primary Dialog

    Log    Step 6
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 7
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 8
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 9
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}    ${system 2}

    Log    Test Teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Stop Container    ${cont 3}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}
    Remove Values From List    ${test containers}    ${cont 3}

Different types of users in both Systems
    [Tags]    C76326    pos
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7111
    ${port 2}=   Set Variable    7112
    ${port 3}=   Set Variable    7113
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${system 3}=   Set Variable    ${IMAGE 4.0}_${port 3}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    ${cont 3}=   Run Container    ${IMAGE 4.0}    ${port 3}    network=bridge
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    Append To List    ${test containers}    ${cont 3}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}
    ${sys 3 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 3}    ${system 3}    ${owner email}
    Sleep    180

    ${sys 1 admin}=   Register and activate account with random email    sys1    admin    ${BASE PASSWORD}
    ${sys 2 adv viewer}=   Register and activate account with random email    sys2    adviewer    ${BASE PASSWORD}
    ${sys 3 custom}=   Register and activate account with random email    sys3    custom    ${BASE PASSWORD}
    ${all systems user}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}

    @{auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    Share     ${auth}    ${sys 1 id}    ${ACCESS ROLES}[admin]    ${sys 1 admin}
    Share     ${auth}    ${sys 2 id}    ${ACCESS ROLES}[advancedViewer]    ${sys 2 adv viewer}
    Share     ${auth}    ${sys 3 id}    ${ACCESS ROLES}[custom]    ${sys 3 custom}
    Share     ${auth}    ${sys 1 id}    ${ACCESS ROLES}[admin]    ${all systems user}
    Share     ${auth}    ${sys 2 id}    ${ACCESS ROLES}[advancedViewer]    ${all systems user}
    Share     ${auth}    ${sys 3 id}    ${ACCESS ROLES}[custom]    ${all systems user}

    Log    Step 1: Merge System 1(primary) with System 2(secondary), check users
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Sleep    240    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Complete merge steps till final password input    ${system 2}
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}    ${system 2}

    ${sys 1 users}=   Get Cloud System Users    ${auth}    ${sys 1 id}
    ${sys 1 user emails}=   Create List
    FOR    ${user}    IN    @{sys 1 users}
        Append To List    ${sys 1 user emails}    ${user}[accountEmail]
    END
    Should Contain    ${sys 1 user emails}    ${sys 2 adv viewer}
    Should Contain    ${sys 1 user emails}    ${all systems user}
    FOR    ${user}    IN    @{sys 1 users}
        Run Keyword If    '${user}[accountEmail]' == '${sys 2 adv viewer}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[cloudAdmin]
        Run Keyword If    '${user}[accountEmail]' == '${all systems user}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[cloudAdmin]
    END

    Log    Step 2: Merge System 1(secondary) with System 3(primary), check users
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Complete merge steps till final password input    ${system 3}
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 3}    ${system 1}

    ${sys 3 users}=   Get Cloud System Users    ${auth}    ${sys 3 id}
    ${sys 3 user emails}=   Create List
    FOR    ${user}    IN    @{sys 1 users}
        Append To List    ${sys 3 user emails}    ${user}[accountEmail]
    END
    Should Contain    ${sys 3 user emails}    ${sys 1 admin}
    Should Contain    ${sys 3 user emails}    ${sys 2 adv viewer}
    Should Contain    ${sys 3 user emails}    ${all systems user}
    Should Contain    ${sys 3 user emails}    ${sys 3 custom}

    FOR    ${user}    IN    @{sys 3 users}
        Run Keyword If    '${user}[accountEmail]' == '${sys 3 custom}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[custom]
        Run Keyword If    '${user}[accountEmail]' == '${all systems user}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[custom]
    END

    Log    Test Teardown
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Stop Container    ${cont 3}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}
    Remove Values From List    ${test containers}    ${cont 3}


# Negative scenarios
Checking state for selected Cloud system
    [Tags]    C70983    C70987    C70984    C70985   neg    deb
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7121
    ${port 2}=   Set Variable    7122
    ${port 3}=   Set Variable    7123
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${system 3}=   Set Variable    ${IMAGE 4.1}_${port 3}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=bridge
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=bridge
    ${cont 3}=   Run Container    ${IMAGE 4.1}    ${port 3}    network=bridge
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    Append To List    ${test containers}    ${cont 3}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}
    ${sys 3 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 3}    ${system 3}    ${owner email}
    Sleep    180
    Stop Container    ${cont 2}    remove=False

    Log    C70983: System offline
    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${system 2}
    ${s}=   Replace String    ${CANNOT MERGE WITH OFFLINE SYSTEM TEXT}    %SYSTEM NAME%    ${system 2}
    Wait until element is visible    //p[contains(text(),"${s}")]

    Log    Step 3
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Check Merge Dialog


    Log    C70987: Checking state - offline system becomes online
    Log    Step 2: Bring system 2 back online and click Next
    Start Container    ${cont 2}
    Sleep    60
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 3: Click <- button
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 4: Click Next
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    # Dialog might not go to the next state after first click
    ${switched}=   Run Keyword And Return Status    Wait Until Element Is Visible    ${MERGE CHOOSE PRIMARY FORM}    timeout=10
    Run Keyword Unless    ${switched}    Run Keywords
        ...    Click Button    ${MERGE NEXT BUTTON}
        ...    AND    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
        ...    AND    Validate Choose Primary Dialog

    Log    C70984: System has an older software version
    Go To    ${ENV}/systems/${sys 3 id}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible   ${SYSTEMS HAVE MISMATCHING VERSIONS}

    Log    C70985: System has a newer software version
    Go To    ${ENV}/systems/${sys 2 id}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 3}
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible   ${SYSTEMS HAVE MISMATCHING VERSIONS}

    Log    Test Teardown
    Reload Page
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Stop Container    ${cont 3}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}
    Remove Values From List    ${test containers}    ${cont 3}

Duplicate servers
    [Tags]    C71004    neg
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7131
    ${port 2}=   Set Variable    7132
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.0}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=host
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=host
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}
    ${sys 2 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 2}    ${system 2}    ${owner email}
    Sleep    180

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${system 2}
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible    ${SERVER APPEARS TO BE LISTING ITSELF}

    Log    Test Teardown
    Reload Page
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}

# Checking state for selected local system
Server URL is empty
    [Tags]    C76223    neg
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${port 1}=   Set Variable    7131
    ${port 2}=   Set Variable    7132
    ${system 1}=   Set Variable    ${IMAGE 4.0}_${port 1}
    ${system 2}=   Set Variable    ${IMAGE 4.1}_${port 2}
    ${cont 1}=   Run Container    ${IMAGE 4.0}    ${port 1}    network=host
    ${cont 2}=   Run Container    ${IMAGE 4.0}    ${port 2}    network=host
    Append To List    ${test containers}    ${cont 1}
    Append To List    ${test containers}    ${cont 2}
    ${sys 1 id}=   Create system and attach to cloud    ${LOCALHOST}    ${port 1}    ${system 1}    ${owner email}

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys 1 id}
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${OTHER SYSTEM}
    Wait Until Element Is Visible    ${MERGE FORM SERVER URL INPUT}
    Input Text   ${MERGE FORM SERVER URL INPUT}    ${EMPTY}
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible    ${MERGE ENTER SERVER ADDRESS}

    Log    C76528: No server is found for system 4.0
    Log    Step 1
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${OTHER SYSTEM}
    Wait Until Element Is Visible    ${MERGE FORM SERVER URL INPUT}
    Input Text   ${MERGE FORM SERVER URL INPUT}    http://example.com:7001
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 2
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 3
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog    ${system 1}    http://example.com:7001

    Log    Step 4
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE FAILED HEADER}

    Log    Test Teardown
    Reload Page
    Log Out
    Stop Container    ${cont 1}    remove=True
    Stop Container    ${cont 2}    remove=True
    Remove Values From List    ${test containers}    ${cont 1}
    Remove Values From List    ${test containers}    ${cont 2}
