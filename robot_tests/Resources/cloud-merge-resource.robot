*** Keywords ***
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
#        ...    ${MERGE ONLY AS OWNER}

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
    [Arguments]    ${system}    ${server}
    ${s}=  Replace String    ${FAILED TO MERGE SYSTEM TEXT}    %SYSTEM%    ${system}
    ${s}=  Replace String    ${s}    %URL%    ${server}
    ${error text}=   Get Text    //div[@class="modal-content"]//p/p[1]
    Should Contain    ${error text}    ${s}
    Run keyword and continue on failure    Wait Until Elements Are Visible
#    ...    //*[contains(text(), "${s}")]
    ...    ${MERGE FAILED X BUTTON}
    ...    ${MERGE FAILED DIALOG HEADER}
    ...    ${MERGE FAILED OK BUTTON}

Validate System Page
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    ...    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    180

Validate Merge
    [Arguments]    ${primary}    ${secondary}
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Wait Until Element Is Visible    //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
    #TODO: add checking the merge text appears and Merge and Disconnect buttons are disabled during the merge.
    ${s}=   Replace String    ${SYSTEM MERGE COMPLETED TEXT}    %PRIMARY%    ${primary}
    ${s}=   Replace String    ${s}    %SECONDARY%    ${secondary}
#    Run keyword and continue on failure    Check For Alert    ${s}
    Run keyword and ignore error    Check For Alert    ${s}

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
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Choose Primary System    ${from target}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog

Disconnect all systems from the account
    [Arguments]    ${email}    ${password}
    ${systems}=   Get Account Systems   ${ENV}    ${email}    ${password}
    FOR    ${system id}    IN    @{systems}
        Disconnect    ${ENV}    ${email}    ${password}    ${system id}
    END

Merge Suite Setup
    Open Browser and go to url    ${ENV}
    Set Suite Variable    @{test containers}    @{EMPTY}

Merge Test Restart
    Reload Page
    Sleep    5
    ${logged in}=   Run Keyword and return Status    Element Should Be Visible    ${ACCOUNT DROPDOWN}
    Run Keyword If    ${logged in}    Log Out
    Go To    ${ENV}

Merge Suite Teardown
    Close All Browsers
    Remove Test Containers

Remove Test Containers
    FOR    ${c}    IN    @{test containers}
        Stop Container    ${c}    remove=True
    END

Reset Systems State
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    Disconnect all systems from the account    ${email 2 owner}    ${password}
    FOR    ${i}    IN RANGE    1  5
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END
    Close Browser
    Open Browser and go to url    ${ENV}