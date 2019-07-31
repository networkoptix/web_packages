*** Settings ***
Resource          ../ipvd_resource.robot
Suite Setup       Open Browser and go to URL    ${url}/ipvd
Test Setup        Restart
Test Teardown     NONE    #Close Browser    #Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        Threaded File

*** Variables ***
${url}         ${ENV}

*** Keywords ***


*** Test Cases ***
IPVD page loads without login
    Go To IPVD page

IPVD page loads while logged in
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Validate Log In
    Go To IPVD page

IPVD landing page actions
    [tags]  C48791  IPVD

    # Step 1 -  Validate Landing Page Contents
    Go To IPVD Page
    ${search_placeholder}=   Get Element Attribute    ${IPVD SEARCH BAR}    placeholder
    Validate on IPVD Page
    Should Be Equal as Strings    ${search_placeholder}    Search by model or manufacturer    ignore_case=true
    Element should contain    ${IPVD ADV SEARCH BUTTON}  ${IPVD ADV SEARCH BUTTON TEXT}
    Element should contain    ${IPVD MANUFACTURERS PANE}//header/span    manufacturers    ignore_case=true
    ${numVendors}=   Get Element Count    ${IPVD MANUFACTURERS PANE ITEM}
    Should Not Be Equal As Numbers  ${numVendors}   0
    Element should contain      ${IPVD DEVICES PANE}//header/span    devices    ignore_case=true
    ${numDeviceTypes}=   Get Element Count    ${IPVD DEVICES PANE}//*[@class="float-left mr-1 mb-1"]
    Element should contain    ${IPVD LANDING PAGE TEXT}    submit a request    ignore_case=true

    # Step 2 - Validate filtering by manufacturer
    ${vendor}=  Set variable    Axis
    Click Element    ${IPVD MANUFACTURERS PANE}//div[contains(text(), '${vendor}')]
    Element Text Should Be    //nx-search/div/div/div[1]/div/div[2]/span[1]    Manufacturer – ${vendor}
    Element Text Should Be    ${IPVD TABLE FIRST ITEM}/td[1]    ${vendor}
    Validate Landing Page Objects are not Visible

    # Step 3
    Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD page

    # Step 4 - Validate filtering by device type
    ${device}=   Set variable    Encoder
    Click Element    ${IPVD DEVICES PANE}//div[contains(text(), '${device}s')]
    Element Text Should Be    //ipvd/div/div[1]/nx-search/div/div/div[1]/div/div[2]/span[1]    Type – ${device}
    Element Text Should Be    ${IPVD TABLE FIRST ITEM}/td[3]    ${device}
    Validate Landing Page Objects are not Visible

    # Step 5 - Back to the landing page
    Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD page

    # Step 6 - Verify IPVD feedback link opens correct dialog
    Click Link    ${IPVD SUBMIT A REQUEST LINK}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    
#Submit request can be closed by 'X', cancel, and escape
#Submit request cannot be close by clicking outside the form
#Submit request correctly sends request

Text search correctly finds manufacturers
    Go To IPVD page
    IPVD Text Search    hanwha
    Validate IPVD Device Table Column Contains Desired Value in all Rows on all Pages    1    Hanwha Techwin (Samsung)


#Text search correctly finds models
#Text search correctly finds resolutions
#Selecting manufacturer from landing page shows cameras for that manufacturer
#Selecting device from landing page shows cameras with the appropriate feature
#Selecting a device from the landing page with two filters works correctly
#Advanced search Minimum Resoltion dropdown applies filter correctly
#Advanced search Manufacturers dropdown applies filter(s) correctly
#Advanced search Types dropdown applies filter(s) correctly
#Advanced search Feature selection applies filter correctly
#Advanced search 2-way Audio and Audio filters interact correctly
#Advanced search PTZ and Advanced PTZ filters interact correctly
#Advanced search Minimum Res and Manufacturers interact correctly
#Advanced search Manufacturers and Types interact correctly
#Advanced search Types and Features interact correctly
#Clear search button clears all filters
#Column sorting for each column works as expected
#Data in table matches data in camera details
#Clicking the 'X' closes camera details
#Search in google works
#Page can be changed by next, previous, and clicking on visible numbers
#Export all to CSV works

