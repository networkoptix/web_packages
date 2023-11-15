*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud    webadmin    system settings

*** Test Cases ***
19. Check HTTPS traffic encryption
    [Tags]    C65701
    Skip If Image Is    5.0    5.1    5.2    msg=5.0 and above not supported
    Log    Preconditions
    ${settings}=   Create Dictionary    trafficEncryptionForced=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    
    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Change Setting And Save   ${ALLOW ONLY SECURE CHECKBOX}

    Log    Step 2
    Go To    ${server url}
    IF    '${IMAGE}' == '4.2_test'
        Wait until location is    ${server url}/static/index.html#/
    ELSE
        Wait until location is    ${server url}/#/settings
    END

    Log    Step 3
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    trafficEncryptionForced    false
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    videoTrafficEncryptionForced    false

    Log    Step 4
    ${resp}=   Check Connection    ${server url}    verify=False
    Should Be Equal As Strings    ${resp}    200    
    
    Log    Step 5
    Go To    ${env}/systems/${system}[cloud id]
    Wait Until Settings Are Visible
    Change Setting And Save    ${ALLOW ONLY SECURE CHECKBOX}

    Log    Step 6
    Go To    ${server url}
    Run keyword and continue on failure    Wait until location contains    ${server url}

    Log    Step 7
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    trafficEncryptionForced    true
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    videoTrafficEncryptionForced    false

    Log    Step 8
    ${resp}=   Check Connection    ${server url}
    Should Be Equal As Strings    ${resp}    SSL Error

    Log    Step 9
    ${resp}=   Check Connection    ${server url}    verify=False
    Should Be Equal As Strings    ${resp}    200

    Go To    ${ENV}
