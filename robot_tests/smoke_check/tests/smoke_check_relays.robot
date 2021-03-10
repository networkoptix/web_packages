*** Settings ***
Resource      ../smoke_check_resource.robot
Suite Setup    Relays Suite Setup
Suite Teardown    Relays Suite Teardown

*** Keywords ***
Relays Suite Setup
    ${system}=   Setup Docker System    image=4.1_prod    cloud email=${email relay}
    Set Suite Variable    ${system}
    ${relays}=   Get Relays     auth=${cloud auth}
    Set Suite Variable    ${relays}
    Sleep    60

Relays Suite Teardown
    Run keyword and ignore error    Disconnect    ${ENV}    ${email relay}    ${password}    ${system}[id]
    Run keyword and ignore error    Delete Docker Server     ${system}[cont]

*** Test Cases ***
Check All Relays
    ${auth}=   Create List    admin    qweasd 123
    ${retest}=   Create List
    FOR    ${relay}    IN    @{relays}
        ${pingable}=   Run keyword and return status    Ping Server    https://${QABURBANK IP}:${system}[port]    ${auth}
        Run Keyword Unless    ${pingable}    Run Keywords
            ...    Append To List    ${retest}    ${relay}    AND
            ...    Continue For Loop
        ${relay works}=   Run keyword and return status    Get System Settings    ${auth}    https://${system}[id].${relay}
        Run Keyword Unless    ${relay works}    Run Keywords
            ...    Append To List    ${retest}    ${relay}    AND
            ...    Continue For Loop
    END
    FOR    ${relay}    IN    @{retest}
        Run keyword and continue on failure    Get System Settings    ${auth}    https://${system}[id].${relay}
    END
