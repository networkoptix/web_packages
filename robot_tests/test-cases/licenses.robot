*** Settings ***
Resource    ../resource.robot
Suite Setup    LM Suite Set Up
Test Teardown    Run Keyword If Test Failed    LM Test Restart
Suite Teardown    Run Keyword and Ignore Error    LM Suite Teardown
Force Tags    Threaded    Licenses

*** Test Cases ***
1. License Management availability for different users
    [Tags]    C76523

    # System Owner
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Reload Page
    Wait Until Elements Are Visible
    ...    ${SYSTEM ADMINISTRATION LINK}
    ...    ${LICENSES LINK}
#    ...    ${SYSTEM STORAGE LINK}

    # Check the Licnses menu link position - not in 20.1 yet
#    ${menu links}=   Get WebElements    ${MENU LEVEL 3 LINK}
#    ${links text}=   Create List
#    ${exp links text}=   Create List    General    Licenses    Cloud Storage
#
#    FOR    ${link}    IN    @{menu links}
#        ${text}=   Get Text    ${link}
#        Append To List    ${links text}    ${text}
#    END
#    Lists Should Be Equal    ${links text}    ${exp links text}

    Open Licenses Page
    Validate Licenses Page    trial left=True
    Log Out

    # System Admin
    Log in to system    ${system 1}    ${LM USERS}[cloudAdmin]
    Reload Page
    Open Licenses Page
    Validate Licenses Page    trial left=True
    Log Out

    FOR    ${user}    IN    ${LM USERS}[viewer]    ${LM USERS}[liveViewer]    ${LM USERS}[advancedViewer]    ${LM USERS}[custom]
        Log in to system    ${system 1}    ${user}
        Wait Until Element Is Not Visible    ${LICENSES LINK}
        Log Out
    END

2. License Management availability for offline system
    [Tags]    C76533    cloud
#    Run Keyword If   '''${mode}'''=='''webadmin'''    Pass Execution     Not relevant in webadmin mode
    Skip If Irrelevant
    Stop Docker Server    ${system 1}[id]    # Get the server offline
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Open Licenses Page
    Wait Until Elements Are Visible
    ...    ${THIS PAGE CANNOT BE LOADED}
    ...    ${MAKE SURE SERVERS ARE ONLINE}

    Start Docker Server    ${system 1}[id]
    Sleep    30
    Log Out

3. License Key Input
    [Tags]    C76534
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    ${mask}=   Get Element Attribute    ${LICENSE KEY INPUT}    mask
    Should Be Equal As Strings    AAAA—AAAA—AAAA—AAAA    ${mask}
    ${pattern}=   Get Element Attribute    ${LICENSE KEY INPUT}    pattern
    Should Be Equal As Strings    [a-zA-Z0-9]*    ${pattern}
    ${type}=   Get Element Attribute    ${LICENSE KEY INPUT}    type
    Should Be Equal As Strings    text    ${type}

    Log     Step 2
    Input Text    ${LICENSE KEY INPUT}    qwe123
    ${formatted key}=   Get Formatted Key Input
    Should Be Equal As Strings    ${formatted key}    QWE1-23

    Log     Step 3
    Input Text    ${LICENSE KEY INPUT}    QWE!@#456
    ${formatted key}=   Get Formatted Key Input
    Should Be Equal As Strings    ${formatted key}    QWE4-56

    Log     Step 4
    Input Text    ${LICENSE KEY INPUT}    1234567890qwertyuiopasdfg
    ${formatted key}=   Get Formatted Key Input
    Should Be Equal As Strings    ${formatted key}    1234-5678-90QW-ERTY

    Log     Step 5
    Input Text    ${LICENSE KEY INPUT}    1234-5678-90QW-ERTY
    ${formatted key}=   Get Formatted Key Input
    Should Be Equal As Strings    ${formatted key}    1234-5678-90QW-ERTY
    Clear Element Text    ${LICENSE KEY INPUT}
    Click Button    ${ACTIVATE BUTTON}    # To clear #formattedKey
    Validate Input Error     ${INVALID LICENSE KEY TEXT}

    Log    Step 6 - commented out due to false negative test results
