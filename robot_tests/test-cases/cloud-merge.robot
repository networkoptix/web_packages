*** Settings ***
Resource          ../resource.robot
Suite Setup       Merge Suite Setup
Test Setup        Merge Test Setup
Test Teardown     Merge Test Teardown
Suite Teardown    Merge Suite Teardown
Force Tags        merge

*** Test Cases ***
Merge button availability
    [Tags]    C70976    C70977    should
    Log    C70976: "Merge with Another System" button is available only for owner
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system}=   Setup System    cloud email=${owner email}

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
    Stop Docker Server    ${system}[server name]
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system}[id]
    Wait until element is visible    ${MERGE BUTTON SYSTEM DISABLED}

Merge Dialog - Dropdown has three sections
    [Tags]    C70979    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 4}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 5}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 6}=   Setup System    image=${IMAGE 4.0}
    ${system 7}=   Setup System    image=${IMAGE 4.1}    network=host
    ${system 8}=   Setup System    image=${IMAGE 4.1}

    ${auth}=   Create List   admin    ${base password}
    Rename Server     https://${QA BURBANK IP}:${system 7}[port]    ${auth}    ServerName

    Sleep    90
    Stop Docker Server    ${system 4}[server name]

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
    ...    timeout=10
    Element should not be visible    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 1}[name]")]
    ${sys 7 description}=    Get Text    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system 7}[name]")]//following-sibling::span
    Log    Might give false negative(shows docker internal ip instead of external)
    Should Contain    ${sys 7 description}    (ServerName,${SPACE}${QA BURBANK IP}:${system 7}[port])

Merge Dialog - Dropdown has two sections(no cloud systems)
    [Tags]    C70980    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
    ${system 3}=   Setup System    image=${IMAGE 4.1}
    ${system 4}=   Setup System    image=${IMAGE 4.0}
    ${system 5}=   Setup System    image=${IMAGE 4.0}
    Sleep    90

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
    Input Text    ${MERGE FORM SERVER URL INPUT}    https://${QA BURBANK IP}:${system 2}[port]
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${OTHER SYSTEM}")]

Merge Dialog - Dropdown has two sections(no local systems)
    [Tags]    C70981    merge_dialog    should
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    Sleep    90

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
    Stop Docker Server    ${system 2}[server name]
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
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.0}    network=custom1    cloud email=${owner email}
    Sleep    90

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

Merge Dialog - Attempt to merge auto-discovered system - back - Attempt to merge Cloud system
    [Tags]    C76480    merge_dialog
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}
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
    Log    Currently fails due to CLOUD-6449
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog

    Log    Step 3
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 2}[name]

Merge Dialog - Close X Button Checking
    [Tags]    C76574    merge_dialog
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=custom1
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
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 8
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}

# Positive scenarios
Positive scenario with selected cloud system (selected system is secondary)
    [Tags]    C70930    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 4}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${auth}=   Create List    admin    ${base password}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}

    FOR    ${i}    IN    1    3
        ${j}=   Evaluate    ${i}+1
        ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${system ${i}}[port]    ${auth}    Server ${system ${i}}[cont]
        ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${system ${j}}[port]    ${auth}    Server ${system ${j}}[cont]

        Log    Step 1: Open System 1 page
        Go To    ${ENV}/systems/${system ${i}}[id]
        Reload Page
        Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

        Log    Step 2: Press merge button and check the dialog state
        Click Button    ${MERGE BUTTON SYSTEM}
        Validate Check Merge Dialog
        Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
        Wait Until Element Is Visible    ${MERGE CHECK MERGE FORM}//span[text()="${system ${j}}[name]"]

        Log    Step 3: Select System 2 and press 'Next'
        Choose System From Dropdown    ${system ${j}}[name]
        Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
        Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
        Validate Choose Primary Dialog    ${system ${i}}[name]    ${system ${j}}[name]

        Log    Step 4: Select system 2 as primary an press 'Next'
        Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
        Validate Confirm Merge Dialog    ${system ${i}}[name]    ${system ${j}}[name]

        Log    Step 5: Enter correct password and press 'Merge Systems'
        Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=1
        Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
