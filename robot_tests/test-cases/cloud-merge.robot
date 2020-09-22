*** Settings ***
Documentation     Make sure there is no running servers on the test machine before running the suite
Resource          ../resource.robot
Suite Setup       Merge Suite Setup
#Test Teardown     Run Keyword If Test Failed    Merge Test Restart
Test Teardown     Merge Test Teardown
Suite Teardown    Merge Suite Teardown
Force Tags        merge

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977    should
    Log    C70976: "Merge with Another System" button is available only for owner
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system}=   Setup System    7021    cloud email=${owner email}

    ${auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    ${users}=   Create Dictionary
    FOR    ${role}    IN    cloudAdmin    viewer    custom
        ${email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
        Set To Dictionary    ${users}    ${role}=${email}
        Share    ${auth}    ${system}[id]    ${role}    ${email}
    END

    Log    Step 1: Log in as owner
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system}[id]
    Reload Page
    Wait until element is visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Steps 2-4: Log in as administrator, viewer, custom
    FOR    ${user}    IN    @{users.keys()}
        Log In    ${users}[${user}]    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${system}[id]
        Wait until element is visible    ${DISCONNECT FROM MY ACCOUNT}    timeout=30
        Wait until element is not visible    ${MERGE BUTTON SYSTEM}    timeout=30
        Log Out
    END

    Log    C70977: "Merge with Another System" button is disabled if system is offline
    Stop Container    ${system}[cont]
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system}[id]
    Wait until element is visible    ${MERGE BUTTON SYSTEM DISABLED}

Merge Dialog - Dropdown has three sections
    [Tags]    C70979    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7301    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7302    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7303    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 4}=   Setup System    7304    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 5}=   Setup System    7305    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 6}=   Setup System    7306    image=${IMAGE 4.0}
    ${system 7}=   Setup System    7307    image=${IMAGE 4.1}    network=host
    ${system 8}=   Setup System    7308    image=${IMAGE 4.1}

    ${auth}=   Create List   admin    ${base password}
    Rename Server     ${HOST}:${system 7}[port]    ${auth}    ServerName

    Sleep    60
    Stop Container    ${system 4}[cont]

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 5}[name]")]

    Log    Step 2
    Click Button    ${MERGE SYSTEM DROPDOWN}
    Validate Check Merge Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE ONLY AS OWNER}
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 2}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 3}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 4}[name]")]//following-sibling::span[contains(text(), "offline")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 5}[name]")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 6}[name]")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 7}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 8}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a[span="${OTHER SYSTEM}"]
    Element should not be visible    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 1}[name]")]
    ${sys 7 description}=    Get Text    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 7}[name]")]//following-sibling::span
    ${ip}=   Replace String    ${HOST}    https://    ${EMPTY}
    ${ip}=   Replace String    ${ip}    http://    ${EMPTY}
    Should Contain    ${sys 7 description}    (ServerName,${SPACE}${ip}:${system 7}[port])

Merge Dialog - Dropdown has two sections(no cloud systems)
    [Tags]    C70980    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7311    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7312    image=${IMAGE 4.1}
    ${system 3}=   Setup System    7313    image=${IMAGE 4.1}
    ${system 4}=   Setup System    7314    image=${IMAGE 4.0}
    ${system 5}=   Setup System    7315    image=${IMAGE 4.0}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]

    Click Button    ${MERGE SYSTEM DROPDOWN}
    Validate Check Merge Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 2}[name]")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 3}[name]")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 4}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 5}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    ...    ${MERGE CHECK MERGE FORM}//li/a[span="${OTHER SYSTEM}"]
    Element should not be visible    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 1}[name]")]

    Log    Step 2
    Choose System From Dropdown    ${system 2}[name]

    Log    Step 3 - cannot be automated - no DOM element for auto-populated url

    Log    Step 4
    Input Text    ${MERGE FORM SERVER URL INPUT}    ${HOST}:${system 2}[port]
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${OTHER SYSTEM}")]