#    Copy To Clipboard    OPXR-4M7A-99P1-92KA
#    Slow    Paste Text    ${LICENSE KEY INPUT}    timeout=1
#    ${formatted key}=   Get Formatted Key Input
#    Should Be Equal As Strings    ${formatted key}    OPXR-4M7A-99P1-92KA

    Log Out

4. Input validation errors
    [Tags]    C76535    C76536    C76537    C76538   C76539    C76540   C76541    input_errors
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    Log    C76535: License key input is empty
    Activate Key    ${EMPTY}    success=False    error text=${ENTER LICENSE KEY TEXT}

    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${ENTER LICENSE KEY TEXT}")]
    Validate Input Normal State

    Log    C76536: License key input is not valid
    Activate Key    qwer1234    success=False    error text=${INVALID LICENSE KEY TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${INVALID LICENSE KEY TEXT}")]
    Validate Input Normal State
    Click Button    ${ACTIVATE BUTTON}
    Validate Input Error     ${INVALID LICENSE KEY TEXT}
    Activate Key    !@#$1234QWERasdf    success=False    error text=${INVALID LICENSE KEY TEXT}

    Log    C76537: License key has incompatible type
    ${key}=   Generate Licenses    brand=dwspectrum
    Activate Key    ${key}    success=False    error text=${LICENSE KEY IS INCOMPATIBLE WITH YOUR SYSTEM TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${ACTIVATE TRIAL FORM}//span[contains(text(), "${LICENSE KEY IS INCOMPATIBLE WITH YOUR SYSTEM TEXT}")]
    Validate Input Normal State

    Log    C76538: License already activated in this system
    ${key}=   Generate Licenses
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Should Be True    ${activated}
    Activate Key    ${key}    success=False    error text=${LICENSE KEY ALREADY ACTIVATED IN THIS SYSTEM TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${LICENSE KEY ALREADY ACTIVATED IN THIS SYSTEM TEXT}")]
    Validate Input Normal State

    Log   C76539: License is disabled
    ${key}=   Generate Licenses
    Disable License    ${key}
    ${disabled}=   Is Enabled    ${key}
    Should Not Be True    ${disabled}
    Activate Key    ${key}    success=False    error text=${INVALID LICENSE KEY TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${INVALID LICENSE KEY TEXT}")]
    Validate Input Normal State

    Log    C76540: License is already activated in another system
    ${key}=   Generate Licenses
    Activate License     ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
    ${hwid}=   Get HWID    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
    ${error text}=   Replace String    ${LICENSE KEY ALREADY ACTIVATED ON ANOTHER SYSTEM TEXT}    %HWID%    ${hwid}
    Activate Key    ${key}    success=False    error text=${error text}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${error text}")]
    Validate Input Normal State

    Log    C76541: Only one starter license is allowed per system
    ${starter 1}=   Generate Licenses    license_type=starter
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${starter 1}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${starter 1}
    Should Be True    ${activated}
    ${starter 2}=   Generate Licenses    license_type=starter
    Activate Key    ${starter 2}    success=False    error text=${ONLY ONE STARTER LICENSE ALLOWED TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${ONLY ONE STARTER LICENSE ALLOWED TEXT}")]
    Validate Input Normal State

    Log    Only one NVR license is allowed per system
    ${nvr 1}=   Generate Licenses    license_type=nvr
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${nvr 1}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${nvr 1}
    Should Be True    ${activated}
    ${nvr 2}=   Generate Licenses    license_type=nvr
    Activate Key    ${nvr 2}    success=False    error text=${ONLY ONE NVR LICENSE ALLOWED TEXT}
    Input Text    ${LICENSE KEY INPUT}    1234-1234-1234-1234
    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(text(), "${ONLY ONE NVR LICENSE ALLOWED TEXT}")]
    Validate Input Normal State

    Log Out

5. Server response errors: Failed to get response from license server
    [Tags]    C76544    server_errors    CLOUD-7316
    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    Change License Portal Host    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    http://example.com/
    ${key}=   Generate Licenses

    Activate Key    ${key}    success=False
    Check For Alert    ${LICENSE SERVER DID NOT RESPOND TEXT}    timeout=10
    ${input val}=   Get Formatted Key Input
    Should Be Equal As Strings    ${input val}    ${key}

    Change License Portal Host    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${LM HOST}
    Log Out

6. Server response errors: License key is expired
    [Tags]    server_errors
    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True
    ${exp ts}=   Get Current Date    time_zone=UTC    increment=-365d    result_format=datetime
    ${key}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
    Activate Key    ${key}    success=False    error text=${LICENSE IS EXPIRED TEXT}

    Log Out

7. Server response errors: Media server becomes offline during license activation
    [Tags]    C76545    server_errors    cloud

    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}   ${system 1}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    Stop Docker Server    ${system 1}[id]
    ${key}=   Generate Licenses
    Activate Key    ${key}    success=False
    Check For Alert    ${FAILED TO ACTIVATE LICENSE TEXT}    timeout=10
    ${input val}=   Get Formatted Key Input
    Should Be Equal As Strings    ${input val}    ${key}

    Start Docker Server    ${system 1}[id]
    Log Out

8. Server response errors: Server offline(System has two servers)
    [Tags]    C76532    C76542    server_errors
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 1}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    Stop Docker Server    ${system 3}[id]
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True
    ${pre selected}=   Get Text    ${BIND TO SERVER DROPDOWN}
    Should Be Equal As Strings    ${pre selected}    ${server 2}
    ${key}=   Generate Licenses
    Input Text    ${LICENSE KEY INPUT}    ${key}
    Click Button    ${BIND TO SERVER DROPDOWN}
    # Pick the server with "offline" mark
    ${offline server}=   Set Variable   ${BIND TO SERVER DROPDOWN}/following-sibling::div//a/span[contains(text(), "${server 3}")]/span[contains(text(), "Offline")]
    Wait Until Element Is Visible    ${offline server}
    Slow    Click Element    ${offline server}    timeout=2
    Click Button    ${ACTIVATE BUTTON}
    Check For Alert    ${FAILED TO ACTIVATE LICENSE TEXT}    timeout=30
#    Check For Alert    ${FAILED TO ACTIVATE - CONNECTION TIMEOUT TEXT}    timeout=10
    ${input val}=   Get Formatted Key Input
    Should Be Equal As Strings    ${input val}    ${key}

    Start Docker Server    ${system 3}[id]
    Log Out

9. Successful scenarios
    [Tags]    C76531    C76548    C76549    C76554    success
    Log    Test Set Up
    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}    ${system 1}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}

    Log    C76548: Successful first license activation
    Log    Step 1
    Open Licenses Page
    Validate Licenses Page    trial left=True
    Wait Until Elements Are Not Visible    ${LICENSES SUMMARY BLOCK}    ${LICENSE DETAIL BLOCK}

    Log    Step 2
    ${key}=   Generate Licenses    n_cameras=20
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Should Be True    ${activated}
    ${input val}=   Get Formatted Key Input
    Should Be Equal As Strings    ${input val}    ${EMPTY}

    Log    Step 3
    Validate Licenses Page    trial left=True    clean=False
    ${key records}=    Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    1
    Validate Summary Record    ${LIC TYPES}[digital]    20    20

    Log    Step 4
    Validate License Info    ${key}

    Log    C76549: Successful not first license activation
    Log    Step 2
    ${exp ts}=   Get Current Date    time_zone=UTC    increment=365d    result_format=datetime
    ${key}=   Generate Licenses    order_type=saas    license_type=analogencoder     n_cameras=16    fixed_expiration_ts=${exp ts}
    Activate Key    ${key}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Should Be True    ${activated}
    ${input val}=   Get Formatted Key Input
    Should Be Equal As Strings    ${input val}    ${EMPTY}

    Log    Step 3
    Validate Licenses Page    trial left=True    clean=False
    ${key records}=    Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    2
    Validate Summary Record    ${LIC TYPES}[analogencoder]    16    16

    Log    Step 4
    Validate License Info    ${key}

    Log    C76554: Successful trial license activation
    Log    Step 2
    Activate Trial
    Validate Licenses Page    trial left=False    clean=False

    Log    Step 3
    ${key records}=   Get WebElements    ${LICENSES SUMMARY RECORD}
    ${num records}=   Get Length    ${key records}
    Should be Equal As Numbers    ${num records}    3
    Validate Summary Record    Trial    4    4

    Log    Step 4
    Validate License Info    ${TRIAL LICENSE}

    Log Out