#        Gives false negative results
        Element Should Be Disabled    ${MERGE BUTTON SYSTEM}
        Element Should Be Disabled    ${DISCONNECT FROM NX}

        Log    Step 6: Enter correct password and press 'Merge Systems'
        Validate Merge    ${system ${i}}[name]    ${system ${j}}[name]
        Wait Until Elements Are Enabled    ${MERGE BUTTON SYSTEM}    ${DISCONNECT FROM NX}
        Slow    Reload page    timeout=5

        Log    Step 7: Verify systems are actually merged
        Click Link    ${SERVERS LINK}
        Click Element    //a[contains(@id, "${server 1 id}")]//span[contains(text(), "Server ${system ${i}}[cont]")]
        Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system ${i}}[cont]")]
        Wait Until Element Is Not Visible    ${OFFLINE BANNER}
        Click Element    //a[contains(@id, "${server 2 id}")]//span[contains(text(), "Server ${system ${j}}[cont]")]
        Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system ${j}}[cont]")]
        Wait Until Element Is Not Visible    ${OFFLINE BANNER}

        Log    Step 8: Verify secondary system is not available anymore
        Go To    ${ENV}/systems/${system ${i}}[id]
        Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    timeout=60
        Click Button    ${MERGE BUTTON SYSTEM}
        Validate Check Merge Dialog
        Click Button    ${MERGE SYSTEM DROPDOWN}
        Element Should Not Be Visible    ${MERGE CHECK MERGE FORM}//li/a//span[contains(text(), "${system ${j}}[name]")]
        Go To    ${ENV}/systems/
        Wait Until Element Is Visible    //h2[contains(text(), "${system ${i}}[name]")]
        Wait Until Element Is Not Visible    //h2[contains(text(), "${system ${j}}[name]")]
    END

Positive scenario with selected cloud system (selected system is primary)
    [Tags]    C70931    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${auth}=   Create List    admin    ${base password}
    Sleep    60

    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${system 1}[port]    ${auth}    Server ${system 1}[cont]
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    Server ${system 2}[cont]

    Log    Step 1
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown    ${system 2}[name]
    Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 2
    Choose Primary System    from target=True
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    Validate Confirm Merge Dialog    ${system 2}[name]    ${system 1}[name]

    Log    Step 3
    Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=1
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Step 4
    Validate Merge    ${system 2}[name]    ${system 1}[name]    on secondary=True

    Log   Step 5
    # Servers don't appear in the list if page is not reloaded
    Reload Page
    Sleep    5

    Click Link    ${SERVERS LINK}
    Click Element    //a[contains(@id, "${server 1 id}")]//span[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}
    Click Element    //a[contains(@id, "${server 2 id}")]//span[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}

    Log    Step 6
    Go To    ${ENV}/systems/${system 2}[id]
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog    lonely=True
    Go To    ${ENV}/systems/
    Wait Until Element Is Visible    //h2[contains(text(), "${system 2}[name]")]
    Wait Until Element Is Not Visible    //h2[contains(text(), "${system 1}[name]")]

    Log    Step 7
    Go To    ${ENV}/systems/${system 1}[id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Positive scenario with selected local autodiscovered system not connected to the cloud
    [Tags]    C70932    pos    must
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
    ${auth}=   Create List    admin    ${base password}
    Sleep    60
    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${system 1}[port]    ${auth}    Server ${system 1}[cont]
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    Server ${system 2}[cont]

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select System 2 and press 'Next'
    Choose System From Dropdown    ${system 2}[name]
    Click Button    ${MERGE NEXT BUTTON}

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge    ${system 1}[name]    ${system 2}[name]
    Slow    Reload Page    timeout=5

    Log    Step 8: Validate Merge Success
    Click Link    ${SERVERS LINK}
    Click Element    //a[contains(@id, "${server 1 id}")]//span[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}
    Click Element    //a[contains(@id, "${server 2 id}")]//span[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}

Positive scenario with selected non-autodiscovered system (dropdown + Server URL input)
    [Tags]    C76220    pos    must
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=custom1
    ${system 3}=   Setup System    image=${IMAGE 4.1}
    ${system 4}=   Setup System    image=${IMAGE 4.1}
    ${auth}=   Create List    admin    ${base password}
    Sleep    60
    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${system 1}[port]    ${auth}    Server ${system 1}[cont]
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    Server ${system 2}[cont]

    Log    Step 1: Open System 1 page
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 2: Press merge button and check the dialog state
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Steps 3, 4: Select Other System
    Choose System From Dropdown    ${OTHER SYSTEM}    input url=https://${QA BURBANK IP}:${system 2}[port]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5

    Log    Steps 5, 6: Validate Admin dialog, enter correct password and press 'Merge Systems'
    Validate Admin Password Dialog
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 7: Enter the corect password for System 2 and press 'Next'
    Validate Confirm Merge Dialog    ${system 1}[name]    server at https://${QA BURBANK IP}:${system 2}[port]
    Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Validate Merge Success
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Wait Until Elements Are Visible
    ...    //div/strong[contains(text(), "Server at https://${QA BURBANK IP}:${system 2}[port]")]
    ...    //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
#    ${s}=   Replace String    ${SYSTEM AND SERVER MERGE COMPLETED TEXT}    %SYSTEM%    ${system 1}[name]
#    ${s}=   Replace String    ${s}   %SERVER%    https://${QA BURBANK IP}:${system 2}[port]
#    Run keyword and continue on failure    Check For Alert    ${s}
    Run keyword and continue on failure    Check For Alert    ${MERGE COMPLETED TEXT}
    Slow    Reload Page    timeout=5

    Click Link    ${SERVERS LINK}
    Click Element    //a[contains(@id, "${server 1 id}")]//span[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 1}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}
    Click Element    //a[contains(@id, "${server 2 id}")]//span[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 2}[cont]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}

Positive scenario with selected non-autodiscovered system (only Server URL input)
    [Tags]    C76221    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=custom1    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=custom2
    ${auth}=   Create List    admin    ${base password}
    Sleep    60

    Log    Step 1: Press Merge button and validate the dialog
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog    lonely=True

    Log    Step 2: Input System 2 url and press Next
    Input Text    ${MERGE FORM SERVER URL INPUT}    https://${QA BURBANK IP}:${system 2}[port]
    Click Button    ${MERGE NEXT BUTTON}

    Log    Step 3: Finish merge process
    Validate Admin Password Dialog
    Slow    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE NEXT BUTTON}

    Validate Confirm Merge Dialog    ${system 1}[name]    server at https://${QA BURBANK IP}:${system 2}[port]
    Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=0.5
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Validate Merge Success
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Wait Until Elements Are Visible
    ...    //div/strong[contains(text(), "Server at https://${QA BURBANK IP}:${system 2}[port]")]
    ...    //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
