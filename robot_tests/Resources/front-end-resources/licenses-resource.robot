*** Keywords ***
LM Suite Set Up
    FOR   ${i}    IN RANGE    1    4
        ${cont name}=   Run Container    ${IMAGE 4.0}    ${LM PORT ${i}}    network=bridge
        Set Suite Variable    ${cont ${i}}    ${cont name}
        ${cont id}=   Get Container Id    ${cont ${i}}
        Set Suite Variable    ${cont id ${i}}    ${cont id}
        ${server name}=   Catenate    SEPARATOR=${SPACE}    Server    ${cont id ${i}}
        Set Suite Variable    ${server ${i}}    ${server name}
        ${sys id}=   Create system and attach to cloud    ${LOCALHOST}   ${LM PORT ${i}}    System ${i}    ${LM OWNER}    ${BASE PASSWORD}
        Set Suite Variable    ${sys id ${i}}    ${sys id}
        Change License Portal Host    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT ${i}}    http://nxlicensed.test.hdw.mx/
    END
    Sleep    90     # Make all systems available on cloud
    Merge Systems    ${CLOUD AUTH}    ${sys id 2}    ${sys id 3}

    FOR    ${role}    IN    @{LM USERS.keys()}
        Share    ${cloud auth}    ${sys id 1}    ${role}    ${LM USERS}[${role}]
    END

    Open Browser and go to URL    ${ENV}


LM Suite Teardown
    FOR   ${i}    IN RANGE    1    4
        Stop Container    ${cont ${i}}    remove=True
    END
    ${systems}=   Get Account Systems    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}
    FOR   ${sys id}    IN    @{systems}
        Disconnect    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}    ${sys id}
    END
    Close All Browsers

LM Test Restart
    Log Out
    FOR    ${i}    IN RANGE    1    4
        Start Container    ${cont ${i}}
    END

Open Licenses Page
    Wait Until Element Is Visible    ${LICENSES LINK}
    Click Link    ${LICENSES LINK}

Validate Licenses Page
    [Arguments]    ${several servers}=${False}    ${clean}=${False}
    Wait Until Elements Are Visible
    ...    ${NEW LICENSE HEADER}
    ...    ${LICENSE KEY INPUT}
    ...    ${ACTIVATE BUTTON}
    Run Keyword If    ${several servers}    Wait Until Elements Are Visible
        ...    ${BIND TO SERVER DROPDOWN}
        ...    ${SERVER MUST BE AVAILABLE}
    Run Keyword If    ${clean}    Wait Until Elements Are Visible
        ...    ${ACTIVATE TRIAL TEXT}
        ...    ${ACTIVATE TRIAL BUTTON}

Activate Key
    [Arguments]    ${key}    ${success}=${True}    ${server name}=${EMPTY}    ${error text}=${EMPTY}
    Input Text    ${LICENSE KEY INPUT}    ${key}
    Run Keyword Unless    '${server name}' == '${EMPTY}'    Run Keywords
    ...    Click Button    ${BIND TO SERVER DROPDOWN}
    ...    AND    Click Link    ${BIND TO SERVER DROPDOWN}/following-sibling::div//a[span[contains(text(), "${server name}")]]
    Sleep    0.5    # To avoid clicking the button before key is completely input
    Click Button    ${ACTIVATE BUTTON}
    Run Keyword If    ${success}     Check For Alert    ${LICENSE IS ACTIVATED TEXT}
    ...    ELSE    Wait Until Element Is Visible    //span[contains(text(), "${error text}")]

Validate Input Error
    [Arguments]    ${error text}
    Wait Until Element Is Visible   ${ACTIVATE TRIAL FORM}//span[contains(text(), "${error text}")]
    ${class}=   Get Attribute    ${LICENSE KEY INPUT}
    Should Contain    ${class}    ng-dirty ng-touched ng-invalid

Activate Trial
    Wait Until Elements Are Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}
    Click Button    ${ACTIVATE TRIAL BUTTON}
    Check For Alert    ${TRIAL LICENSE ACTIVATED TEXT}

Number of Channels
    [Arguments]      ${type}
    ${num}=   Get Text    ${LICENSES SUMMARY RECORD}//td[contains(text(), "${type}")]/following-sibling::td[1]
    ${num}=   Convert To Integer    ${num}
    [Return]    ${num}

Number of Channels Available
    [Arguments]      ${type}
    ${num}=   Get Text    ${LICENSES SUMMARY RECORD}//td[contains(text(), "${type}")]/following-sibling::td[2]
    ${num}=   Convert To Integer    ${num}
    [Return]    ${num}

Validate License Info
    [Arguments]    ${key}    ${port}=${LM PORT 1}
    ${key info}=   Get key info from server    ${CLOUD AUTH}    ${LOCALHOST}:${port}    ${key}
    ${key params}=   Get Child WebElements    //header[h4="${key}"]/../../following-sibling::nx-section/div//div[contains(@class, "values")]

    @{supp_params}=   Create List    Status    Server
    FOR    ${p}    IN    @{key params}
        ${title}=   Get Element Attribute    ${p}    title
        @{key-value}=  Split String    ${title}    separator=-
        ${key}=   Set Variable    ${key-value}[0]
        ${value}=   Set Variable    ${key-value}[1]
        Run Keyword Unless    $key in $supp_params   Should Be Equal As Strings    ${value}    ${key info}[${key}]
    END