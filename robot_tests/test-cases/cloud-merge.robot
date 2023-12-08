*** Settings ***
Resource          ../Resources/front-end-resources/cloud-merge-resource.robot
Suite Setup       Merge Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Merge Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop         Merge Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Merge Suite Teardown
Force Tags        merge

*** Test Cases ***
9. Positive scenario with selected cloud system (selected system is primary)
    [Tags]    C70931    pos    must
    Log    Test set up
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String

    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 5.0}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 5.0}    owner=${owner email}    add users=${False}

    Sleep    60

    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${system 1}[port]    ${system 1}[local auth]    Server ${system 1}[id]
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${system 2}[port]    ${system 2}[local auth]    Server ${system 2}[id]

    Log    Step 1
    Log in to system    ${system 1}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown    ${system 2}[name]
    Wait Until Element Is Visible    ${MERGE ONLY AS OWNER}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=1
    Validate Choose Primary Dialog    ${system 1}[name]    ${system 2}[name]

    Log    Step 2
    Choose Primary System    from target=True
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=0.25
    #Validate Confirm Merge Dialog    ${system 2}[name]    ${system 1}[name]

    Log    Step 3
   # Slow    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}    timeout=1
    Click Button    ${MERGE SYSTEMS BUTTON}

    Log    Step 4
    #Validate Merge    ${system 2}[name]    ${system 1}[name]    on secondary=True

    Log   Step 5
    # Servers don't appear in the list if page is not reloaded
    #Reload Page
    Sleep    95
    Wait Until Element Is Visible    ${SERVERS LINK}

    Click Link    ${SERVERS LINK}
    Verify On Servers Page
    Select Server By Name    Server ${system 1}[id]
#    Click Element    //a[contains(@id, "${server 1 id}")]//span[contains(text(), "Server ${system 1}[id]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 1}[id]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}
    Select Server By Name    Server ${system 2}[id]
#    Click Element    //a[contains(@id, "${server 2 id}")]//span[contains(text(), "Server ${system 2}[id]")]
    Wait Until Element Is Visible    ${SERVER NAME}\[contains(text(), "Server ${system 2}[id]")]
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}

    Log    Step 6
    Go To    ${ENV}/systems/${system 2}[cloud id]
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Click Button    ${MERGE BUTTON SYSTEM}
    #Validate Check Merge Dialog    lonely=True
    Go To    ${ENV}/systems/
    Wait Until Element Is Visible    //nx-text-editable[contains(text(), "${system 2}[name]")]
    Wait Until Element Is Not Visible    //nx-text-editable[contains(text(), "${system 1}[name]")]

    Log    Step 7
    Go To    ${ENV}/systems/${system 1}[cloud id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

14. Positive scenario with back button use (on choosing primary system)
    [Tags]    C76270    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 3}=   Create Base System    cloud_merge_${rs}_3    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    4
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Log    Step 1
    Login to system    ${system 1}    ${owner email}
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

15. Different types of users in both Systems
    [Tags]    C76326    pos
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String

    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 3}=   Create Base System    cloud_merge_${rs}_3    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}

    FOR    ${i}    IN RANGE    1    4
        Append To List    ${test systems}    ${system ${i}}
    END

    Sleep    60

    ${sys 1 admin}=   Register and activate account with random email    sys1    admin    ${BASE PASSWORD}
    ${sys 2 adv viewer}=   Register and activate account with random email    sys2    adviewer    ${BASE PASSWORD}
    ${sys 3 custom}=   Register and activate account with random email    sys3    custom    ${BASE PASSWORD}
    ${all systems user}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}

    ${auth}=   Create List    admin    ${BASE PASSWORD}
    Save User     ${system 1}[token]    https://${QA BURBANK IP}:${system 1}[port]    sys1_admin    ${permissions}[cloudAdmin]    ${sys 1 admin}    sys1 admin    ${BASE PASSWORD}
    Save User     ${system 2}[token]    https://${QA BURBANK IP}:${system 2}[port]    sys2_adv    ${permissions}[advancedViewer]    ${sys 2 adv viewer}    sys2 adv    ${BASE PASSWORD}
    Save User     ${system 3}[token]    https://${QA BURBANK IP}:${system 3}[port]    sys3_custom    ${permissions}[custom]    ${sys 3 custom}    sys3 custom    ${BASE PASSWORD}
    Save User     ${system 1}[token]    https://${QA BURBANK IP}:${system 1}[port]    all_sys    ${permissions}[cloudAdmin]    ${all systems user}    all sys    ${BASE PASSWORD}
    Save User     ${system 2}[token]    https://${QA BURBANK IP}:${system 2}[port]    all_sys    ${permissions}[advancedViewer]    ${all systems user}    all sys    ${BASE PASSWORD}
    Save User     ${system 3}[token]    https://${QA BURBANK IP}:${system 3}[port]    all_sys    ${permissions}[custom]    ${all systems user}    all sys    ${BASE PASSWORD}

    Log    Step 1: Merge System 1(primary) with System 2(secondary), check users
    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[cloud id]
    Reload Page
    Sleep    60    # To avoid false negative tests
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60
    Complete merge steps till final password input    ${system 1}[name]    ${system 2}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=2
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
    Go To    ${ENV}/systems/${system 3}[cloud id]
    Reload Page
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=90
    Complete merge steps till final password input    ${system 3}[name]    ${system 1}[name]
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=2
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

    Reload Page
    Sleep    10
    Click Link    ${USERS LIST LINK}
    FOR    ${user}    IN    @{sys 3 user emails}
        Wait until element is visible    //div[@id="level3users"]//span[contains(text(), "${user}")]   timeout=1
    END

