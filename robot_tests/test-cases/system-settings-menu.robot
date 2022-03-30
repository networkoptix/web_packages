*** Settings ***
Resource          ../Resources/front-end-resources/system-settings-menu-resource.robot
Suite Setup       System Settings Menu Suite Setup
Test Setup        System Settings Menu Test Setup
Test Teardown     Run Keyword If Test Failed    System Settings Menu Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Settings Menu Suite Teardown
Force Tags        system    left-menu    threaded    webadmin    cloud


*** Test Cases ***
1. Should login as "viewer" and should have no ability to "search" in left menu
    Log Out
    Log in to system    ${system 1}    ${system 1}[cloud users][viewer]
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Page Does Not Contain Element    ${LEFT MENU SEARCH INPUT}

2. Should have selected LEVEL-1 node (check specs)
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Page Contains Element    ${LEFT MENU LEVEL1 ADMIN}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       font-size           ${MENU L1 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-left        ${MENU L1 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-right       ${MENU L1 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ADMIN}       font-family         ${FONT MEDIUM}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ICON}        color               ${COLOR DARK9 RGB}

3. Should have LEVEL-3 node (check specs)
    Wait Until Page Contains Element    ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 USERS}       background-color    ${COLOR ALIGHT3 RGB}
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR ALIGHT2 RGB}

4. Should have LEVEL-3 selected node (check specs)
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Page Contains Element    ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       font-size           ${MENU L3 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-left        ${MENU L3 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-right       ${MENU L3 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL3 USER1}       font-family         ${FONT MEDIUM}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

5. Should have LEVEL-3 selected node (check specs - hover)
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

6. Should have LEVEL-3 not selected node (check specs)
    [Tags]    wdeb    cdeb
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

7. Should have LEVEL-3 not selected node (check specs - hover)
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Mouse Over                          ${LEFT MENU LEVEL3 USER2}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT6 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

8. Should have search component
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU SEARCH INPUT}

9. Should have search component (check specs)
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR TRANSPARENT RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       height              ${SEARCH HEIGHT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       font-size           ${SEARCH FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-left        ${SEARCH PLEFT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-right       ${SEARCH PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU SEARCH INPUT}       font-family         ${FONT REGULAR}

10. Shoud allow search input chars
    Go To Users List
    Wait Until Page Contains Element    ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}

11. Should have button CLEAR for search
    Wait Until Page Contains Element    ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Page Contains Element    ${LEFT MENU SEARCH CLEAR}
    Wait Until Element Has Style        ${LEFT MENU SEARCH CLEAR}       height              ${SEARCH HEIGHT}

12. Should clear search input
    Wait Until Page Contains Element    ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Element Is Visible       ${LEFT MENU SEARCH CLEAR}
    Click Button                        ${LEFT MENU SEARCH CLEAR}
    Textfield Should Contain            ${LEFT MENU SEARCH INPUT}       ${EMPTY}

13. Should display Nothing found
    Wait Until Page Contains Element    ${LEFT MENU}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${impossible search}
    ${count}=   Get Element Count       ${LEFT MENU}/div[contains(@class,'nx-menu')]/div
    Should Be True  ${count} == 1
    Element Text Should Be              ${LEFT MENU NO RESULT}          ${nothing found}    ignore_case=True
    Click Button                        ${LEFT MENU SEARCH CLEAR}

14. Should hide menu buttons on search
    Wait Until Page Contains Element    ${LEFT MENU}
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Page Contains Element    ${LEFT MENU BUTTONS}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Page Does Not Contain Element    ${LEFT MENU BUTTONS}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

15. Should perform search with single criteria
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Settings Are Visible
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    ${matches}=   Get WebElements     ${LEFT MENU SEARCH MATCHES}
    FOR    ${match}    IN    @{matches}
        ${text}=    Run Keyword And Continue On Failure    Get Text    ${match}
            IF    '${text}' != 'None' and '${text}' != '${EMPTY}'
                Should Contain    ${text}    ${simple criteria}
            END
    END

16. Should perform search with 'AND' criteria
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Settings Are Visible
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${and criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Check if Match AND Criteria         ${LEFT MENU MATCHES CONTENT}    ${and criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

17. Should perform search with 'OR' criteria
    [Tags]    cdeb
    Wait Until Page Contains Element    ${LEFT MENU}
    Wait Until Settings Are Visible
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
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
