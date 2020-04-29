*** Keywords ***
Go To Cameras
    ${location}=   Get Location
    Go To    ${location}/cameras

Verify on Cameras Page
    Wait Until Elements are Visible
    ...    ${CAMERAS VIEW BUTTON}
    ...    ${EDITABLE TITLE}
    ...    ${CAMERAS DETAILED INFO BUTTON}
    ...    ${ASPECT RATIO DROPDOWN}
    ...    ${ROTATION DROPDOWN}
    ...    ${ENABLE AUDIO CHECKBOCK}
    ...    ${EDIT CREDENTIALS BUTTON}
    ...    ${RECORING CHECK BOX}

Verify Recording Options are Visible
    Wait Until Elements are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}
    ...    ${RECORD MOTION RADIO BUTTON}
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}
    ...    ${FPS INPUT}
    ...    ${QUALITY DROPDOWN}

Verify Authentication Form
    Wait Until Elements are Visible
    ...    ${EDIT CREDENTIALS LOGIN INPUT}
    ...    ${EDIT CREDENTIALS PASSWORD INPUT}
    ...    ${EDIT CREDENTIALS X BUTTON}
    ...    ${EDIT CREDENTIALS CANCEL BUTTON}
    ...    ${EDIT CREDENTIALS SAVE BUTTON}

Enable Recording
    Set Checkbox Value    ${RECORING CHECK BOX}//input    true

Select Camera By Name
    [Arguments]    ${camera name}
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${camera name}")]
    Click Link    //nx-level-3-item/a//span[contains(text(),"${camera name}")]/../..

Change Aspect Ratio
    [Arguments]    ${desired ratio}
    Click Button    ${ASPECT RATIO DROPDOWN}
    Click Link    ${ASPECT RATIO DROPDOWN}/following-sibling::div//span[contains(text(),"${desired ratio}")]/..

Aspect Ratio Should Be
    [Arguments]    ${expected ratio}
    Wait Until Element is Visible    ${ASPECT RATIO DROPDOWN}/span[contains(text(),"${expected ratio}")]

Change Rotation
    [Arguments]    ${desired rotation}
    Click Button    ${ROTATION DROPDOWN}
    Click Link    ${ROTATION DROPDOWN}/following-sibling::div//span[contains(text(),"${desired rotation}")]/..

Rotation Should Be
    [Arguments]    ${expected rotation}
    Wait Until Element is Visible    ${ROTATION DROPDOWN}/span[contains(text(),"${expected rotation}")]

Get Recording Status

Get Recording Mode

Get Recording Quality