16. Checking state for selected Cloud system - System offline / back online
    [Tags]    C70983    C70987    state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String

    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 3}=   Create Base System    cloud_merge_${rs}_3    image=${IMAGE 4.1}    owner=${owner email}    add users=${False}
    ${system 4}=   Create Base System    cloud_merge_${rs}_4    image=${IMAGE 4.1}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    5
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Stop container    ${system 2}[container]
    Stop container    ${system 4}[container]

    FOR    ${i}    IN    1    3
        Log    C70983: System offline
        Log    Step 1
        Log In    ${owner email}    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${system ${i}}[cloud id]
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
        Start container    ${system ${j}}[container]
        Go To    ${ENV}/systems/${system ${j}}[cloud id]
        Reload Page
        Sleep    5
        Wait Until Element Is Not Visible    ${SYSTEM OFFLINE}    timeout=90
        Go To    ${ENV}/systems/${system ${i}}[cloud id]
        Wait until element is enabled    ${MERGE BUTTON SYSTEM}
        Slow    Click Button    ${MERGE BUTTON SYSTEM}    timeout=1
        Validate Check Merge Dialog

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

17. Checking state for selected Cloud system - systems have different versions
    [Tags]    C70984    C70985   state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String

    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.1}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Log    C70984: System has an older software version
    Log in to system    ${system 2}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

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
    Go To    ${ENV}/systems/${system 1}[cloud id]
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

18. Checking state for selected Cloud system - Duplicate servers
    [Tags]    C71004    state_cloud    state_cloud    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String

    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    network=host    owner=${owner email}    add users=${False}    customPort=7001
    ${server id}=   Get Server Id     https://${QA BURBANK IP}:7001    ${system 1}[local auth]
    Change Server Port Via Api    ${system 1}[local auth]    https://${QA BURBANK IP}:7001    ${7002}    ${server id}
    Set Variable    ${system 1}[port]    7002

    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    network=host    owner=${owner email}    add users=${False}    customPort=7001

    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Log    Step 1
    Login to system    ${system 1}    ${owner email}
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

# Password Validation
24. Owner's of the selected system password validation
    [Tags]    C76265    C76266    password_valid
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Log In    ${owner email}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${system 1}[cloud id]
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

25. Current account's password validation
    [Tags]    C76267    C76268    password_valid
    Log    Fails due to CLOUD-6451
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60

    Log in to system    ${system 1}    ${owner email}
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

27. General Errors - Selected server is already in this system
    [Tags]    C76466    general_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 3}=   Create Base System    cloud_merge_${rs}_3    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    4
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    90

    Merge Systems Local    ${system 1}[local auth]    admin:${BASE PASSWORD}    https://${QA BURBANK IP}:${system 1}[port]    ${QA BURBANK IP}:${system 2}[port]
    Sleep    60

    Login to system    ${system 1}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Log    Step 2
    Choose System From Dropdown    ${OTHER SYSTEM}    input url=https://${QA BURBANK IP}:${system 2}[port]    check url=True
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=2
    Validate Admin Password Dialog

    Log    Step 3
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${base password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SERVER APPEARS TO BE LISTING ITSELF}
    ...    ${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}

28. General Errors - System (server) offline after owner's of the selected system password validation
    [Tags]    C76272    general_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep    60


    Login to system    ${system 1}    ${owner email}
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
    Restart Server    https://${QA BURBANK IP}:${system 2}[port]    ${system 2}[local auth]   # make the server offline temporary
    Validate General Error Dialog
    ${s}=   Replace String    ${SYSTEM IS INACCESSIBLE TEXT}    %SYSTEM%   ${system 2}[name]
    Wait Until Element Is Visible    //p[contains(text(), "${s}")]