Merge Dialog - Dropdown has two sections(no local systems)
    [Tags]    C70981    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7316    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7317    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]

    Click Button    ${MERGE SYSTEM DROPDOWN}
    Validate Check Merge Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE ONLY AS OWNER}
    ...    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 2}[name]")]
    ...    ${MERGE CHECK MERGE FORM}//li/a[span="${OTHER SYSTEM}"]
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

    Log   C76420
    Stop Container    ${system 2}[cont]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]
    Click Button    ${MERGE SYSTEM DROPDOWN}
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]//following-sibling::span[contains(text(), "offline")]
    Element should not be visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 1}[name]")]

Merge Dialog - Dropdown has no valid systems
    [Tags]    C76420    merge_dialog
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7321    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7322    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]
    Click Button    ${MERGE SYSTEM DROPDOWN}
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]//following-sibling::span[contains(text(), "incompatible")]
    Element should not be visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 1}[name]")]

#Merge Dialog - Server URL field validation
#    [Tags]    C70982    merge_dialog
#    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
#    ${port 1}=   Set Variable    7321
#    ${port 2}=   Set Variable    7322
#    ${port 3}=   Set Variable    7323
#    ${system 1}=   Set Variable    ${IMAGE 4.1}_${port 1}
#    ${system 2}=   Set Variable    ${IMAGE 4.1}_${port 2}
#    ${system 3}=   Set Variable    ${IMAGE 4.1}_${port 3}
#    ${cont 1}=   Run Container    ${IMAGE 4.1}    ${port 1}    network=bridge
#    ${cont 2}=   Run Container    ${IMAGE 4.1}    ${port 2}    network=bridge
#    ${cont 3}=   Run Container    ${IMAGE 4.1}    ${port 3}    network=bridge
#    FOR    ${i}    IN RANGE   1    4
#        Append To List    ${test containers}    ${cont ${i}}
#    END
#    ${sys 1 id}=   Create system and attach to cloud    ${HOST}    ${port 1}    ${system 1}    ${owner email}
#    Setup Local System    ${HOST}:${port 2}    ${base password}    ${system 2}
#    Setup Local System    ${HOST}:${port 3}    ${base password}    ${system 3}
#    Sleep    90
#
#    Log    Step 1
#    Click Button    ${MERGE BUTTON SYSTEM}
#    Validate Check Merge Dialog
#    Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
#    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}")]
#
#    Log    Step 2
#    Choose System From Dropdown    ${OTHER SYSTEM}
#    Wait Until Element Is Visible    ${MERGE FORM SERVER URL INPUT}
#    Click Button    ${MERGE NEXT BUTTON}
#    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE FORM SERVER URL INPUT}
#    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}
#
#    Log    Step 3
#    Input Text    ${MERGE FORM SERVER URL INPUT}    ${HOST}:${port 2}
#    Click Button    ${MERGE NEXT BUTTON}
#    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
#    Validate Admin Password Dialog

Merge Dialog - Attempt to merge auto-discovered system - back - Attempt to merge Cloud system
    [Tags]    C76480    merge_dialog
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7324    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7325    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7326    image=${IMAGE 4.1}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 3}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 2
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 3
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Choose Primary Dialog

Merge Dialog - Close X Button Checking
    [Tags]    C76574    merge_dialog
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7331    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    7332    image=${IMAGE 4.1}    network=custom1
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

    Log    Step 3
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]

    Log    Step 4
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

    Log    Step 5
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
#    Giving false negative results
#    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Admin Password Dialog

    Log    Step 6
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

    Log    Step 7
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    Validate Confirm Merge Dialog

    Log    Step 8
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

# Positive scenarios
Positive scenario with selected cloud system (selected system is secondary)
    [Tags]    C70931    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7041    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7042    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7043    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 4}=   Setup System    7044    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    60
    Log In    ${owner email}    ${BASE PASSWORD}

    FOR    ${i}    IN    1    3
        Log    Step 1: Open System 1 page
        Go To    ${ENV}/systems/${system ${i}}[id]
        Reload Page
        Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

        Log    Step 2: Press merge button and check the dialog state
        Click Button    ${MERGE BUTTON SYSTEM}
        Validate Check Merge Dialog

        Log    Step 3: Select System 2 and press 'Next'
        ${j}=   Evaluate    ${i}+1
        Choose System From Dropdown    ${system ${j}}[name]
        Click Button    ${MERGE NEXT BUTTON}
        Wait Until Element Is Visible    ${MERGE CHECKING HINT}

        Log    Step 4: Select system 2 as primary an press 'Next'
        Choose Primary System   from target=True
        Click Button    ${MERGE NEXT BUTTON}
        Validate Confirm Merge Dialog

        Log    Step 5: Enter correct password and press 'Merge Systems'
        Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
        Click Button    ${MERGE SYSTEMS BUTTON}
        Validate Merge    ${system ${j}}[name]    ${system ${i}}[name]    on secondary=True
    END

