*** Settings ***
Resource          ../Resources/front-end-resources/systems-page-resource.robot
Suite Setup       Systems Page Suite Setup
Test Setup        Systems Page Test Setup
Test Teardown     QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    Systems Page Suite Teardown
Force Tags        system    cloud

*** Test Cases ***
1. System tiles represent actual information
    [Tags]    C41893    threaded
    Log in    ${system}[owner]    ${base password}
    Validate on Systems Page
    Validate Tile    ${system}[name]    ${YOUR SYSTEM TEXT}
    Validate Tile    ${extra system}[name]    Another Owner
    FOR    ${sys}    IN    @{offline systems}
        Validate Tile    ${sys}[name]    ${YOUR SYSTEM TEXT}    offline=True
    END
    Verify Number Of Tiles Is Correct    9

2. Should show the no systems connected message when you have no systems
    [Tags]    C41866    threaded
    Log In    ${no sys user}    ${base password}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Validate Header Button Text    0

3. Should show the system page instead of all systems when user only has one
    [Tags]    C41878    threaded
    Log In    ${extra system}[owner]    ${base password}
    Wait until Location Is    ${ENV}/systems/${extra system}[cloud id]
    Validate Header Button Text    ${extra system}[name]    systems=False

4. Should open system page when clicked on system
    [Tags]    C41893    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page
    Click Element    //h2[contains(text(), "${system}[name]")]
    Verify In System    ${system}[name]
    Validate Header Button Text    ${system}[name]    systems=False

5. Should show your system for owner and owner name for non-owners
    [Tags]    C41893    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page
    Validate Tile    ${system}[name]    ${YOUR SYSTEM TEXT}
    Validate Tile    ${extra system}[name]    Another Owner

6. Search should highlight system name
    [Tags]    C41891    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page

    Log    Search for the system and check ther result
    Input Text    ${SYSTEMS SEARCH INPUT}    ${system}[name]
    Page Should Contain    ${FOUND TEXT}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${system}[name]"]
    Verify Number Of Tiles Is Correct    1

    Log    Clear input, search for another system and check the result
    Click Button    ${SYSTEM SEARCH X BUTTON}
    Wait Until Element Is Visible    ${SYSTEMS SEARCH INPUT}
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    ${EMPTY}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${extra system}[name]
    Page Should Contain    ${FOUND TEXT}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${extra system}[name]"]
    Verify Number Of Tiles Is Correct    1

7. Search should highlight owner name
    [Tags]    C41891    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page
    Input Text    ${SYSTEMS SEARCH INPUT}    Another Owner
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="Another Owner"]
    Verify Number Of Tiles Is Correct    1

8. Search can be cleared by x button
    [Tags]    C41891    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page
    Verify Number Of Tiles Is Correct    9

    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    ${EMPTY}
    Input Text    ${SYSTEMS SEARCH INPUT}    Not Existing
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    Not Existing
    Verify Number Of Tiles Is Correct    0
    Wait Until Element Is Visible    ${SYSTEM SEARCH X BUTTON}
    Click Button    ${SYSTEM SEARCH X BUTTON}
    Wait Until Element Is Visible    ${SYSTEMS SEARCH INPUT}
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    ${EMPTY}
    Verify Number Of Tiles Is Correct    9

9. Searching for owner email should only show systems with that owner
    [Tags]    C41891    threaded
    Log In    ${system}[owner]    ${base password}
    Validate on Systems Page
    Input Text    ${SYSTEMS SEARCH INPUT}    ${system}[owner]
    Verify Number Of Tiles Is Correct    8
    Run Keyword and Expect Error    *    Validate Tile    ${extra system}[name]    Another Owner

10. Should open systems page in anonymous state
    [Tags]    threaded
    Go To    ${ENV}/systems
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Log In    ${system}[owner]    ${base password}    button=None  api=${False}

11. Should update owner name in systems list, if it's changed
    [Tags]    threaded
    Set Account Name    ${extra system}[owner]    ${base password}    newFirstName    newLastName

    Log In    ${system}[owner]     ${base password}
    Go To    ${ENV}/systems
    Validate on Systems Page
    Validate Tile    ${extra system}[name]    newFirstName newLastName

12. Search should only be visible with 9 or more systems
    [Tags]    C41890
    Disconnect from account    ${system}[owner]    ${base password}    ${extra system}[cloud id]
    Log In    ${system}[owner]    ${base password}
    Go To    ${ENV}/systems
    Validate on Systems Page    search=False
    Verify Number Of Tiles Is Correct    8
