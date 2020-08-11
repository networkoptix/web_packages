*** Settings ***
Resource    ../resource.robot
Suite Setup    LM Suite Set Up
Test Teardown   Run Keyword If Test Failed    LM Test Restart
Suite Teardown    LM Suite Teardown
Force Tags     licenses


*** Test Cases ***
License Management availability for different users
    [Tags]    C76523
    FOR    ${user}    IN    ${LM OWNER}    ${LM USERS}[cloudAdmin]
        Log In    ${user}    ${BASE PASSWORD}
        Go To    ${ENV}/systems/${sys id 1}
        Open Licenses Page
        Validate Licenses Page    clean=True
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
    Stop Container    ${cont 1}
    Go To    ${ENV}/systems/${sys id 1}
    Open Licenses Page
    Wait Until Elements Are Visible
    ...    ${THIS PAGE CANNOT BE LOADED}
    ...    ${MAKE SURE SERVERS ARE ONLINE}

    Start Container    ${cont 1}
    Sleep    30    # Get the server back online
    Log Out

Input validation errors
    [Tags]    C76535    C76536    C76537    C76538   C76539    C76540   C76541
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Link    ${SYSTEM GENERAL LINK}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Sleep    10  # Get the system initialized. See CLOUD-5475
    Open Licenses Page
    Validate Licenses Page

    Log    C76535: License key input is empty
    Activate Key    ${EMPTY}    success=False    error text=Enter license key
    Input Text    ${LICENSE KEY INPUT}    hello world
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "Enter license key")]

    Log    C76536: License key input is not valid
    Activate Key    qwer1234    success=False    error text=Invalid license key
    Input Text    ${LICENSE KEY INPUT}    blablabla
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "Invalid license key")]

# Commented out due to CLOUD-5482
#    Log    C76537: License key has incompatible type
#    ${key}=   Generate Licenses    brand=dwspectrum
#    Activate Key    ${key}    success=False    error text=License type is incompatible with your system
#    Input Text    ${LICENSE KEY INPUT}    I love my wife
#    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "License type is incompatible with your system")]

    Log    C76538: License already activated in this system
    ${key}=   Generate Licenses
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Activate Key    ${key}    success=False    error text=License key has already been activated in this system
    Input Text    ${LICENSE KEY INPUT}    Putin - vor
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "License key has already been activated in this system")]

    Log   C76539: License is disabled
    ${key}=   Generate Licenses
    Disable License    ${key}
    ${disabled}=   Is Enabled    ${key}
    Should Not Be True    ${disabled}
    Activate Key    ${key}    success=False    error text=Invalid license key
    Input Text    ${LICENSE KEY INPUT}    why again?
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "Invalid license key")]

    Log    C76540: License is already activated in another system
    ${key}=   Generate Licenses
    Activate License    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${key}
    ${activated}=   License Is Activated    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${key}
    Should Be True    ${activated}
    Activate Key    ${key}    success=False    error text=License key has already been activated and bound to server with hardware ID
    Input Text    ${LICENSE KEY INPUT}    nevermind
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "License key has already been activated and bound to server with hardware ID")]

    Log    C76541: Only one starter license is allowed per system
    ${starter 1}=   Generate Licenses    license_type=starter
    Activate License    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${starter 1}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${starter 1}
    Should Be True    ${activated}
    ${starter 2}=   Generate Licenses    license_type=starter
    Activate Key    ${starter 2}    success=False    error text=Only one starter license is allowed per system
    Input Text    ${LICENSE KEY INPUT}    the last one
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "License key has already been activated and bound to server with hardware ID")]

    Log Out

# Service response errors