#    ${s}=   Replace String    ${SYSTEM AND SERVER MERGE COMPLETED TEXT}    %SYSTEM%    ${system 1}[name]
#    ${s}=   Replace String    ${s}   %SERVER%    https://${QA BURBANK IP}:${system 2}[port]
#    Run keyword and continue on failure    Check For Alert    ${s}
    Run keyword and continue on failure    Check For Alert    ${MERGE COMPLETED TEXT}

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
#    ${sys 1 id}=   Create system and attach to cloud    https://${QA BURBANK IP}    ${port 1}    ${system 1}    ${owner email}
#    Setup Local System    https://${QA BURBANK IP}:${port 2}    ${base password}    ${system 2}
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
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
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
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 2
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]

    Log    Step 3
    Choose System From Dropdown    ${system 3}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 3}[name]

    Log    Step 4
    Choose Primary System    from target=True
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    Validate Confirm Merge Dialog    ${system 3}[name]    ${system 1}[name]

    Log    Step 5
    Slow    Click Button    ${MERGE GO BACK BUTTON}    timeout=0.25
    Log    Currently fails due to CLOUD-6448
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 3}[name]    from target=True

    Log    Step 6
    Slow    Click Button    ${MERGE GO BACK BUTTON}    timeout=0.25
    Validate Check Merge Dialog

    Log    Step 7
    Choose System From Dropdown    ${system 2}[name]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 8
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 9
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=0.25
    Validate Merge    ${system 1}[name]    ${system 2}[name]

