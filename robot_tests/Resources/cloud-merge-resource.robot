*** Settings ***
Resource          ../resource.robot
Resource          ../Resources/front-end-resources/system-server-resource.robot

*** Keywords ***
Merge Suite Setup
    Open Browser and go to url    ${ENV}
    Set Suite Variable    @{test servers}    @{EMPTY}
    ${id}=   Create Custom Network    custom1    1
    Set Suite Variable    ${custom net id 1}    ${id}
    ${id}=   Create Custom Network    custom2   2
    Set Suite Variable    ${custom net id 2}    ${id}

Merge Test Setup
    Go To    ${ENV}
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}    2
    Run Keyword If    ${status}    Log Out

Merge Test Teardown
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}    2
    Run Keyword If    ${status}    Log Out via API    validate=False
    Remove Test Systems
    Run Keyword If Test Failed    Execute Command Remotely    docker rm -f $(docker ps -qa --filter name="cloud_merge")

Merge Suite Teardown
    Close All Browsers
    Remove Custom Network    ${custom net id 1}
    Remove Custom Network    ${custom net id 2}

Remove Test Systems
    FOR    ${s}    IN    @{test systems}
        Delete Base System    ${s}
        Remove Values From List    ${test systems}    ${s}
    END

Validate Check Merge Dialog
    [Arguments]      ${lonely}=${False}
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE NEXT BUTTON}
    IF    ${lonely}
        Wait Until Elements Are Visible
        ...    ${MERGE FORM SERVER URL LABEL}
        ...    ${MERGE FORM SERVER URL INPUT}
        ...    ${MERGE ENTER THE ADDRESS}
    ELSE
        Wait Until Elements are Visible
        ...    ${MERGE CURRENT SYSTEM WITH}
        ...    ${MERGE SYSTEM DROPDOWN}
    END

Validate Admin Password Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE X BUTTON}
    #...    ${MERGE GO BACK BUTTON}
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
    [Arguments]    ${system 1}    ${system 2}    ${from target}=${False}
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE X BUTTON}
    #...    ${MERGE TAKE SYSTEM NAME}
    #...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE NEXT BUTTON}
    Run Keyword If    ${from target}    Wait Until Elements Are Visible
        ...    ${MERGE RADIO FIRST SYSTEM}//label[@for="firstSystem" and text()="${system 1}"]//span[@class="check unchecked"]
        ...    ${MERGE RADIO SECOND SYSTEM}//label[@for="secondSystem" and text()="${system 2}"]//span[@class="check checked"]
        ...    ELSE    Wait Until Elements Are Visible
            ...    ${MERGE RADIO FIRST SYSTEM}//label[@for="firstSystem" and text()="${system 1}"]//span[@class="check checked"]
            ...    ${MERGE RADIO SECOND SYSTEM}//label[@for="secondSystem" and text()="${system 2}"]//span[@class="check unchecked"]

Validate Confirm Merge Dialog
    [Arguments]    ${system 1}    ${system 2}
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE ENTER YOUR PASSWORD}
    ...    ${MERGE PASSWORD INPUT}
    ...    ${MERGE X BUTTON}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE SYSTEMS BUTTON}

    ${txt}=   Get Text    ${CONFIRM MERGE TEXT}
    ${p1}=   Replace String    ${YOU ARE ABOUT TO MERGE TEXT}    %SYSTEM1%    ${system 1}
    ${p1}=   Replace String    ${p1}    %SYSTEM2%    ${system 2}
    ${p2}=   Replace String    ${SETTINGS WILL BE TAKEN TEXT}    %SYSTEM%    ${system 1}
    Should be equal as strings    ${txt}    ${p1}\n${p2}

Validate Merge Failed Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE FAILED ERROR TEXT}
    ...    ${MERGE FAILED DIALOG HEADER}
    ...    ${MERGE FAILED X BUTTON}
    ...    ${MERGE FAILED OK BUTTON}

Validate General Error Dialog
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${MERGE SYSTEMS HEADER}
    ...    ${MERGE GO BACK BUTTON}
    ...    ${MERGE TRY AGAIN BUTTON}

