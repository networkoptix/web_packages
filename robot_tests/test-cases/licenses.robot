*** Settings ***
Resource    ../resource.robot
Suite Setup    LM Suite Set Up
Test Teardown    Run Keyword If Test Failed    LM Test Restart
Suite Teardown    LM Suite Teardown

*** Test Cases ***
License Management availability for different users
    [Tags]    C76523
    FOR    ${user}    IN    ${LM OWNER}    ${LM USERS}[cloudAdmin]
        Log In    ${user}    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id 1}
        Open Licenses Page
        Validate Licenses Page    trial left=True
        Log Out
    END
    FOR    ${user}    IN    ${LM USERS}[viewer]    ${LM USERS}[advancedViewer]    ${LM USERS}[custom]
        Log In    ${user}    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id 1}
        Wait Until Element Is Not Visible    ${LICENSES LINK}
        Log Out
    END

License Management availability for offline system
    [Tags]    C76533
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Stop Container    ${cont 1}    # Get the server offline
    Go To    ${ENV}/systems/${sys id 1}
    Open Licenses Page
    Wait Until Elements Are Visible
    ...    ${THIS PAGE CANNOT BE LOADED}
    ...    ${MAKE SURE SERVERS ARE ONLINE}

    Start Container    ${cont 1}
    Sleep    30
    Log Out

License Key Input
    [Documentation]    Checks "mask", "pattern" and "type" attributes of the input. Visual check is not possible.
    [Tags]    C76534
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    ${mask}=   Get Element Attribute    ${LICENSE KEY INPUT}    mask
    Should Be Equal As Strings    AAAA—AAAA—AAAA—AAAA    ${mask}
    ${pattern}=   Get Element Attribute    ${LICENSE KEY INPUT}    pattern
    Should Be Equal As Strings    [a-zA-Z0-9]*    ${pattern}
    ${type}=   Get Element Attribute    ${LICENSE KEY INPUT}    type
    Should Be Equal As Strings    text    ${type}

    Log Out

