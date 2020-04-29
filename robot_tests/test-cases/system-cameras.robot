*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Common Restart Logout    ${url}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Test Cases ***
Rename Camera
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Element    ${EDITABLE TITLE}
    Input Text    ${EDITABLE TITLE}    camera 1 name changed
    Wait Until Element is Visible    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    @{auth}=    Create List    admin    ${password}
    ${cameras}=   Get Cameras    ${auth}    ${AUTO SYS IP}
    Should Be Equal    ${cameras[0]["name"]}    camera 1 name changed
    Input Text    ${EDITABLE TITLE}    camera 1
    Wait Until Element is Visible    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Should Be Equal    ${cameras[0]["name"]}    camera 1

View button
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view

Detailed Info
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health

Aspect Ratio
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Aspect Ratio    1:1
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${BASE PASSWORD}
    ${json}=   Get Cameras    ${auth}    ${AUTO SYS IP}
    ${server aspect ratio}=   Get Aspect Ratio    ${json}    good cam
    Should Be Equal    ${server aspect ratio}    1
    Change Aspect Ratio    Auto
    # check ration changed

Rotation
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Rotation    90˚
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${BASE PASSWORD}
    ${json}=   Get Cameras    ${auth}    ${AUTO SYS IP}
    ${server rotation}=   Get Rotation    ${json}    good cam
    Should Be Equal    ${server rotation}    90˚
    Change Rotation    Auto

Audio enable Disabled
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    # enable
    # check Enabled
    # Disable
    # check Disable

Audio unavailable
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOCK}//label[@disabled]

# Authentication
Record Always
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}
    Click Element    ${RECORD ALWAYS RADIO BUTTON}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
Record Motion
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}
    Click Element    ${RECORD ALWAYS RADIO BUTTON}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}

Record Motion + Low Quality
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}
    Click Element    ${RECORD ALWAYS RADIO BUTTON}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}

Change FPS
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${FPS INPUT}
    Click Element    ${FPS INPUT}
    Input Text    ${FPS INPUT}    20
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}

Change Quality
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${FPS INPUT}
    Click Element    ${FPS INPUT}
    Input Text    ${FPS INPUT}    20
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}

Enable/disable motion detection

Disabled Motion With Recording
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}

    Record motion and record motion low quality radio buttons should be disabled

Placeholder shows when system is offline
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}