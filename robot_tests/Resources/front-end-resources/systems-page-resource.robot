*** Keywords ***
Check Systems Text
    [Arguments]    ${user}
    Sleep    1
    Log Out
    Log In    ${user}    ${password}
    Wait Until Page Contains Element    ${AUTO TESTS USER}
    Element Text Should Be    ${AUTO TESTS USER}    ${TEST FIRST NAME} ${TEST LAST NAME}
    Wait Until Element Is Not Visible    //h2[.='${YOUR SYSTEM TEXT}']

Systems Page Suite Setup
    Create Base Cloud System
    ${TMP USERS}=   Create List
    Set Suite Variable    ${TMP USERS}
    ${another owner}=   Register and activate account with random email    Another    Owner    ${base password}
    Append To List    ${TMP USERS}    ${another owner}

    ${extra system}=   Setup Docker System    cloud email=${another owner}
    Sleep    5
    ${tmp auth}=   Create List    ${another owner}    ${base password}
    Share    ${tmp auth}    ${extra system}[id]    viewer    ${system}[owner]
    Set Suite Variable    ${extra system}

    ${offline systems}=   Create List
    FOR    ${i}    IN RANGE    7
        ${s}=   Setup Docker System    cloud email=${system}[owner]
        Append To List    ${offline systems}    ${s}
        Delete Docker Server    ${s}[cont]
    END
    Set Suite Variable    ${offline systems}
    Sleep    30
    Open browser and go to URL    ${ENV}

Systems Page Suite Teardown
    Delete Base Cloud System
    FOR    ${sys}    IN    @{offline systems}    ${extra system}
        Delete Docker Server    ${sys}[cont]
    END
    # Remove Temporary Users
    Close All Browsers

Validate on Systems Page
    [Arguments]    ${search}=${True}
    Wait Until Location Is    ${ENV}/systems
    Wait Until Elements Are Visible
       ...    ${SYSTEMS HEADER}
       ...    ${SYSTEMS LIST}
    Title Should Be    ${SYSTEMS TITLE TEXT} - ${PRODUCT NAME}
    Run Keyword If    ${search}    Wait Until Element is Visible    ${SYSTEMS SEARCH INPUT}
       ...    ELSE    Wait Until Element Is Not Visible    ${SYSTEMS SEARCH INPUT}

Validate Tile
    [Arguments]    ${system name}    ${owner name}    ${offline}=${False}
    Wait Until Element is Visible    //h2[text()="${system name}"]/following-sibling::span[contains(text(), "${owner name}")]    timeout=10
    Run Keyword If   ${offline}    Wait Until Element is Visible    ${OFFLINE BADGE}
        ...    ELSE    Wait Until Element is Visible    ${OPEN IN NX BUTTON}

Verify Number Of Tiles Is Correct
    [Arguments]    ${expected num tiles}
    Sleep    1
    ${tiles}=   Get WebElements    //div[contains(@class,"card ")]
    ${actual num tiles}=   Get Length    ${tiles}
    Should Be Equal As Numbers    ${actual num tiles}     ${expected num tiles}
