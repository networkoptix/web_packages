*** Settings ***
Resource          resource.robot

*** Variables ***


*** Keywords ***
Go To IPVD Page
    Go To    ${url}/ipvd
    Validate on IPVD page

Go To IPVD Page with arguments
    [Arguments]    ${urlParameters}
    Go To    ${url}/ipvd${urlParameters}
    Validate on IPVD page

Open IPVD Page and Log In
    Open Browser and go to URL    ${url}/ipvd
    Validate on IPVD page
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Validate Log In
    Wait until Element is Not Visible    ${LOG IN MODAL}
    # Have to call it a 2nd time to get back onto the IPVD page after logging in until the following issue is resolved:
    # CLOUD-3386 Logging into or out of an account should not redirect to site root
    Go To IPVD page

### Landing Page keywords - start ###

Validate Landing Page Contents
    ${search_placeholder} =  Get Element Attribute   ${IPVD SEARCH BAR}    placeholder
    Go To IPVD page
    Validate on IPVD Page
    Should be Equal as Strings
    ...    ${search_placeholder}
    ...    Search by model or manufacturer
    ...    ignore_case=true
    Element should contain
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD ADV SEARCH BUTTON TEXT}
    Element should contain
    ...    ${IPVD MANUFACTURERS PANE}//header/span
    ...    manufacturers
    ...    ignore_case=true
    Validate Manufacturers Pane is Not Empty
    Element should contain
    ...    ${IPVD DEVICES PANE}//header/span
    ...    devices
    ...    ignore_case=true
    Validate Devices Pane is Not Empty
    Element should contain
    ...    ${IPVD LANDING PAGE TEXT}
    ...    submit a request
    ...    ignore_case=true


Validate Filtering by Manufacturer
    ${vendor} =  Set variable   Axis
    Click Element    ${IPVD MANUFACTURERS PANE}//div[contains(text(), '${vendor}')]
    Element Text should be    //nx-search/div/div/div[1]/div/div[2]/span[1]
    ...    Manufacturer – ${vendor}
    Element Text should be  ${IPVD TABLE FIRST ITEM}/td[1]     ${vendor}
    Validate Landing Page Objects are not Visible

Validate Filtering by Device Type
    ${device} =  Set variable  Encoder
    Click Element    ${IPVD DEVICES PANE}//div[contains(text(), '${device}s')]
    Element Text should be  //ipvd/div/div[1]/nx-search/div/div/div[1]/div/div[2]/span[1]    Type – ${device}
    Element Text should be  ${IPVD TABLE FIRST ITEM}/td[3]     ${device}
    Validate Landing Page Objects are not Visible

Validate Landing Page Objects are Not Visible
    Elements should Not be Visible
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}

Validate Manufacturers Pane is Not Empty
    ${numVendors} =    Get Element Count    ${IPVD MANUFACTURERS PANE ITEM}
    Should Not be Equal As Numbers  ${numVendors}   0

Validate Devices Pane is Not Empty
    ${numDeviceTypes} =    Get Element Count    ${IPVD DEVICES PANE}//*[@class="float-left mr-1 mb-1"]
    Should Not be Equal As Numbers  ${numDeviceTypes}   0

### Landing Page keywords - end ###


IPVD Text Search
    [Arguments]    ${SearchString}
    Click Element    ${IPVD SEARCH BAR}
    Element should be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Wait until Element is Visible    ${IPVD TABLE FIRST ITEM}

IPVD Text Search Expecting No Results
    [Arguments]    ${SearchString}
    Click Element    ${IPVD SEARCH BAR}
    Element should be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Elements should Not be Visible
    ...    ${IPVD TABLE}
    ...    ${IPVD PAGINATION}
    ...    ${IPVD EXPORT TO CSV}

IPVD Table Row Count
    [Arguments]    ${AllPages}=False
    Wait until Element is Visible    ${IPVD TABLE}
    # TODO: Implement call to paginator if ${AllPages}=True
    ${rowCount}=   Get Element Count    ${IPVD TABLE ROWS}
    [Return]    ${rowCount}