Positive scenario with selected cloud system (selected system is primary)
    [Tags]    C70930    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7031    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7032    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 3: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 4: Keep primary system and press 'Next'
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 5: Enter correct password and press 'Merge Systems'
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}[name]    ${system 2}[name]

Positive scenario with selected local autodiscovered system not connected to the cloud
    [Tags]    C70932    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7051    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7052    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    # Switching dialog states is too fast, robot doesn't catch checking state
    # Wait Until Element Is Visible    ${MERGE CHECKING HINT}    timeout=5

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Validate Confirm Merge Dialog
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}[name]    ${system 2}[name]

Positive scenario with selected non-autodiscovered system (dropdown + Server URL input)
    [Tags]    C76220    pos    must
    Log    Fails due to CLOUD-5790
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7061    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7062    image=${IMAGE 4.1}    network=custom1
    ${system 3}=   Setup System    7063    image=${IMAGE 4.1}
    ${system 4}=   Setup System    7064    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select Other System
    Choose System From Dropdown    ${OTHER SYSTEM}    target system ip=${HOST}    target system port=${system 2}[port]    input url=${HOST}:${system 2}[port]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    # Switching dialog states is too fast, robot doesn't catch checking state
    # Wait Until Element Is Visible    ${MERGE CHECKING HINT}    timeout=5

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Validate Confirm Merge Dialog
    Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Validate Merge Success
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Wait Until Elements Are Visible
    ...    //div/strong[contains(text(), "Server at ${HOST}:${system 2}[port]")]
    ...    //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
    ${s}=   Replace String    ${SYSTEM AND SERVER MERGE COMPLETED TEXT}    %SYSTEM%    ${system 1}[name]
    ${s}=   Replace String    ${s}   %SERVER%    ${HOST}:${system 2}[port]
    Run keyword and continue on failure    Check For Alert    ${s}

Positive scenario with selected non-autodiscovered system (only Server URL input)
    [Tags]    C76221    pos
    Log    Fails due to CLOUD-5790
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7071    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    7072    image=${IMAGE 4.1}    network=custom2
    Sleep    60

    Log    Step 1: Press Merge button and validate the dialog
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog    lonely=True

    Log    Step 2: Input System 2 url and press Next
    Input Text    ${MERGE FORM SERVER URL INPUT}    ${HOST}:${system 2}[port]
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 3: Finish merge process
    Validate Admin Password Dialog
    Slow    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE NEXT BUTTON}

    Validate Confirm Merge Dialog
    Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Validate Merge Success
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Wait Until Elements Are Visible
    ...    //div/strong[contains(text(), "Server at ${HOST}:${system 2}[port]")]
    ...    //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
    ${s}=   Replace String    ${SYSTEM AND SERVER MERGE COMPLETED TEXT}    %SYSTEM%    ${system 1}[name]
    ${s}=   Replace String    ${s}   %SERVER%    ${HOST}:${system 2}[port]
    Run keyword and continue on failure    Check For Alert    ${s}

Positive scenario with selected new system
     Log    Commented out due to CLOUD-5439
#    [Tags]    C76269    pos
#    Log    Test set up
#    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
#    ${port 1}=   Set Variable    7081
#    ${port 2}=   Set Variable    7082
#    ${system 1}=   Set Variable    ${IMAGE 4.1}_${port 1}
#    ${system 2}=   Set Variable    ${IMAGE 4.1}_${port 2}
#    ${cont 1}=   Run Container    ${IMAGE 4.1}    ${port 1}    network=host
#    ${cont 2}=   Run Container    ${IMAGE 4.1}    ${port 2}    network=host
#    Append To List    ${test containers}    ${cont 1}
#    Append To List    ${test containers}    ${cont 2}
#    ${sys 1 id}=   Create system and attach to cloud    ${HOST}    ${port 1}    ${system 1}    ${owner email}
#    Setup Local System    ${HOST}:${port 2}    ${base password}    ${system 2}
#
#    Log    Step 1
#    Log In    ${owner email}    ${BASE PASSWORD}
#    Go To    ${ENV}/systems/${sys 1 id}
#    Reload Page
#    Sleep    120    # To avoid false negative tests
#    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90