10. License Details Block: Purchase permanent keys
    [Tags]    C76532    C76550    C76557    C76561    C76562    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    @{types}=   Create List    digital    analogencoder    iomodule    vmax    videowall    starter    bridge
    ${n}=   Set Variable    0
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(10, 100)
        ${rand}=   Set Variable If    '''${type}''' == '''starter'''    4    ${rand}
        ${key}=   Generate Licenses    license_type=${type}    n_cameras=${rand}
        ${k}=   Evaluate    ${n}%2+2
        Activate Key    ${key}    server name=${server ${k}}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system ${k}}[port]    ${key}
        Should Be True    ${activated}
        Validate Licenses Page    several servers=True    trial left=True    clean=False
        Validate Summary Record    ${LIC TYPES}[${type}]    ${rand}    ${rand}
        Validate License Info    ${key}    server num=${k}
        ${n}=   Evaluate    ${n}+1
    END

    Log Out

11. License Details Block: SAAS keys
    [Tags]    C76560    C76561    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    @{types}=   Create List    digital    analogencoder    iomodule    vmax    videowall    bridge
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(31, 101)
        ${exp ts}=   Get Current Date    time_zone=UTC    increment=${rand}d    result_format=datetime
        ${key}=   Generate Licenses    order_type=saas    license_type=${type}    n_cameras=${rand}    fixed_expiration_ts=${exp ts}
        Activate Key    ${key}    server name=${server 2}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
        Should Be True    ${activated}
        Validate Licenses Page    several servers=True    trial left=True    clean=False
        Validate Summary Record    ${LIC TYPES}[${type}]    ${rand}    ${rand}
        Validate License Info    ${key}    server num=2
    END

    Log Out