Input validation errors
    [Tags]    C76535    C76536    C76537    C76538   C76539    C76540   C76541    input_errors
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    Log    C76535: License key input is empty
    Activate Key    ${EMPTY}    success=False    error text=${ENTER LICENSE KEY TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${ENTER LICENSE KEY TEXT}")]

    Log    C76536: License key input is not valid
    Activate Key    qwer1234    success=False    error text=${INVALID LICENSE KEY TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${INVALID LICENSE KEY TEXT}")]

# Commented out due to CLOUD-5482
#    Log    C76537: License key has incompatible type
#    ${key}=   Generate Licenses    brand=dwspectrum
#    Activate Key    ${key}    success=False    error text=${LICENSE KEY IS INCOMPATIBLE WITH YOUR SYSTEM TEXT}
#    Input Text    ${LICENSE KEY INPUT}    I love my wife
#    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${LICENSE KEY IS INCOMPATIBLE WITH YOUR SYSTEM TEXT}")]

    Log    C76538: License already activated in this system
    ${key}=   Generate Licenses
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Activate Key    ${key}    success=False    error text=${LICENSE KEY ALREADY ACTIVATED IN THIS SYSTEM TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${LICENSE KEY ALREADY ACTIVATED IN THIS SYSTEM TEXT}")]

    Log   C76539: License is disabled
    ${key}=   Generate Licenses
    Disable License    ${key}
    ${disabled}=   Is Enabled    ${key}
    Should Not Be True    ${disabled}
    Activate Key    ${key}    success=False    error text=${INVALID LICENSE KEY TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${INVALID LICENSE KEY TEXT}")]

    Log    C76540: License is already activated in another system
    ${key}=   Generate Licenses
    Activate License    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${key}
    ${activated}=   License Is Activated    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${key}
    Should Be True    ${activated}
    Activate Key    ${key}    success=False    error text=${LICENSE KEY ALREADY ACTIVATED ON ANOTHER SYSTEM TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${LICENSE KEY ALREADY ACTIVATED ON ANOTHER SYSTEM TEXT}")]

    Log    C76541: Only one starter license is allowed per system
    ${starter 1}=   Generate Licenses    license_type=starter
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${starter 1}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${starter 1}
    Should Be True    ${activated}
    ${starter 2}=   Generate Licenses    license_type=starter
    Activate Key    ${starter 2}    success=False    error text=${ONLY ONE STARTER LICENSE ALLOWED TEXT}
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${ONLY ONE STARTER LICENSE ALLOWED TEXT}")]

    Log Out

Server response errors
    [Tags]    C76544    C76545    C76542    server_errors
    Remove all keys from system    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
    Log    C76544: Failed to get response from license server
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    Change License Portal Host    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    http://example.com/
    ${key}=   Generate Licenses

    Activate Key    ${key}    success=False
    Check For Alert    ${LICENSE SERVER DID NOT RESPOND TEXT}
    Change License Portal Host    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${LM HOST}

#    Log    Not implemented - see CLOUD-5631: Failed to activate an expired license
#    ${exp ts}=   Get Current Date    increment=-365d    result_format=datetime
#    ${key}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
#    Activate Key    success=False
#    Check For Alert    ${LICENSE IS EXPIRED TEXT}

    Log    C76545: Media server becomes offline during license activation
    Stop Container    ${cont 1}
    Activate Key    ${key}    success=False
    Check For Alert    ${FAILED TO ACTIVATE LICENSE TEXT}
    Start Container    ${cont 1}

    Log    C76542: Server offline(System has two servers)
    Go To    ${ENV}/systems/${sys id 2}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    Stop Container    ${cont 3}
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True
    Activate Key    ${key}    success=False    server name=${server 3}
    Check For Alert    ${FAILED TO ACTIVATE - CONNECTION TIMEOUT TEXT}
    Start Container    ${cont 3}

    Log Out

Successful scenarios
    [Tags]    C76548    C76549    C76554    success
    Log    Test Set Up
    Remove all keys from system    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}

    Log    C76548: Successful first license activation
    Log    Step 1
    Open Licenses Page
    Validate Licenses Page    trial left=True
    Wait Until Elements Are Not Visible    ${LICENSES SUMMARY BLOCK}    ${LICENSE DETAIL BLOCK}

    Log    Step 2
    ${key}=   Generate Licenses    n_cameras=20
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}

    Log    Step 3
    Wait Until Elements Are Visible
    ...    ${LICENSES SUMMARY BLOCK}
    ...    ${LICENSES SUMMARY HEADER}
    ...    ${LICENSES SUMMARY THEAD}
    ...    ${LICENSES SUMMARY RECORD}

    ${key records}=    Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    1
    Validate Summary Record    ${LIC TYPES}[digital]    20    20

    Log    Step 4
    Validate License Info    ${key}

    Log    C76549: Successful not first license activation
    Log    Step 2
    ${exp ts}=   Get Current Date    increment=365d    result_format=datetime
    ${key}=   Generate Licenses    order_type=saas    license_type=analogencoder     n_cameras=16    fixed_expiration_ts=${exp ts}
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}

    Log    Step 3
    ${key records}=    Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    2
    Validate Summary Record    ${LIC TYPES}[analogencoder]    16    16

    Log    Step 4
    Validate License Info    ${key}

    Log    C76554: Successful trial license activation
    Log    Step 2
    Activate Trial
    Wait Until Elements Are Not Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}

    Log    Step 3
    ${key records}=   Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    3
    Validate Summary Record    Trial    4    4

    Log    Step 4
    Validate License Info    ${TRIAL LICENSE}

    Log Out

License Detail Block
    [Tags]    C76557    C76560    C76561    C76563    C76564    C76565    C76566    details
    Remove all keys from system    ${LOCALHOST}:${LM PORT 2}    ${CLOUD AUTH}
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 2}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    Log    C76557: Purchase permanent keys
    @{lic types}=   Create List    digital    analogencoder    iomodule    vmax    videowall    starter
    ${n}=   Set Variable    0
    FOR     ${type}    IN    @{lic types}
        ${rand}=   Evaluate    random.randint(10, 100)
        ${key}=   Generate Licenses    license_type=${type}    n_cameras=${rand}
        ${k}=   Evaluate    ${n}%2+2
        Activate Key    ${key}    server name=${server ${k}}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT ${k}}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}    port=${LM PORT ${k}}
        ${n}=   Evaluate    ${n}+1
    END

    Log    C76560: SAAS keys
    Remove Values From List    ${lic types}    starter
    FOR     ${type}    IN    @{lic types}
        ${rand}=   Evaluate    random.randint(31, 101)
        ${exp ts}=   Get Current Date    increment=${rand}d    result_format=datetime
        ${key}=   Generate Licenses    order_type=saas    license_type=${type}    n_cameras=${rand}    fixed_expiration_ts=${exp ts}
        Activate Key    ${key}    server name=${server 2}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}    port=${LM PORT 2}
    END

    Log    C76561: License details for Video Wall licenses
    ${demo vw}=   Generate Licenses    order_type=demo    license_type=videowall    n_cameras=17    trial_days=60
    Activate Key    ${demo vw}    server name=${server 2}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${demo vw}
    Should Be True    ${activated}
    Validate License Info    ${demo vw}    port=${LM PORT 2}

    Log    C76563: License details for license with expired status
    ${exp ts}=   Get Current Date    increment=-365d    result_format=datetime
    ${key}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
    ${hwids}=   Get Server HWIDs    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}
    Add License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}    ${hwids[1]}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
    Should Be True    ${activated}
    Reload Page
    Sleep    10
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    Validate License Info    ${key}    port=${LM PORT 2}
    ${status}=   Get Key Status    ${key}
    Should Be Equal As Strings    ${status}    Expired

    Log    C76564: License details for license with error status
    ${key}=   Generate Licenses
    Activate Key    ${key}    server name=${server 3}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 3}    ${key}
    Should Be True    ${activated}
    Stop Container    ${cont 3}
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    ${server}=   Get Key Server    ${key}
    Should Be Equal As Strings    ${server}    Server not found
    ${status}=   Get Key Status    ${key}
    Should Be Equal As Strings    ${status}    Error

    Start Container    ${cont 3}
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    Log    C76565: License details for license with date within 30 days
    ${key}=   Generate Licenses    order_type=demo    trial_days=30
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
    Should Be True    ${activated}
    Validate License Info    ${key}    port=${LM PORT 2}

    Log   C76566: License details for deactivated license
    ${key}=   Generate Licenses
    FOR    ${i}    IN RANGE    3
        Activate Key    ${key}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}    port=${LM PORT 2}
        Deactivate Licenses    ${key}
        Slow    Restart Server    ${LOCALHOST}:${LM PORT 2}    ${CLOUD AUTH}    timeout=20
        Reload Page
        Validate Licenses Page    several servers=True    trial left=True    clean=False
        Wait Until Element Is Not Visible    //header[h4="${key}"]
    END
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
    Should Be True    ${activated}
    Validate License Info    ${key}    port=${LM PORT 2}

    Log Out