Positive scenario with back button use (on choosing primary system)
    [Tags]    C76270    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7091    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7092    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7093    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Choose Primary Dialog

    Log    Step 2
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 3
    Choose System From Dropdown    ${system 3}[name]
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
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Log    Step 8
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 9
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}[name]    ${system 2}[name]

Different types of users in both Systems
    [Tags]    C76326    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7111    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7112    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7113    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    ${sys 1 admin}=   Register and activate account with random email    sys1    admin    ${BASE PASSWORD}
    ${sys 2 adv viewer}=   Register and activate account with random email    sys2    adviewer    ${BASE PASSWORD}
    ${sys 3 custom}=   Register and activate account with random email    sys3    custom    ${BASE PASSWORD}
    ${all systems user}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}

    ${auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    Share     ${auth}    ${system 1}[id]    ${ACCESS ROLES}[admin]    ${sys 1 admin}
    Share     ${auth}    ${system 2}[id]    ${ACCESS ROLES}[advancedViewer]    ${sys 2 adv viewer}
    Share     ${auth}    ${system 3}[id]    ${ACCESS ROLES}[custom]    ${sys 3 custom}
    Share     ${auth}    ${system 1}[id]    ${ACCESS ROLES}[admin]    ${all systems user}
    Share     ${auth}    ${system 2}[id]    ${ACCESS ROLES}[advancedViewer]    ${all systems user}
    Share     ${auth}    ${system 3}[id]    ${ACCESS ROLES}[custom]    ${all systems user}

    Log    Step 1: Merge System 1(primary) with System 2(secondary), check users
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Sleep    60    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Complete merge steps till final password input    ${system 2}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}[name]    ${system 2}[name]

    ${sys 1 users}=   Get Cloud System Users    ${auth}    ${system 1}[id]
    ${sys 1 user emails}=   Create List
    FOR    ${user}    IN    @{sys 1 users}
        Append To List    ${sys 1 user emails}    ${user}[accountEmail]
    END
    Should Contain    ${sys 1 user emails}    ${sys 2 adv viewer}
    Should Contain    ${sys 1 user emails}    ${all systems user}
    FOR    ${user}    IN    @{sys 1 users}
        Run Keyword If    '${user}[accountEmail]' == '${sys 2 adv viewer}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[advancedViewer]
        Run Keyword If    '${user}[accountEmail]' == '${all systems user}'
        ...    Should Be Equal As Strings    ${user}[customPermissions]    ${permissions}[cloudAdmin]
    END

    Log    Step 2: Merge System 1(secondary) with System 3(primary), check users
    Go To    ${ENV}/systems/${system 3}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Complete merge steps till final password input    ${system 1}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 3}[name]    ${system 1}[name]

    ${sys 3 users}=   Get Cloud System Users    ${auth}    ${system 3}[id]
    ${sys 3 user emails}=   Create List
    FOR    ${user}    IN    @{sys 3 users}
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

