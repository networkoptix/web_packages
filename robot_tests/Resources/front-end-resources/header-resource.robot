*** Settings ***
Resource          ../../resource.robot
Resource          systems-page-resource.robot

*** Keywords ***
# Setups & Teardowns
Header Suite Setup
    Open Browser and go to URL    ${ENV}

    ${zero systems owner}=   Register and activate account with random email    No    Systems    ${BASE PASSWORD}
    Set Suite Variable    ${zero systems owner}
    Sleep    0.5
    ${one system owner}=   Register and activate account with random email    One    System    ${BASE PASSWORD}
    Set Suite Variable    ${one system owner}
    Sleep    0.5
    ${many systems owner}=   Register and activate account with random email    Many    Systems    ${BASE PASSWORD}
    Set Suite Variable    ${many systems owner}
    FOR    ${user}    IN    ${zero systems owner}    ${one system owner}    ${many systems owner}
        Append To List    ${HEADER TMP USERS}    ${user}
    END

    ${rand}=   Generate Random String      length=5
    ${main system}=   Create Base System    header_main_sys_${rand}    owner=${one system owner}
    Set Suite Variable    ${main system}

    Run Keyword If   '''${mode}''' == '''webadmin'''    Pass Execution    Webadmin mode: suite setup finished
    ${offline systems}=   Create List
    ${rand}=   Generate Random String      length=5
    FOR    ${i}    IN RANGE    1    17
        ${system}=   Create Base System    header_offline_system_${rand}_${i}    owner=${many systems owner}    add users=${False}
        Sleep    2
        Append To List    ${offline systems}    ${system}
        Delete Docker Server    ${system}[id]
    END
    Set Suite Variable    ${offline systems}

Header Suite Teardown
    Close All Browsers
    Delete Base System    ${main system}
    Run Keyword If   '''${mode}''' == '''webadmin'''    Pass Execution    Webadmin mode tests complete
    FOR    ${system}    IN    @{offline systems}
        Delete Base System    ${system}
    END

Header Test Setup
    Skip If Irrelevant
    Set Window Size    1920    1080

Header Test Teardown
    Skip If Irrelevant
    Close Modal If There
    ${logged in}=   Run keyword and return status    Wait until element is visible    ${ACCOUNT DROPDOWN}    timeout=5
    Run Keyword If    ${logged in}    Log Out


Validate Active Header Link
    [Arguments]    ${link text}
    Wait until element is visible    ${HEADER ACTIVE TAB LINK}
    ${active tab text}=   Get Text    ${HEADER ACTIVE TAB LINK}
    ${active tab text}=   Evaluate    $active_tab_text.strip()
    Should Be Equal As Strings    ${active tab text}    ${link text}


# Systems Grid
Validate System Info Tile
    # System's tile in Systems Grid
    [Arguments]    ${system name}    ${owner name}    #${online}=${True}
    Wait until element is visible    ${DROPDOWN SYSTEMS TILE}//div[@class="system-info"]//span[@class="system-name" and contains(text(), "${system name}")]    timeout=5
    ${owner txt}=   Get Text    ${DROPDOWN SYSTEMS TILE}//div[@class="system-info"]//span[@class="system-name" and contains(text(), "${system name}")]/following-sibling::span[@class="owner"]
    Should contain    ${owner txt}    ${OWNER TEXT}    ${owner name}

Verify extra systems number is correct
    [Arguments]    ${expected number}
    ${tiles text}=   Get Text    ${EXTRA SYSTEM TILE}
    Should be equal as strings    +${SPACE}${expected number}${SPACE}${SYSTEMS TITLE TEXT}    ${tiles text}

Get systems names from Systems grid
    ${names}=   Create List
    ${all tiles}=   Get WebElements    //nx-system-tile//div[contains(@class, "system-info")]/span[contains(@class, "system-name")]
    FOR    ${tile}    IN    @{all tiles}
        ${name}=   Get Text    ${tile}
        Append To List    ${names}    ${name}
    END
    [Return]    ${names}


