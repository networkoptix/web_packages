*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
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
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam

    Click Element    ${EDITABLE TITLE}
    Input Content Editable Text    ${EDITABLE TITLE}    good cam name changed
    Wait Until Element is Visible    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    ${AUTO SYS IP}    ${AUTO TESTS GOOD CAM ID}    good cam name changed

    Click Element    ${EDITABLE TITLE}
    Input Content Editable Text    ${EDITABLE TITLE}    good cam
    Wait Until Element is Visible    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}

    Camera Name Should be    ${auth}    ${AUTO SYS IP}    ${AUTO TESTS GOOD CAM ID}    good cam

View button
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view

Detailed Info
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health

Aspect Ratio
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Aspect Ratio    1:1
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    1:1
    Reload Page
    Aspect Ratio Should Be    1:1
    Change Aspect Ratio    Auto
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    Auto
    Reload Page
    Aspect Ratio Should Be    Auto

Rotation
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    good cam
    Verify on Cameras Page
    Change Rotation    90˚
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    90˚
    Reload Page
    Rotation Should Be    90˚
    Change Rotation    Auto
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    Auto
    Reload Page
    Rotation Should Be    Auto

Audio enable Disabled
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    good cam
    Verify on Cameras Page
    checkbox
    Set Checkbox Value    ${ENABLE AUDIO CHECKBOCK}//input    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Audio Enabled Should Be    True
    Reload Page
    Audio Enabled Should Be    True
    Set Checkbox Value    ${ENABLE AUDIO CHECKBOCK}//input    False
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Audio Enabled Should Be    False

Audio unavailable
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    no audio cam
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOCK}//label[@disabled]

Edit credentials form Close and Cancel buttons
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS X BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS CANCEL BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

# Changing credentials from valid to invalid ones makes the camera unauthorized
#     Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
#     Wait Until Element is Visible    ${CAMERAS LINK}
#     Click Link    ${CAMERAS LINK}
#     Verify on Cameras Page
#     Select Camera By Name    good cam
#     Click Button    ${EDIT CREDENTIALS BUTTON}
#     Verify Authentication Form
#     Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    qwer
#     Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    asdf
#     Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
#     Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}


# Changing credentials from invalid ones to valid ones makes the camera authorized


Recording toggle status
    [Tags]    C76391    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    no license cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${ENABLED RECORDING SLIDER}/preceding-sibling::input[@class="selected"]/..
    Wait Until Element Is Visible    ${LICENSE REQUIRED WARNING}

    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    good cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${ENABLED RECORDING SLIDER}/preceding-sibling::input[@class="selected"]/..
    Wait Until Element Is Visible    ${ONE LICENSE WILL BE USED WARNING}

    Select Camera By Name    no audio cam
    Verify on Cameras Page
    Wait Until Element is Visible    ${ENABLED RECORDING SLIDER}/preceding-sibling::input[@class="selected"]/..
    Verify Recording Options are Visible

Record Always
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    good cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${ENABLED RECORDING SLIDER}/preceding-sibling::input[@class="selected"]/..
    Toggle Recording
    Verify Recording Options are Visible
    Sleep    1
    ${value}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Should Be Equal As Integers    ${value}    2
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD ALWAYS RADIO BUTTON}    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Click Element    ${RECORDING CHECK BOX}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Record Motion
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION RADIO BUTTON}    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Click Element    ${RECORDING CHECK BOX}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Record Motion + Low Quality
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Enable Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Click Element    ${RECORDING CHECK BOX}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Check recording triple state
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]

Change FPS
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
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    good cam
    Verify on Cameras Page
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Not Visible    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Reload Page
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}
    Reload Page
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}

Disabled Motion With Recording
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
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}