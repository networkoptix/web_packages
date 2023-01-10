*** Settings ***
Resource          ../resource.robot
Library    ../NoptixLibrary/GenericKeywords.py

*** Test Cases ***
test1
    ${servserjson}=   Create Systems
    teardown servers    ${servserjson}