Request Form Basic Validations
    [tags]    C48969    IPVD
    Go To IPVD page
    Wait Until Element Is Visible    ${IPVD SUBMIT A REQUEST}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Validate Request Form Initial State
    Validate Privacy Policy
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    #Name, email, message, and agreeing to privacy policy fields turn red
    Validate Input Field State    ${IPVD FEEDBACK YOUR NAME}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK MESSAGE}/../..    False
    Click Button    ${IPVD FEEDBACK CANCEL BUTTON}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}

Feedback Form Basic Validations
    [tags]    C54182    IPVD
    #IPVD page    Login=True
    #Wait Until Element Is Not Visible    ${LOG IN MODAL}
    Open IPVD page and Log In
    IPVD Text Search    Axis
    IPVD Select Device From Table Randomly
    Wait Until Element Is Visible    ${IPVD SEND DEVICE FEEDBACK}
    Click Element    ${IPVD SEND DEVICE FEEDBACK}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Validate Request Form Initial State
    Validate Privacy Policy
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    #Name, email, message, and agreeing to privacy policy fields turn red
    Validate Input Field State    ${IPVD FEEDBACK YOUR NAME}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK MESSAGE}/../..    False
    Click Button    ${IPVD FEEDBACK CANCEL BUTTON}
    #TODO: Verify Table of devices and camera info panel did not change
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}
    #TODO: Verify Table of devices and camera info panel did not change