12. License Details Block: Video Wall licenses
    [Tags]    C76561    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${demo vw}=   Generate Licenses    order_type=demo    license_type=videowall    n_cameras=17    trial_days=60
    Activate Key    ${demo vw}    server name=${server 2}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${demo vw}
    Should Be True    ${activated}
    Validate Licenses Page    several servers=True    trial left=True    clean=False
    Validate Summary Record    Video Wall    17    17
    Validate License Info    ${demo vw}    server num=2

    Log Out

13. License Details Block: License with date within 30 days
    [Tags]    C76565    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    # Such key is not red-colored in current implementation(due to local - UTC time difference)
    ${exp ts}=   Get Current Date    time_zone=UTC    increment=30d    result_format=%Y-%m-%d
    ${exp ts}=   Add Time To Date    ${exp ts}    23:59:59    result_format=datetime
    ${saas}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
    Activate Key    ${saas}    server name=${server 2}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${saas}
    Should Be True    ${activated}
    Validate License Info    ${saas}    server num=2
    Wait Until Element Has Style    //header[h4="${saas}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Expires")]    color    rgba(43, 56, 63, 1)

    ${demo}=   Generate Licenses    order_type=demo    trial_days=29
    Activate Key    ${demo}    server name=${server 2}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${demo}
    Should Be True    ${activated}
    Validate License Info    ${demo}    server num=2
    Wait Until Element Has Style    //header[h4="${demo}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Expires")]    color    ${ERROR COLOR WITH OPACITY}

    Log Out

14. License Details Block: Deactivated license
    [Tags]    C76566    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${key}=   Generate Licenses
    FOR    ${i}    IN RANGE    3
        Activate Key    ${key}    server name=${server 2}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
        Should Be True    ${activated}
        Validate License Info    ${key}    server num=2
        Deactivate Licenses    ${key}
        Restart Server    https://${QA BURBANK IP}:${system 2}[port]   ${LOCAL AUTH}
        Sleep    20
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
        Should Not Be True    ${activated}
        Reload Page
        Validate Licenses Page    several servers=True    trial left=True
        Wait Until Element Is Not Visible    //header[h4="${key}"]
    END
    Activate Key    ${key}    server name=${server 2}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
    Should Be True    ${activated}
    Validate Licenses Page    several servers=True    trial left=True    clean=False
    Validate License Info    ${key}    server num=2
    Wait Until Element Has Style    //header[h4="${key}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Deactivation left")]    color    ${ERROR COLOR WITH OPACITY}

    Log Out