Different types of users in both Systems
    [Tags]    C76326    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    ${sys 1 admin}=   Register and activate account with random email    sys1    admin    ${BASE PASSWORD}
    ${sys 2 adv viewer}=   Register and activate account with random email    sys2    adviewer    ${BASE PASSWORD}
    ${sys 3 custom}=   Register and activate account with random email    sys3    custom    ${BASE PASSWORD}
    ${all systems user}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}

    ${auth}=   Create List    ${owner email}    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 1}[port]    sys1_admin    ${permissions}[cloudAdmin]    ${sys 1 admin}    sys1 admin    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 2}[port]    sys2_adv    ${permissions}[advancedViewer]    ${sys 2 adv viewer}    sys2 adv    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 3}[port]    sys3_custom    ${permissions}[custom]    ${sys 3 custom}    sys3 custom    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 1}[port]    all_sys    ${permissions}[cloudAdmin]    ${all systems user}    all sys    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 2}[port]    all_sys    ${permissions}[advancedViewer]    ${all systems user}    all sys    ${BASE PASSWORD}
    Save User     ${auth}    https://${QA BURBANK IP}:${system 3}[port]    all_sys    ${permissions}[custom]    ${all systems user}    all sys    ${BASE PASSWORD}

    Log    Step 1: Merge System 1(primary) with System 2(secondary), check users
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Sleep    60    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Complete merge steps till final password input    ${system 1}[name]    ${system 2}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge    ${system 1}[name]    ${system 2}[name]

    ${sys 1 users}=   Get Users    ${auth}    https://${QA BURBANK IP}:${system 1}[port]

    ${sys 1 user emails}=   Create List
    FOR    ${user}    IN    @{sys 1 users}
        Run Keyword If   $user['email']    Append To List    ${sys 1 user emails}    ${user}[email]
    END
    Log    ${sys 1 user emails}
    Should Contain    ${sys 1 user emails}    ${sys 2 adv viewer}
    Should Contain    ${sys 1 user emails}    ${all systems user}
    Should Contain    ${sys 1 user emails}    ${sys 1 admin}

    FOR    ${user}    IN    @{sys 1 users}
        Run Keyword If    '${user}[email]' == '${sys 2 adv viewer}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[advancedViewer]
        Run Keyword If    '${user}[email]' == '${all systems user}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[cloudAdmin]
        Run Keyword If    '${user}[email]' == '${sys 1 admin}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[cloudAdmin]
    END

    Log    Step 2: Merge System 1(secondary) with System 3(primary), check users
    Go To    ${ENV}/systems/${system 3}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Complete merge steps till final password input    ${system 3}[name]    ${system 1}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge    ${system 3}[name]    ${system 1}[name]

    ${sys 3 users}=   Get Users    ${auth}    https://${QA BURBANK IP}:${system 3}[port]

    ${sys 3 user emails}=   Create List
    FOR    ${user}    IN    @{sys 3 users}
        Run Keyword If    $user['email']    Append To List    ${sys 3 user emails}    ${user}[email]
    END
    Should Contain    ${sys 3 user emails}    ${sys 1 admin}
    Should Contain    ${sys 3 user emails}    ${sys 2 adv viewer}
    Should Contain    ${sys 3 user emails}    ${all systems user}
    Should Contain    ${sys 3 user emails}    ${sys 3 custom}

    FOR    ${user}    IN    @{sys 3 users}
        Run Keyword If    '${user}[email]' == '${sys 3 custom}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[custom]
        Run Keyword If    '${user}[email]' == '${all systems user}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[custom]
        Run Keyword If    '${user}[email]' == '${sys 1 admin}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[cloudAdmin]
        Run Keyword If    '${user}[email]' == '${sys 2 adv viewer}'
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[advancedViewer]
    END

    Slow    Reload Page     timeout=5
    Click Link    ${USERS LIST LINK}
    FOR    ${user}    IN    @{sys 3 user emails}
        Wait until element is visible    //div[@id="level3users"]//span[contains(text(), "${user}")]   timeout=1
    END

