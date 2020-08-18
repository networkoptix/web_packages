*** Keywords ***
LM Suite Set Up
    FOR   ${i}    IN RANGE    1    4
        ${cont name}=   Run Container    ${IMAGE 4.1}    ${LM PORT ${i}}    network=bridge
        Set Suite Variable    ${cont ${i}}    ${cont name}
        ${cont id}=   Get Container Id    ${cont ${i}}
        Set Suite Variable    ${cont id ${i}}    ${cont id}
        ${server name}=   Catenate    SEPARATOR=${SPACE}    Server    ${cont id ${i}}
        Set Suite Variable    ${server ${i}}    ${server name}
        ${sys id}=   Create system and attach to cloud    ${LOCALHOST}   ${LM PORT ${i}}    System ${i}    ${LM OWNER}    ${BASE PASSWORD}
        Set Suite Variable    ${sys id ${i}}    ${sys id}
        Change License Portal Host    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT ${i}}    ${LM HOST}
    END
    Sleep    120
    Merge Systems    ${CLOUD AUTH}    ${sys id 2}    ${sys id 3}
#    Merge Cloud Systems    ${ENV}    ${sys id 2}    ${sys id 3}    ${LM OWNER}    ${BASE PASSWORD}
    Sleep    60

    FOR    ${role}    IN    @{LM USERS.keys()}
        Share    ${cloud auth}    ${sys id 1}    ${role}    ${LM USERS}[${role}]
    END

    Open Browser and go to URL    ${ENV}

LM Suite Teardown
    ${systems}=   Get Account Systems    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}
    FOR   ${sys id}    IN    @{systems}
        Disconnect    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}    ${sys id}
    END
    FOR   ${i}    IN RANGE    1    4
        Stop Container    ${cont ${i}}    remove=True
    END
    Close All Browsers

LM Test Restart
    Log Out
    FOR    ${i}    IN RANGE    1    4
        Start Container    ${cont ${i}}
        Change License Portal Host    ${CLOUD AUTH}    ${LOCALHOST}:${LM PORT ${i}}    ${LM HOST}
    END

Remove all keys from system
    [Arguments]    ${server url}    ${server auth}
    ${licenses}=   Get Licenses    ${server auth}    ${server url}
    FOR    ${lic}    IN    @{licenses}
        Remove License    ${server auth}    ${server url}    ${lic}[key]
    END
    Restart Server    ${server url}    ${server auth}

Open Licenses Page
    Wait Until Element Is Visible    ${LICENSES LINK}
    Click Link    ${LICENSES LINK}

Validate Licenses Page
    [Documentation]    trial left = activation of trial license is available, clean = no regular keys activated
    [Arguments]    ${several servers}=${False}    ${trial left}=${False}    ${clean}=${True}
    Wait Until Elements Are Visible
    ...    ${NEW LICENSE HEADER}
    ...    ${LICENSE KEY INPUT}
    ...    ${ACTIVATE BUTTON}
    ...    timeout=90

    Run Keyword If    ${several servers}    Wait Until Elements Are Visible
        ...    ${BIND TO SERVER DROPDOWN}
        ...    ${SERVER MUST BE AVAILABLE}
        ...    timeout=90
        ...    ELSE    Wait Until Elements Are Not Visible
             ...    ${BIND TO SERVER DROPDOWN}
             ...    ${SERVER MUST BE AVAILABLE}

    Run Keyword If    ${trial left}    Wait Until Elements Are Visible
        ...    ${ACTIVATE TRIAL TEXT}
        ...    ${ACTIVATE TRIAL BUTTON}
        ...    timeout=90
        ...    ELSE    Wait Until Elements Are Not Visible
             ...    ${ACTIVATE TRIAL TEXT}
             ...    ${ACTIVATE TRIAL BUTTON}

    Run Keyword If    ${clean}    Wait Until Elements Are Not Visible
        ...    ${LICENSES SUMMARY BLOCK}
        ...    ${LICENSES SUMMARY HEADER}
        ...    ${LICENSES SUMMARY THEAD}
        ...    ${LICENSES SUMMARY RECORD}
        ...    ELSE    Wait Until Elements Are Visible
            ...    ${LICENSES SUMMARY BLOCK}
            ...    ${LICENSES SUMMARY HEADER}
            ...    ${LICENSES SUMMARY THEAD}
            ...    ${LICENSES SUMMARY RECORD}
            ...    timeout=90