Validate Merge
    [Arguments]    ${primary}    ${secondary}    ${on secondary}=${False}
    Capture Page Screenshot
    Wait Until Element Is Not Visible    ${MERGE DIALOG}
    ${s}=   Replace String    ${WHEN MERGE IS FINISHED TEXT}    %SYSTEM%    ${primary}
    Run Keyword If    ${on secondary}    Run Keyword and continue on failure    Wait Until Elements Are Visible
        ...    //h2[contains(text(), "${THIS SYSTEM IS BEING MERGED TEXT}") and contains(text(), "${primary}")]
        ...    //p[contains(text(), "${DEPENDING ON THE SIZE OF DATABASE TEXT}")]
        ...    //p[contains(text(), "${UNTIL MERGE IS FINISHED TEXT}")]
        ...    //p[contains(text(), "${s}")]
    ...    ELSE    Wait Until Element Is Visible    //div[strong="${secondary}" and contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]
    #/following-sibling::div[contains(text(), "${DEPENDING ON THE SIZE OF DATABASE TEXT}")]

#    Run keyword and continue on failure    Check For Alert    System merge completed
#    I beg you, devs, please, stop changing texts
    ${s}=   Replace String    ${SYSTEM MERGE COMPLETED TEXT}    %PRIMARY%    ${primary}
    ${s}=   Replace String    ${s}    %SECONDARY%    ${secondary}
    Run keyword and continue on failure    Check For Alert    ${s}    timeout=120

Validate System and Server Merge
    [Arguments]    ${system}    ${server}
    ${s}=   Replace String    ${SYSTEM MERGE COMPLETED TEXT}    %PRIMARY%    ${primary}
    ${s}=   Replace String    ${s}    %SECONDARY%    ${secondary}
    Run keyword and continue on failure    Check For Alert    ${s}

Choose System From Dropdown
    [Arguments]
    ...    ${target system name}
    ...    ${input url}=${EMPTY}
    ...    ${check url}=${False}

    Slow    Click Button    ${MERGE SYSTEM DROPDOWN}    timeout=1
    ${menu shown}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${MERGE SYSTEMS MENU}    timeout=10
    IF    ${menu shown} == ${False}
        Click Element    ${MERGE SYSTEM DROPDOWN ARROW}
    END
    Wait Until Element Is Visible    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]
    Slow    Click Element    ${MERGE CHECK MERGE FORM}//li/a//span[text()="${target system name}"]    timeout=0.5
    IF    ${check url}==${True}
        Wait Until Elements Are Visible    ${MERGE FORM SERVER URL LABEL}    ${MERGE FORM SERVER URL INPUT}
    END
    ${url placeholder}=   Run Keyword If    ${check url}==${True}    Get Element Attribute    ${MERGE FORM SERVER URL INPUT}    placeholder
    Run Keyword If    ${check url}==${True}    Should Be Equal As Strings    ${url placeholder}    host:port
    IF    '${input url}'!='${EMPTY}'
        Input Text    ${MERGE FORM SERVER URL INPUT}    ${input url}
    END

Choose Primary System
    [Arguments]    ${from target}=${False}
#    Validate Choose Primary Dialog
    Run Keyword If    ${from target}==${True}    Run Keywords
       ...    Click Element    ${MERGE RADIO SECOND SYSTEM}
       ...    AND    Wait Until Element Is Not Visible    ${MERGE RADIO FIRST SYSTEM}//label[@for="firstSystem"]//span[@class="check checked"]
       ...    AND    Wait Until Element Is Visible    ${MERGE RADIO SECOND SYSTEM}//label[@for="secondSystem"]//span[@class="check checked"]

Complete merge steps till final password input
    [Arguments]
    ...    ${primary system}
    ...    ${target system name}
    ...    ${input url}=${EMPTY}
    ...    ${check url}=${False}
    ...    ${from target}=${False}

    Click Button    ${MERGE BUTTON SYSTEM}
    Validate Check Merge Dialog

    Choose System From Dropdown   ${target system name}    ${input url}    ${check url}
    Validate Check Merge Dialog
    Wait Until Element Is Visible    ${MERGE NEXT BUTTON}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=2
    Run keyword and ignore error    Wait Until Element Is Visible    ${MERGE CHECKING HINT}

    Choose Primary System    ${from target}
    Wait Until Element Is Visible    ${MERGE NEXT BUTTON}
    Slow    Click Button    ${MERGE NEXT BUTTON}    timeout=2
    Validate Confirm Merge Dialog    ${primary system}    ${target system name}
