*** Settings ***
Resource            ../resource.robot
Suite Teardown      DockerApi.Prune Containers
Force Tags          WIP

*** Test Cases ***
Docker Api Test
    ${ports} =    Create List         50369   50387
    ${mac} =    Get Random Mac
    ${random} =    Generate Random String   length=5
    ${name} =   Set Variable   ${SUITE_NAME}_${random}_0    
    ${id} =    Create Container      ${ports}     ${mac}    ${name}
    Sleep   1
    DockerApi.Start Container    ${id}
    Sleep   1
    ${list} =    List Containers
    Should Not Be Empty    ${list}
    DockerApi.Stop Container    ${id}
    Sleep   1
    ${list} =    List Containers
    Should Be Empty    ${list}
    DockerApi.Start Container    ${id}
    Sleep   1
    ${list} =    List Containers
    Should Not Be Empty    ${list}
    DockerApi.Delete Container    ${id}
    Sleep   1
    ${list} =    List Containers
    Should Be Empty    ${list}
