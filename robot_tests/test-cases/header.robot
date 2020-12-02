*** Settings ***
Resource             ../resource.robot
Suite Setup          Open Browser and go to URL    ${url}
Test Setup           Restart
Test Teardown        Run Keyword If Test Failed    Open New Browser
Suite Teardown       Close All Browsers

*** Variables ***
${email}                   ${EMAIL OWNER}
${email invalid}           aodehurgjaegir
${password}                ${BASE PASSWORD}
${url}                     ${ENV}
@{auth}                    ${email}    ${password}
@{TMP USERS}

# Misc
${view tab}          ${HEADER TAB WRAPPER}/nx-header-tabs[1]
${first system}      (${SYSTEMS LIST BUTTONS})[1]

*** Keywords ***
Open New Browser
    Close Browser
    Open Browser and go to URL    ${url}

Restart
    Common Restart Logout    ${url}

Login and Wait Until Systems Loaded
    Log In    ${email}    ${password}
    Wait Until Elements are Visible    ${SYSTEMS LIST}    ${SYSTEMS DROPDOWN}

Check Drop Menu Systems Grid System
    [Arguments]    ${system list count}
    Wait Until Element is Visible    ${SYSTEMS DROPDOWN}
    Sleep    1
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element is Visible    ${SYSTEMS GRID}

    FOR    ${width}    ${columns}    ${max systems}    IN ZIP    ${WIDTHS}    ${COLUMNS SHOWN}    ${MAX SYSTEMS SHOWN}
        Set Window Size    ${width}    1080
        ${tiles}=   Get Element Count    ${SYSTEMS GRID TILES}
        ${tiles to show}=   Get Tiles to Show    ${system list count}    ${max systems}
        Should be Equal As Integers    ${tiles}    ${tiles to show}
        ${more systems text}=   Get Text    ${SYSTEMS GRID TILES}/div
        ${show additional button}=   Show Additional    ${tiles}    ${tiles to show}
        ${additional}=   Set Variable If    ${show additional button}    ${tiles} - ${tiles to show}
        ${system grid size}=   Get Element Size    ${SYSTEMS GRID}
        ${system tile size}=   Get Element Size    (${SYSTEMS GRID TILES})[1]
        ${is correct grid}=   Check Grid Size    ${system grid size}[0]    ${system tile size}[0]    ${columns}
        ${systems}=   Set Variable    ${SYSTEMS TITLE TEXT}
        Should be True    ${is correct grid}
        Run Keyword If    ${show additional button}    Should be Equal As Strings    ${more systems text}    + ${additional} ${systems}
    END

    Open New Browser

Check Header Items
    [Arguments]    ${logged in}
    ${hidden elements list}=   Set Variable If    ${logged in}    ${HIDE LOGGED IN}    ${HIDE ANONYMOUS}
    ${hidden elements common}=   Set Variable If    ${logged in}    ${LOGGED IN COMMON}    ${ANONYMOUS COMMON}

    FOR    ${breakpoint}    ${hidden elements}    IN ZIP    ${BREAKPOINTS}    ${hidden elements list}
        ${width}=   Set Variable    ${breakpoint-24}
        Set Window Size    ${width}    1080
        Wait Until Elements Are Not Visible    @{hidden elements}    @{hidden elements common}
    END

    Open New Browser

*** Test Cases ***
Header shows correct items while anonymous, header main button text is correct
    [Tags]    Threadable
    Wait Until Elements Are Visible
    ...    ${LOG IN NAV BAR}
    ...    ${CREATE ACCOUNT HEADER}
    ...    ${HEADER LANGUAGE DROPDOWN}
    ...    ${SYSTEMS DROPDOWN}
    ...    ${HEADER ICON LINK}
    ${logo link url}=   Get Element Attribute    ${HEADER ICON LINK}    href
    Should Be Equal as Strings    ${logo link url}    ${url}/
    ${logo src}=   Get Element Attribute    ${LOGO ICON}    src
    Should Be Equal as Strings    ${logo src}    ${LOGO ICON SOURCE}
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False

Header shows correct items when logged in
    [Tags]    Threadable
    Login and Wait Until Systems Loaded
    Wait Until Elements Are Not Visible    ${LOG IN NAV BAR}    ${CREATE ACCOUNT HEADER}    ${HEADER LANGUAGE DROPDOWN}
    Wait Until Elements Are Visible    ${HEADER ICON LINK}    ${ACCOUNT DROPDOWN}
    ${logo link url}=   Get Element Attribute    ${HEADER ICON LINK}    href
    Should Be Equal as Strings    ${logo link url}    ${url}/systems
    ${logged in email}=   Get Text    ${ACCOUNT DROPDOWN}
    Should be Equal as Strings    ${logged in email}    ${email}

