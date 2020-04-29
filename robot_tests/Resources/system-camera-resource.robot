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

Get Aspect Ratio
    [Arguments]    ${json}    ${camera name}
    FOR    ${camera}    IN    @{json}
        Run Keyword If    '''${camera["name"]}'''=='''${camera name}'''    Return From Keyword    ${camera["addParams"][19]["value"]}
    END

Change Rotation
    [Arguments]    ${desired rotation}
    Click Button    ${ROTATION DROPDOWN}
    Click Link    ${ROTATION DROPDOWN}/following-sibling::div//span[contains(text(),"${desired rotation}")]/..

Get Rotation
    [Arguments]    ${json}    ${camera name}
    FOR    ${camera}    IN    @{json}
        Run Keyword If    '''${camera["name"]}'''=='''${camera name}'''    Return From Keyword    ${camera["addParams"][20]["value"]}
    END


Get Recording Status

Get Recording Mode

Get Recording Quality