Checking state for selected Cloud system - System offline / back online
    [Tags]    C70983    C70987    state_cloud    neg    should
    Log    Fails due to CLOUD-5798
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7121    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7122    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    7123    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 4}=   Setup System    7124    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    60
    Stop Container    ${system 2}[cont]    remove=False
    Stop Container    ${system 4}[cont]    remove=False
    ${auth}=   Create List    ${owner email}    ${BASE PASSWORD}

    FOR    ${i}    IN    1    3
        Log    C70983: System offline
        Log    Step 1
        Log In    ${owner email}    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${system ${i}}[id]
        Reload Page
        Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
        Slow    Click Button    ${MERGE BUTTON SYSTEM}    timeout=1
        Validate Check Merge Dialog

        Log    Step 2
        ${j}=   Evaluate    ${i}+1
        Choose System From Dropdown    ${system ${j}}[name]
        ${s}=   Replace String    ${CANNOT MERGE WITH OFFLINE SYSTEM TEXT}    %SYSTEM NAME%    ${system ${j}}[name]
        Wait until element is visible    //p[contains(text(),"${s}")]

        Log    Step 3
        Click Button    ${MERGE NEXT BUTTON}
        Wait until element is visible    ${MERGE CHECKING HINT}
        Validate Check Merge Dialog
        Wait until element is visible    //p[contains(text(),"${s}")]

        Log    C70987: offline system becomes online
        Log    Step 2: Bring system 2 back online and click Next
        Start Container    ${system ${j}}[cont]
        Sleep    60
        Click Button    ${MERGE NEXT BUTTON}
        Wait Until Element Is Visible    ${MERGE CHECKING HINT}
        Validate Choose Primary Dialog

        Log    Step 3: Click <- button
        Click Button    ${MERGE GO BACK BUTTON}
        Validate Check Merge Dialog
        Wait until element is not visible    //p[contains(text(),"${s}")]

        Log    Step 4: Click Next
        Click Button    ${MERGE NEXT BUTTON}
        Wait until element is visible    ${MERGE CHECKING HINT}
        Validate Choose Primary Dialog

        Click Button    ${MERGE X BUTTON}
        Log Out
    END

Checking state for selected Cloud system - systems have different versions
    [Tags]    C70984    C70985   state_cloud    neg    should
    Log    Fails due to CLOUD-5796
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7131    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7132    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log    C70984: System has an older software version
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 2}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 1}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Wait until element is visible   ${SYSTEMS HAVE MISMATCHING VERSIONS}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Run Keyword and ignore error    Wait Until Element Is Visible    ${MERGE CHECKING HINT}    # Gives false negative results

    Log    C70985: System has a newer software version
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 2}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Wait Until Element Is visible   ${SYSTEMS HAVE MISMATCHING VERSIONS}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Run Keyword and ignore error    Wait Until Element Is Visible    ${MERGE CHECKING HINT}    # Gives false negative results

Checking state for selected Cloud system - Duplicate servers
    [Tags]    C71004    state_cloud    state_cloud    neg    should
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7133    image=${IMAGE 4.1}    network=host    cloud email=${owner email}
    ${system 2}=   Setup System    7134    image=${IMAGE 4.1}    network=host    cloud email=${owner email}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${system 2}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Wait until elements are visible
    ...    ${SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

    Click Button    ${MERGE X BUTTON}

Checking state for selected local system - Server URL is empty
    [Tags]    C76223    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7141    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7142    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${OTHER SYSTEM}
    Wait until element is visible    ${MERGE FORM SERVER URL INPUT}
    ${placeholder}=   Get Element Attribute    ${MERGE FORM SERVER URL INPUT}    placeholder
    Should Be Equal As Strings     ${placeholder}    host:port

    Log    Step 3
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible    ${MERGE ENTER SERVER ADDRESS}

Checking state for selected local system - No server is found for system 4.1
    [Tags]    C76223    C76224    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7143    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7144    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${OTHER SYSTEM}
    Wait Until Element Is Visible    ${MERGE FORM SERVER URL INPUT}

    Input Text   ${MERGE FORM SERVER URL INPUT}    ${EMPTY}
    Click Button    ${MERGE NEXT BUTTON}
    Wait until element is visible    ${MERGE ENTER SERVER ADDRESS}

    Input Text   ${MERGE FORM SERVER URL INPUT}    http://example.com:7001
    Click Button    ${MERGE NEXT BUTTON}
    Wait until Element Is Visible    ${MERGE SERVER NOT FOUND}

    Log    Step 2
    Choose System From Dropdown    ${system 2}[name]
    Validate Check Merge Dialog
    Input Text   ${MERGE FORM SERVER URL INPUT}    ${HOST}:4321
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE SERVER NOT FOUND}

    Log    Step 3 - Cannot Be Automated

Checking state for selected local system - No server is found for system 4.0
    [Tags]    C76528    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7145    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7146    image=${IMAGE 4.0}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
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
    Input Text   ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

    Log    Step 3
    Input Text   ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog
    #TODO: add checking text

    Log    Step 4
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE FAILED DIALOG}

