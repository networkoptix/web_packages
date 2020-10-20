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
    Acquire Lock    setup_lock
    Open Connection    ${ssh host ip}    alias=${ssh host alias}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    ${cont id}=   Execute Command    docker run -d --name ${system name} --restart=always -p ${port}:7001 -t ${IMAGE}
    Set To Dictionary    ${system}    cont=${cont id}
#    If port is not specified, it might change after restarting the server
#    ${port str}=   Execute Command    docker port "${system name}" 7001
#    @{port str split}=   Split String    ${port str}    :
#    Set To Dictionary    ${system}    port=${port str split}[1]
    Setup Local System    https://${ssh host ip}:${system}[port]    ${password}    ${system name}
    Close All Connections
    Release Lock    setup_lock
    [Return]    ${system}