Checking state for selected Cloud system - System offline / back online
    [Tags]    C70983    C70987    state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 4}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    60
    Stop Docker Server    ${system 2}[server name]
    Stop Docker Server    ${system 4}[server name]
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
        Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system ${j}}[name]")]/following-sibling::span[contains(text(), "offline")]
        ${s}=   Replace String    ${CANNOT MERGE WITH OFFLINE SYSTEM TEXT}    %SYSTEM NAME%    ${system ${j}}[name]
        Wait until element is visible    //p[contains(text(),"${s}")]
        Wait until element has style    //p[contains(text(),"${s}")]    color    ${ERROR COLOR WITH OPACITY}

        Log    Step 3
        Click Button    ${MERGE NEXT BUTTON}
        Wait until element is visible    ${MERGE CHECKING HINT}
        Validate Check Merge Dialog
        Wait until element is visible    //p[contains(text(),"${s}")]

        Log    C70987: offline system becomes online
        Log    Step 2: Bring system 2 back online and click Next
#        Start Container    ${system ${j}}[cont]
        Start Docker Server    ${system ${j}}[server name]
        Sleep    60
        Click Button    ${MERGE NEXT BUTTON}
        Wait until element is visible    ${MERGE CHECKING HINT}
        Validate Choose Primary Dialog    ${system ${i}}[name]    ${system ${j}}[name]

        Log    Step 3: Click <- button
        Click Button    ${MERGE GO BACK BUTTON}
        Validate Check Merge Dialog
        Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system ${j}}[name]")]
        Wait until element is not visible    ${MERGE CHECK MERGE FORM}//p[contains(text(),"${s}")]
        Wait until element is not visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "offline")]

        Log    Step 4: Click Next
        Click Button    ${MERGE NEXT BUTTON}
        Wait until element is visible    ${MERGE CHECKING HINT}
        Validate Choose Primary Dialog    ${system ${i}}[name]    ${system ${j}}[name]

        Click Button    ${MERGE X BUTTON}
        Log Out
    END

Checking state for selected Cloud system - systems have different versions
    [Tags]    C70984    C70985   state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log    C70984: System has an older software version
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 2}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 1}[name]
    Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 1}[name]")]/following-sibling::span[contains(text(), "incompatible")]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
#    Currently no link
#    Wait until element is visible   ${MERGE CHECK MERGE FORM}//a[@href="/download"]
    ${error text}=   Get Text    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
    Should be equal as strings     ${error text}    ${SYSTEMS HAVE MISMATCHING VERSIONS TEXT}
    Wait until element has style    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]    color    ${ERROR COLOR WITH OPACITY}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Check Merge Dialog
    Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 1}[name]")]/following-sibling::span[contains(text(), "incompatible")]
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]

    Log    C70985: System has a newer software version
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]/following-sibling::span[contains(text(), "incompatible")]
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
#    Currently no link
#    Wait until element is visible   ${MERGE CHECK MERGE FORM}//a[@href="/download"]
    ${error text}=   Get Text    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
    Should be equal as strings     ${error text}    ${SYSTEMS HAVE MISMATCHING VERSIONS TEXT}
    Wait until element has style    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]    color    ${ERROR COLOR WITH OPACITY}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Check Merge Dialog
    Wait until element is visible    ${MERGE SYSTEM DROPDOWN}//span[contains(text(), "${system 2}[name]")]/following-sibling::span[contains(text(), "incompatible")]
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]

Checking state for selected Cloud system - Duplicate servers
    [Tags]    C71004    state_cloud    state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    network=host    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    network=host    cloud email=${owner email}
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
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
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
    Wait until element has style    ${MERGE ENTER SERVER ADDRESS}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE FORM SERVER URL INPUT}    border-color    ${ERROR COLOR}

Checking state for selected local system - No server is found for system 4.1
    [Tags]    C76223    C76224    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
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
    Input Text   ${MERGE FORM SERVER URL INPUT}    https://${QA BURBANK IP}:4321
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE SERVER NOT FOUND}
    Wait until element has style    ${MERGE SERVER NOT FOUND}    color    ${ERROR COLOR WITH OPACITY}

Checking state for selected local system - No server is found for system 4.0
    [Tags]    C76528    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.0}
    Set Local Variable    ${not existing server}    https://10.10.10.100:7001
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

    Input Text   ${MERGE FORM SERVER URL INPUT}    ${not existing server}
    Click Button    ${MERGE NEXT BUTTON}
    # Currently fails due to CLOUD-6450
    Validate Admin Password Dialog

    Log    Step 2
    Input Text   ${MERGE ADMIN FORM PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog    ${system 1}[name]    server at ${not existing server}

    Log    Step 3
    Input Text   ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    server at ${not existing server}
    ${error p2}=   Replace String    ${SERVER IS INACCESSIBLE TEXT}    %SERVER%    ${not existing server}
    Run keyword and continue on failure    Should be equal as strings    ${txt}    ${error p1}\n${error p2}

    Log    Step 4
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE FAILED DIALOG}

