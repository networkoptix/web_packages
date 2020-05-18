*** Settings ***
Resource          ../resource.robot
Resource          ../APIresource.robot
Library           ../NoptixLibrary/

Suite Setup       Open Browser and go to url    ${ENV}
Test Teardown     Run Keyword If Test Failed    Reset Systems State
Suite Teardown    Run Keywords    Reset Systems State    Close All Browsers
Force Tags        Threaded File    merge

*** Variables ***
${email 1 owner}           qaburbank+mergeowner1@gmail.com
${email 2 owner}           qaburbank+mergeowner2@gmail.com
${password}                ${BASE PASSWORD}
@{auth}                    admin    ${BASE PASSWORD}
${server 1 ip}             http://10.1.5.125:7001     # VMS 4.1
${server 2 ip}             http://10.1.5.151:7001     # VMS 4.1
${server 3 ip}             http://10.1.5.145:7001     # VMS 4.0
${server 4 ip}             http://10.1.5.192:7001     # VMS 4.0
${server 5 ip}             http://10.1.5.163:7001     # VMS 3.2
${server 1 name}           vpc1-ub18
${server 2 name}           vpc2-ub18
${server 3 name}           vpc3-ub18
${server 4 name}           vpc4-ub18
${server 5 name}           vpc5-ub18

${docker 3.2 server ip}    http://10.1.5.158
${docker server name}      docker_3_2
${docker server port}      7004

*** Keywords ***
Validate Check Merge Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE NEXT BUTTON}
    ...    ${MERGE CURRENT SYSTEM WITH}
    ...    ${MERGE SYSTEM DROPDOWN}
#    ...    ${MERGE ONLY AS OWNER}

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
    ...    ${MERGE NEXT BUTTON}

Validate System Page
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    ...    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    180

Validate Merge
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    #TODO: add checking the merge text appears and Merge and Disconnect buttons are disabled during the merge.
    Run keyword and continue on failure    Check For Alert    ${SYSTEM MERGE COMPLETED TEXT}

Choose System From Dropdown
    [Arguments]
    ...    ${target system name}
    ...    ${target system ip}=${EMPTY}
    ...    ${target system port}=${EMPTY}
    ...    ${input url}=${EMPTY}
    ...    ${check url}=${False}

    Click Element    ${MERGE SYSTEM DROPDOWN}
    Wait Until Element Is Visible    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]
    # TODO: add validating server info in dropdown if check url==${True}
    Click Element    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]
    Run Keyword Unless     ${check url}==${False}    Wait Until Elements Are Visible    ${MERGE FORM SERVER URL LABEL}    ${MERGE FORM SERVER URL INPUT}
    ${url placeholder}=   Run Keyword And Return If    ${check url}==${True}    Get Element Attribute    ${MERGE FORM SERVER URL INPUT}    placeholder
    Run Keyword If    ${check url}==${True}    Should Be Equal As Strings    ${url placeholder}    host: port
    # TODO: add auto-populated url verification(there is no text in DOM now) if check url==${True}
    Run Keyword Unless     '${input url}'=='${EMPTY}'    Input Text    ${MERGE FORM SERVER URL INPUT}    ${target system ip}${target system port}

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

Reset Systems State
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    Disconnect all systems from the account    ${email 2 owner}    ${password}
    FOR    ${i}    IN RANGE    1  5
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END
    Close Browser
    Open Browser and go to url    ${ENV}

*** Test Cases ***
Merge button should be available if there is only one system connected to cloud
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    # Sometimes system settings and merge button are not loaded without restarting the servers
    # and reloading the system's page after. See CLOUD-4758
    Restart Server    ${server 1 ip}    ${auth}
    Sleep    60
    Reload Page
    Validate System Page

    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server 1 ip}    ${auth}
    Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server 1 ip}    ${password}     ${server 1 name}


# Positive cases
Owner can merge two 4.1 systems
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Connect system to cloud    ${auth}    ${server 2 ip}        ${server 2 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Wait Until Elements Are Visible    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    Restart Server    ${server 1 ip}    ${auth}
    Restart Server    ${server 2 ip}    ${auth}
    Sleep    120

    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    Reload Page

    Validate System Page
    Complete merge steps till final password input    target system name=${server 2 name}
    Input Text    ${MERGE PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Merge

    # Only one system should left in the account
    Go to    ${ENV}/systems
    Validate System Page
    # TODO: validate new local systems settings via API

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN RANGE    1  3
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END

Owner can merge two 4.0 systems
    Connect system to cloud    ${auth}    ${server 3 ip}        ${server 3 name}    ${email 1 owner}    ${password}
    Connect system to cloud    ${auth}    ${server 4 ip}        ${server 4 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Wait Until Elements Are Visible
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 3 name}")]
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 4 name}")]
    Restart Server    ${server 3 ip}    ${auth}
    Restart Server    ${server 4 ip}    ${auth}
    Sleep    120

    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 3 name}")]
    Reload Page

    Validate System Page
    Complete merge steps till final password input    target system name=${server 4 name}    from target=${True}
    Input Text    ${MERGE PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Merge
    # Only one system should left in the account
    Go to    ${ENV}/systems
    Validate System Page
    # TODO: validate new local systems settings via API

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN RANGE    3  5
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END

Owner can merge 4.1 with local 4.1 system
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Restart Server    ${server 1 ip}    ${auth}
    Sleep    60
    Reload Page

    Validate System Page
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown    ${server 2 name}    ${server 2 ip}        check url=${True}
    Validate Check Merge Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}
    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    incorrect_password
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Click Button    ${MERGE GO BACK BUTTON}
    Validate Check Merge Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog
    Wait Until Element Is Not Visible    ${MERGE PASSWORD INCORRECT}

    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog
    Input Text    ${MERGE PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}

    # Only one system should left in the account
    Go to    ${ENV}/systems
    Validate System Page
    # TODO: validate new local systems settings via API

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN RANGE    1  3
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END

