*** Settings ***
Resource          ../../resource.robot
Resource          system-camera-resource.robot
Resource          storage-resource.robot

*** Keywords ***
# Setups and teardowns
System Admin Suite Setup
    Open browser and go to URL    ${ENV}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Set Suite Variable    ${system}   ${servers}[0]
    Set Suite Variable    ${server url}    https://${QABURBANK IP}:${system}[port][0]
    Add Virtual Camera    ${server url}    ${system}[localAuth]    ${CAMERA NAME}
    ${local system}=   Run Keyword If   '''${mode}'''=='''webadmin'''    Create Base System    system_admin_local_${rand}    image=${IMAGE}
    Set Suite Variable    ${local system}
    Sleep    30
    Go To    ${url}

System Admin Suite Teardown
    Teardown Servers    ${servers}
    Run Keyword If    '''${mode}'''=='''webadmin'''    Delete Docker Server    ${local system}[id]
    Close All Browsers
    Run Keyword And Ignore Error    Delete Docker Server    ${4.0 cont}

System Admin Test Setup
    Skip If Irrelevant

System Admin Test Restart
    Skip If Irrelevant
    Close Modal If There
    ${logged in}=   Run keyword and return status    Wait until element is visible    ${ACCOUNT DROPDOWN}
    Run Keyword If    ${logged in}    Log Out
    Sleep    1
    ${logged in}=   Run keyword and return status    Wait until element is visible    ${ACCOUNT DROPDOWN}
    Run Keyword If    ${logged in}    Log Out via API

    Run Keyword If Test Failed    Run Keywords
        ...    Start Docker Server    ${system}[id]
        ...    AND    Sleep    10

    Set System Name    ${server url}    ${system}[localAuth]    ${system}[name]
    ${settings}=   Create Dictionary    videoTrafficEncryptionForced=false
    Set System Settings    ${system}[localAuth]    ${server url}    ${settings}
    Set System Settings    ${system}[localAuth]    ${server url}    ${default advanced settings}
# Waits
Wait until settings are visible
    [Arguments]    ${timeout}=${selenium timeout}    ${old system}=${False}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX}${visible}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX}${visible}
    ...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}${visible}
    ...    ${ENABLE AUDIT TRAIL CHECKBOX}${visible}
    ...    timeout=${timeout}

    Run Keyword If    not ${old system}    Wait Until Elements Are Visible
        ...    ${ALLOW ONLY SECURE CHECKBOX}${visible}
        ...    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}
        ...    ${LIMIT SESSION DURATION CHECKBOX}${visible}
        ...    timeout=${timeout}
        ...    ELSE    Wait Until Elements Are Not Visible
            ...    ${ALLOW ONLY SECURE CHECKBOX}${visible}
            ...    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}
            ...    ${LIMIT SESSION DURATION CHECKBOX}${visible}
            ...    timeout=${timeout}

Wait Until Advanced Settings Are Visible
    [Arguments]    ${block number}=ONE    ${timeout}=${selenium timeout}
    IF    '${block number}'=='ONE' or '${block number}'=='THREE' or '${block number}'=='FOUR'
        IF    '${IMAGE}'=='5.0'
            ${block number}=   Set Variable    ${block number} ${IMAGE}
        END
    END
    Run keyword and continue on failure    Wait Until Elements Are Visible
        ...    @{ADVANCED SETTINGS ALERT BAR}
        ...    @{ADVANCED SETTING ELEMENT BLOCK ${block number}}
        ...    timeout=${timeout}

# UI - validations
Validate Disconnect Form
    Run keyword and continue on failure    Wait Until Elements Are Visible
        ...    ${DISCONNECT FORM HEADER}
        ...    ${DISCONNECT FORM CLOSE BUTTON}
        ...    ${DISCONNECT FORM ALL USERS WILL BE DELETED}
        ...    ${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE}
      #    Below web elements commented out since Disconnect form no longer contains password field
      # ...    ${DISCONNECT FORM ENTER PASSWORD TO CONTINUE}
      # ...    ${DISCONNECT PASSWORD INPUT}
        ...    ${DISCONNECT FORM CANCEL BUTTON}
        ...    ${DISCONNECT FORM DISCONNECT CLOUD BUTTON}

Validate Success Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
        ...    ${SUCCESS DIALOG HEADER}
        ...    ${SUCCESS DIALOG X BUTTON}
        ...    ${SUCCESS DIALOG TEXT}
        ...    ${SUCCESS DIALOG CLOSE BUTTON}

# UI - actions
Change System Name
    [Arguments]    ${new name}    ${save}=${True}
    Delete All Text     ${SYSTEM NAME}      replaceText=${True}     replaceWith=1
    Sleep    1
    Delete All Text     ${SYSTEM NAME}      replaceText=${True}     replaceWith=${new name}
    Sleep    1