Checking state for selected local system - Selected server has an older software version
    [Tags]    C76226    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.0}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${system 2}[name]
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
# Currently no link
#    Wait until element is visible   ${MERGE CHECK MERGE FORM}//a[@href="/download"]
    ${error text}=   Get Text    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
    Should be equal as strings     ${error text}    ${SERVER HAS INCOMPATIBLE VERSION TEXT}
    Wait until element has style    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]    color    ${ERROR COLOR WITH OPACITY}

    Log    Step 3
    Click Button    ${MERGE NEXT BUTTON}
    Validate Check Merge Dialog
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]

Checking state for selected local system - Selected server has a newer software version
    [Tags]    C76396    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
    Sleep    60

    Log    Step 1
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${system 2}[name]
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
# Currently no link
#    Wait until element is visible   ${MERGE CHECK MERGE FORM}//a[@href="/download"]
    ${error text}=   Get Text    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]
    Should be equal as strings     ${error text}    ${SERVER HAS INCOMPATIBLE VERSION TEXT}
    Wait until element has style    ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]    color    ${ERROR COLOR WITH OPACITY}

    Log    Step 3
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Check Merge Dialog
    Wait until element is visible   ${MERGE CHECK MERGE FORM}//p[contains(@class,"error-label")]

Checking state for selected local system - URL validation error
    [Tags]    C76227    state_local    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
    Sleep    60

    Log    Steps 1, 2
    Log In    ${owner email}    ${base password}
    Go To    ${ENV}/systems/${system 1}[id]
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    Choose System From Dropdown    ${OTHER SYSTEM}

    Log    Step 3
    Slow    Input Text    ${MERGE FORM SERVER URL INPUT}    example    timeout=0.5
    Set Focus To Element     ${ACCOUNT DROPDOWN}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE INVALID URL}
    Wait until element has style    ${MERGE INVALID URL}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE FORM SERVER URL INPUT}    border-color    ${ERROR COLOR}

    Log    Step 4-9
    ${invalid URLs}=   Create List    example.com:7001?    example.com:asd    example.com.    http://com:7001    127.0.0.1.7:7001    # example.com - valid
    FOR    ${url}    IN    @{invalid URLs}
        Slow    Input Text    ${MERGE FORM SERVER URL INPUT}    ${url}    timeout=0.5
        Click Button    ${MERGE NEXT BUTTON}
        Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE INVALID URL}
        Wait until element has style    ${MERGE INVALID URL}    color    ${ERROR COLOR WITH OPACITY}
        Wait until element has style    ${MERGE FORM SERVER URL INPUT}    border-color    ${ERROR COLOR}
    END

# Password Validation
Owner's of the selected system password validation
    [Tags]    C76265    C76266    password_valid
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
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
    Wait until element has style    ${MERGE PASSWORD REQUIRED}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE ADMIN FORM PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    C76266: Enter invalid password and click Next
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}   ds$6Hf4f&dh
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Wait until element has style    ${MERGE PASSWORD INCORRECT}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE ADMIN FORM PASSWORD INPUT}    border-color    ${ERROR COLOR}

