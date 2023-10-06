*** Settings ***
Resource          ../Resources/front-end-resources/system-settings-menu-resource.robot
Suite Setup       System Settings Menu Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Settings Menu Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       Settings Menu Test Teardown
Suite Teardown    Run Keyword and Ignore Error    System Settings Menu Suite Teardown
Force Tags        system    left-menu    threaded    webadmin    cloud


*** Test Cases ***

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
    Sleep    5
    ${matches}=   Get WebElements     ${LEFT MENU SEARCH MATCHES}
    FOR    ${match}    IN    @{matches}
        ${text}=   Run Keyword And Continue On Failure    Get Text    ${match}
        ${text}=   Convert To Lower Case    ${text}
        IF    '${text}' != 'None' and '${text}' != '${EMPTY}'
            Should Contain    ${text}    ${simple criteria}
        END
    END

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