#    Press Keys    ${SYSTEM NAME}    ${new name}
    #Execute JavaScript    document.getElementById("systemName-editable").innerHTML = "${new name}";
#    Press Keys    ${SYSTEM NAME}    ENTER
    Wait until elements are visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    IF    ${save}
        Click Button    ${SAVE BUTTON}
        Wait Until Elements Are Not Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
        Wait until element is visible    ${NO UNSAVED CHANGES}
        Sleep    1
    END
    
Change Input for Advanced Setting
    [Arguments]    ${locator}    ${value}
    Input Text    ${locator}    ${value}
    Wait until element is visible    ${SAVE BUTTON}
    Click Button    ${SAVE BUTTON}
    Validate Success Dialog
    Click Element    ${SUCCESS DIALOG CLOSE BUTTON}
    IF    '${value}' != '${EMPTY}'
        Wait Until Textfield Contains    ${locator}    ${value}
    END

Change Setting
    [Arguments]    ${locator}    ${buttons}=${True}
    ${status}=   Run Keyword and Return Status    Checkbox Is Selected     ${locator}    ${True}
    ${selected}=   Set Variable If    ${status}==True    False
    ...    ${status}==False    True
    Wait Until Page Contains Element    ${locator}
    Set Checkbox Value    ${locator}    ${selected}
    Run Keyword If    ${buttons}    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    [Return]    ${selected}

Change Setting And Save
    [Arguments]    ${locator}    ${advanced}=${False}
    ${selected}=   Change Setting    ${locator}
    Click Button    ${SAVE BUTTON}
    Run Keyword If    ${advanced}    Run Keywords
        ...    Validate Success Dialog    AND
        ...    Click Button    ${SUCCESS DIALOG CLOSE BUTTON}
        ...    ELSE    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    [Return]    ${selected}

Changing setting changes it on server
    [Arguments]    ${locator}    ${key}    ${server url}=${server url}    ${advanced}=${False}
    Setting on page matches server    ${locator}    ${key}    ${server url}
    Wait until element is enabled    ${locator}
    ${selected}=   Change Setting And Save   ${locator}    ${advanced}
    Evaluate System Settings via API    ${local auth}    ${server url}     ${key}    ${selected}

Changing input setting changes it on server
    [Arguments]    ${locator}    ${key}    ${new value}    ${server url}=${server url}
    Input on page matches server    ${locator}    ${key}    ${server url}
    Change Input for Advanced Setting    ${locator}    ${new value}
    Evaluate System Settings via API    ${local auth}    ${server url}     ${key}    ${new value}

Change Setting Encrypt video traffic
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${ALLOW ONLY SECURE CHECKBOX}
    ${status2}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}
    ${selected}=   Set Variable If    ${status}==False or ${status2}==False    true
    ...    ${status}==True and ${status2}==True     false

    #Run Keyword If    ${status}==True and ${status2}==False   Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    true
    #...    ELSE IF     ${status}==True and ${status2}==True    Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    false
    #...    ELSE    Run Keywords
    #   ...    Set Checkbox Value    ${ALLOW ONLY SECURE CHECKBOX}    true
    #   ...    AND    Wait until element is visible    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}
    #   ...    AND    Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    true
    IF    ${status}==True and ${status2}==False
        Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    true
    ELSE IF    ${status}==True and ${status2}==True
        Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    false
    ELSE
        Set Checkbox Value    ${ALLOW ONLY SECURE CHECKBOX}    true
        Wait until element is visible    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}
        Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    true
    END

    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Button    ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    [Return]    ${selected}

Changing Several Settings at Random
    [Arguments]     ${action}   ${server url}=${server url}
    ${num settings}=   Evaluate    random.randint(2, 6)    modules=random    # random number of settings
    ${settings to change}=   Evaluate    random.sample(${checkboxes}, ${num settings})    modules=random    # random set of stttings
    FOR    ${s}    IN    @{settings to change}
        Change Setting   ${s}
    END
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    2
    Settings on page should match settings on server    ${server url}

Changing All Settings
    [Arguments]    ${action}
    Settings on page should match settings on server
    FOR    ${checkbox}    IN   @{checkboxes}
        Change Setting    ${checkbox}
    END
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
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
           IF    ${status}==False
               Input Text    ${TIME NUMBER INPUT}    ${random}
           ELSE
               Exit For Loop
           END
    END
    FOR    ${i}    IN RANGE    9
           ${status} =    Run Keyword And Return Status    Element Text Should Be    ${TIME DURATION INTERVAL TEXT}    ${interval}
           Run Keyword If    ${status}==False    Run Keywords
           ...    Click Button    ${TIME DURATION INTERVAL BUTTON}    AND
           ...    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}    AND
           ...    Click Link    ${TIME DURATION NEW SELECTION}
           ...    ELSE    Exit For Loop
    END
    
    ${element_xpath}=       Replace String      ${TIME DURATION INTERVAL BUTTON}        \"  \\\"
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}
    Click Link    ${TIME DURATION NEW SELECTION}
    Wait Until Elements Are Visible     ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}

