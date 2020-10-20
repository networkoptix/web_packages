*** Settings ***
Resource         ../smoke_check_resource.robot
Suite Setup    Merge Suite Setup
Suite Teardown    Merge Suite Teardown


*** Keywords ***
Merge Suite Setup
    ${merge owner}=   Get Random Email    ${email base}
    Register and activate account    SmokeCheck    MergeOwner    ${merge owner}    ${password}
    Set Suite Variable    ${merge owner}    ${merge owner}

    ${merge 1}=   Setup Remote System    ${ssh auth}    ciqa    merge1    ${ssh host ip}    ${merge 1 port}
    Set Suite Variable    ${merge 1}    ${merge 1}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${merge 1}[ip]:${merge 1}[port]    ${merge 1}[name]    ${merge owner}    ${password}    ${ENV}
    Set To Dictionary    ${merge 1}    cloud id=${cloud id}

    ${merge 2}=   Setup Remote System    ${ssh auth}    ciqa    merge2    ${ssh host ip}    ${merge 2 port}
    Set Suite Variable    ${merge 2}    ${merge 2}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${merge 2}[ip]:${merge 2}[port]    ${merge 2}[name]    ${merge owner}    ${password}    ${ENV}
    Set To Dictionary    ${merge 2}    cloud id=${cloud id}

    ${systems}=   Get Account Systems    ${ENV}    ${merge owner}    ${password}
    ${sys 1 connected}=   Run keyword and return status    Should Contain    ${systems}    ${merge 1}[cloud id]
    ${sys 2 connected}=   Run keyword and return status    Should Contain    ${systems}    ${merge 2}[cloud id]
    Run Keyword Unless    $sys_1_connected and $sys_2_connected    Fatal Error    One or more system is not connected to cloud
    Sleep   60

Merge Suite Teardown
    Acquire Lock    teardown_lock
    Open Connection    ${ssh host ip}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    Execute Command    docker rm -f ${merge 1}[cont] ${merge 2}[cont]
    Close All Connections
    Release Lock    teardown_lock

*** Test Cases ***
Merge two cloud systems
    Merge Cloud Systems    ${ENV}    ${merge 1}[cloud id]    ${merge 2}[cloud id]    ${merge owner}    ${password}


