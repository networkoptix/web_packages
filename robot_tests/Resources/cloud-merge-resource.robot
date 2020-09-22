*** Keywords ***
Merge Suite Setup
    Open Browser and go to url    ${ENV}
    Set Suite Variable    @{test containers}    @{EMPTY}
    ${id}=   Create Custom Network    custom1    1
    Set Suite Variable    ${custom net id 1}    ${id}
    ${id}=   Create Custom Network    custom2   2
    Set Suite Variable    ${custom net id 2}    ${id}

Merge Test Restart
    Remove Test Containers
    Close All Browsers
    Open Browser and go to url    ${ENV}

Merge Test Teardown
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}    2
    Run Keyword If    ${status}    Log Out via API
    Remove Test Containers

Merge Suite Teardown
    Close All Browsers
    Remove Test Containers
    Remove Custom Network    ${custom net id 1}
    Remove Custom Network    ${custom net id 2}

Remove Test Containers
    FOR    ${c}    IN    @{test containers}
        Stop Container    ${c}    remove=True
        Remove Values From List    ${test containers}    ${c}
    END

Setup System
    [Arguments]    ${port}    ${image}=${IMAGE 4.1}    ${network}=bridge    ${cloud email}=${None}
    ${system}=   Create Dictionary    name=${image}_${port}    port=${port}
    ${cont}=   Run Container    ${image}    ${port}    network=${network}
    Append To List    ${test containers}    ${cont}
    Set To Dictionary    ${system}    cont=${cont}
    ${auth}=   Create List    admin    ${base password}
    Setup Local System    ${HOST}:${port}    ${base password}    ${system}[name]

#   Connect system to cloud if email is not None
    ${mock list}=   Create List
    Run Keyword If    $cloud_email    Append To List    ${mock list}    1
    FOR    ${i}    IN    @{mock list}
        Set To Dictionary    ${system}    owner=${cloud email}
        ${id}=   Connect System to Cloud    ${auth}   ${HOST}:${port}    ${system}[name]    ${system}[owner]    ${base password}
        Set To Dictionary    ${system}    id=${id}
    END
    [Return]    ${system}

Validate Check Merge Dialog
    [Arguments]      ${lonely}=${False}
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE NEXT BUTTON}
    Run Keyword If    ${lonely}    Wait Until Elements Are Visible
    ...    ${MERGE FORM SERVER URL INPUT}
    ...    ${MERGE ENTER THE ADDRESS}
    ...    ELSE    Wait Until Elements are Visible
        ...    ${MERGE CURRENT SYSTEM WITH}
        ...    ${MERGE SYSTEM DROPDOWN}

Validate Admin Password Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE X BUTTON}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE NEXT BUTTON}
    ...    ${MERGE ADMIN FORM LOGIN LABEL}
    ...    ${MERGE ADMIN FORM LOGIN INPUT}
    ...    ${MERGE ADMIN FORM PASSWORD LABEL}
    ...    ${MERGE ADMIN FORM PASSWORD INPUT}

    ${auto populated login}=   Get Element Attribute    ${MERGE ADMIN FORM LOGIN INPUT}    value
    Should Be Equal As Strings    ${auto populated login}    admin
    ${disabled}=   Get Element Attribute    ${MERGE ADMIN FORM LOGIN INPUT}    disabled
    Should Be Equal As Strings    ${disabled}    true

Validate Choose Primary Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE X BUTTON}
    ...    ${MERGE RADIO FIRST SYSTEM}
    ...    ${MERGE RADIO SECOND SYSTEM}
    ...    ${MERGE TAKE SYSTEM NAME}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE NEXT BUTTON}

Validate Confirm Merge Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE ENTER YOUR PASSWORD}
    ...    ${MERGE PASSWORD INPUT}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE SYSTEMS BUTTON}