Text search
    [tags]    C48967    IPVD
    #Step 1
    Go To IPVD page
    ${baseurl}=   Set Variable    ${ENV}/ipvd
    #Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgba(0, 0, 0, 0)    #transparent
    Click Element    ${IPVD SEARCH BAR}
    #Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgb(255, 255, 255)    #rgb(255, 255, 255)  #white  #FFFFFF
    #Step 2
    IPVD Text Search    h
    Location Should Be    ${baseurl}?search=h
    Validate IPVD Device Table Not Empty
    #${IPVD SEARCH BAR}/../following-sibling::div       #All Buttons to right of Text Search bar (Advanced Search or Applied Filters)
    #${IPVD SEARCH BAR}/../following-sibling::div[1]    #First Button to right of Text Search bar (Advanced Search or Applied Filters)
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    Click Element    ${IPVD NEXT PAGE BUTTON}
    Location Should Be    ${baseurl}?search=h&page=2
    Wait Until Element Does Not Have Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    #Step 4
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    Location Should Be    ${baseurl}?search=h
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    #Step 5
    Click Element    ${IPVD LAST PAGE BUTTON}
    Wait Until Element Has Class    ${IPVD NEXT PAGE BUTTON}    disabled
    #Step 6
    Wait Until Element Does Not Have Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    ${page1}=   IPVD Active Page Number
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    ${page2}=   IPVD Active Page Number
    Should Be True    ${page2}-${page1} == -1    Problem selecting Previous page of results
    #Step 7
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    Location Should Be    ${baseurl}
    Validate on IPVD page
    #Step 8
    IPVD Text Search    h
    Location Should Be    ${baseurl}?search=h
    Validate IPVD Device Table Not Empty
    ${lastPage1}=   Get Text    ${IPVD LAST PAGE BUTTON}
    IPVD Text Search    hi
    Location Should Be    ${baseurl}?search=hi
    Validate IPVD Device Table Not Empty
    ${lastPage2}=   Get Text    ${IPVD LAST PAGE BUTTON}
    Should Be True    ${lastPage2} < ${lastPage1}    Page 2 results should be fewer than Page 1 results
    IPVD Text Search    hik
    Location Should Be    ${baseurl}?search=hik
    Validate IPVD Device Table Not Empty
    ${lastPage3}=   Get Text    ${IPVD LAST PAGE BUTTON}
    Should Be True    ${lastPage3} < ${lastPage2}    Page 3 results should be fewer than Page 2 results
    #Step 9
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    Location Should Be    ${baseurl}
    Validate on IPVD page
    #Step 10
    IPVD Text Search Expecting No Results    aaaaaaaa
    Location Should Be    ${baseurl}?search=aaaaaaaa
    Element Should Be Visible    ${NOTHING FOUND PLACEHOLDER}
    #Step 11
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    Dahua
    IPVD Text Search    ${desiredText}
    Location Should Be    ${baseurl}?search=${desiredText}
    IPVD Select Device From Table Randomly
    ${make}=   Get Text    ${IPVD DEVICE MAKE}
    Should Be Equal As Strings    ${make}    ${desiredText}    Device selected expected to be "${desiredText}" but is "${make}"
    #Step 12
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    SNC-CH120
    IPVD Text Search    ${desiredText}
    Location Should Be    ${baseurl}?search=${desiredText}
    IPVD Select Device From Table Column By Value    2    ${desiredText}
    ${model}=   Get Text    ${IPVD DEVICE MODEL}
    Should Be Equal As Strings    ${model}    ${desiredText}    Device selected expected to be "${desiredText}" but is "${model}"
    #Step 13
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    Digital Watchdog DWCA
    IPVD Text Search    ${desiredText}
    ${t}=   Replace String Using Regexp    ${desiredText}    \(\\ \)    %20
    Location Should Be    ${baseurl}?search=${t}
    IPVD Select Device From Table Randomly
    ${make}=   Get Text    ${IPVD DEVICE MAKE}
    ${model}=   Get Text    ${IPVD DEVICE MODEL}
    Should Contain    ${make} ${model}    ${desiredText}    Device selected expected to be "${desiredText}" but is "${make} ${model}"
    #Step 14
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    1920x1080
    IPVD Text Search    ${desiredText}
    Location Should Be    ${baseurl}?search=${desiredText}
    IPVD Select Device From Table By Row Number    1
    ${make1}=   Get Text    ${IPVD DEVICE MAKE}
    Elements Should Not Be Visible    ${IPVD TABLE HEADING MANUFACTURER}${IPVD TABLE HEADING LABEL SORT ARROW}
    Click Element    ${IPVD TABLE HEADING MANUFACTURER}
    IPVD Select Device From Table By Row Number    1
    ${make2}=   Get Text    ${IPVD DEVICE MAKE}
    Element Should Be Visible    ${IPVD TABLE HEADING MANUFACTURER}${IPVD TABLE HEADING LABEL SORT ARROW}
    ${u}=   Get Location
    Should Contain    ${u}    &sortBy=vendor,ASC    URL parameters should include &sortBy=vendor,ASC, but doesn't seem to. URL: "${u}"
    Click Element    ${IPVD TABLE HEADING MANUFACTURER}
    ${u}=   Get Location
    Should Contain    ${u}    &sortBy=vendor,DESC    URL parameters should include &sortBy=vendor,DESC, but doesn't seem to. URL: "${u}"
    IPVD Select Device From Table By Row Number    1
    ${make3}=   Get Text    ${IPVD DEVICE MAKE}
    Should Be Equal As Strings    ${make1}    ${make2}    1st "${make1}" and 2nd "${make2}" selected device should be the same manufacturers, but weren't.
    Should Be True    '${make2}' < '${make3}'    2nd "${make2}" selected device should be lexographically less than 3rd "${make3}" selected device, but wasn't.

Text in search input is kept after clicking X on applied Features filter indicator
    [tags]    C49362    IPVD
    #Step 1
    Go To IPVD page
    Click Element    ${IPVD DEVS FILTER PTZ CAMERAS}
    IPVD Text Search    Axis
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}
    Should Be Equal As Strings    ${numberOfFiltersApplied}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column Contains Desired Value in all Rows on all Pages    1    Axis
    Validate IPVD Device Table Column Contains Desired Value in all Rows on all Pages    8    ●
    #Step 2
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Click Element    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}
    Should Be Equal As Strings    ${numberOfFiltersApplied}    ${IPVD ADV FILTER TYPE} – ${IPVD ADV TYPE CAMERA}
    ${filterText}=   Get Element Attribute    ${IPVD SEARCH BAR}    value
    Should Be Equal As Strings    ${filterText}    Axis
    Validate IPVD Device Table Column Contains Desired Value in all Rows on all Pages    1    Axis
