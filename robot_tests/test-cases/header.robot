*** Settings ***
Resource          ../resource.robot
Suite Setup       Header Suite Setup
Test Setup        Header Test Setup
Suite Teardown    Header Suite Teardown

*** Test Cases ***
# Anonymous user
Anonymous: Header shows correct items
    [Tags]    threadable    anon
    Wait Until Elements Are Visible
    ...    ${LOG IN NAV BAR}
    ...    ${CREATE ACCOUNT HEADER}
    ...    ${HEADER LANGUAGE DROPDOWN}
    ...    ${SYSTEMS DROPDOWN}
    ...    ${HEADER ICON LINK}
    ${logo link url}=   Get Element Attribute    ${HEADER ICON LINK}    href
    Should Be Equal as Strings    ${logo link url}    ${ENV}/
    ${logo src}=   Get Element Attribute    ${LOGO ICON}    src
    Should Be Equal as Strings    ${logo src}    ${LOGO ICON SOURCE}
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False

Anonymous: Logo goes to landing page
    [Tags]    threadable    anon
    Go to    ${ENV}/register
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/

Anonymous: Header button text is correct
    [Tags]    threadable    anon
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False

Anonymous: Clicking on the main header button closes the dropdown
    [Tags]    threadable    anon
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Wait until element is visible    ${EXTERNAL LINKS HEADER}
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}

    Click Element    ${SYSTEMS DROPDOWN}
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}
    Press Keys    //body    ENTER
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}
    Click Element    ${LARGE CREATE ACCOUNT BUTTON}
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

Anonymous: Clicking outside the dropdown closes it
    [Tags]    threadable    anon
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False

Anonymous: Different page widths
    [Tags]    threadable    anon    ui
    Go To    ${knowledge base}[url]
    Check Header Items    False


# User has no systems connected to cloud
No systems: Header button text is correct
    [Tags]    threadable    no_sys
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    0    systems=True

No systems: Logo goes to landing page
    [Tags]    threadable    no_sys
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    0    systems=True
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/systems

No systems: Check Dropdown Content
    [Tags]    threadable    no_sys
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    0    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Wait until element is visible    ${EXTERNAL LINKS HEADER}
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}

No systems: Different page widths
    [Tags]    threadable    no_sys    ui
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Validate Header Button Text    0    systems=True

    Check Header Items    True

# User has one system connected to cloud
One system: Logo goes to view for that system
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/systems/${main system}[id]/view

One system: Header button displays the system name
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False

One system: Check Dropdown content
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Wait until element is visible    ${EXTERNAL LINKS HEADER}
    Validate System Navigation Tile    ${main system}[name]    active link=${SETTINGS TEXT}
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}

One system: Check header links - System
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False
    # Settings page is loaded after logging in
    Validate Active Header Link    ${SETTINGS TEXT}
    Click Element    ${SYSTEMS DROPDOWN}
    Validate System Navigation Tile    ${main system}[name]    active link=${SETTINGS TEXT}

    ${tabs names}=   Create List    ${VIEW}    ${SETTINGS TEXT}    ${INFORMATION TEXT}
    ${tabs links}=   Create List    ${VIEW TAB}    ${SETTINGS TAB}    ${INFORMATION TAB}
    FOR    ${name}    ${link}    IN ZIP    ${tabs names}     ${tabs links}
        Click Link    ${link}
        Validate Header Button Text    ${main system}[name]    systems=False
        Validate Active Header Link    ${name}
        Click Element    ${SYSTEMS DROPDOWN}
        Validate System Navigation Tile    ${main system}[name]    active link=${name}
    END

One system: Check header links - For Developers
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Go To    ${ENV}/docs/developers
    Wait Until Element Is Visible    //h1[contains(text(), "${DEVELOP WITH NX META TEXT}")]
    Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
    Validate Active Header Link    ${PLATFORM OVERVIEW TEXT}

    FOR    ${page}    IN    @{for developers int pages}
        Click Link    ${HEADER TAB LINK}\[contains(text(), "${page}[title]")]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}    active link=${page}[title]
    END

One system: Check header links - Services
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Go To    ${ENV}/download
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${SERVICES TEXT}    systems=False
    Validate Active Header Link    ${DOWNLOADS TEXT}

    FOR    ${page}    IN    @{services pages}
        Click Link    ${HEADER TAB LINK}\[contains(text(), "${page}[title]")]
        Sleep   1
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
    END

One system: Check navigation links - System
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page text}    IN    ${VIEW}    ${SETTINGS TEXT}    ${INFORMATION TEXT}
        Click Link    //h5[contains(text(), "${main system}[name]")]/../following-sibling::ul//a[contains(text(), "${page text}")]
        Validate Header Button Text    ${main system}[name]    systems=False
        Validate Active Header Link    ${page text}
        Click Element    ${SYSTEMS DROPDOWN}
        Validate System Navigation Tile    ${main system}[name]    active link=${page text}
    END

One system: Check navigation links - For Developers
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page}    IN    @{for developers int pages}
        Click Element    //h5[contains(text(), "${FOR DEVELOPERS TEXT}")]/../following-sibling::ul//a[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}    active link=${page}[title]
    END

One system: Check navigation links - Services
    [Tags]    threadable    one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page}    IN    @{services pages}
        Click Element    //h5[contains(text(), "${SERVICES TEXT}")]/../following-sibling::ul//a[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}    active link=${page}[title]
    END

One System: Different page widths
    [Tags]    threadable    one_sys    ui
    Log in to user and system    ${one system owner}    ${main system}[id]
    Verify In System    ${main system}[name]
    Wait Until Element is Visible    ${VIEW TAB}
    Click Element    ${VIEW TAB}
    Check Header Items    True


