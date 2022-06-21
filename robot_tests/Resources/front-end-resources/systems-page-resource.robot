*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Systems Page Suite Setup
    ${rand str}=   Generate Random String      length=5
    ${owner}=   Register and activate account with random email    Main    Owner    ${base password}
    ${system}=   Create Base System    systems_page_main_${rand str}   add users=True    owner=${owner}
    Set Suite Variable    ${system}

    ${another owner}=   Register and activate account with random email    Another    Owner    ${base password}
    ${extra system}=   Create Base System    systems_page_extra_${rand str}   add users=False    owner=${another owner}
    Set Suite Variable    ${extra system}

    ${tmp auth}=   Create List    ${another owner}    ${base password}
    Share    ${tmp auth}    ${extra system}[cloud id]    viewer    ${system}[owner]     ${permissions}[viewer]
    Set Suite Variable    ${extra system}

    ${offline systems}=   Create List
    FOR    ${i}    IN RANGE    7
        ${s}=   Create Base System    systems_page_offline_${rand str}_${i}    add users=False    owner=${system}[owner]
        Append To List    ${offline systems}    ${s}
        Sleep    5
        Delete Docker Server    ${s}[id]
    END
    Set Suite Variable    ${offline systems}

    ${no sys user}=   Register and activate account with random email    NoSystems    User    ${base password}
    Set Suite Variable    ${no sys user}
    Sleep    30

    Open browser and go to URL    ${ENV}

Systems Page Suite Teardown
    FOR    ${sys}    IN    @{offline systems}    ${system}    ${extra system}
        Delete Base System    ${sys}
    END
    Delete Account    ${no sys user}    ${base password}
    Close All Browsers

Validate on Systems Page
    [Arguments]    ${search}=${True}
    Wait Until Location Is    ${ENV}/systems
    Wait Until Elements Are Visible
       ...    ${SYSTEMS HEADER}
       ...    ${SYSTEMS LIST}
    Title Should Be    ${SYSTEMS TITLE TEXT} - ${PRODUCT NAME}
    IF    ${search}
        Wait Until Element is Visible    ${SYSTEMS SEARCH INPUT}
    ELSE
        Wait Until Element Is Not Visible    ${SYSTEMS SEARCH INPUT}
    END

Validate Tile
    [Arguments]    ${system name}    ${owner name}    ${offline}=${False}
    Wait Until Element is Visible    //h2[text()="${system name}"]/following-sibling::span[contains(text(), "${owner name}")]    timeout=10
    IF    ${offline}
        Wait Until Element is Visible    ${OFFLINE BADGE}
    ELSE
        Wait Until Element is Visible    ${OPEN IN NX BUTTON}
    END

Verify Number Of Tiles Is Correct
    [Arguments]    ${expected num tiles}
    Sleep    1
    ${tiles}=   Get WebElements    //div[contains(@class,"card ")]
    ${actual num tiles}=   Get Length    ${tiles}
    Should Be Equal As Numbers    ${actual num tiles}     ${expected num tiles}