Current account's password validation
    [Tags]    C76267    C76268    password_valid
    Log    Fails due to CLOUD-6451
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180
    Complete merge steps till final password input    ${system 1}[name]    ${system 2}[name]

    Log    C76267: Click Next with blank password field
    Input Text    ${MERGE PASSWORD INPUT}    ${EMPTY}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}
    Wait until element has style    ${MERGE PASSWORD REQUIRED}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    C76268: Enter invalid password and click Next
    Input Text    ${MERGE PASSWORD INPUT}   ds$6Hf4f&dh
    Click Button    ${MERGE SYSTEMS BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Wait until element has style    ${MERGE PASSWORD INCORRECT}    color    ${ERROR COLOR WITH OPACITY}
    Wait until element has style    ${MERGE PASSWORD INPUT}    border-color    ${ERROR COLOR}

General errors - Duplicate servers
    [Tags]    C76484    C76485    general_errors    neg    should
    Log    Test Set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    Sleep    90

    ${auth}=   Create List    ${owner email}    ${base password}
    Merge Systems    ${auth}    ${system 1}[id]    ${system 2}[id]
    Sleep    60
    Detach Server From System    https://${QA BURBANK IP}:${system 2}[port]    ${auth}
    Setup Local System    https://${QA BURBANK IP}:${system 2}[port]    ${base password}    ${system 2}[name]
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
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

    Log    Step 4
    Slow    Click Button    ${MERGE TRY AGAIN BUTTON}    timeout=1
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

    Log    C76484
    Log    Step 2
    ${id}=    Get Server Id    https://${QA BURBANK IP}:${system 1}[port]    ${auth}    Server ${system 2}[cont]
    Remove Resource From System    https://${QA BURBANK IP}:${system 1}[port]    ${auth}    ${id}
    ${auth}=   Create List    admin    ${base password}
    ${id}=    Get Server Id    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    Server ${system 1}[cont]
    Remove Resource From System    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    ${id}
    Sleep    5    # avoid false negative results

    Slow    Click Button    ${MERGE TRY AGAIN BUTTON}    timeout=5
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 3
    Click Button   ${MERGE GO BACK BUTTON}
    Validate Admin Password Dialog

    Log    Step 4
    Click Button   ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

General Errors - Selected server is already in this system
    [Tags]    C76466    general_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
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
    Choose System From Dropdown    ${OTHER SYSTEM}    input url=https://${QA BURBANK IP}:${system 2}[port]    check url=True
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
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}
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
    Restart Server    https://${QA BURBANK IP}:${system 2}[port]    ${auth}   # make the server offline temporary
    Validate General Error Dialog
    ${s}=   Replace String    ${SYSTEM IS INACCESSIBLE TEXT}    %SYSTEM%   ${system 2}[name]
    Wait Until Element Is Visible    //p[contains(text(), "${s}")]

