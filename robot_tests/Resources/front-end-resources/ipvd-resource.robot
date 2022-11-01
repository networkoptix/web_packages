*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Go To IPVD Page
    Go To    ${ENV}/ipvd
    Validate on IPVD page

Go To IPVD Page with arguments
    [Arguments]    ${urlParameters}
    Go To    ${ENV}/ipvd${urlParameters}
    Validate on IPVD page

Open IPVD Page
    Open Browser and go to URL    ${ENV}/ipvd
    Validate on IPVD page

Open IPVD Page and Log In
    Open Browser and go to URL    ${ENV}/ipvd
    Validate on IPVD page
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Wait until Element is Not Visible    ${LOG IN MODAL}

Validate Landing Page Contents
    ${search_placeholder}=   Get Element Attribute   ${IPVD SEARCH BAR}    placeholder
    Go To IPVD page
    Validate on IPVD Page
    Should be Equal as Strings
    ...    ${search_placeholder}
    ...    Search by model or manufacturer
    ...    ignore_case=true
    Element should contain    ${IPVD ADV SEARCH BUTTON}    ${IPVD ADV SEARCH BUTTON TEXT}
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
    ${vendor}=   Set variable   Axis
    Click Element    ${IPVD MANUFACTURERS PANE}//div[contains(text(), '${vendor}')]
    Element Text should be    //nx-search/div/div/div[1]/div/div[2]/span[1]
    ...    Manufacturer – ${vendor}
    Element Text should be    ${IPVD TABLE FIRST ITEM}/td[1]     ${vendor}
    Validate Landing Page Objects are not Visible

Validate Filtering by Device Type
    ${device}=   Set variable  Encoder
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
    ${numVendors}=   Get Element Count    ${IPVD MANUFACTURERS PANE ITEM}
    Should Not be Equal As Numbers  ${numVendors}   0

Validate Devices Pane is Not Empty
    ${numDeviceTypes}=   Get Element Count    ${IPVD DEVICES PANE}//*[@class="float-left mr-1 mb-1"]
    Should Not be Equal As Numbers  ${numDeviceTypes}   0

IPVD Text Search
    [Arguments]    ${SearchString}
    Wait Until Element Is Visible    ${IPVD SEARCH BAR}
    Click Element    ${IPVD SEARCH BAR}
    Element should be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Wait until Element is Visible    ${IPVD TABLE FIRST ITEM}

IPVD Text Search Expecting No Results
    [Arguments]    ${SearchString}
    Click Element    ${IPVD SEARCH BAR}
    Element should be Focused    ${IPVD SEARCH BAR}
    Input Text    ${IPVD SEARCH BAR}    ${SearchString}
    Elements should Not be Visible    ${IPVD TABLE}    ${IPVD PAGINATION}    ${IPVD EXPORT TO CSV LINK}

IPVD Table Row Count
    [Arguments]    ${AllPages}=False
    Wait until Element is Visible    ${IPVD TABLE}
    # TODO: Implement call to paginator if ${AllPages}=True
    ${rowCount}=   Get Element Count    ${IPVD TABLE ROWS}
    [Return]    ${rowCount}

Validate IPVD Device Table Not Empty
    [Arguments]     ${include last}=${True}
    ${rowCount}=   IPVD Table Row Count
    Should be True    ${rowCount} > 0    Table empty when rows were expected.
    IF      ${include last}
        Wait until Elements are Visible
        #...    ${IPVD CLEAR TEXT SEARCH BUTTON}
        ...    ${IPVD PREVIOUS PAGE BUTTON}
        ...    ${IPVD FIRST PAGE BUTTON}
        ...    ${IPVD LAST PAGE BUTTON}
        ...    ${IPVD NEXT PAGE BUTTON}
        ...    ${IPVD EXPORT TO CSV LINK}
    ELSE
        Wait until Elements are Visible
        #...    ${IPVD CLEAR TEXT SEARCH BUTTON}
        ...    ${IPVD PREVIOUS PAGE BUTTON}
        ...    ${IPVD FIRST PAGE BUTTON}
        ...    ${IPVD NEXT PAGE BUTTON}
        ...    ${IPVD EXPORT TO CSV LINK}
    END
    [Return]    ${rowCount}

Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    [Arguments]    ${column}    ${SearchString}
    Sleep   1
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Click Element    ${IPVD FIRST PAGE BUTTON}
    ${lastPage}=   IPVD Last Page Number
    FOR    ${pageNumber}    IN RANGE    1    ${lastPage}+1
        Validate IPVD Device Table Column Contains Desired Value in all Rows    ${column}    ${SearchString}
        Sleep   1
        Run Keyword If    ${pageNumber} < ${lastPage}    Click Element    ${IPVD NEXT PAGE BUTTON}
    END