Elements Text Should Be
    [Arguments]    ${args}
    FOR    ${key}    ${val}    IN ZIP    ${args.keys()}    ${args.values()}
        Element Text Should Be    ${key}    ${val}
    END

# VMS verifications
Settings on page should match settings on server
    [Arguments]    ${server url}=${server url}
    FOR    ${setting}    IN    @{default settings.keys()}
        IF    '''${setting}''' != '''sessionLimitMinutes'''
            Setting on page matches server    //*[@id="${setting}"]    ${setting}
        END
    END
    Log    Limit session duration to
    ${status}=   Run Keyword and Return Status    Checkbox Is Selected    ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    IF    ${status}==False
        Evaluate System Settings via API    ${local auth}    ${server url}    sessionLimitMinutes    0
    ELSE
        Evaluate Session Limit
    END

Setting on page matches server
    [Arguments]    ${locator}    ${key}    ${server url}=${server url}
    ${status}=   Run Keyword and Return Status    Checkbox Is Selected    ${locator}    ${True}
    ${selected}=   Convert To String    ${status}
    #${selected}=   Convert To Lowercase    ${string}
    Run Keyword And Continue On Failure    Evaluate System Settings via API     ${local auth}    ${server url}    ${key}    ${selected}

Input on page matches server
    [Arguments]    ${locator}    ${key}    ${server url}=${server url}
    ${data}=   Get Element Attribute    ${locator}    value
    Run Keyword And Continue On Failure    Evaluate System Settings via API     ${local auth}    ${server url}    ${key}    ${data}

Data on page matches server
    [Arguments]    ${locator}    ${key}    ${server url}=${server url}
    ${data}=   Get Text    ${locator}
    Run Keyword And Continue On Failure    Evaluate System Settings via API     ${local auth}    ${server url}    ${key}    ${data}

Evaluate Session Limit
    [Arguments]    ${server url}=${server url}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Sleep    5
    ${interval}=   Get Text    ${TIME DURATION INTERVAL TEXT}
    ${multiplier}=   Set Variable If    "${interval}"=="${HOURS TEXT}"    60
    ...    "${interval}"=="${MINUTES TEXT}"    1
    ...    "${interval}"=="${DAYS TEXT}"     1440
    ${number}=   Evaluate    ${multiplier}*${value}
    Evaluate System Settings via API    ${local auth}    ${server url}    sessionLimitMinutes      ${number}

# Search
Validate Search Input
    [Arguments]    ${view page}=${False}
    Run Keyword If    ${view page}==${True}    Wait until elements are visible
        ...    ${VIEW SEARCH INPUT}
        ...    ${VIEW SEARCH DETAILS TOGGLER}
        ...    ELSE    Wait until elements are visible
            ...    ${SEARCH INPUT}
            ...    ${SEARCH ICON}

Search For
    [Arguments]    ${text}
    Validate Search Input
    Input Text    ${SEARCH INPUT}    ${text}

# Webadmin - specific
Validate Cloud Block
    [Documentation]    check UI of the header extension for local admin
    [Arguments]    ${connected}=${False}
    Wait until elements are visible
       ...    ${CLOUD NAME}
       ...    ${CLOUD LINK}
    Run Keyword If    ${connected}    Wait until elements are visible
        ...    ${CONNECTION STATUS}\[contains(text(), "CONNECTED")]
        ...    ${DISCONNECT FROM NX}
            ...    ELSE    Wait until elements are visible
                ...    ${CONNECTION STATUS}\[contains(text(), "NOT CONNECTED")]
                ...    ${CONNECT TO CLOUD BUTTON}

Validate Connect To Cloud Form
    Wait until elements are visible
        ...    ${CONNECT TO CLOUD MESSAGE}
        ...    ${CONNECT TO CLOUD HEADER}
        ...    ${CONNECT TO CLOUD X BUTTON}
        ...    ${CONNECT TO CLOUD EMAIL INPUT}
        ...    ${CONNECT TO CLOUD PASSWORD INPUT}
        ...    ${CONNECT TO CLOUD FORGOT PASSWORD LINK}
        ...    ${CONNECT TO CLOUD CREATE ACCOUNT LINK}
        ...    ${CONNECT TO CLOUD OK BUTTON}
        ...    ${CONNECT TO CLOUD CANCEL BUTTON}