Owner can merge 4.0 with local 4.0 system
    Connect system to cloud    ${auth}    ${server 3 ip}        ${server 3 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Restart Server    ${server 3 ip}    ${auth}
    Sleep    60
    Reload Page

    Validate System Page
    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown    ${server 4 name}    ${server 4 ip}        check url=${True}
    Validate Check Merge Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Validate Admin Password Dialog

    Input Text    ${MERGE ADMIN FORM PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog
    Input Text    ${MERGE PASSWORD INPUT}    ${password}
    Click Button    ${MERGE NEXT BUTTON}

    # Only one system should left in the account
    Go to    ${ENV}/systems
    Validate System Page
    # TODO: validate new local systems settings via API

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN RANGE    3  5
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END

# Negative cases
Invalid and empty password
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Connect system to cloud    ${auth}    ${server 2 ip}        ${server 2 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Wait Until Elements Are Visible
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    Restart Server    ${server 1 ip}    ${auth}
    Restart Server    ${server 2 ip}    ${auth}
    Sleep    60

    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    Reload Page

    Validate System Page
    Complete merge steps till final password input    ${server 2 name}

    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}

    Input Text    ${MERGE PASSWORD INPUT}    incorrect_password
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Click Button    ${MERGE X BUTTON}
    Wait Until Element Is Not Visible    ${MERGE FORM}
    Validate System Page
    Go To    ${ENV}/systems
    Wait Until Elements Are Visible
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN RANGE    1  3
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END

Invalid and empty URLs
    [Tags]    inc
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Restart Server    ${server 1 ip}    ${auth}
    Sleep    60

    Reload Page
    Sleep    60
    Validate System Page

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${OTHER SYSTEM}
    Click Button    ${MERGE NEXT BUTTON}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE ENTER SERVER ADDRESS}

    Input Text    ${MERGE FORM SERVER URL INPUT}    incorrect_text_url
    Click Button    ${MERGE NEXT BUTTON}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE INVALID URL}

    Input Text    ${MERGE FORM SERVER URL INPUT}    10.1.5
    Click Button    ${MERGE NEXT BUTTON}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE INVALID URL}

    Input Text    ${MERGE FORM SERVER URL INPUT}    10.10.5.5:7777
    Click Button    ${MERGE NEXT BUTTON}
    # Fails due to incorrect error message
    Run keyword and continue on failure    Wait Until Element Is Visible    ${MERGE SERVER NOT FOUND}
    Click Button    ${MERGE X BUTTON}

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
    Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}

Incompatible Servers
    Connect system to cloud    ${auth}    ${server 1 ip}        ${server 1 name}    ${email 1 owner}    ${password}
    Connect system to cloud    ${auth}    ${server 3 ip}        ${server 3 name}    ${email 1 owner}    ${password}
    Log In    ${email 1 owner}    ${password}
    Wait Until Elements Are Visible
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 3 name}")]
    Restart Server    ${server 1 ip}    ${auth}
    Restart Server    ${server 2 ip}    ${auth}
    Sleep    60

    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    Reload Page
    Validate System Page

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${server 3 name}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${SYSTEM HAS AN OLDER SOFTWARE VERSION}

    Choose System From Dropdown    ${server 5 name}
    Wait Until Element Is Visible    ${SERVER HAS AN OLDER SOFTWARE VERSION}

    Go To    ${ENV}/systems
    Wait Until Elements Are Visible
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    ...    ${SYSTEMS TILE}//h2[contains(text(),"${server 3 name}")]
    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 3 name}")]
    Reload Page
    Validate System Page

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${server 1 name}
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${SYSTEM HAS A NEWER SOFTWARE VERSION}
    Click Button    ${MERGE X BUTTON}
    Validate System Page

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog
    Choose System From Dropdown    ${server 5 name}
    Wait Until Element Is Visible    ${SERVER HAS AN OLDER SOFTWARE VERSION}
    Click Button    ${MERGE X BUTTON}
    Validate System Page

    # Teardown
    Log Out
    Disconnect all systems from the account    ${email 1 owner}    ${password}
    FOR    ${i}    IN    1    3
        Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server ${i} ip}    ${auth}
        Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server ${i} ip}    ${password}     ${server ${i} name}
    END


