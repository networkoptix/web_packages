*** Settings ***
Resource          ../resource.robot
Resource          ../APIresource.robot

*** Variables ***

${email}    qaburbank@gmail.com
${password}    QWEasd!@#
@{auth}    ${email}    ${password}
${url}    ${ENV}
${system id}    e463fb9a-c26a-4ebb-b3e5-2e8170a647af

*** Test Cases ***
Test "Disconnnect System From Cloud"
    Disconnnect System From Cloud    ${auth}    ${system id}