Fill in login and password
    [Arguments]    ${login}    ${password}
    Slow    Input Text    ${CONNECT TO CLOUD EMAIL INPUT}    ${login}    timeout= 0.1
    Slow    Input Text    ${CONNECT TO CLOUD PASSWORD INPUT}    ${password}    timeout= 0.1

Close Connect to Cloud modal
    Wait until element is visible    ${CONNECT TO CLOUD X BUTTON}
    Click Button    ${CONNECT TO CLOUD X BUTTON}
    Wait until element is not visible    ${CONNECT TO CLOUD MODAL}

Validate Email Input Error
    [Arguments]    ${error text}
    #TODO ADD CHECKING RED COLOR
    ${error path}=   Replace String   ${CONNECT TO CLOUD EMAIL ERROR}    %ERROR TEXT%    ${error text}
    Wait until element is visible    ${error path}

Validate Password Input Error
    [Arguments]    ${error text}
    #TODO ADD CHECKING RED COLOR
    ${error path}=   Replace String   ${CONNECT TO CLOUD PASSWORD ERROR}    %ERROR TEXT%    ${error text}
    Wait until element is visible    ${error path}

Connect To Cloud
    [Arguments]    ${email}    ${password}    ${success}=${True}
    Validate Connect To Cloud Form
    Fill in login and password    ${email}    ${password}
    Slow    Click Button    ${CONNECT TO CLOUD OK BUTTON}    timeout=0.1
    Run Keyword If    ${success}    Run Keywords
       ...    Check For Alert    System connected to Nx Cloud    AND
       ...    Wait until element is not visible    ${CONNECT TO CLOUD MODAL}    AND
       ...    Wait until element is visible   ${DISCONNECT FROM NX}

# API - based
Evaluate System Settings via API
    [Arguments]    ${auth}    ${server url}    ${key}    ${expected value}
    ${settings}=   Get System Settings From Server    ${auth}    ${server url}
    IF    '${IMAGE}' == '5.0'
        ${expected value}=   Convert To String    ${expected value}
        ${expected value}=   Replace String    ${expected value}    empty    ${EMPTY}
        ${expected value}=   Replace String    ${expected value}    true    True
        ${expected value}=   Replace String    ${expected value}    false    False
        ${expected value}=   Replace String    ${expected value}    "    '
        ${value}=   Convert To String    ${settings}[${key}]
        ${status}=   Run Keyword and Return Status    Should Contain    ${value}    {
        IF    ${status}
            ${value}=   Remove String    ${value}    ${SPACE}
        END
        Should Be Equal As Strings    ${value}    ${expected value}
        #Dictionary should contain item    ${settings}    ${key}    ${expected value}
    ELSE
        IF    '${expected value}' == 'True' or '${expected value}' == 'False'
            ${expected value}=   Convert To Lower Case    ${expected value}
        END
        Dictionary should contain item    ${settings}    ${key}    ${expected value}
    END

Evaluate Log Level via API
    [Arguments]    ${auth}    ${server url}    ${key}    ${value}
    ${logLevel}=   Get Log Level    ${auth}    ${server url}
    ${value}=    Convert To Lower Case    ${value}
    Dictionary should contain item    ${logLevel}    ${key}    ${value}


# Misc
Checkbox Is Selected
    [Arguments]    ${locator}    ${state}
    ${selected}=   Run Keyword and Return Status    Element Attribute Value Should Be     ${locator}${visible}//span    class    tick checked
    Should Be True    ${selected} == ${state}


Show Advanced Settings
    ${location}=   Get Location
    Go To    ${location}${ADVANCED SETTINGS}

Reset Settings To Default
    [Arguments]    ${auth}    ${server url}
    IF    "${IMAGE}" == "5.0" or "${IMAGE}" == "5.1"
        Set System Settings    ${auth}    ${server url}    ${default settings5}
    ELSE
        Set System Settings    ${auth}    ${server url}    ${default settings}
    END

System Offline Suite Setup
    Open browser and go to URL    ${ENV}
    ${owner}=   Register and activate account with random email    System     Owner    ${BASE PASSWORD}
    ${rand}=   Generate Random String      length=5
    ${system}=   Create Base System    system_admin_offline_1_${rand}    image=${IMAGE}    owner=${owner}
    Set Suite Variable    ${system}
    Stop Docker Server    ${system}[id]
    ${extra system}=   Create Base System    system_admin_offline_2_${rand}    image=${IMAGE}    owner=${owner}
    Set Suite Variable    ${extra system}
    Sleep    30
    Go to    ${ENV}

System Offline Suite Teardown
    Delete Base System    ${system}
    Delete Base System    ${extra system}
    Close All Browsers

System Offline Restart
    Common Restart Logout    ${ENV}
    Log in to user and system   ${system}[cloudOwner]    ${system}[id]
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}    ${DISCONNECT FROM NX}    ${USERS LIST LINK}