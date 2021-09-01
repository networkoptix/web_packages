*** Settings ***
Resource     ../resource.robot
Resource     ../APIresource.robot
Resource     ../variables.robot
Resource     smoke_check_variables.robot
Variables    get_variables.py    ${ENV}    ${VMS}

*** Keywords ***
Setup Remote System
    [Arguments]    ${ssh auth}    ${ssh host alias}    ${system name}    ${ssh host ip}    ${port}
    ${system}=    Create Dictionary
    Set To Dictionary    ${system}    name=${system name}    ip=${ssh host ip}    port=${port}
    ${mac}=   Get Random MAC
    Run Keyword If    '4.3' not in $img   Set Local Variable   ${vms}    old
    ...    ELSE   Set Local Variable    ${vms}    new

    Acquire Lock    setup_lock
    Open Connection    ${ssh host ip}    alias=${ssh host alias}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    ${cont id}=   Execute Command    docker run -d --name ${system name} --restart=always --mac-address=${mac} -e vms=${vms} -p ${port}:7001 -t ${IMAGE}
    Set To Dictionary    ${system}    cont=${cont id}
    Setup Local System    https://${ssh host ip}:${system}[port]    ${password}    ${system name}
    Close All Connections
    Release Lock    setup_lock

    [Return]    ${system}