Validate IPVD Device Table Not Empty
    ${rowCount}=   IPVD Table Row Count
    Should be True    ${rowCount} > 0    Table empty when rows were expected.
    Wait until Elements are Visible
    #...    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ...    ${IPVD PREVIOUS PAGE BUTTON}
    ...    ${IPVD FIRST PAGE BUTTON}
    ...    ${IPVD LAST PAGE BUTTON}
    ...    ${IPVD NEXT PAGE BUTTON}
    ...    ${IPVD EXPORT TO CSV}
    [Return]    ${rowCount}

Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    [Arguments]    ${column}    ${SearchString}
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Click Element    ${IPVD FIRST PAGE BUTTON}
    ${lastPage}=   IPVD Last Page Number
    :FOR    ${pageNumber}    IN RANGE    1    ${lastPage}+1
    \    Validate IPVD Device Table Column Contains Desired Value in all Rows    ${column}    ${SearchString}
    \    Run Keyword If    ${pageNumber} < ${lastPage}    Click Element    ${IPVD NEXT PAGE BUTTON}

Validate IPVD Device Table Column contains Desired Value in all Rows
    [Arguments]    ${column}    ${SearchString}
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Table Column should Contain
    ...    ${IPVD TABLE}
    ...    ${column}
    ...    ${SearchString}
    :FOR    ${rowNumber}    IN RANGE    1    ${rowCount}+1
    \    Element should be Visible    ${IPVD TABLE ROWS}\[${rowNumber}]/td\[${column}]//div[contains(text(),'${SearchString}')]

IPVD Select Device from Table Column by Value
    [Arguments]    ${column}    ${SearchString}
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Table Column should Contain    ${IPVD TABLE}    ${column}    ${SearchString}
    :FOR    ${rowNumber}    IN RANGE    1    ${rowCount}+1
    \    ${curText}=   Get Text    ${IPVD TABLE ROWS}\[${rowNumber}]/td\[${column}]/div
    \    Exit For Loop If    '${curText}' == '${SearchString}'
    IPVD Select Device From Table By Row Number    ${rowNumber}
    [Return]    ${rowNumber}

IPVD Select Device from Table Randomly
    ${rowCount}=   Validate IPVD Device Table Not Empty
    ${rowNumber}=   Evaluate
    ...    random.randint(1,${rowCount}-1)
    ...    modules=random
    IPVD Select Device From Table By Row Number    ${rowNumber}
    [Return]    ${rowNumber}

IPVD Select Device from Table by Row Number
    [Arguments]    ${rowNumber}=1
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Should be True    ${rowCount} >= ${rowNumber}
    ${rows}=   Get WebElements    ${IPVD TABLE ROWS}
    ${rowNumberOffset}=   Evaluate    ${rowNumber}-1
    Click Element    ${rows}[${rowNumberOffset}]
    Sleep    2
    [Return]    ${rowNumber}

IPVD Active Page Number
    Wait until Element is Visible    ${IPVD PAGINATION}
    ${page}=   Get Text    ${IPVD PAGINATION}/li[contains(@class,'active')]
    ${page}=   Remove String Using Regexp    ${page}    \\n\\(current\\)
    [Return]    ${page}

IPVD Last Page Number
    Wait until Element is Visible    ${IPVD PAGINATION}
    ${page}=   Get Text    ${IPVD LAST PAGE BUTTON}
    ${page}=   Remove String Using Regexp    ${page}    \\n\\(current\\)
    [Return]    ${page}

Advaced Search Filters Text
    [Arguments]    ${filters}
    Return From Keyword    //ipvd/span[contains(text(),"${filters}"]

Validate on IPVD Page
    Wait until Elements are Visible
    ...    ${IPVD TITLE}
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    ...    ${IPVD LANDING PAGE TEXT}
    Elements should Not be Visible
    ...    ${IPVD TABLE}
    ...    ${IPVD DEVICE DETAILS}
    ...    ${IPVD PAGINATION}
    ...    ${IPVD EXPORT TO CSV}
    Validate Manufacturer More Count

Verify IPVD Advanced Search is Closed
    Wait until Elements are Visible    ${IPVD ADV SEARCH BUTTON}
    Click Element    ${IPVD SEARCH BAR}
    Wait Until Element Has Style
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    background-color
    ...    ${COLOR LIGHT4 RGB}
    Verify Button Arrow Direction
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    Down
    Wait until Element does Not have Class
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    selected
    Elements should Not be Visible
    # IPVD Advanced Filters
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    ${IPVD ADV FILTERS MFRS}
    ...    ${IPVD ADV FILTERS TYPES}
    # IPVD Advanced Filters Features
    ...    ${IPVD ADV FEATURES AUDIO}
    ...    ${IPVD ADV FEATURES 2-WAY AUDIO}
    ...    ${IPVD ADV FEATURES PTZ}
    ...    ${IPVD ADV FEATURES ADV PTZ}
    ...    ${IPVD ADV FEATURES FISHEYE}
    ...    ${IPVD ADV FEATURES MOTION}
    ...    ${IPVD ADV FEATURES I/O}
    ...    ${IPVD ADV FEATURES H.265}
    ...    ${IPVD ADV FEATURES MULTI SENSOR}

Verify IPVD Advanced Search is Open
    Wait until Elements are Visible    ${IPVD ADV SEARCH BUTTON}
    Click Element    ${IPVD SEARCH BAR}
    Wait Until Element Has Style
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    background-color
    ...    ${COLOR LIGHT16 RGB}
    Verify Button Arrow Direction
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    Up
    Wait until Element has Class
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    selected
    Wait until Elements are Visible
    # IPVD Advanced Filters
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    ${IPVD ADV FILTERS MFRS}
    ...    ${IPVD ADV FILTERS TYPES}
    # IPVD Advanced Filters Features
    ...    ${IPVD ADV FEATURES AUDIO}
    ...    ${IPVD ADV FEATURES 2-WAY AUDIO}
    ...    ${IPVD ADV FEATURES PTZ}
    ...    ${IPVD ADV FEATURES ADV PTZ}
    ...    ${IPVD ADV FEATURES FISHEYE}
    ...    ${IPVD ADV FEATURES MOTION}
    ...    ${IPVD ADV FEATURES I/O}
    ...    ${IPVD ADV FEATURES H.265}
    ...    ${IPVD ADV FEATURES MULTI SENSOR}

Validate Manufacturer More Count
    Wait until Elements are Visible
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ${count}=   Get Text    ${IPVD MANUFACTURERS PANE}//h4/header
    ${count}=   Remove String Using Regexp
    ...    ${count}
    ...    \\ ${IPVD MANUFACTURERS TEXT}
    ${more}=   Get Text    ${IPVD AND MORE}
    ${more}=   Remove String Using Regexp
    ...    ${more}
    ...    \\D
    Should be True    ${more} == ${count}-${IPVD VENDORS SHOWN}
    ...    Expected ${more} to be ${count} minus ${IPVD VENDORS SHOWN}.

Open New Browser on Failure
    Close Browser
    Open Browser
    Go To IPVD page

Restart
    Register Keyword To Run On Failure    NONE
    ${status}=   Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out
    # Go To    ${url}/ipvd

Validate Request Form Initial State
    Wait until Element is Visible    ${IPVD FEEDBACK}

Validate Privacy Policy
    Element should be Visible    ${IPVD FEEDBACK PRIVACY POLICY}
    ${url}=   Get Element Attribute
    ...    ${IPVD FEEDBACK PRIVACY POLICY}
    ...    href
    Should Contain    ${url}    privacy    # TODO: CLOUD-2949
    # Should Contain    ${url}    ${PRIVACY POLICY URL}
    Click Element    ${IPVD FEEDBACK PRIVACY POLICY}
    @{windows}=   Get Window Handles
    ${numWindows}=   Get Length    ${windows}
    Should be True
    ...    ${numWindows} == 2
    ...    Number of browser windows open after clicking Privacy Policy link should be 2, but is ${numWindows}. CLOUD-3315
    Select Window    @{windows}[1]
    Location should be    ${url}    # TODO: CLOUD-2949
    # Location should be    ${PRIVACY POLICY URL FULL}
    Wait until Element is Visible    ${PRIVACY POLICY HEADER}
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
    Page should Not contain Element    ${IPVD FEEDBACK}
    Check For Alert    Message has been sent.
    # TODO: Check email and verify submitted data received

Validate Message Not Sent
    Page should contain Element    ${IPVD FEEDBACK}
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