Validate IPVD Device Table Column contains Desired Value in all Rows
    [Arguments]    ${column}    ${SearchString}
    Sleep    1
    ${rowCount}=   Validate IPVD Device Table Not Empty
    Sleep    1
    Table Column should Contain    ${IPVD TABLE}    ${column}    ${SearchString}
    FOR    ${rowNumber}    IN RANGE    1    ${rowCount}+1
        Wait Until Element is Visible    ${IPVD TABLE ROWS}\[${rowNumber}]/td\[${column}]//div[contains(text(),'${SearchString}')]
    END

IPVD Select Device from Table Column by Value
    [Arguments]    ${column}    ${SearchString}   ${include last}=${True}
    ${rowCount}=   Validate IPVD Device Table Not Empty     ${include last}
    Table Column should Contain    ${IPVD TABLE}    ${column}    ${SearchString}
    FOR    ${rowNumber}    IN RANGE    1    ${rowCount}+1
        ${curText}=   Get Text    ${IPVD TABLE ROWS}\[${rowNumber}]/td\[${column}]/div
        Exit For Loop If    '${curText}' == '${SearchString}'
    END
    IPVD Select Device From Table By Row Number    ${rowNumber}      ${include last}
    [Return]    ${rowNumber}

IPVD Select Device from Table Randomly
    [Arguments]     ${include last}=${True}
    ${rowCount}=   Validate IPVD Device Table Not Empty      ${include last}
    ${rowNumber}=   Evaluate
    ...    random.randint(1,${rowCount}-1)
    ...    modules=random
    IPVD Select Device From Table By Row Number    ${rowNumber}    ${include last}
    [Return]    ${rowNumber}

IPVD Select Device from Table by Row Number
    [Arguments]    ${rowNumber}=1   ${include last}=${True}
    ${rowCount}=   Validate IPVD Device Table Not Empty     ${include last}
    Should be True    ${rowCount} >= ${rowNumber}
    ${rows}=   Get WebElements    ${IPVD TABLE ROWS}
    ${rowNumberOffset}=   Evaluate    ${rowNumber}-1
    Click Element    ${rows}[${rowNumberOffset}]
    Sleep    2
    [Return]    ${rowNumber}

IPVD Active Page Number
    Wait until Element is Visible    ${IPVD PAGINATION}
    ${page}=   Get Text    ${IPVD PAGINATION}/a[contains(@class,'active')]
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
    # CLOUD-3564 "Supported IP Video Devices" inset not being translated
    ...    ${IPVD SEARCH BAR}
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    ${IPVD MANUFACTURERS PANE}
    ...    ${IPVD AND MORE}
    ...    ${IPVD DEVICES PANE}
    ...    ${IPVD LANDING PAGE TEXT}
    Title should be    ${IPVD TITLE TEXT} - ${PRODUCT_NAME}
    Elements should Not be Visible
    ...    ${IPVD TABLE}
    ...    ${IPVD DEVICE DETAILS}
    ...    ${IPVD PAGINATION}
    ...    ${IPVD EXPORT TO CSV LINK}
   # Validate Manufacturer More Count

