*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud


*** Test Cases ***
# Left search

19. Left menu search: Search menu for offline system
    [Tags]    C81761    search
    Stop container    ${system}[container]
    Log in to system new    ${system}    ${system}[cloudOwner]

    Log    Steps 2, 3
    ${links}=   Create List    ${LICENSES LINK}    ${CAMERAS LINK}    ${USERS LINK}    ${SERVERS LINK}
    ${aliases}=   Create List    licenses    cameras    users    servers
    FOR    ${link}    ${alias}    IN ZIP    ${links}    ${aliases}
        Wait until element is visible    ${link}
        Click Link    ${link}
        Wait Until Location Contains    ${ENV}/systems/${system}[id]/${alias}
        Run keyword and continue on failure    Validate Search Input
    END

    Log    Step 4
    Click Link    ${VIEW TAB}
    Wait Until Elements Are Visible     ${SYSTEM OFFLINE HEADER}    ${THIS SYSTEM IS OFFLINE}
    Wait Until Element Is Not Visible    ${SEARCH INPUT}

    Log    Step 5
    Click Link    ${INFORMATION TAB}
    Wait Until Elements Are Visible     ${SYSTEM OFFLINE HEADER}    ${THIS SYSTEM IS OFFLINE}
    Wait Until Element Is Not Visible    ${SEARCH INPUT}

    Start container   ${system}[container]

20. Left menu search: Availability for different users
    [Tags]    C81760    webadmin    search
    FOR     ${user}    IN    ${system}[cloudOwner]    ${system}[cloudUsers][cloudAdmin]
        Log in to system new    ${system}    ${user}
        Validate Search Input
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

    FOR     ${user}    IN    ${system}[cloudUsers][advancedViewer]    ${system}[cloudUsers][viewer]
        Log in to system new    ${system}    ${user}
        Wait until element is not visible    ${SEARCH INPUT}
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

21. Left menu search: Search mechanics
    [Tags]    C81762    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]

    Log    Step 1
    Search For    a
    Wait until elements are visible    ${SEARCH CLOSE BUTTON}    ${SEARCH ICON}

    Log    Step 2
    Search For    User
    Wait until element is not visible    ${MENU SECTION}
    Wait until element is visible    ${SEARCH NOTHING FOUND}

    Log    Step 3
    Search For    noptix
    Wait until elements are visible
    ...    ${USERS LIST}
    ...    ${SEARCHABLE MENU}
    ...    ${SEARCH RESULT ARROW}


    ${viewer info}=   Get Account Info    ${system}[cloudUsers][viewer]    ${password}
    ${viewer id}=   Set Variable    ${viewer info}[id]
    Set Suite Variable    ${viewer id}
    ${all users found}=   Get WebElements    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="noptix"]]
    ${num users found}=   Get Length    ${all users found}
    Capture Page Screenshot
    IF   '${IMAGE}' == '5.0'
        Should Be Equal As Numbers    ${num users found}    7
    ELSE
        Should Be Equal As Numbers    ${num users found}    6
    END

    Log    Step 4
    ${name} =    Get Text    ${all users found}[0]
    Click Element    ${all users found}[0]
    Wait until element is visible    //h2[contains(text(), "${name}")]

22. Left menu search: Collapsable tabs
    [Tags]    C81771    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]
    Validate Search Input

    Log    Step 1
    Search For    a
    Wait until elements are visible    ${SEARCH CLOSE BUTTON}    ${SEARCH ICON}
    Log    Step 2
    Click Element    ${USERS EXPAND BUTTON}
    Wait Until Element Is Visible    ${USERS RESULTS SUMMARY}
    Log    Step 3
    Click Element    ${USERS EXPAND BUTTON}
    Wait Until Element Is Visible    ${USERS EXPAND RESULTS}

23. Left menu search: Placeholder
    [Tags]    C81772    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]
    Search For    backup
    Wait until element is visible    ${SEARCH NOTHING FOUND}

24. Left menu search: Searchable fields
    [Tags]    C81796    webadmin    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version
    Log in to system new    ${system}    ${system}[cloudOwner]

    IF    '${LANGUAGE}'=='en_US'
        Log    Step 1
        Search For    en
        Wait until elements are visible
        ...    ${LICENSES LINK}
        ...    ${GENERAL LINK}
    END

    Log    Step 2
    Search For    ${CAMERA NAME}
    Run keyword and continue on failure    Wait Until Element is Visible    //span[@class="highlighted" and contains(text(), "${CAMERA NAME}")]

    Log    Steps 3,4,5 - cannot be autotested

    Log    Step 6
    Search For    admin
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="admin"]]

    Log    Step 7
    Search For    viewer
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and contains(text(), "viewer")]

    Log    Step 8
    Search For    ${system}[cloudUsers][viewer]
    ${highlighted}=   Fetch From Right    ${system}[cloudUsers][viewer]    ${TEST EMAIL}+
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${TEST EMAIL}"]/following-sibling::span[contains(@class, "highlighted") and text()="${highlighted}"]

    Log    Step 9
    Search For    ${system}[id]
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${system}[id]"]


# Disconnect System from Cloud
25. Disconnect dialog interface checks
    [Tags]    C48834    webadmin
    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log     Step 2
    #Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}
    Click Element    ${DISCONNECT FORM CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 3
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    # removing the below step since no password is needed anymore in order to disconnect system from cloud
    #Log    Step 4
    #Click Button    ${DISCONNECT FROM NX}
    #Validate Disconnect Form
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #The below steps commented out since password field was removed from "Discconect System from Nx Cloud"
    #Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}

    #Log    Step 5
    #Input Text    ${DISCONNECT PASSWORD INPUT}    khgwearfgak
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM WRONG PASSWORD}
    #${input class}=   Get Element Attribute    ${DISCONNECT PASSWORD INPUT}    class
    #Should Contain    ${input class}    ng-invalid
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    #Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    #Wait Until Element Is Not Visible    ${DISCONNECT FORM}