General Errors - Different owners
    [Tags]    C76225    C76464    general_errors    neg    should
    Log    Test Setup
    ${owner 1 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${owner 2 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner 1 email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner 2 email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner 1 email}
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
    Choose System From Dropdown    target system name=${OTHER SYSTEM}    input url=https://${QA BURBANK IP}:${system 2}[port]    check url=True
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 4
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    Step 5
    Slow    Click Button    ${MERGE GO BACK BUTTON}
    Validate Admin Password Dialog

    Log    Step 6
    Slow    Click Button    ${MERGE GO BACK BUTTON}    timeout=0.5
    Validate Check Merge Dialog

    Log    Step 7
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    Validate Admin Password Dialog

    Log    Step 8
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    Step 9
    Slow    Click Button    ${MERGE TRY AGAIN BUTTON}    timeout=0.5
    Validate General Error Dialog
    Wait Until Element Is Visible    ${MERGE SYSTEMS HAVE DIFFERENT OWNERS}

    Log    C76464
    Log    Step 2
    Disconnect    ${ENV}    ${owner 2 email}    ${base password}    ${system 2}[id]
    Slow    Restart Server    https://${QA BURBANK IP}:${system 2}[port]    ${auth}    timeout=5
    Connect System to Cloud   ${auth}   https://${QA BURBANK IP}:${system 2}[port]    ${system 2}[name]    ${owner 1 email}    ${base password}
    Slow    Click Button    ${MERGE TRY AGAIN BUTTON}    timeout=0.5
    Validate Confirm Merge Dialog    ${system 1}[name]    server at https://${QA BURBANK IP}:${system 2}[port]

    Log   Step 3
    Slow    Click Button    ${MERGE GO BACK BUTTON}    timeout=0.5
    Validate Admin Password Dialog

    Log    Step 4
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.5
    Validate Confirm Merge Dialog    ${system 1}[name]    server at https://${QA BURBANK IP}:${system 2}[port]

Merge Errors - System (server) offline after current account's password validation
    [Tags]    C76273   merge_errors    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    admin    ${base password}
    Sleep  60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input     ${system 1}[name]    ${system 2}[name]

    Log     Step 2
    Stop Docker Server    ${system 2}[server name]
    Sleep    5
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error p2}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 2}[name]
    Should be equal as strings    ${txt}    ${error p1}\n${error p2}

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Primary System becomes offline during merge process
    [Tags]    C76277    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    ${owner email}    ${base password}
    Sleep   60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input    ${system 1}[name]     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Restart Server    https://${QA BURBANK IP}:${system 1}[port]    ${auth}
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error offline}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 1}[name]
    ${error unreach}=   Replace String    ${FAILED TO MERGE SYSTEM IS UNREACHABLE TEXT}    %SYSTEM%    ${system 1}[name]
    ${offline status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error offline}
    ${unreach status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error unreach}\n${FAILED TO MERGE TRY AGAIN TEXT}
    Run Keyword Unless    $offline_status or $unreach_status    Should be equal as strings    ${txt}    ${error p1}\n${MERGE FAILED UNKNOWN ERROR TEXT}

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Secondary System becomes offline during merge process
    [Tags]    C76278    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.1}    cloud email=${owner email}
    ${auth}=   Create List    ${owner email}    ${base password}
    Sleep   60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input    ${system 1}[name]     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Restart Server    https://${QA BURBANK IP}:${system 2}[port]    ${auth}
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error offline}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 2}[name]
    ${error unreach}=   Replace String    ${FAILED TO MERGE SYSTEM IS UNREACHABLE TEXT}    %SYSTEM%    ${system 2}[name]
    ${offline status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error offline}
    ${unreach status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error unreach}\n${FAILED TO MERGE TRY AGAIN TEXT}
    Run Keyword Unless    $offline_status or $unreach_status    Should be equal as strings    ${txt}    ${error p1}\n${MERGE FAILED UNKNOWN ERROR TEXT}

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Duplicate servers for 4.0 Systems
    [Tags]    C76546    merge_errors    neg
    Log    Fails due to CLOUD-6450
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    ${system 2}=   Setup System    image=${IMAGE 4.0}    cloud email=${owner email}
    Sleep    90
    ${auth}=   Create List    ${owner email}    ${base password}

    Merge Systems    ${auth}    ${system 1}[id]    ${system 2}[id]
    Sleep    60
    Detach Server From System    https://${QA BURBANK IP}:${system 2}[port]    ${auth}
    Sleep    10
    Setup Local System    https://${QA BURBANK IP}:${system 2}[port]    ${base password}    ${system 2}[name]

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
    Validate Confirm Merge Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 4
    Input Text    ${MERGE PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    Should be equal as strings    ${txt}    ${error p1}\n${SERVER APPEARS TO BE LISTING ITSELF TEXT}\n${REMOVE OFFLINE AND INCOMPATIBLE SERVERS TEXT}

    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

Merge Errors - Different owners for Sytems 4.0
    [Tags]    C76547    merge_errors    neg
    Log    Fails due to CLOUD-6450
    Log    Test Setup
    ${owner 1 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${owner 2 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${system 1}=   Setup System    image=${IMAGE 4.0}    network=bridge    cloud email=${owner 1 email}
    ${system 2}=   Setup System    image=${IMAGE 4.0}    network=host    cloud email=${owner 2 email}
    ${system 3}=   Setup System    image=${IMAGE 4.1}    network=bridge    cloud email=${owner 1 email}
    Sleep    60

    Log In    ${owner 1 email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1
    Slow    Click Button    ${MERGE BUTTON SYSTEM}    timeout=0.5
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${OTHER SYSTEM}
    Wait until element is visible    ${MERGE FORM SERVER URL INPUT}
    Slow    Input Text    ${MERGE FORM SERVER URL INPUT}    https://${QA BURBANK IP}:${system 2}[port]    timeout=1
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Confirm Merge Dialog    ${system 1}[name]    server at https://${QA BURBANK IP}}:${system 2}[port]

    Log    Step 4
    Input Text    ${MERGE PASSWORD INPUT}    ${base password}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    server at https://${QA BURBANK IP}:${system 2}[port]
    Should be equal as strings    ${txt}    ${error p1}\n${THIS SYSTEM HAS DIFFERENT OWNER TEXT}

    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}