Successful scenarios
    [Tags]    C76548    C76549    C76554
    Log    Test Set Up
    Remove all keys from system    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Link    ${SYSTEM GENERAL LINK}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Sleep    10  # Get the system initialized. See CLOUD-5475

    Log    C76548: Successful first license activation
    Log    Step 1
    Open Licenses Page
    Validate Licenses Page    clean=True
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

    ${num channels}=   Number of Channels    Professional
    ${num available}=   Number of Channels Available    Professional
    Should Be Equal As Numbers    ${num channels}   20
    Should Be Equal As Numbers    ${num available}   20

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

    ${num channels}=   Number of Channels    Analog Encoder
    ${num available}=   Number of Channels Available    Analog Encoder
    Should Be Equal As Numbers    ${num channels}   16
    Should Be Equal As Numbers    ${num available}   16

    Log    Step 4
    Validate License Info    ${key}

    Log    C76554: Successful trial license activation
    Log    Step 2
    Activate Trial
    Wait Until Elements Are Not Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}

    Log    Step 3
    ${key records}=    Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    3

    ${num channels}=   Number of Channels    Trial
    ${num available}=   Number of Channels Available    Trial
    Should Be Equal As Numbers    ${num channels}   4
    Should Be Equal As Numbers    ${num available}   4

    Log    Step 4
    Validate License Info    ${TRIAL LICENSE}

    Log Out

# License Detail Block
License details for purchase licenses with different types
    [Tags]    C76557    C76560    C76563    C76564    C76565    C76566
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 1}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Link    ${SYSTEM GENERAL LINK}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Sleep    10  # Get the system initialized. See CLOUD-5475
    Open Licenses Page
    Validate Licenses Page

    Log    C76557: Purchase permanent keys
    @{lic types}=   Create List    digital    analogencoder    iomodule    vmax    videowall
    FOR     ${type}    IN    @{lic types}
        ${rand}=   Evaluate    random.randint(10, 100)
        ${key}=   Generate Licenses    license_type=${type}    n_cameras=${rand}
        Activate Key    ${key}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}
    END

    Log    C76560: SAAS keys
    FOR     ${type}    IN    @{lic types}
        ${rand}=   Evaluate    random.randint(31, 101)
        ${exp ts}=   Get Current Date    increment=${rand}d    result_format=datetime
        ${key}=   Generate Licenses    order_type=saas    license_type=${type}    n_cameras=${rand}    fixed_expiration_ts=${exp ts}
        Activate Key    ${key}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}
    END

# Such license keys cannot be rettrieved via ec2/getLicenses
#    Log    C76563: License details for license with expired status
#    ${exp ts}=   Convert Date    2019-02-02 23:59:59    result_format=datetime
#    ${key}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
#    Activate Key    ${key}
#    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
#    Should Be True    ${activated}
#    Validate License Info    ${key}

#    Log    C76564: License details for license with error status

    Log    C76565: License details for license with date within 30 days
    ${key}=   Generate Licenses    order_type=demo    trial_days=30
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Validate License Info    ${key}

    Log   C76566: License details for deactivated license
    ${key}=   Generate Licenses
    FOR    ${i}    IN RANGE    3
        Activate Key    ${key}
        ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}
        Deactivate Licenses    ${key}
        Restart Server    ${LOCALHOST}:${LM PORT 1}    ${CLOUD AUTH}
        Sleep    30
        Click Link    ${SYSTEM GENERAL LINK}
        Wait Until Element Is Visible    ${DISCONNECT FROM NX}
        Open Licenses Page
        Validate Licenses Page
    END
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 1}    ${key}
    Should Be True    ${activated}
    Validate License Info    ${key}

    Log Out

#VMS integration

Two Servers
    [Tags]    C76550    two_servers
    Log In    ${LM OWNER}    ${BASE PASSWORD}
    Go To    ${ENV}/systems/${sys id 2}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Link    ${SYSTEM GENERAL LINK}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Sleep    10  # Get the system initialized. See CLOUD-5475
    Open Licenses Page
    Validate Licenses Page    several servers=True    clean=True

    Log    Activate Trial
    Activate Trial
    Validate License Info    ${TRIAL LICENSE}    ${LM PORT 2}

    Log    Activate to Server 1
    ${key}=   Generate Licenses    n_cameras=5
    Activate Key    ${key}    server name=${server 2}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
    Validate License Info    ${key}    ${LM PORT 2}

    Log    Activate to Server 2
    ${key}=   Generate Licenses    license_type=analogencoder    n_cameras=4
    Activate Key    ${key}    server name=${server 3}
    ${activated}=   License Is Activated    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT 2}    ${key}
    Validate License Info    ${key}    ${LM PORT 3}

    Log Out