*** Settings ***
Resource          ../resource.robot
Resource          ../APIresource.robot
Library           ../NoptixLibrary/

Suite Setup       Open Browser and go to url    ${ENV}
Test Teardown     Run Keyword If Test Failed    Reset State
Suite Teardown    Close All Browsers

*** Variables ***
${email owner 1}    qaburbank+mergeowner1@gmail.com
${email owner 2}    qaburbank+mergeowner2@gmail.com
${email owner 3}    qaburbank+mergeowner3@gmail.com
${password}         ${BASE PASSWORD}
@{auth}             admin    ${password}
${server 1 ip}      http://10.1.5.138
${server 2 ip}      http://10.1.5.179
${server 3 ip}      http://10.1.5.186
${server 1 name}    vpc1-ub18
${server 2 name}    vpc2-ub18
${server 3 name}    vpc3-ub18
${server port}      7001


*** Keywords ***
Validate Check Merge Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE NEXT BUTTON}
    ...    ${MERGE CURRENT SYSTEM WITH}
    ...    ${MERGE SYSTEM DROPDOWN}
    ...    ${MERGE ONLY AS OWNER}

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

Disconnect all systems from the account
    [Arguments]    ${email}    ${password}
    ${systems}=   Get Account Systems   ${ENV}    ${email}    ${password}
    FOR    ${system id}    IN    @{systems}
        Disconnect    ${ENV}    ${email}    ${password}    ${system id}
    END

Reset State
    @{auth}=   Create List    admin    ${password}
    FOR    ${i}    IN RANGE    1  4
        Disconnect all systems from the account    ${email owner ${i}}    ${password}
        Restart Server    ${server ${i} ip}:${server port}    ${auth}
    END
    Close Browser
    Open Browser and go to url    ${ENV}

*** Test Cases ***
Wrong and empty password
    [Tags]    C54685
    ${system 1 id}=   Connect system to cloud    ${auth}    ${server 1 ip}    ${server port}    ${server 1 name}    ${email owner 1}    ${password}
    ${system 2 id}=   Connect system to cloud    ${auth}    ${server 2 ip}    ${server port}    ${server 2 name}    ${email owner 1}    ${password}
    Log In    ${email owner 1}    ${password}
    Wait Until Elements Are Visible    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    # Dirty hack - system settings and merge button are not loaded without restarting the servers
    # and reloading the system's page after. See CLOUD-4758
    Restart Server    ${server 1 ip}:${server port}    ${auth}
    Restart Server    ${server 2 ip}:${server port}    ${auth}
    Sleep    60

    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    Reload Page
    Wait Until Element is Visible    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    180
    Click Element    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}
    Validate Choose Primary Dialog

    Click Button    ${MERGE NEXT BUTTON}
    Validate Confirm Merge Dialog
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}
    Input Text    ${MERGE PASSWORD INPUT}    qwerasdf
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Press Keys    ${MERGE NEXT BUTTON}    ESCAPE

    Log Out
    Disconnect all systems from the account    ${email owner 1}    ${password}
    Restart Server    ${server 1 ip}:${server port}    ${auth}
    Restart Server    ${server 2 ip}:${server port}    ${auth}

Only one system connected to Cloud Account - Merge Button should be disabled
    Connect system to cloud    ${auth}    ${server 3 ip}    ${server port}    ${server 3 name}    ${email owner 1}    ${password}

    Log In    ${email owner 1}    ${password}
    Run keyword and expect error    *    Wait until element is visible    ${MERGE BUTTON SYSTEM}    5

    Log Out
    Disconnect all systems from the account    ${email owner 1}    ${password}
    Restart Server    ${server 3 ip}:${server port}    ${auth}

2 Systems: 1 as Owner & 1 as non-Owner
    [Tags]    deb
    ${system 1 id}=   Connect system to cloud    ${auth}    ${server 1 ip}    ${server port}    ${server 1 name}    ${email owner 1}    ${password}
    ${system 2 id}=   Connect system to cloud    ${auth}    ${server 2 ip}    ${server port}    ${server 2 name}    ${email owner 2}    ${password}

    @{auth}=   Create List    ${email owner 1}    ${password}
    Share    ${auth}    ${system 1 id}    &{ACCESS ROLES}[admin]    ${email owner 2}

    Log In    ${email owner 2}    ${password}
    Wait Until Element Is Visible    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    Restart Server    ${server 1 ip}:${server port}    ${auth}
    Restart Server    ${server 2 ip}:${server port}    ${auth}
    Sleep    60
    Wait Until Element Is Visible    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Enabled    ${MERGE BUTTON SYSTEM}    180

    Click Button    ${MERGE BUTTON SYSTEM}
#    Validate Check Merge Dialog

#    Wait Until Elements Are Visible
#    ...    ${MERGE NOT OWNER MESSAGE 2}
#    ...    ${MERGE DIALOG}//p[contains(text(),'${MERGE NOT OWNER MESSAGE 1 TEXT}')]
#    ...    ${MERGE OK BUTTON}
#    ...    ${MERGE X BUTTON}
#    Element Text Should Be    ${MERGE NOT OWNER MESSAGE 2}    ${MERGE NOT OWNER MESSAGE 2 TEXT}
#    Click Button    ${MERGE OK BUTTON}
#    Wait Until Element Is Not Visible    ${MERGE DIALOG}
#
#    Click Button    ${MERGE BUTTON SYSTEM}
#    Sleep    2
#    Wait Until Elements Are Visible
#    ...    ${MERGE NOT OWNER MESSAGE 2}
#    ...    ${MERGE DIALOG}//p[contains(text(),'${MERGE NOT OWNER MESSAGE 1 TEXT}')]
#    ...    ${MERGE OK BUTTON}
#    ...    ${MERGE X BUTTON}
#    Click Button    ${MERGE X BUTTON}
#    Wait Until Element Is Not Visible    ${MERGE DIALOG}
#
#    Click Button    ${MERGE BUTTON SYSTEM}
#    Sleep    2
#    Wait Until Elements Are Visible
#    ...    ${MERGE NOT OWNER MESSAGE 2}
#    ...    ${MERGE DIALOG}//p[contains(text(),'${MERGE NOT OWNER MESSAGE 1 TEXT}')]
#    ...    ${MERGE OK BUTTON}
#    ...    ${MERGE X BUTTON}
#    Press Keys    ${MERGE OK BUTTON}    ESCAPE
#    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    Press Keys    ${MERGE NEXT BUTTON}    ESCAPE
    Log Out
    Disconnect all systems from the account    ${email owner 1}    ${password}
    Disconnect all systems from the account    ${email owner 2}    ${password}
    Restart Server    ${server 1 ip}:${server port}    ${auth}
    Restart Server    ${server 2 ip}:${server port}    ${auth}