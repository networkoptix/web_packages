*** Keywords ***
Start up
    [Arguments]    ${url}
    Reset All Cameras
    Open Browser and go to URL    ${url}

Reset cameras and log out
    Common Restart Logout    ${url}
    Reset All cameras
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
    ...    ${ENABLE AUDIO CHECKBOX}
    ...    ${EDIT CREDENTIALS BUTTON}
    ...    ${RECORDING CHECK BOX}
    ...    timeout=40

Verify Recording Options are Visible
    Wait Until Elements are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..
    ...    ${RECORD MOTION RADIO BUTTON}/..
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    ...    ${FPS INPUT}
    ...    ${QUALITY DROPDOWN}

Verify Authentication Form
    Wait Until Elements are Visible
    ...    ${EDIT CREDENTIALS LOGIN INPUT}
    ...    ${EDIT CREDENTIALS PASSWORD INPUT}
    ...    ${EDIT CREDENTIALS X BUTTON}
    ...    ${EDIT CREDENTIALS CANCEL BUTTON}
    ...    ${EDIT CREDENTIALS SAVE BUTTON}

Toggle Recording
    Wait Until Element Is Enabled    ${ENABLED RECORDING SLIDER}
    Click Element    ${RECORDING CHECK BOX}

Select Camera By Name
    [Arguments]    ${camera name}
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${camera name}")]
    Click Link    //nx-level-3-item/a//span[contains(text(),"${camera name}")]/../..

Change Aspect Ratio
    [Arguments]    ${expected ratio}
    Click Button    ${ASPECT RATIO DROPDOWN}
    Click Element    ${ASPECT RATIO DROPDOWN}/following-sibling::div//span[contains(text(),"${expected ratio}")]/..

Aspect Ratio Should Be
    [Arguments]    ${expected ratio}
    Wait Until Element is Visible    ${ASPECT RATIO DROPDOWN}/span[contains(text(),"${expected ratio}")]

Change Rotation
    [Arguments]    ${expected rotation}
    Click Button    ${ROTATION DROPDOWN}
    Click Element    ${ROTATION DROPDOWN}/following-sibling::div//span[contains(text(),"${expected rotation}")]/..

Rotation Should Be
    [Arguments]    ${expected rotation}
    Wait Until Element is Visible    ${ROTATION DROPDOWN}/span[contains(text(),"${expected rotation}")]

Audio Enabled Should Be
    [Arguments]    ${expected state}
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}
    ${current state}=   Get Checkbox Value    ${ENABLE AUDIO CHECKBOX}//input
    Should Be Equal    "${expected state}"    "${current state}"

Camera Name Should Be
    [Arguments]    ${auth}    ${server url}    ${camera id}    ${name}
    ${cameras}=   Get Cameras    ${auth}    ${server url}
    FOR    ${camera}  IN  @{cameras}
        log   ${camera}
        Run Keyword if    '''${camera['id']}'''=='''${camera id}'''    Should Be Equal    ${camera['name']}    ${name}
    END

Get Camera Attribute By Camera Name
    [Arguments]    ${auth}    ${server url}    ${name}    ${attribute}
    ${cameras}=    Get Cameras    ${auth}    ${server url}
    FOR    ${camera}  IN  @{cameras}
        Run Keyword If    '''${camera['name']}'''=='''${name}'''    Return From Keyword    ${camera['${attribute}']}
    END

Verify recording controls are open
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    ...    ${FPS INPUT}                             
    ...    ${QUALITY DROPDOWN}

Reset Camera
    [Arguments]    ${camera name}    ${server ip}
    ${auth}=    Create List    admin    ${BASE PASSWORD}
    ${data}=   evaluate    json.loads('''${${camera name} JSON 1}''')
    Set All Camera Attributes    ${server ip}    ${auth}    ${data}
    
    ${data2}=   evaluate    json.loads('''${${camera name} JSON 2}''')
    Set All Camera Add Params    ${server ip}    ${auth}    ${data2}

Reset All cameras
    Reset Camera    good cam    ${AUTO SYS IP}
    Reset Camera    unauth cam    ${AUTO SYS IP}
    Reset Camera    offline cam    ${AUTO SYS IP}
    Reset Camera    no license cam    https://10.1.5.126:7005
    Reset Camera    no audio cam    ${AUTO SYS IP}
    Reset Camera    triple state cam    https://10.1.5.126:7005
