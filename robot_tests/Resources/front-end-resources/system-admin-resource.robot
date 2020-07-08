*** Keywords *** 
Log in to Autotests 2 System
    [Arguments]    ${email}
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}    ${SYSTEM ADMINISTRATION LINK}
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${MERGE BUTTON SYSTEM DISABLED}
    Run Keyword If    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}'    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}

Open Rename System Dialog
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible   ${RENAME INPUT}    ${RENAME SAVE}    ${RENAME CANCEL}    ${RENAME X BUTTON}


Settings on page should match settings on server
    Log    Enable auto discovery of cameras and servers
    Setting on page matches server    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}     autoDiscoveryEnabled
    Log    Send anonymous usage and crash statistics to developers
    Setting on page matches server     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}    statisticsAllowed
    Log    Allow system to optimize camera settings
    Setting on page matches server    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}    cameraSettingsOptimization
    Log    Enable audit trail
    Setting on page matches server    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}    auditTrailEnabled
    Log    Allow only secure connections
    Setting on page matches server    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}    trafficEncryptionForced
    Log    Encrypt video traffic
    Setting on page matches server    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}     videoTrafficEncryptionForced
    Log    Limit session duration to
    ${status} =    Run Keyword and Return Status    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Run Keyword If    ${status}==False    Evaluate Auto System Settings via API    sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit

Setting on page matches server
    [Arguments]    ${setting}    ${id}
    ${status}=   Run Keyword and Return Status    Element Attribute Value Should Be     ${setting}//span    class    tick checked
    ${string}=   Convert To String    ${status}
    ${selected}=   Convert To Lowercase    ${string}
    Run Keyword And Continue On Failure    Evaluate Auto System Settings via API     ${id}    ${selected}

Evaluate Session Limit
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Sleep    5
    ${interval}=   Get Text    ${TIME DURATION INTERVAL TEXT}
    ${multiplier}=   Set Variable If    "${interval}"=="hours"    60
    ...    "${interval}"=="minutes"    1
    ${number}=   Evaluate      ${multiplier}*${value}
    Evaluate Auto System Settings via API    sessionLimitMinutes      ${number}

Changing setting changes it on server
    [Arguments]    ${setting}    ${id}
    Wait until element is enabled    ${setting}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected}=   Set Variable If    ${status}==True    false
    ...    ${status}==False    true
    Set Checkbox Value    ${setting}    ${selected}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Evaluate Auto System Settings via API     ${id}    ${selected}

Change Setting and Save
    [Arguments]    ${setting}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected}=   Set Variable If    ${status}==True    false
    ...    ${status}==False    true
    Set Checkbox Value    ${setting}    ${selected}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}

Change Setting Without Saving
    [Arguments]    ${setting}
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected} =    Set Variable If    ${status}==True    false
    ...    ${status}==False    true
    Set Checkbox Value    ${setting}    ${selected}

Set Hidden Checkbox
     Log    BOTH CHECKBOXES ARE UNCHECKED TO START
     Set Checkbox Value    ${ALLOW ONLY SECURE CHECKBOX REAL}    true
     Sleep    1
     Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    true
     Sleep    2
     Capture Page Screenshot

Change Setting Encrypt video traffic
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${ALLOW ONLY SECURE CHECKBOX REAL}
    ${status2}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}
    ${selected}=   Set Variable If    ${status}==False or ${status2}==False    true
    ...    ${status}==True and ${status2}==True     false
    Run Keyword If    ${status}==True and ${status2}==False   Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    true
    ...    ELSE IF     ${status}==True and ${status2}==True    Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    false
    ...    ELSE    Set Hidden Checkbox
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    [Return]    ${selected}

Changing Several Settings at Random
    [Arguments]     ${action}
    ${random}=   Evaluate    random.randint(2, 6)    modules=random    #need to uncomment and set to 6 max when bug fixed
    FOR    ${idx}    IN RANGE   ${random}
        ${checkbox}=   Evaluate    random.choice(@{checkboxes})    modules=random
        Log    ${checkbox}
        Change Setting Without Saving    ${checkbox}
    END
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    2
    Settings on page should match settings on server

Changing All Settings
    [Arguments]    ${action}
    FOR    ${checkbox}    IN   @{checkboxes}
        Log    ${checkbox}
        Change Setting Without Saving    ${checkbox}
    END
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    2
    Settings on page should match settings on server

Change Duration Time Interval
    [Arguments]    ${action}
    ${interval}=   Get Text    ${TIME DURATION INTERVAL TEXT}
    ${random}=   Evaluate    random.randint(1, 59)    modules=random
    Input Text    ${TIME NUMBER INPUT}    ${random}
    FOR    ${i}    IN RANGE    2
           ${status}=   Run Keyword And Return Status    Textfield Value Should Be    ${TIME NUMBER INPUT}    ${random}
           Run Keyword If    ${status}==False    Input Text    ${TIME NUMBER INPUT}    ${random}
           ...    ELSE    Exit For Loop
    END
    FOR    ${i}    IN RANGE    9
           ${status} =    Run Keyword And Return Status    Element Text Should Be    ${TIME DURATION INTERVAL TEXT}    ${interval}
           Run Keyword If    ${status}==False    Run Keywords
           ...    Click Button    ${TIME DURATION INTERVAL BUTTON}    AND
           ...    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}    AND
           ...    Click Link    ${TIME DURATION NEW SELECTION}
           ...    ELSE    Exit For Loop
    END

    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}
    Click Link    ${TIME DURATION NEW SELECTION}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}

Validate Disconnect Form
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FORM HEADER}
    ...    ${DISCONNECT FORM CLOSE BUTTON}
    ...    ${DISCONNECT FORM ALL USERS WILL BE DELETED}
    ...    ${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE}
    ...    ${DISCONNECT FORM ENTER PASSWORD TO CONTINUE}
    ...    ${DISCONNECT PASSWORD INPUT}
    ...    ${DISCONNECT FORM CANCEL BUTTON}
    ...    ${DISCONNECT FORM DISCONNECT BUTTON}

Wait Until System Settings Are Visible
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    ...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}

Wait Until Security Settings Are Visible
    Wait Until Elements Are Visible
    ...    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}
    ...    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}
    ...    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}
    ...    ${LIMIT SESSION DURATION CHECKBOX VISIBLE}
    