Checking state for selected local system - Selected server has an older software version
    [Tags]    C76266    state_local    neg
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7147    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7148    image=${IMAGE 4.0}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 2}[name]
    Wait Until Element Is Visible   ${SERVER HAS INCOMPATIBLE VERSION}

    Log    Step 3
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible   ${SERVER HAS INCOMPATIBLE VERSION}

Checking state for selected local system - Selected server has an newer software version
    [Tags]    C76396    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7149    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7150    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 2}[name]
    Wait Until Element Is Visible   ${SERVER HAS INCOMPATIBLE VERSION}

    Log    Step 3
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible   ${SERVER HAS INCOMPATIBLE VERSION}

Checking state for selected local system - URL validation error
    [Tags]    C76227    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7151    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7152    image=${IMAGE 4.1}
    Sleep    60

    Log    Steps 1, 2
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${OTHER SYSTEM}

    Log    Step 3 - Not Implemented

    Log    Step 4-9
    ${invalid URLs}=   Create List    example.com:7001?    example.com:asd    http://com:7001    127.0.0.1.7:7001    # example.com - valid
    FOR    ${url}    IN    @{invalid URLs}
        Slow    Input Text    ${MERGE FORM SERVER URL INPUT}    ${url}    timeout=0.5
        Click Button    ${MERGE NEXT BUTTON}
        Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE INVALID URL}
    END

# Password Validation
Owner's of the selected system password validation
    [Tags]    C76265    C76266    password_valid
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7211    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7212    image=${IMAGE 4.1}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    C76265: Click Next with blank password field
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${EMPTY}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}

    Log    C76266: Enter invalid password and click Next
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}   ds$6Hf4f&dh
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}

Current account's password validation
    [Tags]    C76267    C76268    password_valid
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7221    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7222    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180
    Complete merge steps till final password input    ${system 2}[name]

    Log    C76267: Click Next with blank password field
    Input Text    ${MERGE PASSWORD INPUT}    ${EMPTY}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}

    Log    C76268: Enter invalid password and click Next
    Input Text    ${MERGE PASSWORD INPUT}   ds$6Hf4f&dh
    Click Button    ${MERGE SYSTEMS BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}

General errors - Duplicate servers
    [Tags]    C76484    C76485    general_errors    neg    should
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7231    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7232    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    90

    ${auth}=   Create List    ${owner email}    ${base password}
    Merge Systems    ${auth}    ${system 1}[id]    ${system 2}[id]
    Sleep    60
    Detach Server From System    ${HOST}:${system 2}[port]    ${auth}
    Setup Local System    ${HOST}:${system 2}[port]    ${base password}    ${system 2}[name]

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    C76484
    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${system 2}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

    Log    Step 4
    Click Button    ${MERGE NEXT BUTTON}
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

    Log    C76484
    Log    Step 2
    ${cont id}=   Get Container Id    ${system 2}[cont]
    ${id}=    Get Server Id    ${HOST}:${system 1}[port]    ${auth}    Server ${cont id}
    Remove Resource From System    ${HOST}:${system 1}[port]    ${auth}    ${id}
    ${cont id}=   Get Container Id    ${system 1}[cont]
    ${auth}=   Create List    admin    ${base password}
    ${id}=    Get Server Id    ${HOST}:${system 2}[port]    ${auth}    Server ${cont id}
    Remove Resource From System    ${HOST}:${system 2}[port]    ${auth}    ${id}

    Slow    Click Button    ${MERGE TRY AGAIN BUTTON}    timeout=2
    Validate Confirm Merge Dialog

    Log    Step 3
    Click Button   ${MERGE GO BACK BUTTON}
    Validate Admin Password Dialog

    Log    Step 4
    Click Button   ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

General Errors - Selected server is already in this system
    [Tags]    C76466    general_errors    neg
    Log    Fails due to CLOUD-5807
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7233    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7234    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    90

    ${auth}=   Create List    ${owner email}    ${base password}
    Merge Systems    ${auth}    ${system 1}[id]    ${system 2}[id]
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${OTHER SYSTEM}    target system ip=${HOST}    target system port=${system 2}[port]    input url=${HOST}:${system 2}[port]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

