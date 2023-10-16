*** Settings ***
Resource          ../Resources/front-end-resources/system-settings-menu-resource.robot
Suite Setup       System Settings Menu Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Settings Menu Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       Settings Menu Test Teardown
Suite Teardown    Run Keyword and Ignore Error    System Settings Menu Suite Teardown
Force Tags        system    left-menu    threaded    webadmin    cloud


*** Test Cases ***

16. Should perform search with 'AND' criteria
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Settings Are Visible
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${and criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Sleep    1
    Check if Match AND Criteria         ${LEFT MENU MATCHES CONTENT}    ${and criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

17. Should perform search with 'OR' criteria
    [Tags]    cdeb
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Settings Are Visible
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Sleep    1
    Check if Match OR Criteria          ${LEFT MENU MATCHES CONTENT}    ${or criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

18. Should navigate with up/down arrows when search criteria is entered
    [Tags]    wdeb    cdeb
    Wait Until Page Contains Element    ${LEFT MENU}
    Click Element                       ${LEFT MENU LEVEL1 ADMIN}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}

    Log     First item should be selected (by default)
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     color               ${COLOR LIGHT1 RGB}

    Log     Keyboard navigation to next item
    Press keys                          NONE                            ARROW_DOWN
    Sleep    1
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT8 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR DARK9 RGB}

    Log     Select next item
    Press keys                          NONE                            ENTER
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR LIGHT1 RGB}
    # Storage option is not implemented yet, comment it out
    #Log     Keyboard focus should move to next item
    #Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     background-color    ${COLOR LIGHT8 RGB}
    #Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     color               ${COLOR DARK9 RGB}
    Click Button                        ${LEFT MENU SEARCH CLEAR}