# User has many systems connected to cloud
Many systems: Logo goes to Systems page
    [Tags]    threadable    many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/systems

Many systems: Header button displays number of systems
    [Tags]    threadable    many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Validate Header Button Text    16    systems=True

Many systems: Check dropdown content if 16 or less systems
    [Tags]    threadable    many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Validate Header Button Text    16    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}
    Wait Until Elements Are Not Visible    ${EXTRA SYSTEM TILE}
    FOR    ${sys}    IN    @{offline systems}
        Validate System Info Tile    ${sys}[name]    Many Systems
    END

Many systems: Check dropdown content if 17 or more systems
    [Tags]    threadable    many_sys   CLOUD-6778
    Share    ${auth}    ${main system}[id]    ${access roles}[admin]    ${many systems owner}
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Run keyword and continue on failure    Validate Header Button Text    17    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Log    Check all tiles in Systems grid
    ${grid systems}=   Get systems names from Systems grid
    FOR    ${sys}    IN    @{grid systems}
        Run Keyword If    '''${sys}''' == '''${main system}[name]'''    Validate System Info Tile    ${sys}    One System
           ...    ELSE    Validate System Info Tile    ${sys}    Many Systems
    END

    Log    Online system is displayed first in Systems Grid and shown in Navigation grid
    Should be Equal As Strings    ${grid systems}[0]    ${main system}[name]
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}//h5[contains(text(), "${main system}[name]")]

    Log    Extra Systems tile is displayed, shows correct number and leads to Systems page
    Run keyword and continue on failure    Verify extra systems number is correct    2
    Click Element    ${EXTRA SYSTEM TILE}
    Validate on Systems Page    search=True

Many systems: Links in Systems grid lead to proper pages
    [Tags]    threadable    many_sys
    Add user to cloud system if not there    ${main system}[id]    ${access roles}[admin]    ${many systems owner}    ${auth}

    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    ${grid systems}=   Get systems names from Systems grid
    FOR    ${sys}    IN    @{grid systems}
        Click Element    //div[contains(@class, "system-info")]/span[contains(text(), "${sys}")]
        Wait Until Element Is Visible    //h2[contains(text(), "${sys}")]
        Validate Header Button Text    ${sys}    systems=False
        Click Element    ${SYSTEMS DROPDOWN}
        Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}
        Validate System Navigation Tile    ${sys}    active link=${SETTINGS TEXT}
    END

Many systems: Different page widths
    [Tags]    threadable    diff_width    ui
    Add user to cloud system if not there    ${main system}[id]    ${access roles}[admin]    ${many systems owner}    ${auth}
    Log in to user and system    ${many systems owner}    ${main system}[id]
    Verify In System    ${main system}[name]

    Wait Until Element is Visible    ${VIEW TAB}
    Click Element    ${VIEW TAB}
    Run keyword and continue on failure    Check Header Items    True

    ${system list count}=   Get Element Count    ${SYSTEMS LIST BUTTONS}
    Go To    ${ENV}/account
    Check Drop Menu Systems Grid System    ${system list count}


# Other cases
Check header and dropdown content for not admins
    [Tags]    threadable    other    CLOUD-6794
    FOR    ${user}    IN    @{main system users}
        Log in to user and system    ${user}    ${main system}[id]
        Verify In System    ${main system}[name]    editable=False
        Validate Header Button Text    ${main system}[name]    systems=False
        Wait Until Element Is Not Visible    ${INFORMATION TAB}
        Click Element    ${SYSTEMS DROPDOWN}

        Wait until elements are visible
            ...    ${DROPDOWN NAVIGATION GRID}
            ...    //h5[contains(text(), "${main system}[name]")]/../following-sibling::ul//a[contains(text(), "${SETTINGS TEXT}")]
            ...    //h5[contains(text(), "${main system}[name]")]/../following-sibling::ul//a[contains(text(), "${VIEW}")]
        Wait until elements are not visible
            ...    ${DROPDOWN SYSTEMS GRID}
            ...    ${INFORMATION TAB}
            ...    //h5[contains(text(), "${main system}[name]")]/../following-sibling::ul//a[contains(text(), "${INFORMATION TEXT}")]

        Log Out
    END

Check external links - For Developers
    [Tags]    threadable    other
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}
    Wait Until Element Is Not Visible    ${DROPDOWN SYSTEMS GRID}
    ${links names}=   Get External Links Names   ${FOR DEVELOPERS TEXT}
    FOR    ${name}    IN    @{links names}
        ${actual url}=   Get Element Attribute    ${FOR DEVELOPERS LINK}\[contains(text(), "${name}")]    href
        Set Local variable    ${expected url}        ${FOR DEVS EXTERNAL LINKS["${name}"]}
        Run keyword and continue on failure    Should Be Equal As Strings    ${actual url}    ${expected url}
    END


Check External links
    [Tags]    threadable    other
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}
    Wait Until Element Is Not Visible    ${DROPDOWN SYSTEMS GRID}
    ${links names}=   Get External Links Names   ${EXTERNAL LINKS TEXT}
    FOR    ${name}    IN    @{links names}
        ${actual url}=   Get Element Attribute    ${EXTERNAL LINK}\[contains(text(), "${name}")]    href
        Set Local Variable    ${expected url}    ${EXTERNAL LINKS["${name}"]}
        Run keyword and continue on failure    Should Be Equal As Strings    ${actual url}    ${expected url}
    END