Activate Key
    [Arguments]    ${key}    ${success}=${True}    ${server name}=${EMPTY}    ${error text}=${EMPTY}
    Input Text    ${LICENSE KEY INPUT}    ${key}
    Run Keyword Unless    '${server name}' == '${EMPTY}'    Run Keywords
    ...    Click Button    ${BIND TO SERVER DROPDOWN}
    ...    AND    Sleep    1    # Avoid too fast clicking
    ...    AND    Click Link    ${BIND TO SERVER DROPDOWN}/following-sibling::div//a[span[contains(text(), "${server name}")]]
    Sleep    2    # To avoid clicking the button before key is completely input
    Click Button    ${ACTIVATE BUTTON}
    Run Keyword If    ${success}     Check For Alert    ${LICENSE IS ACTIVATED TEXT}
    Run Keyword Unless    '${error text}' == '${EMPTY}'   Wait Until Element Is Visible    //span[contains(text(), "${error text}")]    timeout=20

Validate Input Error
    [Arguments]    ${error text}
    Wait Until Element Is Visible   ${ACTIVATE TRIAL FORM}//span[contains(text(), "${error text}")]
    ${class}=   Get Element Attribute    ${LICENSE KEY INPUT}
    Should Contain    ${class}    ng-dirty ng-touched ng-invalid

Activate Trial
    Wait Until Elements Are Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}
    Click Button    ${ACTIVATE TRIAL BUTTON}
    Check For Alert    ${TRIAL LICENSE ACTIVATED TEXT}
    Wait Until Elements Are Not Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}

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

Validate Summary Record
    [Arguments]    ${type}    ${activated}    ${available}
    ${act}=   Number of Channels    ${type}
    ${av}=   Number of Channels Available    ${type}
    Should Be Equal As Numbers    ${act}    ${activated}
    Should Be Equal As Numbers    ${av}    ${available}

Validate License Info
    [Documentation]   Verify the key's info on server and on cloud is equal
    [Arguments]    ${key}    ${port}=${LM PORT 1}
    ${key info}=   Get key info from server    ${CLOUD AUTH}    ${LOCALHOST}:${port}    ${key}
    ${key params}=   Get Child WebElements    //header[h4="${key}"]/../../following-sibling::nx-section/div//div[contains(@class, "values")]

    @{supp_params}=   Create List    Status    Server
    FOR    ${p}    IN    @{key params}
        ${style}=   Get Element Attribute    ${p}    style
        ${visible}=   Run Keyword And Return Status    Should Not Contain    ${style}    display: none
        Run Keyword Unless    ${visible}    Continue For Loop

        ${title}=   Get Element Attribute    ${p}    title
        @{key-value}=  Split String    ${title}    separator=-
        ${key}=   Set Variable    ${key-value}[0]
        ${value}=   Set Variable    ${key-value}[1]
        Run Keyword Unless    $key in $supp_params   Should Be Equal As Strings    ${value}    ${key info}[${key}]
    END

Get Key Server
    [Arguments]    ${key}
    ${key path}=   Set Variable    //header[h4="${key}"]/../../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Server")]
    ${server}=   Get Text    ${key path}
    ${class}=   Get Element Attribute    ${key path}    class
    Run Keyword If    '''${server}''' == '''Server not found'''    Should Contain    ${class}    error
    [Return]    ${server}

Get Key Status
    [Arguments]    ${key}
    ${key path}=   Set Variable    //header[h4="${key}"]/../../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Status")]
    ${status}=   Get Text    ${key path}
    ${class}=   Get Element Attribute    ${key path}    class
    Run Keyword If    '''${status}''' == '''Error'''    Should Contain    ${class}    error
    [Return]    ${status}