15. License Details Block: License with expired status
    [Tags]    C76563    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${exp ts}=   Get Current Date    time_zone=UTC    increment=-365d    result_format=datetime
    ${key}=   Generate Licenses    order_type=saas    fixed_expiration_ts=${exp ts}
    ${hwids}=   Get Server HWIDs    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 2}[port]
    Add License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}    ${hwids}[1]
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${key}
    Should Be True    ${activated}
    Restart Server    https://${QA BURBANK IP}:${system 2}[port]   ${LOCAL AUTH}
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    Validate License Info    ${key}    status=Expired    server num=2
    Log Out

16. License Details Block: License with error status
    [Tags]    C76564    details
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${key}=   Generate Licenses
    Activate Key    ${key}    server name=${server 3}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 3}[port]    ${key}
    Should Be True    ${activated}
    Stop Docker Server    ${system 3}[id]
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    ${server}=   Get Key Server    ${key}
    Run keyword and ignore error    Should Be Equal As Strings    ${server}    Server not found
    ${status}=   Get Key Status    ${key}
    Run keyword and ignore error    Should Be Equal As Strings    ${status}    Error

    Start Docker Server    ${system 3}[id]
    Sleep    10
    Reload Page
    Validate Licenses Page    several servers=True    trial left=True    clean=False

    Log Out

17. License Summary Block: Server goes offline
    [Tags]    C76567    C76631    summary    cloud
    Skip If Irrelevant
    Remove all keys from system    ${system 2}[port]
    Log in to system    ${system 2}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    several servers=True    trial left=True

    ${num online}=   Evaluate    random.randint(10, 100)
    ${num offline}=   Evaluate    random.randint(10, 100)
    ${total}=   Evaluate    ${num online}+${num offline}
    ${pro on}=   Generate Licenses    license_type=digital    n_cameras=${num online}
    ${pro off}=   Generate Licenses    license_type=digital    n_cameras=${num offline}
    Activate Key    ${pro on}    server name=${server 2}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 2}[port]    ${pro on}
    Should Be True    ${activated}
    Activate Key    ${pro off}    server name=${server 3}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 3}[port]    ${pro off}
    Should Be True    ${activated}

    Validate Licenses Page    several servers=True    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${total}    ${total}
    Validate License Info    ${pro on}    server num=2
    Validate License Info    ${pro off}    server num=3

    Stop Docker Server    ${system 3}[id]
    Sleep    30
    Reload Page

    Validate Licenses Page    several servers=True    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${total}    ${num online}

    Start Docker Server    ${system 3}[id]
    Log Out

18. License Summary Block: License key is expired
    [Tags]    C76567    C76632    summary
    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}    ${system 2}[cloud auth][0]

    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True

    ${num good}=   Evaluate    random.randint(10, 100)
    ${pur vw}=   Generate Licenses    license_type=videowall    n_cameras=${num good}
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${pur vw}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${pur vw}
    Should Be True    ${activated}

    ${num expired}=   Evaluate    random.randint(10, 100)
    ${total}=   Evaluate    ${num good}+${num expired}
    ${exp ts}=   Get Current Date    time_zone=UTC    increment=-365d    result_format=datetime
    ${saas vw}=   Generate Licenses    order_type=saas    license_type=videowall    n_cameras=${num expired}    fixed_expiration_ts=${exp ts}
    ${hwids}=   Get Server HWIDs    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]
    Add License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${saas vw}    ${hwids[1]}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${saas vw}
    Restart Server    https://${QA BURBANK IP}:${system 1}[port]   ${LOCAL AUTH}
    Sleep    10
    Reload Page
    Validate Licenses Page    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[videowall]    ${total}    ${num good}
    Validate License Info    ${pur vw}
    Validate License Info    ${saas vw}    status=Expired

    ${expires path}=   Set Variable    //header[h4="${saas vw}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Expires")]
    ${class}=   Get Element Attribute    ${expires path}    class
    Should Contain    ${class}    error
    Wait Until Element Has Style    ${expires path}    color    ${ERROR COLOR WITH OPACITY}

    Log Out