Validate Camera Info Panel
    Wait until elements are visible
    ...    ${IPVD DEVICE DETAILS}
    ...    ${IPVD DEVICE MAKE}
    ...    ${IPVD DEVICE MODEL}
    ...    ${IPVD CLOSE DETAILS BUTTON}
    ...    ${IPVD DEVICE GOOGLE LINK}
    ...    ${IPVD DEVICE INFO}
    ...    ${IPVD DEVICE FIRMWARE INFO}
    ...    ${IPVD DEVICE FIRMWARE VERSION}
    ...    ${IPVD DEVICE FIRMWARE VERSION POPULARITY}
    ...    ${IPVD SEND DEVICE FEEDBACK}
    ...    ${IPVD DEVICE LAST UPDATED INFO}

    ${number of parameters}=   Get Element Count    ${IPVD DEVICE INFO PARAMETER}
    Should be equal as numbers  ${number of parameters}   14

Verify IPVD Advanced Search is Closed
    Wait until Elements are Visible    ${IPVD ADV SEARCH BUTTON}
    Click Element    ${IPVD SEARCH BAR}
    Wait Until Element Has Style
    ...    ${IPVD ADV SEARCH BUTTON}
    ...    background-color
    ...    ${COLOR LIGHT4 RGB}
    Advanced Search Arrow Should Point    down
    Wait until Element does Not have Class    ${IPVD ADV SEARCH BUTTON}    selected
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
    Advanced Search Arrow Should Point    up
    Wait until Element has Class    ${IPVD ADV SEARCH BUTTON}    selected
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
    Wait until Elements are Visible    ${IPVD MANUFACTURERS PANE}    ${IPVD AND MORE}
    ${count}=   Get Text    ${IPVD MANUFACTURERS PANE}//h4/header
    ${count}=   Remove String Using Regexp    ${count}    \\ ${IPVD MANUFACTURERS TEXT}
    ${more}=   Get Text    ${IPVD AND MORE}
    ${more}=   Remove String Using Regexp    ${more}    \\D
    Should be True    ${more} == ${count}-${IPVD VENDORS SHOWN}
    ...    Expected ${more} to be ${count} minus ${IPVD VENDORS SHOWN}.

Advanced Search Arrow Should Point
    [Arguments]    ${expected direction}
    Sleep    1
    ${transform value}=   Run Keyword And Return Status     Wait Until Element is Visible     ${IPVD ADV SEARCH BUTTON}${IPVD arrow}/parent::div/parent::div[contains(@class, "selected")]    timeout=2
    ${observed direction}=   Set Variable If    ${transform value}    up    down
    Should Be Equal    '''${expected direction}'''    '''${observed direction}'''

Filter Arrow Should Point
    [Arguments]    ${element}    ${expected direction}
    Sleep    1
    ${transform value}=   Get Element Style    ${element}${IPVD arrow}//*[name()="polyline"]    transform
    ${observed direction}=   Set Variable If    "${transform value}"=="matrix(1, 0, 0, 1, 0, 0)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.934479, 0.356018, 0, 0, -0.356018, 0.934479, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.999087, 0.0427241, 0, 0, -0.0427241, 0.999087, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.191714, 0.981451, 0, 0, -0.981451, 0.191714, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, -1, 1.22465e-16, 0, 0, -1.22465e-16, -1, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.191714, 0.981451, 0, 0, -0.981451, 0.191714, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.992888, 0.119053, 0, 0, -0.119053, 0.992888, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.191714, 0.981451, 0, 0, -0.981451, 0.191714, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, -0.572517, 0.819893, 0, 0, -0.819893, -0.572517, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.984495, 0.175413, 0, 0, -0.175413, 0.984495, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, 0.191714, 0.981451, 0, 0, -0.981451, 0.191714, 0, 0, 0, 0, 1)" or "${transform value}"=="matrix3d(1, 0, 0, 0, 0, -0.572517, 0.819893, 0, 0, -0.819893, -0.572517, 0, 0, 0, 0, 1)"  up
    ...    "${transform value}"=="none"    down
    Should Be Equal    '''${expected direction}'''    '''${observed direction}'''

Open New Browser on Failure
    Close Browser
    Open Browser
    Go To IPVD page

Restart
    Common Restart Logout    ${ENV}
    Set Window Size    1920    1080
    # Go To    ${url}/ipvd

Validate Request Form Initial State
    Wait until Element is Visible    ${IPVD FEEDBACK}

