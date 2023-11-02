*** Settings ***
Resource          ../Resources/front-end-resources/systems-page-resource.robot
Suite Setup       Systems Page Suite Setup
Test Setup        Systems Page Test Setup
Test Teardown     QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    Systems Page Suite Teardown
Force Tags        system    cloud

*** Test Cases ***

9. Searching for owner email should only show systems with that owner
    [Tags]    C41891    threaded
    Log In    ${system}[cloudOwner]    ${base password}    api=${False}
    Validate on Systems Page
    Input Text    ${SYSTEMS SEARCH INPUT}    ${system}[cloudOwner]
    Verify Number Of Tiles Is Correct    8
    Run Keyword and Expect Error    *    Validate Tile    ${extra system}[name]    Another Owner