General Errors - System (server) offline after owner's of the selected system password validation
    [Tags]    C76272    general_errors    neg
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7235    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7236    image=${IMAGE 4.1}
    ${auth}=   Create List    admin    ${base password}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 2
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
    Restart Server    ${HOST}:${system 2}[port]    ${auth}   # make the server offline temporary
    Validate General Error Dialog
    ${s}=   Replace String    ${SYSTEM IS INACCESSIBLE TEXT}    %SYSTEM%   ${system 2}[name]
    Wait Until Element Is Visible    //p[contains(text(), "${s}")]

General Errors - Different owners
    [Tags]    C76225    C76464    general_errors    neg    should
    Log    Test set up
    ${owner 1 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${owner 2 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7237    image=${IMAGE 4.1}    cloud email=${owner 1 email}
    ${system 2}=   Setup System    7238    image=${IMAGE 4.1}    cloud email=${owner 2 email}
    ${system 3}=   Setup System    7239    image=${IMAGE 4.1}    cloud email=${owner 1 email}
    ${auth}=   Create List    admin    ${base password}
    Sleep   60

    Log In    ${owner 1 email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    C76225
    Log    Steps 1, 2
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 3
    Choose System From Dropdown    target system name=${OTHER SYSTEM}    target system ip=${HOST}    target system port=${system 2}[port]    input url=${HOST}:${system 2}[port]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 4
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    Step 5
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Admin Password Dialog

    Log    Step 6
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 7
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 8
    Click Button    ${MERGE NEXT BUTTON}
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    Step 9
    Click Button    ${MERGE TRY AGAIN BUTTON}
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    C76464
    Log    Step 2
    Disconnect    ${ENV}    ${owner 2 email}    ${base password}    ${system 2}[id]
    Slow    Restart Server    ${HOST}:${system 2}[port]    ${auth}    timeout=5
    Connect System to Cloud   ${auth}   ${HOST}:${system 2}[port]    ${system 2}[name]    ${owner 1 email}    ${base password}
    Click Button    ${MERGE TRY AGAIN BUTTON}
    Validate Confirm Merge Dialog

    Log   Step 3
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Admin Password Dialog

    Log    Step 4
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

Merge Errors - System (server) offline after current account's password validation
    [Tags]    C76273   merge_errors    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7241    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7242    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    admin    ${base password}
    Sleep  60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input     ${system 2}[name]

    Log     Step 2
    Stop Container    ${system 2}[cont]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Primary System becomes offline during merge process
    [Tags]    C76277    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7243    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7244    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    ${owner email}    ${base password}
    Sleep   60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Restart Server    ${HOST}:${system 1}[port]    ${auth}
    Validate Merge Failed Dialog
    #TODO: add checking text

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Secondary System becomes offline during merge process
    [Tags]    C76278    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7245    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    7246    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    ${owner email}    ${base password}
    Sleep   60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Restart Server    ${HOST}:${system 2}[port]    ${auth}
    Validate Merge Failed Dialog
    #TODO: add checking text

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Duplicate servers for 4.0 Systems
    [Tags]    C76546    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7247    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    7248    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    90
    ${auth}=   Create List    ${owner email}    ${base password}

    Merge Systems    ${auth}    ${system 1}[id]    ${system 2}[id]
    Sleep    60
    Detach Server From System    ${HOST}:${system 2}[port]    ${auth}
    Sleep    10
    Setup Local System    ${HOST}:${system 2}[port]    ${base password}    ${system 2}[name]

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${system 2}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Confirm Merge Dialog

    Log    Step 4
    Input Text    ${MERGE PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge Failed Dialog
    #TODO: add checking text

    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Different owners for Sytems 4.0
    [Tags]    C76547    merge_errors    neg
    Log    Fails due to CLOUD-5802
    Log    Test Setup
    ${owner 1 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${owner 2 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    7251    image=${IMAGE 4.0}    network=custom1    cloud email=${owner 1 email}
    ${system 2}=   Setup System    7252    image=${IMAGE 4.0}    network=custom2    cloud email=${owner 2 email}
    Sleep    60

    Log In    ${owner 1 email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog    lonely=True

    Log    Step 2
    Input Text    ${MERGE FORM SERVER URL INPUT}    ${HOST}:${system 2}[port]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Confirm Merge Dialog

    Log    Step 4
    Input Text    ${MERGE PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge Failed Dialog
    #TODO: add checking text

    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}