Validate Privacy Policy
    Element should be Visible    ${IPVD FEEDBACK PRIVACY POLICY}
    ${url}=   Get Element Attribute    ${IPVD FEEDBACK PRIVACY POLICY}    href
    Should Contain    ${url}    privacy    # TODO: CLOUD-2949
    # Should Contain    ${url}    ${PRIVACY POLICY URL}
    Click Element    ${IPVD FEEDBACK PRIVACY POLICY}
    @{windows}=   Get Window Handles
    ${numWindows}=   Get Length    ${windows}
    Should be True
    ...    ${numWindows} == 2
    ...    Number of browser windows open after clicking Privacy Policy link should be 2, but is ${numWindows}. CLOUD-3315
#    Select Window    ${windows}[1]
    Switch Window    ${windows}[1]
    ${location}=    Get Location
    Should Contain    ${url}    ${location}    # TODO: CLOUD-2949
    # Location should be    ${PRIVACY POLICY URL FULL}
    Close Window
#    Select Window    ${windows}[0]
    Switch Window    ${windows}[0]

Submit Feedback/Request Form
    [Arguments]    ${Your Name}    ${Email}    ${Message}
    Wait until element is visible    ${IPVD FEEDBACK YOUR NAME}
    Input Text    ${IPVD FEEDBACK YOUR NAME}    ${Your Name}
    Wait until element is visible    ${IPVD FEEDBACK EMAIL}
    Input Text    ${IPVD FEEDBACK EMAIL}    ${Email}
    Wait until element is visible    ${IPVD FEEDBACK MESSAGE}
    Input Text    ${IPVD FEEDBACK MESSAGE}    ${Message}
    Wait until element is visible    ${IPVD FEEDBACK SEND BUTTON}
    Click Button    ${IPVD FEEDBACK SEND BUTTON}

Validate Message Sent
    Wait Until Page Does not Contain    ${IPVD FEEDBACK}
    Check For Alert    ${IPVD FEEDBACK MESSAGE SENT}
    # TODO: Check email and verify submitted data received

Validate Message Not Sent
    Page should contain Element    ${IPVD FEEDBACK}
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False


Language Support
    ${IPVD FEEDBACK ABOUT}    Replace String    ${IPVD FEEDBACK ABOUT}     {{model}}    ${model}
    Element Should Contain    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK ABOUT}

Test Submit Feedback Message
    [Arguments]    ${Expect Success}    ${Your Name}    ${Email}    ${Message}
    Go To IPVD page
    #Search for Axis and click any camera from list
    IPVD Text Search    Axis
    IPVD Select Device From Table Randomly
    Wait Until Element Is Visible    ${IPVD SEND DEVICE FEEDBACK}
    Click Element    ${IPVD SEND DEVICE FEEDBACK}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    ${model} =   Get Text    ${IPVD DEVICE MODEL}
    ${IPVD FEEDBACK ABOUT}    Replace String    ${IPVD FEEDBACK ABOUT}     {{model}}    ${model}
    Element Should Contain    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK ABOUT}
    Submit Feedback/Request Form    ${Your Name}    ${Email}    ${Message}
    IF    ${Expect Success}==True
        On Success    ${Email}
    ELSE IF    ${Expect Success}==False
        Validate Message Not Sent
    END

On Success
    [arguments]    ${email}
    Validate Message Sent
    # Commented out as we don't have access to the current email and it gets changed at random
    #Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    #${email}    Wait For Email    recipient=${email}    timeout=120    status=UNSEEN
    #Delete Email    ${email}

Test Submit Request Message
    [Arguments]    ${Expect Success}    ${Your Name}    ${Email}    ${Message}
    Go To IPVD page
    Wait Until Element Is Visible    ${IPVD SUBMIT A REQUEST}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Element Text Should Be    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK FOR CAMERAS PAGE}
    Submit Feedback/Request Form    ${Your Name}    ${Email}    ${Message}
    IF    ${Expect Success}==True
        On Success    ${Email}
    ELSE IF    ${Expect Success}==False
        Validate Message Not Sent
    END
