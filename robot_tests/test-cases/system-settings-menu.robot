*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
#Test Setup        Restart
#Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}                ${EMAIL OWNER}
${password}             ${BASE PASSWORD}
@{cloud auth}           ${EMAIL OWNER}    ${BASE PASSWORD}
${url}                  ${ENV}
${impossible search}    velociraptor
${nothing found}        Nothing found
${simple criteria}      s
${and criteria}         s a
${or criteria}          s|a

*** Keywords ***
Restart
    Common Restart Logout    ${url}

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
    FOR    ${user email}   ${user role}    IN ZIP   ${AUTO TESTS USERS.keys()}     ${AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${cloud system id}    ${user role}    ${user email}
    END
    Open Browser and go to URL    ${url}

*** Test Cases ***
Should login as "viewer" and should have no ability to "search" in left menu
    Log in                                      ${EMAIL AUTO TESTS ANCHOR}      ${password}
    Wait Until Page Contains Element            ${LEFT MENU}
    Wait Until Page Does Not Contain Element    ${LEFT MENU SEARCH INPUT}
    Restart

Should show system settings with left menu
    [Tags]    system settings    left_menu    threaded
    Log in to Auto Tests System         ${EMAIL OWNER}
    Wait Until Page Contains Element    ${LEFT MENU}

Should have selected LEVEL-1 node (check specs)
    Wait Until Page Contains Element    ${LEFT MENU LEVEL1 ADMIN}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       font-size           ${MENU L1 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-left        ${MENU L1 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       padding-right       ${MENU L1 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ADMIN}       font-family         ${FONT MEDIUM}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL1 ICON}        color               ${COLOR DARK9 RGB}

Should have LEVEL-3 node (check specs)
    Mouse Over                          ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 USERS}       background-color    ${COLOR ALIGHT3 RGB}
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Element Has Style        ${LEFT MENU LEVEL1 ADMIN}       background-color    ${COLOR ALIGHT2 RGB}

Should have LEVEL-3 selected node (check specs)
    Wait Until Page Contains Element    ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       font-size           ${MENU L3 FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-left        ${MENU L3 PLEFT}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       padding-right       ${MENU L3 PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU LEVEL3 USER1}       font-family         ${FONT MEDIUM}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

Should have LEVEL-3 selected node (check specs - hover)
    Mouse Over                          ${LEFT MENU LEVEL3 USER1}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1}       color               ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER1 EXT}   color               ${COLOR LIGHT1 RGB}

Should have LEVEL-3 not selected node (check specs)
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT5 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

Should have LEVEL-3 not selected node (check specs - hover)
    Mouse Over                          ${LEFT MENU LEVEL3 USER2}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       background-color    ${COLOR LIGHT6 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 USER2 EXT}   color               ${COLOR LIGHT16 RGB}

Should have search component
    Wait Until Page Contains Element    ${LEFT MENU SEARCH INPUT}

Should have search component (check specs)
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR TRANSPARENT RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       height              ${SEARCH HEIGHT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       font-size           ${SEARCH FONT SIZE}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-left        ${SEARCH PLEFT}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       padding-right       ${SEARCH PRIGHT}
    Wait Until Element Contains Style   ${LEFT MENU SEARCH INPUT}       font-family         ${FONT REGULAR}

Shoud allow search input chars
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       background-color    ${COLOR LIGHT1 RGB}
    Wait Until Element Has Style        ${LEFT MENU SEARCH INPUT}       color               ${COLOR DARK9 RGB}

Should have button "CLEAR" for search
    Wait Until Page Contains Element    ${LEFT MENU SEARCH CLEAR}
    Wait Until Element Has Style        ${LEFT MENU SEARCH CLEAR}       height              ${SEARCH HEIGHT}

Should clear search input
    Click Button                        ${LEFT MENU SEARCH CLEAR}
    Textfield Should Contain            ${LEFT MENU SEARCH INPUT}       ${EMPTY}

Should display "Nothing found"
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${impossible search}
    ${count}=    Get Element Count      ${LEFT MENU}/div[contains(@class,'nx-menu')]/div
    Should Be True  ${count} == 1
    Element Text Should Be              ${LEFT MENU NO RESULT}          ${nothing found}    ignore_case=True
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should hide menu buttons on search
    Click Element                       ${LEFT MENU LEVEL1 USERS}
    Wait Until Page Contains Element    ${LEFT MENU BUTTONS}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Page Does Not Contain Element    ${LEFT MENU BUTTONS}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should perform search with single criteria
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${simple criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    ${matches} =    Get WebElements     ${LEFT MENU SEARCH MATCHES}
    FOR    ${match}    IN    @{matches}
        Element Text Should Be          ${match}    ${simple criteria}    ignore_case=True
    END

Should perform search with 'AND' criteria
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${and criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Check if Match AND Criteria         ${LEFT MENU MATCHES CONTENT}    ${and criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should perform search with 'OR' criteria
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Check if Match OR Criteria          ${LEFT MENU MATCHES CONTENT}    ${or criteria}
    Click Button                        ${LEFT MENU SEARCH CLEAR}

Should navigate with up/down arrows when search criteria is entered
    Click Element                       ${LEFT MENU LEVEL1 ADMIN}
    Input Text                          ${LEFT MENU SEARCH INPUT}       ${or criteria}
    Wait Until Elements Are Visible     ${LEFT MENU SEARCH MATCHES}
    Log     Fist item should be selected (by default)
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 GENERAL}     color               ${COLOR LIGHT1 RGB}
    Log     Keyboard novigation to next item
    Press keys                          NONE                            ARROW_DOWN
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT8 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR DARK9 RGB}
    Log     Select next item
    Press keys                          NONE                            ENTER
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         background-color    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 LIC}         color               ${COLOR LIGHT1 RGB}
    Log     Keyboard focus should move to next item
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     background-color    ${COLOR LIGHT8 RGB}
    Wait Until Element Has Style        ${LEFT MENU LEVEL3 STORAGE}     color               ${COLOR DARK9 RGB}

    Click Button                        ${LEFT MENU SEARCH CLEAR}



