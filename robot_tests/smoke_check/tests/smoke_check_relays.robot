*** Settings ***
Resource      ../smoke_check_resource.robot
Suite Setup    Relays Suite Setup
Suite Teardown    Relays Suite Teardown
Force Tags    relays

*** Keywords ***
Relays Suite Setup
    ${system}=   Create Base System    test_relays    image=${IMG}    owner=${email relay}    add users=${False}
    Set Suite Variable    ${system}
    ${relays}=   Get Relays     auth=${cloud auth}
    Set Suite Variable    ${relays}
    Sleep    60

Relays Suite Teardown
    Delete Base System     ${system}


*** Test Cases ***
Check All Relays
    ${auth}=   Create List    admin    qweasd 123
    ${retest}=   Create List
    FOR    ${relay}    IN    @{relays}
        ${pingable}=   Run keyword and return status    Ping Server    https://${QABURBANK IP}:${system}[port]    ${auth}
        IF    ${pingable} == ${False}
            Append To List    ${retest}    ${relay}
            Continue For Loop
        END
        ${relay works}=   Run keyword and return status    Get System Settings    ${auth}    https://${system}[id].${relay}
        IF    ${relay works} == ${False}
            Append To List    ${retest}    ${relay}
            Continue For Loop
        END
    END
    FOR    ${relay}    IN    @{retest}
        Run keyword and continue on failure    Get System Settings    ${auth}    https://${system}[id].${relay}
    END
