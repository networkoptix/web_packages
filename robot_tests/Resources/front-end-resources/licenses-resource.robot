*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
LM Suite Set Up
    FOR   ${i}    IN RANGE    1    4
        ${rand}=   Generate Random String
        ${system}=   Create Base System    license_system_${i}_${rand}    network=bridge
        Change License Portal Host    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system}[port]   ${LM HOST}
        Set Suite Variable    ${system ${i}}    ${system}
        ${server name}=   Catenate    SEPARATOR=${SPACE}
        Set Suite Variable    ${server ${i}}    Server ${system}[id]
    END
    Sleep    10

    Merge Systems Local    ${LOCAL AUTH}    admin:${BASE PASSWORD}    https://${QA BURBANK IP}:${system 2}[port]    ${QA BURBANK IP}:${system 3}[port]    currentPassword=${BASE PASSWORD}
    Sleep    10

    FOR    ${i}    IN RANGE    1    3
        ${id}=   Connect System to Cloud    ${system ${i}}[local auth]    https://${QA BURBANK IP}:${system ${i}}[port]    ${system ${i}}[name]    ${LM OWNER}    ${BASE PASSWORD}
        Set To Dictionary    ${system ${i}}    cloud id=${id}
        Set To Dictionary    ${system ${i}}    cloud auth=${cloud auth}
    END

    FOR    ${role}    IN    @{LM USERS.keys()}
        Save User
            ...    ${LOCAL AUTH}
            ...    https://${QA BURBANK IP}:${system 1}[port]
            ...    ${LM USERS}[${role}]
            ...    ${permissions}[${role}]
            ...    ${LM USERS}[${role}]
            ...    LM ${role}
            ...    password=${BASE PASSWORD}
        #    ...    is_cloud=${True}
        Sleep   1
    END
    Sleep    30
    Open Browser and go to URL    ${ENV}

LM Suite Teardown
#    ${systems}=   Get Account Systems    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}
#    FOR   ${sys}    IN    @{systems}
#        Disconnect    ${ENV}    ${LM OWNER}    ${BASE PASSWORD}    ${sys}[id]
#    END
#    FOR   ${i}    IN RANGE    1    4
#        Delete Docker Server    ${system ${i}}[id]
#    END
    FOR   ${i}    IN RANGE    1    4
        Delete Base System    ${system ${i}}
    END
    Close All Browsers

LM Test Restart
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}    2
    Run Keyword If    ${status}    Log Out
    FOR    ${i}    IN RANGE    1    4
        Start Docker Server    ${system ${i}}[id]
        Sleep    10
        Change License Portal Host    ${LOCAL AUTH}    https://${QA BURBANK IP}:${system ${i}}[port]    ${LM HOST}
    END

Remove all keys from system
    [Arguments]    ${port}    #${name}
    ${licenses}=   Get Licenses    ${LOCAL AUTH}    https://${QA BURBANK IP}:${port}
    FOR    ${lic}    IN    @{licenses}
        Remove License    ${LOCAL AUTH}    https://${QA BURBANK IP}:${port}    ${lic}[key]
    END
    Restart Server    https://${QABURBANK IP}:${port}    ${LOCAL AUTH}
    Sleep    30
    [Return]    ${port}

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
    IF    '${server name}' != '${EMPTY}'
        Click Button    ${BIND TO SERVER DROPDOWN}
        Sleep    2
        Click Link    ${BIND TO SERVER DROPDOWN}/following-sibling::div//a[span[contains(text(), "${server name}")]]
    END
    Sleep    2    # To avoid clicking the button before key is completely input
    Click Button    ${ACTIVATE BUTTON}
    Run Keyword If    ${success}    Run Keywords
        ...    Check For Alert    ${LICENSE IS ACTIVATED TEXT}
        ...    AND    Verify license is listed first    ${key}
        ...    AND    Wait Until Element Is Not Visible    ${NEW LICENSE FORM}//span[contains(@class, "input-error")]
    IF    '${error text}' != '${EMPTY}'
        Validate Input Error     ${error text}
    END

Activate Trial
    Wait Until Elements Are Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}
    Slow    Click Button    ${ACTIVATE TRIAL BUTTON}    timeout=1
    Check For Alert    ${TRIAL LICENSE ACTIVATED TEXT}
    Wait Until Elements Are Not Visible    ${ACTIVATE TRIAL TEXT}    ${ACTIVATE TRIAL BUTTON}