License Summary Block
    [Tags]    C76567    C76631    C76632    summary
    FOR    ${i}    IN RANGE    1    4
        Remove all keys from system    ${LOCALHOST}:${LM PORT ${i}}  ${CLOUD AUTH}
    END

    Log    C76632: license key is expired
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    ${num good}=   Evaluate    random.randint(10, 100)
    ${pur vw}=   Generate Licenses    license_type=videowall    n_cameras=${num good}
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${pur vw}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${pur vw}
    Should Be True    ${activated}

    ${num expired}=   Evaluate    random.randint(10, 100)
    ${total}=   Evaluate    ${num good}+${num expired}
    ${exp ts}=   Get Current Date    increment=-365d    result_format=datetime
    ${saas vw}=   Generate Licenses    order_type=saas    license_type=videowall    n_cameras=${num expired}    fixed_expiration_ts=${exp ts}
    ${hwids}=   Get Server HWIDs    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}
    Add License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${saas vw}    ${hwids[1]}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${saas vw}
    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
    Sleep    10

    Reload Page
    Validate Licenses Page    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[videowall]    ${total}    ${num good}
#    Validate License Info    ${pur vw}
#    Validate License Info    ${saas vw}

    Log    C76631: Server goes offline
    Go To    ${ENV}/systems/${sys id 2}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${num online}=   Evaluate    random.randint(10, 100)
    ${num offline}=   Evaluate    random.randint(10, 100)
    ${total}=   Evaluate    ${num online}+${num offline}
    ${pro on}=   Generate Licenses    license_type=digital    n_cameras=${num online}
    ${pro off}=   Generate Licenses    license_type=digital    n_cameras=${num offline}
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${pro on}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${pro on}
    Should Be True    ${activated}
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 3}    ${pro off}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 3}    ${pro off}
    Should Be True    ${activated}

    Restart Server    ${LOCALHOST}:${LM PORT 2}    ${CLOUD AUTH}
    Restart Server    ${LOCALHOST}:${LM PORT 3}    ${CLOUD AUTH}
    Sleep    10

    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${total}    ${total}
    Validate License Info    ${pro on}
    Validate License Info    ${pro off}

    Stop Container    ${cont 3}
    Sleep    10
    Reload Page

    Validate Licenses Page    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${total}    ${num online}

    Start Container    ${cont 3}
    Log Out

