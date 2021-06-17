*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Verify on Servers Page
    [Arguments]    ${timeout}=${selenium_timeout}
    Wait Until Elements are Visible
    #...    ${PORT INPUT}
    ...    ${RESTART SERVER BUTTON}
    ...    ${SERVER DETAILED INFO BUTTON}
    ...    ${IP}       
    ...    ${OS}       
    ...    ${VERSION}  
    ...    timeout=${timeout}

Verify Server Buttons Are Enabled
    Wait Until Elements are Enabled
    ...    ${PORT INPUT}
    ...    ${RESTART SERVER BUTTON}

Log in to user and system
    [Arguments]    ${user}    ${system id}    ${verify}=True    ${password}=${BASE PASSWORD}
    Log in    ${user}    ${password}
    Go To    ${ENV}/systems/${system id}
    #Run Keyword If    '${user}'=='${EMAIL OWNER}' and ${verify}==True    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    #Run Keyword If    '${user}'=='${EMAIL ADMIN}' and ${verify}==True   Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    #Run Keyword Unless    '${user}'=='${EMAIL OWNER}' or '${user}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Verify Rename Dialog
    Wait Until Elements are Visible
    ...    ${RENAME SERVER FORM}
    ...    ${RENAME SAVE BUTTON}
    ...    ${RENAME CANCEL BUTTON}
    ...    ${RENAME CLOSE BUTTON}
    ...    ${RENAME SERVER INPUT}

Verify Restart Dialog
    Wait Until Elements Are Visible  
    ...    ${RESTART DIALOG CLOSE BUTTON}  
    ...    ${RESTART DIALOG CANCEL BUTTON} 
    ...    ${RESTART DIALOG RESTART BUTTON}  

Select Server By Name
    [Arguments]    ${server name}
    Verify on Servers Page
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${server name}")]    120
    Sleep    5
    Click Link    //nx-level-3-item/a//span[contains(text(),"${server name}")]/../..
    Verify on Servers Page

Change Port To
    [Arguments]    ${port}
    Input Text    ${PORT INPUT}    ${port}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL} 
    
Test Every Loglevel Option
    [Arguments]    ${dropdown}    ${id}    ${server url}
    FOR    ${option}    IN    @{LOGLEVEL OPTIONS}
        Set Log Level Option    ${dropdown}    ${id}    ${option}
        Evaluate Log Level via API    ${server['local auth']}    ${server url}    ${id}    ${option}
    END

Set Log Level Option
    [Arguments]    ${dropdown}    ${id}    ${option}
    Click Element    ${dropdown}
    Click Element    //div[@aria-labelledby="${id}"]//a/span[text()="${option}"]
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Visible    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Click Button    ${ADVANCED SAVE MODAL CLOSE BUTTON}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}

Verify Storage Elements
    Wait Until Elements are Visible
    ...    ${STORAGE LOCATIONS BLOCK}
    ...    ${STORAGE ADD BUTTON}
    ...    ${STORAGE REINDEXING BLOCK}
    ...    ${STORAGE REINDEX MAIN BUTTON}

Verify Add Storage Dialog
    Wait Until Elements Are Visible
    ...    ${ADD STORAGE MODAL}
    ...    ${AS MODAL CLOSE BUTTON}
    ...    ${AS MODAL URL INPUT}
    ...    ${AS MODAL LOGIN INPUT}
    ...    ${AS MODAL PASSWORD INPUT}
    ...    ${AS MODAL SUBMIT BUTTON}
    ...    ${AS MODAL CANCEL BUTTON}
