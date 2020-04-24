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

Apect Ratio
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    # change Ratio
    # check ratio changed
    # change back
    # check ration changed

Rotation
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    # change rotation
    # check rotation changed
    # change back
    # check rotation changed

Audio enable Disabled
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    # enable
    # check Enabled
    # Disable
    # check Disable

Audo unavailable
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    # check enable audio checkbox is not clickable

# Authentication
# Record Always
# Record Motion
# Record Motion + Low Quality
# Change FPS
# Change Quality
# Disabled Motion With Recording
# Enabled Motion

# Offline Info?