Validate Merge Failed Dialog
#    [Arguments]    ${system}    ${server}
#    ${s}=  Replace String    ${FAILED TO MERGE SYSTEM TEXT}    %SYSTEM%    ${system}
#    ${s}=  Replace String    ${s}    %URL%    ${server}
#    ${error text}=   Get Text    //div[@class="modal-content"]//p/p[1]
#    Should Contain    ${error text}    ${s}
    Run keyword and continue on failure    Wait Until Elements Are Visible
#    ...    //*[contains(text(), "${s}")]
    ...    ${MERGE FAILED DIALOG HEADER}
    ...    ${MERGE FAILED X BUTTON}
    ...    ${MERGE FAILED OK BUTTON}

Validate General Error Dialog
    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE TRY AGAIN BUTTON}

Validate Merge
    [Arguments]    ${primary}    ${secondary}    ${on secondary}=${False}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Run Keyword If    ${on secondary}    Wait Until Element Is Visible    //h2[contains(text(), "${THIS SYSTEM IS BEING MERGED TEXT}") and contains(text(), "${primary}")]
    ...    ELSE    Wait Until Element Is Visible    //div[strong="${secondary}" and contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
    ${s}=   Replace String    ${SYSTEM MERGE COMPLETED TEXT}    %PRIMARY%    ${primary}
    ${s}=   Replace String    ${s}    %SECONDARY%    ${secondary}
    Run keyword and continue on failure    Check For Alert    ${s}



Validate System and Server Merge
    [Arguments]    ${system}    ${server}
    ${s}=   Replace String    ${SYSTEM MERGE COMPLETED TEXT}    %PRIMARY%    ${primary}
    ${s}=   Replace String    ${s}    %SECONDARY%    ${secondary}
    Run keyword and continue on failure    Check For Alert    ${s}

Choose System From Dropdown
    [Arguments]
    ...    ${target system name}
    ...    ${target system ip}=${EMPTY}
    ...    ${target system port}=${EMPTY}
    ...    ${input url}=${EMPTY}
    ...    ${check url}=${False}

    Click Element    ${MERGE SYSTEM DROPDOWN}
    Sleep   1
    ${menu shown}=   Run Keyword and Return Status    Element Should Be Visible    ${MERGE SYSTEMS MENU}
    Run Keyword Unless    ${menu shown}    Click Element    ${MERGE SYSTEM DROPDOWN ARROW}
    Wait Until Element Is Visible    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]
    # TODO: add validating server info in dropdown if check url==${True}
    Click Element    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]
    Run Keyword Unless     ${check url}==${False}    Wait Until Elements Are Visible    ${MERGE FORM SERVER URL LABEL}    ${MERGE FORM SERVER URL INPUT}
    ${url placeholder}=   Run Keyword And Return If    ${check url}==${True}    Get Element Attribute    ${MERGE FORM SERVER URL INPUT}    placeholder
    Run Keyword If    ${check url}==${True}    Should Be Equal As Strings    ${url placeholder}    host: port
    # TODO: add auto-populated url verification(there is no text in DOM now) if check url==${True}
    Run Keyword Unless     '${input url}'=='${EMPTY}'    Input Text    ${MERGE FORM SERVER URL INPUT}    ${target system ip}:${target system port}

Choose Primary System
    [Arguments]    ${from target}=${False}
    Validate Choose Primary Dialog
    Run Keyword If    ${from target}==${True}    Click Element    ${MERGE RADIO SECOND SYSTEM}
    # TODO: make sure choice is changed if ${from target}=${True}

Complete merge steps till final password input
    [Arguments]
    ...    ${target system name}
    ...    ${target system ip}=${EMPTY}
    ...    ${target system port}=${EMPTY}
    ...    ${input url}=${EMPTY}
    ...    ${check url}=${False}
    ...    ${from target}=${False}

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown   ${target system name}    ${target system ip}    ${target system port}    ${input url}    ${check url}
    Validate Check Merge Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Run keyword and ignore error    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Choose Primary System    ${from target}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog
