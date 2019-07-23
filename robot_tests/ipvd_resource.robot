*** Settings ***
Resource          resource.robot

*** Variables ***


*** Keywords ***
Go To IPVD page
    Go To    ${url}/ipvd
    Validate on IPVD page

Open IPVD page and Log In
    Open Browser and go to URL    ${url}/ipvd
    Validate on IPVD page
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Validate Log In
    Wait Until Element Is Not Visible    ${LOG IN MODAL}
    Go To IPVD page  #Have to call it a 2nd time to get back onto the IPVD page after logging in

IPVD Text Search
    [Arguments]    ${SearchString}
    Click Element    ${IPVD SEARCH BAR}
    Element Should Be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Wait Until Element Is Visible    ${IPVD TABLE FIRST ITEM}

IPVD Text Search Expecting No Results
    [Arguments]    ${SearchString}
    Click Element    ${IPVD SEARCH BAR}
    Element Should Be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Elements Should Not Be Visible    ${IPVD TABLE}

IPVD Table Row Count
    [Arguments]    ${AllPages}=False
    Wait Until Element Is Visible    ${IPVD TABLE}
    #TODO: Implement call to paginator if ${AllPages}=True
    ${rowCount}=   Get Element Count    ${IPVD TABLE ROWS}
    [Return]    ${rowCount}

Validate IPVD Device Table Not Empty
    ${rowCount}=   IPVD Table Row Count
    Should Be True    ${rowCount} > 0    Table empty when rows were expected.
    [Return]    ${rowCount}

IPVD Select Device From Table Column By Value
    [Arguments]    ${column}    ${SearchString}
    ${rowNumber}=   Set Variable    0
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Table Column Should Contain    ${IPVD TABLE}    2    ${SearchString}
    :FOR    ${rowIndex}    IN RANGE    1    ${rowCount}+1
    \    ${curText}=   Get Text    ${IPVD TABLE ROWS}\[${rowIndex}]/td\[${column}]/div
    \    ${rowNumber}=   Set Variable    ${rowIndex}
    \    Exit For Loop If    '${curText}' == '${SearchString}'
    IPVD Select Device From Table By Row Number    ${rowNumber}
    [Return]    ${rowNumber}

IPVD Select Device From Table Randomly
    ${rowCount}=   Validate IPVD Device Table Not Empty
    ${rows}=   Get WebElements    ${IPVD TABLE ROWS}
    ${RowNumber}=   Evaluate    random.randint(1,${rowCount}-1)    modules=random
    IPVD Select Device From Table By Row Number    ${rowNumber}
    [Return]    ${rowNumber}

IPVD Select Device From Table By Row Number
    [Arguments]    ${RowNumber}=1
    ${rowCount}=   Validate IPVD Device Table Not Empty
    ${rows}=   Get WebElements    ${IPVD TABLE ROWS}
    Should Be True    ${rowCount}>=${RowNumber}
    ${RowNumber}=   Evaluate    ${RowNumber}-1
    Click Element    ${rows}[${RowNumber}]
    Sleep    2

IPVD Active Page Number
    Wait Until Element Is Visible    ${IPVD PAGINATION}
    ${page}=   Get Text    ${IPVD PAGINATION}/li[contains(@class,'active')]
    ${page}=   Remove String Using Regexp    ${page}    \\n\\(current\\)
    [Return]    ${page}

Advaced search filters text
    [Arguments]    ${filters}
    Return From Keyword    //ipvd/span[contains(text(),"${filters}"]

Validate on IPVD page
    Wait Until Elements Are Visible
    ...    ${IPVD TITLE}
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADVANCED SEARCH BUTTON}
    ...    ${IPVD MANFUACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    Validate Manufacturer More Count

Validate Manufacturer More Count
    Wait Until Elements Are Visible
    ...    ${IPVD MANFUACTURERS PANE}
    ...    ${IPVD AND MORE}
    ${count}=   Get Text    ${IPVD MANFUACTURERS PANE}//h4/header
    ${count}=   Remove String Using Regexp    ${count}    \\ ${IPVD MANUFACTURERS TEXT}
    ${more}=   Get Text    ${IPVD AND MORE}
    ${more}=   Remove String Using Regexp    ${more}    (\\.\\.\\.\\ and\\ )|(\\ more)
    Should Be True    ${more} == ${count}-${IPVD VENDORS SHOWN}    Expected ${more} to be ${count} minus ${IPVD VENDORS SHOWN}.

Open New Browser On Failure
    Close Browser
    #Open Browser and go to URL    ${url}/ipvd
    Open Browser
    Go To IPVD page

Restart
    Register Keyword To Run On Failure    NONE
    ${status}=   Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out
    # Go To    ${url}/ipvd

Validate Request Form Initial State
    Wait Until Element Is Visible    ${IPVD FEEDBACK}

Validate Privacy Policy
    Element Should Be Visible    ${IPVD FEEDBACK PRIVACY POLICY}
    ${url}=   Get Element Attribute    ${IPVD FEEDBACK PRIVACY POLICY}    href
    Should Contain    ${url}    privacy    #TODO: CLOUD-2949
    #Should Contain    ${url}    ${PRIVACY POLICY URL}
    Click Element    ${IPVD FEEDBACK PRIVACY POLICY}
    @{windows}=   Get Window Handles
    ${numWindows}=   Get Length    ${windows}
    Should Be True    ${numWindows} == 2    Number of browser windows open after clicking Privacy Policy link should be 2, but is ${numWindows}. CLOUD-3315
    Select Window    @{windows}[1]
    Location Should Be    ${url}    #TODO: CLOUD-2949
    #Location Should Be    ${PRIVACY POLICY URL FULL}
    Wait Until Element Is Visible    ${PRIVACY POLICY HEADER}
    Close Window
    Select Window    @{windows}[0]

Submit Feedback/Request Form
    [Arguments]    ${Your Name}    ${Email}    ${Message}
    Input Text    ${IPVD FEEDBACK YOUR NAME}    ${Your Name}
    Sleep    0.25
    Input Text    ${IPVD FEEDBACK EMAIL}    ${Email}
    Sleep    0.25
    Input Text    ${IPVD FEEDBACK MESSAGE}    ${Message}
    Sleep    0.25
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    Sleep    2

Validate Message Sent
    Page Should Not Contain Element    ${IPVD FEEDBACK}
    Check For Alert    Message has been sent.
    #TODO: Check email and verify submitted data received

Validate Message Not Sent
    Page Should Contain Element    ${IPVD FEEDBACK}
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