# Navigation Grid
Validate System Navigation Tile
    [Arguments]    ${system name}    ${active link}=${None}
    Wait until elements are visible
    ...    //h5[text()="${system name}"]/../..//following-sibling::ul//a[contains(text(), "${VIEW}")]
    ...    //h5[text()="${system name}"]/../../following-sibling::ul//a[contains(text(), "${SETTINGS TEXT}")]
    ...    //h5[text()="${system name}"]/../../following-sibling::ul//a[contains(text(), "${INFORMATION TEXT}")]
    Run keyword if    $active_link    Wait until element is visible    //h5[text()="${system name}"]/../../following-sibling::ul/li[contains(@class, "selected")]/a[contains(text(), "${active link}")]

Validate Navigation Grid Tile
    [Arguments]    ${tile header}    ${tile pages}    ${active link}=${None}
    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}//h5[text()="${tile header}"]
    FOR    ${page}    IN    @{tile pages}
        ${page title}=   Evaluate    $page['title'].strip()
        Wait until element is visible    ${DROPDOWN NAVIGATION GRID}//h5[text()="${tile header}"]/../../following-sibling::ul//a[contains(text(), "${page}[title]")]
    END
    Run Keyword If    $active_link    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}//h5[text()="${tile header}"]/../../following-sibling::ul/li[contains(@class, "selected")]//a[contains(text(), "${active link}")]

Get External Links Names
    [Arguments]    ${section title}
    ${links names}=   Create List
    ${links}=   Get WebElements    ${DROPDOWN NAVIGATION TILE}//h5[contains(text(), "${section title}")]/../../following-sibling::ul//a[@target="_blank"]
    FOR    ${link}    IN    @{links}
        ${text}=   Get Text    ${link}
        ${text}=   Strip String    ${text}
        Append To List    ${links names}    ${text}
    END
    [Return]    ${links names}


# UI
Check Drop Menu Systems Grid System
    [Arguments]    ${system list count}
    Wait Until Element is Visible    ${SYSTEMS DROPDOWN}
    Slow    Click Element    ${SYSTEMS DROPDOWN}    timeout=2
    Wait Until Element is Visible    ${DROPDOWN SYSTEMS GRID}

    FOR    ${width}    ${columns}    ${max systems}    IN ZIP    ${WIDTHS}    ${COLUMNS SHOWN}    ${MAX SYSTEMS SHOWN}
        Set Window Size    ${width}    1080
        Sleep    1
        ${tiles}=   Get Element Count    ${SYSTEMS GRID TILES}
        ${tiles to show}=   Get Tiles to Show    ${system list count}    ${max systems}
        Should be Equal As Integers    ${tiles}    ${tiles to show}
        ${show additional}=   Show Additional    ${tiles}    ${tiles to show}
        ${additional}=   Set Variable If    ${show additional}    ${tiles} - ${tiles to show}
        ${system grid size}=   Get Element Size    ${SYSTEMS GRID}
        ${system tile size}=   Get Element Size    (${SYSTEMS GRID TILES})[1]
        ${is correct grid}=   Check Grid Size    ${system grid size}[0]    ${system tile size}[0]    ${columns}
        Should be True    ${is correct grid}
        Run Keyword If    ${show additional}    Verify extra systems number is correct    ${additional}
    END

Check Header Items
    [Arguments]    ${logged in}
    ${hidden elements list}=   Set Variable If    ${logged in}    ${HIDE LOGGED IN}    ${HIDE ANONYMOUS}
    ${hidden elements common}=   Set Variable If    ${logged in}    ${LOGGED IN COMMON}    ${ANONYMOUS COMMON}

    FOR    ${breakpoint}    ${hidden elements}    IN ZIP    ${BREAKPOINTS}    ${hidden elements list}
        ${width}=   Set Variable    ${breakpoint - 24}
        Set Window Size    ${width}    1080
        Wait Until Elements Are Not Visible    @{hidden elements}    @{hidden elements common}
    END