29. General Errors - Different owners
    [Tags]    C76225    C76464    general_errors    neg    should
    Log    Test Setup
    ${owner 1 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${owner 2 email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}

    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner 1 email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner 2 email}    add users=${False}
    ${system 3}=   Create Base System    cloud_merge_${rs}_3    image=${IMAGE 4.2}    owner=${owner 1 email}    add users=${False}
    FOR    ${i}    IN RANGE    1    4
        Append To List    ${test systems}    ${system ${i}}
    END
    ${auth}=   Create List    admin    ${base password}
    Sleep   60

    Login to system    ${system 1}    ${owner 1 email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

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
    Disconnect    ${owner 2 email}    ${base password}    ${system 2}[cloud id]
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

30. Merge Errors - System (server) offline after current account's password validation
    [Tags]    C76273   merge_errors    neg    should
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    ${auth}=   Create List    admin    ${base password}
    Sleep  60

    Login to system    ${system 1}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input     ${system 1}[name]    ${system 2}[name]

    Log     Step 2
    Stop container    ${system 2}[container]
    Sleep    5
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error p2}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 2}[name]
    ${offline status}=   Run Keyword And Return Status    Should be equal as strings    ${txt}    ${error p1}\n${error p2}
    IF    ${offline status} == ${False}
        Should be equal as strings    ${txt}    ${error p1}\n${MERGE FAILED UNKNOWN ERROR TEXT}
    END

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

31. Merge Errors - Primary System becomes offline during merge process
    [Tags]    C76277    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    ${auth}=   Create List    ${owner email}    ${base password}
    Sleep   60

    Login to system    ${system 1}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=60

    Log     Step 1
    Complete merge steps till final password input    ${system 1}[name]     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${MERGE SYSTEMS BUTTON}
    Restart Server    https://${QA BURBANK IP}:${system 1}[port]    ${system 1}[cloud auth]
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error offline}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 1}[name]
    ${error unreach}=   Replace String    ${FAILED TO MERGE SYSTEM IS UNREACHABLE TEXT}    %SYSTEM%    ${system 1}[name]
    ${offline status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error offline}
    ${unreach status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error unreach}\n${FAILED TO MERGE TRY AGAIN TEXT}
    IF    ${offline_status} == ${False} and ${unreach_status} == ${False}
        Should be equal as strings    ${txt}    ${error p1}\n${MERGE FAILED UNKNOWN ERROR TEXT}
    END

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}

32. Merge Errors - Secondary System becomes offline during merge process
    [Tags]    C76278    merge_errors    neg
    Log    Test Setup
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${BASE PASSWORD}
    ${rs}=   Generate Random String
    ${system 1}=   Create Base System    cloud_merge_${rs}_1    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    ${system 2}=   Create Base System    cloud_merge_${rs}_2    image=${IMAGE 4.2}    owner=${owner email}    add users=${False}
    FOR    ${i}    IN RANGE    1    3
        Append To List    ${test systems}    ${system ${i}}
    END
    Sleep   60

    Login to system    ${system 1}    ${owner email}
    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    timeout=180

    Log     Step 1
    Complete merge steps till final password input    ${system 1}[name]     ${system 2}[name]

    Log     Step 2
    Input Text    ${MERGE PASSWORD INPUT}    ${BASE PASSWORD}
    Slow    Click Button    ${MERGE SYSTEMS BUTTON}    timeout=1
    Restart Server    https://${QA BURBANK IP}:${system 2}[port]    ${system 2}[cloud auth]
    Validate Merge Failed Dialog

    ${txt}=   Get Text    ${MERGE FAILED ERROR TEXT}
    ${error p1}=   Replace String    ${FAILED TO MERGE SYSTEMS TEXT}    %SYSTEM1%    ${system 1}[name]
    ${error p1}=   Replace String    ${error p1}    %SYSTEM2%    ${system 2}[name]
    ${error offline}=   Replace String    ${FAILED TO MERGE SYSTEM IS OFFLINE TEXT}    %SYSTEM%    ${system 2}[name]
    ${error unreach}=   Replace String    ${FAILED TO MERGE SYSTEM IS UNREACHABLE TEXT}    %SYSTEM%    ${system 2}[name]
    ${offline status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error offline}
    ${unreach status}=   Run Keyword and return status    Should be equal as strings    ${txt}    ${error p1}\n${error unreach}\n${FAILED TO MERGE TRY AGAIN TEXT}
    IF    ${offline_status} == ${False} and ${unreach_status} == ${False}
        Should be equal as strings    ${txt}    ${error p1}\n${MERGE FAILED UNKNOWN ERROR TEXT}
    END

    Log    Step 3
    Click Button    ${MERGE FAILED OK BUTTON}
    Wait until element is not visible    ${MERGE DIALOG}