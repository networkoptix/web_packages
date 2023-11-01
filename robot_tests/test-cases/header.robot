*** Settings ***
Resource          ../Resources/front-end-resources/header-resource.robot
Suite Setup       Header Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Header Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop         Header Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Header Suite Teardown
Force Tags        cloud

*** Test Cases ***
# User has many systems connected to cloud
19. Many systems: Logo goes to Systems page
    [Tags]        many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Go to    ${ENV}/systems/${main system}[cloud id]
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/systems

20. Many systems: Header button displays number of systems
    [Tags]        many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Validate Header Button Text    16    systems=True

21. Many systems: Check dropdown content if 16 or less systems
    [Tags]        many_sys
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Validate Header Button Text    16    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}
    Wait Until Elements Are Not Visible    ${EXTRA SYSTEM TILE}
    FOR    ${sys}    IN    @{offline systems}
        Validate System Info Tile    ${sys}[name]    Many Systems
    END

22. Many systems: Check dropdown content if 17 or more systems
    [Tags]        many_sys   CLOUD-6778
    Share    ${main system}[cloud auth]    ${main system}[cloud id]    ${access roles}[admin]    ${many systems owner}      ${permissions}[cloudAdmin]
    Log In    ${many systems owner}    ${BASE PASSWORD}
    Reload Page    # User doesn't see the system shared with them without reloading the page
    Validate on Systems Page    search=True
    Run keyword and continue on failure    Validate Header Button Text    17    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Log    Check all tiles in Systems grid
    ${grid systems}=   Get systems names from Systems grid
    FOR    ${sys}    IN    @{grid systems}
        IF    '''${sys}''' == '''${main system}[name]'''
            Validate System Info Tile    ${sys}    One System
        ELSE
            Validate System Info Tile    ${sys}    Many Systems
        END
    END

    Log    Online system is displayed first in Systems Grid and shown in Navigation grid
    Should be Equal As Strings    ${grid systems}[0]    ${main system}[name]
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}//h5[contains(text(), "${main system}[name]")]

    Log    Extra Systems tile is displayed, shows correct number and leads to Systems page
    Run keyword and continue on failure    Verify extra systems number is correct    2
    Click Element    ${EXTRA SYSTEM TILE}
    Validate on Systems Page    search=True

23. Many systems: Links in Systems grid lead to proper pages
    [Tags]        many_sys
    Add user to cloud system if not there    ${main system}[cloud id]    ${access roles}[admin]    ${many systems owner}    ${main system}[cloud auth]

    Log In    ${many systems owner}    ${BASE PASSWORD}
    Validate on Systems Page    search=True
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    ${grid systems}=   Get systems names from Systems grid
    FOR    ${sys}    IN    @{grid systems}
        Click Element    //div[contains(@class, "system-info")]/span[contains(text(), "${sys}")]
        Wait Until Element Is Visible    //span[contains(text(), "${sys}")]
        Validate Header Button Text    ${sys}    systems=False
        Click Element    ${SYSTEMS DROPDOWN}
        Wait Until Elements Are Visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}
        Validate System Navigation Tile    ${sys}    active link=${SETTINGS TEXT}
    END

24. Many systems: Different page widths
    [Tags]        diff_width    ui
    Add user to cloud system if not there    ${main system}[cloud id]    ${access roles}[admin]    ${many systems owner}    ${main system}[cloud auth]
    Log in to user and system    ${many systems owner}    ${main system}[cloud id]
    Wait until element is visible    //span[text()="${main system}[name]"]

    Wait Until Element is Visible    ${VIEW TAB}
    Click Element    ${VIEW TAB}
    Run keyword and continue on failure    Check Header Items    True

    ${systems}=   Get Account Systems    ${many systems owner}    ${base password}
    ${system list count}=    Get Length     ${systems}
    Go To    ${ENV}/account
    Check Drop Menu Systems Grid System    ${system list count}

# Other cases
25. Check header and dropdown content for not admins
    [Tags]        other    CLOUD-6794    CLOUD-7200
    FOR    ${user}    IN
        ...    ${main system}[cloud users][viewer]
        ...    ${main system}[cloud users][liveViewer]
        ...    ${main system}[cloud users][advancedViewer]
        ...    ${main system}[cloud users][custom]
        Log in to system    ${main system}    ${user}
        Wait until element is visible    ${SYSTEM NAME}\[contains(text(), "${main system}[name]")]
        # Commented out due to CLOUD-7200
        # Verify In System    ${main system}[name]    editable=False
        Validate Header Button Text    ${main system}[name]    systems=False
        Wait Until Element Is Not Visible    ${INFORMATION TAB}
        Click Element    ${SYSTEMS DROPDOWN}

        Wait until elements are visible
            ...    ${DROPDOWN NAVIGATION GRID}
            ...    //h5[contains(text(), "${main system}[name]")]/../../following-sibling::ul//a[contains(text(), "${SETTINGS TEXT}")]
            ...    //h5[contains(text(), "${main system}[name]")]/../../following-sibling::ul//a[contains(text(), "${VIEW}")]
        Wait until elements are not visible
            ...    ${DROPDOWN SYSTEMS GRID}
            ...    ${INFORMATION TAB}
            ...    //h5[contains(text(), "${main system}[name]")]/../../following-sibling::ul//a[contains(text(), "${INFORMATION TEXT}")]

        Log Out
    END

26. Check external links - For Developers
    [Tags]        other
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}
    Wait Until Element Is Not Visible    ${DROPDOWN SYSTEMS GRID}
    ${links names}=   Get External Links Names   ${FOR DEVELOPERS TEXT}
    FOR    ${name}    IN    @{links names}
        ${actual url}=   Get Element Attribute    ${FOR DEVELOPERS LINK}\[contains(text(), "${name}")]    href
        ${expected url}=    Get From Dictionary    ${FOR DEVS EXTERNAL LINKS}    ${name}
        Run keyword and continue on failure    Should Be Equal As Strings    ${actual url}    ${expected url}
    END
    Click Element    ${SYSTEMS DROPDOWN}

27. Check External links
    [Tags]        other
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    sleep    10
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${DROPDOWN NAVIGATION GRID}
    Wait Until Element Is Not Visible    ${DROPDOWN SYSTEMS GRID}
    ${links names}=   Get External Links Names   ${EXTERNAL LINKS TEXT}
    FOR    ${name}    IN    @{links names}
        ${actual url}=   Get Element Attribute    ${EXTERNAL LINK}\[contains(text(), "${name}")]    href
        ${expected url}=    Get From Dictionary    ${EXTERNAL LINKS}    ${name}
        Run keyword and continue on failure    Should Be Equal As Strings    ${actual url}    ${expected url}
    END
