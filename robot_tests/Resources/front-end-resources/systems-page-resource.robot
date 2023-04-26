*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Systems Page Suite Setup
    Open browser and go to URL    ${ENV}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Set Account Name    ${servers}[0][cloudAuth][0]    ${servers}[0][cloudAuth][1]    Main    Owner
    Set Account Name    ${servers}[1][cloudAuth][0]    ${servers}[1][cloudAuth][1]    Another    Owner
    Set Suite Variable    ${system}   ${servers}[0]
    ${extra system} =     Set Variable  ${servers}[1]
    Share    ${extra system}[cloudAuth]    ${extra system}[id]    viewer    ${system}[cloudOwner]     ${permissions}[viewer]
    Set Suite Variable    ${extra system}   ${extra system}
    ${offline systems}=   Create List
    FOR    ${server}    IN   @{servers}[2:9]
        Append To List    ${offline systems}    ${server}
        Delete container   ${server}[container]
    END
    Set Suite Variable    ${offline systems}    ${offline systems}
    ${no sys user}=   Register and activate account with random email    NoSystems    User    ${base password}
    Set Suite Variable    ${no sys user}
    Sleep    5
    Go to    ${ENV}

Systems Page Test Setup
    QA Video Recording Start
    Common Restart Logout    ${ENV}

Systems Page Suite Teardown
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
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