#    Commented out due to CLOUD-5714
#    ${input val}=   Get Formatted Key Input
#    Should Be Equal As Strings    ${input val}    ${EMPTY}

Get Formatted Key Input
    ${formatted key}=   Get Hidden Inner HTML    ${FORMATTED KEY}
    [Return]    ${formatted key}

Validate Input Error
    [Arguments]    ${error text}
    Run keyword and continue on failure    Wait Until Element Is Visible   ${NEW LICENSE FORM}//span[contains(text(), "${error text}")]
    ${class}=   Get Element Attribute    ${LICENSE KEY INPUT}    class
    FOR    ${val}    IN    ng-dirty    ng-touched    ng-invalid
        Should Contain    ${class}    ${val}
    END
    Run keyword and continue on failure    Wait Until Element Has Style    ${LICENSE KEY INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Run keyword and continue on failure    Wait Until Element Has Style    ${LICENSE KEY INPUT}    border-color    ${ERROR COLOR}
    Run keyword and continue on failure    Wait Until Element Has Style    ${NEW LICENSE FORM}//span[contains(text(), "${error text}")]    color    ${ERROR COLOR WITH OPACITY}

Validate Input Normal State
    Run keyword and continue on failure    Wait Until Element Has Style    ${LICENSE KEY INPUT}    color    rgba(43, 56, 63, 1)    #${DISABLED TEXT COLOR}
    Run keyword and continue on failure    Wait Until Element Has Style    ${LICENSE KEY INPUT}    border-color    rgb(205, 215, 220)    #rgb(47, 162, 219)

# Licenses Summary
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

# Licenses Details
Verify license is listed first
    [Arguments]    ${key}
    ${first license}=   Get Text    ${FIRST LICENSE}
    Should Be Equal As Strings    ${first license}    ${key}

Get Key Server
    [Arguments]    ${key}
    ${server path}=   Set Variable    //header[h4="${key}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Server")]
    ${server}=   Get Text    ${server path}
    ${class}=   Get Element Attribute    ${server path}    class
    Run Keyword If    '''${server}''' == '''Server not found'''    Run Keywords
        ...    Should Contain    ${class}    error
        ...    AND    Wait Until Element Has Style    ${server path}    color    ${ERROR COLOR WITH OPACITY}
    [Return]    ${server}

Get Key Status
    [Arguments]    ${key}
    ${status path}=   Set Variable    //header[h4="${key}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]//p[contains(@title, "Status")]
    ${status}=   Get Text    ${status path}
    ${class}=   Get Element Attribute    ${status path}    class
    Run Keyword If    '${status}' in ['Error', 'Expired']    Run Keywords
        ...    Should Contain    ${class}    error
        ...    AND    Wait Until Element Has Style    ${status path}    color    ${ERROR COLOR WITH OPACITY}
    [Return]    ${status}

Validate License Info
    [Documentation]   Verify the key's info on server is the same as on cloud
    [Arguments]    ${key}    ${status}=OK    ${server num}=1
    ${key info}=   Get key info from server    ${CLOUD AUTH}    https://${QA BURBANK IP}:${system ${server num}}[port]    ${key}
    ${key params}=   Get Child WebElements    //header[h4="${key}"]/../following-sibling::nx-section/div//div[contains(@class, "values")]

    @{supp_params}=   Create List    Status    Server
    FOR    ${p}    IN    @{key params}
        ${style}=   Get Element Attribute    ${p}    style
        ${visible}=   Run Keyword And Return Status    Should Not Contain    ${style}    display: none
        IF    ${visible} == ${False}
            Continue For Loop
        END

        ${title}=   Get Element Attribute    ${p}    title
        @{kv}=  Split String    ${title}    separator=-
        ${k}=   Set Variable    ${kv}[0]
        ${v}=   Set Variable    ${kv}[1]
        IF    $k not in ${supp_params}
            Should Be Equal As Strings    ${v}    ${key info}[${k}]
        END
    END

    ${key status}=   Get Key Status    ${key}
    ${key server}=   Get Key Server    ${key}
    Run keyword and continue on failure     Should Be Equal As Strings    ${key status}    ${status}
    Run keyword and continue on failure     Should Be Equal As Strings    ${key server}    ${server ${server num}}
