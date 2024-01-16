*** Settings ***
Resource          ../Resources/front-end-resources/cloud-merge-resource.robot
Suite Setup       Merge Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Merge Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop         Merge Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Merge Suite Teardown
Force Tags        merge

*** Test Cases ***
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