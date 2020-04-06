*** Settings ***
Resource          ../resource.robot
Resource          ../APIresource.robot
Library           ../NoptixLibrary/

Suite Setup       Open Browser and go to url    ${ENV}
#Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset State
Suite Teardown    Reset State

*** Variables ***
${email owner 1}    qaburbank+mergeowner1@gmail.com
${email owner 2}    qaburbank+mergeowner2@gmail.com
${email owner 3}    qaburbank+mergeowner3@gmail.com
${server 1 ip}      http://10.1.5.138
${server 2 ip}      http://10.1.5.179
${server 3 ip}      http://10.1.5.186
${server 1 name}    vpc1-ub18
${server 2 name}    vpc2-ub18
${server 3 name}    vpc3-ub18
${server port}      7001


*** Keywords ***
Disconnect all systems from the account
    [Arguments]    ${email}    ${password}
    ${systems}=   Get Account Systems   ${ENV}    ${email}    ${password}
    FOR    ${system id}    IN    @{systems}
        Disconnect    ${ENV}    ${email}    ${password}    ${system id}
    END

Reset State
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    FOR    ${i}    IN RANGE    1  3
        Disconnect all systems from the account    ${email owner ${i}}    ${BASE PASSWORD}
        Restart Server    ${server ${i} ip}:${server port}    ${auth}
    END
    Close Browser
    Open Browser and go to url    ${ENV}

*** Test Cases ***
Wrong and empty password
    [Tags]    C54685
    @{auth}=    Create List    admin    ${BASE PASSWORD}
    ${system 1 id}=   Connect system to cloud    ${auth}    ${server 1 ip}    ${server port}    ${server 1 name}    ${email owner 1}    ${BASE PASSWORD}
    ${system 2 id}=   Connect system to cloud    ${auth}    ${server 2 ip}    ${server port}    ${server 2 name}    ${email owner 1}    ${BASE PASSWORD}

    Log In    ${email owner 1}    ${BASE PASSWORD}
    Wait Until Elements Are Visible    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]    ${SYSTEMS TILE}//h2[contains(text(),"${server 2 name}")]
    Click Element    ${SYSTEMS TILE}//h2[contains(text(),"${server 1 name}")]
    # Reloading is added to get the merge button available. Sometimes it works :) See CLOUD-4758
    Reload Page
    Sleep    2
    Wait Until Element Is Visible    ${MERGE BUTTON SYSTEM}    180
    Click Button    ${MERGE BUTTON SYSTEM}

    # Merge dialog state 1
    Wait Until Elements Are Visible
    ...    ${MERGE DIALOG}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE NEXT BUTTON}
    ...    ${MERGE CURRENT SYSTEM WITH}
    ...    ${MERGE ONLY AS OWNER}

    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    # Merge dialog state 2
    Wait Until Elements Are Visible
    ...    ${MERGE CHOOSE PRIMARY FORM}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE NEXT BUTTON}
    Click Button    ${MERGE NEXT BUTTON}

    # Merge dialog state 3
    Wait Until Elements Are Visible
    ...    ${MERGE PASSWORD INPUT}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD REQUIRED}
    Input Text    ${MERGE PASSWORD INPUT}    qwerasdf
    Click Button    ${MERGE NEXT BUTTON}
    Wait Until Element Is Visible    ${MERGE PASSWORD INCORRECT}
    Press Keys    ${MERGE BUTTON MODAL}    ESCAPE

    Log Out
    Disconnect all systems from the account    ${email owner 1}    ${BASE PASSWORD}
    Restart Server    ${server 1 ip}:${server port}    ${auth}
    Restart Server    ${server 2 ip}:${server port}    ${auth}

Only one system connected to Cloud Account - Merge Button should be disabled
    @{auth}=    Create List    admin    ${BASE PASSWORD}
    ${system 1 id}=   Connect system to cloud    ${auth}    ${server 1 ip}    ${server port}    ${server 1 name}    ${email owner 1}    ${BASE PASSWORD}

    Log In    ${email owner 1}    ${BASE PASSWORD}
    Run keyword and expect error    *    Wait until element is enabled    ${MERGE BUTTON SYSTEM}    5

    Log Out
    Disconnect all systems from the account    ${email owner 1}    ${BASE PASSWORD}
    Restart Server    ${server 1 ip}:${server port}    ${auth}