19. VMS integration
    [Documentation]    Validate information on cloud for license keys activated/deactivated/removed in client
    [Tags]    C76568    C76569    C76570    vms
    Remove all keys from system    ${system 1}[port]
    Log in to system    ${system 1}    ${system 2}[cloud auth][0]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Open Licenses Page
    Validate Licenses Page    trial left=True    clean=True

    Log    C76568: License Activation
    Log    Purchase permanent licenses
    ${n}=   Set Variable    0
    ${types}=   Create List    digital    analogencoder    iomodule    vmax    starter    videowall    nvr
    # A dict to store number of activated licenses of each type
    ${types counter}=   Create Dictionary    digital=0    analogencoder=0    iomodule=0    vmax=0    videowall=0    starter=0
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(10, 100)
        Set To Dictionary    ${types counter}    ${type}=${rand}
        Log    ${types counter}[${type}]
        ${pur}=   Generate Licenses    order_type=purchase    license_type=${type}    n_cameras=${rand}
        Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${pur}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${pur}
        Should Be True    ${activated}
        Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
        Sleep    10
        Reload Page
        Sleep    10
        Validate Licenses Page    trial left=True    clean=False
        # Verify licenses' summary records are updated correctly
        Validate Summary Record    ${LIC TYPES}[${type}]    ${types counter}[${type}]    ${types counter}[${type}]
        # Verify licenses' details are updated correctly
        Validate License Info    ${pur}
    END

    Log    SaaS and Demo time licenses
    Remove Values From List    ${types}    starter    videowall    nvr
    ${t}=   Set Variable    0    # Time licenses counter
    FOR     ${type}    IN    @{types}
        ${rand}=   Evaluate    random.randint(10, 100)
        ${n}=   Evaluate    ${types counter}[${type}]+${rand}
        Set To Dictionary    ${types counter}    ${type}=${n}
        ${t}=   Evaluate    ${t}+${rand}
        ${exp ts}=   Get Current Date    time_zone=UTC    increment=${rand}d    result_format=datetime
        ${saas}=   Generate Licenses    order_type=saas    license_type=${type}    n_cameras=${rand}    fixed_expiration_ts=${exp ts}
        ${demo}=   Generate Licenses    order_type=demo    license_type=${type}    n_cameras=${rand}    trial_days=${rand}
        Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${saas}
        Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${demo}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${saas}
        Should Be True    ${activated}
        ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${demo}
        Should Be True    ${activated}
        Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
        Sleep    10
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
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${demo vw}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${demo vw}
    Should Be True    ${activated}

    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page

    Validate Licenses Page    trial left=True    clean=False
    Validate Summary Record    ${LIC TYPES}[videowall]    ${types counter}[videowall]    ${types counter}[videowall]
    Validate License Info    ${demo vw}

    Log    Trial license is displayed correctly, summary is updated correctly
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${TRIAL LICENSE}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${TRIAL LICENSE}
    Should Be True    ${activated}

    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    Trial    4    4
    Validate License Info    ${TRIAL LICENSE}

    Log    C76569: License deactivation
    ${rand}=   Evaluate    random.randint(10, 100)
    ${key}=   Generate Licenses    n_cameras=${rand}
    ${n}=   Evaluate    ${types counter}[digital]+${rand}
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Should Be True    ${activated}
    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page
    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${n}    ${n}
    Validate License Info    ${key}

    Deactivate Licenses    ${key}
    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${types counter}[digital]    ${types counter}[digital]
    Wait Until Element Is Not Visible    //header[h4="${key}"]

    Log    C76570: Remove license
    Activate License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    ${activated}=   License Is Activated    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Should Be True    ${activated}
    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page
    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${n}    ${n}
    Validate License Info    ${key}

    Remove License    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system 1}[port]    ${key}
    Restart Server    https://${QABURBANK IP}:${system 1}[port]    ${LOCAL AUTH}
    Sleep    10
    Reload Page

    Validate Licenses Page    trial left=False    clean=False
    Validate Summary Record    ${LIC TYPES}[digital]    ${types counter}[digital]    ${types counter}[digital]
    Wait Until Element Is Not Visible    //header[h4="${key}"]

    Log Out