VMS integration
    [Documentation]    Validate information on cloud for license keys activated/deactivated/removed in client
    [Tags]    C76568    C76569    C76570    vms
    Remove all keys from system    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True    clean=True

    Log    C76568: License Activation
    Log    Purchase permanent licenses
    ${n}=   Set Variable    0
    ${types}=   Create List    digital    analogencoder    iomodule    vmax    starter    videowall
    # A dict to store number of activated licenses of each type
    ${types counter}=   Create Dictionary    digital=0    analogencoder=0    iomodule=0    vmax=0    starter=0    videowall=0
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(10, 100)
        Set To Dictionary    ${types counter}    ${type}=${rand}
        Log    ${types counter}[${type}]
        ${pur}=   Generate Licenses    order_type=purchase    license_type=${type}    n_cameras=${rand}
        Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${pur}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${pur}
        Should Be True    ${activated}
        Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
        Reload Page
        Validate Licenses Page    trial left=True    clean=False
        # Verify licenses' summary records are updated correctly
        Validate Summary Record    ${LIC TYPES}[${type}]    ${types counter}[${type}]    ${types counter}[${type}]
        # Verify licenses' details are updated correctly
        Validate License Info    ${pur}
    END

    Log    SaaS and Demo time licenses
    Remove Values From List    ${types}    starter    videowall
    ${t}=   Set Variable    0    # Time licenses counter
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(10, 100)
        ${n}=   Evaluate    ${types counter}[${type}]+${rand}
        Set To Dictionary    ${types counter}    ${type}=${n}
        ${t}=   Evaluate    ${t}+${rand}
        ${exp ts}=   Get Current Date    increment=${rand}d    result_format=datetime
        ${saas}=   Generate Licenses    order_type=saas    license_type=${type}    n_cameras=${rand}    fixed_expiration_ts=${exp ts}
        ${demo}=   Generate Licenses    order_type=demo    license_type=${type}    n_cameras=${rand}    trial_days=${rand}
        Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${saas}
        Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${demo}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${saas}
        Should Be True    ${activated}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${demo}
        Should Be True    ${activated}
        Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
        Reload Page

        Validate Licenses Page    trial left=True    clean=False
        Validate Summary Record    ${LIC TYPES}[${type}]    ${types counter}[${type}]    ${types counter}[${type}]
        Validate Summary Record    Time    ${t}    ${t}
        Validate License Info    ${saas}
        Validate License Info    ${demo}
    END

    Log    Demo Videowall license is displayed correctly, summary is updated correctly
    ${rand}=   Evaluate    random.randint(10, 100)
    ${demo vw}=   Generate Licenses    order_type=demo    license_type=videowall    n_cameras=${rand}    trial_days=${rand}
    ${n}=   Evaluate    ${types counter}[videowall]+${rand}
    Set To Dictionary    ${types counter}    videowall=${n}
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${demo vw}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${demo vw}
    Should Be True    ${activated}

    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page

    Validate Licenses Page    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[videowall]    ${types counter}[videowall]    ${types counter}[videowall]
    Validate License Info    ${demo vw}

    Log    Trial license is displayed correctly, summary is updated correctly
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${TRIAL LICENSE}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${TRIAL LICENSE}
    Should Be True    ${activated}

    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    Trial    4    4
    Validate License Info    ${TRIAL LICENSE}

    Log    C76569: License deactivation
    ${rand}=   Evaluate    random.randint(10, 100)
    ${key}=   Generate Licenses    n_cameras=${rand}
    ${n}=   Evaluate    ${types counter}[digital]+${rand}
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page
    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${n}    ${n}
    Validate License Info    ${key}

    Deactivate Licenses    ${key}
    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${types counter}[digital]    ${types counter}[digital]
    Wait Until Element Is Not Visible    //header[h4="${key}"]

    Log    C76570: Remove license
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page
    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${n}    ${n}
    Validate License Info    ${key}

    Remove License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Slow    Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}    timeout=10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${types counter}[digital]    ${types counter}[digital]
    Wait Until Element Is Not Visible    //header[h4="${key}"]

    Log Out