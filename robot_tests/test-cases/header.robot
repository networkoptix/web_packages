*** Settings ***
Resource          ../Resources/front-end-resources/header-resource.robot
Suite Setup       Header Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Header Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop         Header Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Header Suite Teardown
Force Tags        cloud

*** Test Cases ***
# Anonymous user

3. Anonymous: Clicking on the main header button closes the dropdown
    [Tags]        anon
    Validate Header Button Text    ${ALL SITE TEXT}    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Wait until element is visible    ${EXTERNAL LINKS TITLE}
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}

    Log    Clicking on the main header button closes the dropdown
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Log    Clicking ENETR closes the dropdown
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}
    Press Keys    //body    ENTER
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

    Log    Clicking outside the dropdown closes it
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}
    Click Element    //header
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}    ${DROPDOWN NAVIGATION GRID}

4. Anonymous: Different page widths
    [Tags]        anon    ui
    Go To    ${knowledge base}[url]
    Check Header Items    False
    Go Back

# User has no systems connected to cloud
5. No systems: Header button text is correct
    [Tags]        no_sys
    IF    '''${mode}''' == '''cloud'''
        go to     ${ENV}
    ELSE
        go to     ${QA BURBANK IP}:${main system}[port]
    END
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Sleep    5
    Wait until keyword succeeds    3x    5sec    Validate Header Button Text    0    systems=True

6. No systems: Logo goes to landing page
    [Tags]        no_sys
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Validate Header Button Text    0    systems=True
    Click Element    ${HEADER ICON LINK}
    Wait Until Location is    ${ENV}/systems

7. No systems: Check Dropdown Content
    [Tags]        no_sys
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Validate Header Button Text    0    systems=True
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Wait until element is visible    ${EXTERNAL LINKS TITLE}
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}

8. No systems: Different page widths
    [Tags]        no_sys    ui
    Log In    ${zero systems owner}    ${BASE PASSWORD}
    Validate Header Button Text    0    systems=True
    Check Header Items    True

# User has one system connected to cloud
9. One system: Logo goes to view for that system
    [Tags]        one_sys    cloud    webadmin
    Log in to system    ${main system}    ${main system}[owner]
    Verify In System    ${main system}[name]
    Wait Until Element is Visible    ${HEADER ICON LINK}
    Click Element    ${HEADER ICON LINK}/..
    IF    '''${mode}''' == '''cloud'''
        Wait Until Location Is    ${ENV}/systems/${main system}[cloud id]/view
    ELSE
        Verify In System    ${main system}[name]
    END

10. One system: Header button displays the system name
    [Tags]        one_sys        webadmin
    Log in to system    ${main system}    ${main system}[owner]
    Run keyword and continue on failure    Validate Header Button Text    ${main system}[name]    systems=False

11. One system: Check Dropdown content
    [Tags]        one_sys        webadmin
    Log in to system    ${main system}    ${main system}[owner]
    Run keyword and continue on failure    Validate Header Button Text    ${main system}[name]    systems=False
    Click Element    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Validate System Navigation Tile    ${main system}[name]    active link=${SETTINGS TEXT}

    Run Keyword If    '''${mode}''' == '''webadmin'''    Pass Execution    Webadmin tests PASS
    Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}
    Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}
    Wait until element is visible    ${EXTERNAL LINKS TITLE}

12. One system: Check header links - System
    [Tags]        one_sys        webadmin
    Log in to system    ${main system}    ${main system}[owner]
    Run keyword and continue on failure    Validate Header Button Text    ${main system}[name]    systems=False
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

13. One system: Check header links - For Developers
    [Tags]        one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Go To    ${ENV}/docs/developers
#    Wait Until Element Is Visible    //h1[contains(text(), "${DEVELOP WITH NX META TEXT}")]
    Wait Until Element Is Visible    //h1[contains(text(), "Nx Witness For Developers")]
    Run keyword and continue on failure    Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
    Validate Active Header Link    ${PLATFORM OVERVIEW TEXT}

    FOR    ${page}    IN    @{for developers int pages}
        Click Link    ${HEADER TAB LINK}\[contains(text(), "${page}[title]")]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}    active link=${page}[title]
    END

14. One system: Check header links - Services
    [Tags]        one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Go To    ${ENV}/download
    Validate Header Button Text    ${SERVICES TEXT}    systems=False
    Validate Active Header Link    ${DOWNLOADS TEXT}

    FOR    ${page}    IN    @{services pages}
        Click Link    ${HEADER TAB LINK}\[contains(text(), "${page}[title]")]
        Sleep   1
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
    END

15. One system: Check navigation links - System
    [Tags]        one_sys   CLOUD-7200        webadmin
    Log in to system    ${main system}    ${main system}[owner]
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page text}    IN    ${VIEW}    ${SETTINGS TEXT}    ${INFORMATION TEXT}
        Click Link    //h5[contains(text(), "${main system}[name]")]/../../following-sibling::ul//a[contains(text(), "${page text}")]
        Validate Header Button Text    ${main system}[name]    systems=False
        Validate Active Header Link    ${page text}
        Click Element    ${SYSTEMS DROPDOWN}
        Validate System Navigation Tile    ${main system}[name]    active link=${page text}
    END

16. One system: Check navigation links - For Developers
    [Tags]        one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page}    IN    @{for developers int pages}
        Click Element    //h5[contains(text(), "${FOR DEVELOPERS TEXT}")]/../../following-sibling::ul//a[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${FOR DEVELOPERS TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${FOR DEVELOPERS TEXT}    ${for developers int pages}    active link=${page}[title]
    END

17. One system: Check navigation links - Services
    [Tags]        one_sys
    Log In    ${one system owner}    ${BASE PASSWORD}
    Validate Header Button Text    ${main system}[name]    systems=False
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}

    FOR    ${page}    IN    @{services pages}
        Click Element    //h5[contains(text(), "${SERVICES TEXT}")]/../../following-sibling::ul//a[contains(text(), "${page}[title]")]
        Wait Until Location Contains    ${page}[url]
        Validate Header Button Text    ${SERVICES TEXT}    systems=False
        Validate Active Header Link    ${page}[title]
        Click Element    ${SYSTEMS DROPDOWN}
        Validate Navigation Grid Tile    ${SERVICES TEXT}    ${services pages}    active link=${page}[title]
    END

18. One System: Different page widths
    [Tags]        one_sys    ui
    Log in to user and system    ${one system owner}    ${main system}[cloud id]
    Verify In System    ${main system}[name]
    Wait Until Element is Visible    ${VIEW TAB}
    Click Element    ${VIEW TAB}
    Check Header Items    True


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