As anonymous logo goes to landing page
    [Tags]    Threadable
    Go to    ${url}/register
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${url}/

As logged in with one system user goes to view for that system
    ${random email}=  Register and activate account with random email    firstname    lastname    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${random email}
    Log In    ${random email}    ${password}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${AUTO TESTS}    systems=False
    Slow    Go to    ${url}/account    timeout=3
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${VIEW PAGE}

As logged in with more than 1 system, logo goes to systems page
    [Tags]    Threadable
    Log In    ${email}    ${password}
    Go to    ${url}/account
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${url}/systems

On systems page, header should show number of systems
    [Tags]    Threadable
    Login and Wait Until Systems Loaded
    ${systems}=   Set Variable    ${SYSTEMS TITLE TEXT}
    ${system count}=   Get Element Count    ${SYSTEMS LIST BUTTONS}
    ${header count}=   Get Text    ${SYSTEMS DROPDOWN}/span
    Should be Equal As Strings    ${system count} ${systems}    ${header count}
    Check Drop Menu Systems Grid System    ${system count}

    #TODO: merge tests for number of systems from header-func

On system page, header should show current system name
    [Tags]    Threadable
    Login and Wait Until Systems Loaded
    ${system list count}=   Get Element Count    ${SYSTEMS LIST BUTTONS}
    ${systems to check}=   Systems to Check    ${system list count}

    FOR    ${i}    IN RANGE    1    ${systems to check}
        ${next system tile}=   Set Variable    (${SYSTEMS GRID TILES})[${i}]
        Wait Until Element is Visible    ${SYSTEMS DROPDOWN}
        Click Element    ${SYSTEMS DROPDOWN}
        Wait Until Element is Visible    ${next system tile}
        Click Element    ${next system tile}
        Wait Until Element is Visible    ${SYSTEM NAME HEADING}

        ${system name text}=   Get Text    ${SYSTEM NAME HEADING}
        Validate Header Button Text    ${system name text}    systems=False
        Validate Active Tab Text    ${SETTINGS TEXT}
    END

    Check Drop Menu Systems Grid System    ${system list count}

On another page in the navigation grid, header should show tile's name, active pages are higlighted in header
    [Tags]    Threadable
    Login and Wait Until Systems Loaded

    FOR    ${page}    IN    @{for developers int pages}
        Go To    ${page}[url]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Validate Active Tab Text    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    END

    FOR    ${page}    IN    @{services pages}
        Go To    ${page}[url]
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Validate Active Tab Text    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}
    END

Links in navigation grid lead to proper pages, active pages are highlighted in menu
    Login and Wait Until Systems Loaded

    Set Test Variable   ${sys id}    ${AUTO TESTS SYSTEM ID}
    Go To    ${url}/systems/${sys id}

    Wait Until Element is Visible    ${SYSTEMS DROPDOWN}
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.5
    Validate Navigation Grid Tile    ${AUTO TESTS}    ${system pages}
    Validate Active Navigation Item    ${SETTINGS TEXT}

    # System tile
    FOR   ${page}    IN    @{system pages}
        Click Element    ${NAVIGATION LINK}//span[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${AUTO TESTS}    systems=False
        Wait Until Element is Visible    ${SYSTEMS DROPDOWN}
        Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.5
        Validate Active Navigation Item    ${page}[title]
    END

    # For developers tile
    FOR   ${page}    IN    @{for developers int pages}
        Click Element    ${NAVIGATION LINK}//span[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.25
        Validate Active Navigation Item    ${page}[title]
    END
    #TODO: add external For Developers links

    # Services tile
    FOR   ${page}    IN    @{services pages}
        Click Element    ${NAVIGATION LINK}//span[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.25
        Validate Active Navigation Item    ${page}[title]
    END

    #TODO: add External Links

Different page widths and header interaction while anonymous
    [Tags]    Threadable
    Go To    ${knowledge base}[url]
    Check Header Items    False

Different page widths and header interaction while logged in
    [Tags]    Threadable
    Login and Wait Until Systems Loaded
    Go To   ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${view tab}
    Click Element    ${view tab}
    Check Header Items    True

Different page width with main button opened
    [Tags]    Threadable
    Login and Wait Until Systems Loaded
    ${system list count}=   Get Element Count    ${SYSTEMS LIST BUTTONS}
    # The go to account can be removed once the systems/settings page gets updated, currently it has a forced viewport width
    Go To    ${url}/account
    Check Drop Menu Systems Grid System    ${system list count}
