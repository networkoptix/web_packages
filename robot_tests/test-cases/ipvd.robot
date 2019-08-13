*** Settings ***
Resource          ../ipvd_resource.robot
Suite Setup       Open Browser and go to URL    ${url}/ipvd
Test Setup        Restart
Test Teardown     NONE    #Close Browser    #Run Keyword If Test Failed    Reset DB and Open New Browser on Failure
Suite Teardown    Close All Browsers
Force Tags        Threaded File

*** Variables ***
${url}         ${ENV}

*** Keywords ***


*** Test Cases ***
IPVD Page loads without Login
    Go To IPVD Page

IPVD Page loads while Logged in
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Validate Log In
    Go To IPVD Page

#Submit request can be closed by 'X', cancel, and escape
#Submit request cannot be close by clicking outside the form
#Submit request correctly sends request

Text search correctly finds Manufacturers
    Go To IPVD Page
    IPVD Text Search    hanwha
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    1
    ...    Hanwha Techwin (Samsung)


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
    Go To IPVD Page
    Wait until Element is Visible    ${IPVD SUBMIT A REQUEST}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Validate Request Form Initial State
    Validate Privacy Policy
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    #Name, email, message, and agreeing to privacy policy fields turn red
    Validate Input Field State    ${IPVD FEEDBACK YOUR NAME}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK MESSAGE}/../..    False
    Click Button    ${IPVD FEEDBACK CANCEL BUTTON}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}

Feedback Form Basic Validations
    [tags]    C54182    IPVD
    #IPVD Page    Login=True
    #Wait until Element is Not Visible    ${LOG IN MODAL}
    Open IPVD Page and Log In
    IPVD Text Search    Axis
    IPVD Select Device from Table Randomly
    Wait until Element is Visible    ${IPVD SEND DEVICE FEEDBACK}
    Click Element    ${IPVD SEND DEVICE FEEDBACK}
    Wait until Element is Visible    ${IPVD FEEDBACK}
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
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}
    #TODO: Verify Table of devices and camera info panel did not change

Text search
    [tags]    C48967    IPVD

    Log    Step 1
    Go To IPVD Page
    ${baseurl}=   Set Variable    ${ENV}/ipvd
    # transparent
    Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgba(0, 0, 0, 0)
    Click Element    ${IPVD SEARCH BAR}
    # white
    Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgba(255, 255, 255, 1)

    Log    Step 2
    IPVD Text Search    h
    Location should be    ${baseurl}?search=h
    Validate IPVD Device Table Not Empty

    Log    Step 3
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    Click Element    ${IPVD NEXT PAGE BUTTON}
    Location should be    ${baseurl}?search=h&page=2
    Wait Until Element Does Not Have Class
    ...    ${IPVD PREVIOUS PAGE BUTTON}
    ...    disabled

    Log    Step 4
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    Location should be    ${baseurl}?search=h
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled

    Log    Step 5
    Click Element    ${IPVD LAST PAGE BUTTON}
    Wait Until Element Has Class    ${IPVD NEXT PAGE BUTTON}    disabled

    Log    Step 6
    Wait Until Element Does Not Have Class
    ...    ${IPVD PREVIOUS PAGE BUTTON}
    ...    disabled
    ${page1}=   IPVD Active Page Number
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    ${page2}=   IPVD Active Page Number
    Should be True
    ...    ${page2}-${page1} == -1
    ...    Problem selecting Previous page of results

    Log    Step 7
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    Location should be    ${baseurl}
    Validate on IPVD Page

    Log    Step 8
    IPVD Text Search    h
    Location should be    ${baseurl}?search=h
    Validate IPVD Device Table Not Empty
    ${lastPage1}=   Get Text    ${IPVD LAST PAGE BUTTON}
    IPVD Text Search    hi
    Location should be    ${baseurl}?search=hi
    Validate IPVD Device Table Not Empty
    ${lastPage2}=   Get Text    ${IPVD LAST PAGE BUTTON}
    Should be True
    ...    ${lastPage2} < ${lastPage1}
    ...    Page 2 results should be fewer than Page 1 results
    IPVD Text Search    hik
    Location should be    ${baseurl}?search=hik
    Validate IPVD Device Table Not Empty
    ${lastPage3}=   Get Text    ${IPVD LAST PAGE BUTTON}
    Should be True
    ...    ${lastPage3} < ${lastPage2}
    ...    Page 3 results should be fewer than Page 2 results

    Log    Step 9
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    Location should be    ${baseurl}
    Validate on IPVD Page

    Log    Step 10
    IPVD Text Search Expecting No Results    aaaaaaaa
    Location should be    ${baseurl}?search=aaaaaaaa
    Element should be Visible    ${NOTHING FOUND PLACEHOLDER}

    Log    Step 11
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    Dahua
    IPVD Text Search    ${desiredText}
    Location should be    ${baseurl}?search=${desiredText}
    IPVD Select Device from Table Randomly
    ${make}=   Get Text    ${IPVD DEVICE MAKE}
    Should be Equal As Strings
    ...    ${make}
    ...    ${desiredText}
    ...    Device selected expected to be "${desiredText}" but is "${make}"

    Log    Step 12
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    SNC-CH120
    IPVD Text Search    ${desiredText}
    Location should be    ${baseurl}?search=${desiredText}
    IPVD Select Device from Table Column by Value    2    ${desiredText}
    ${model}=   Get Text    ${IPVD DEVICE MODEL}
    Should be Equal As Strings
    ...    ${model}
    ...    ${desiredText}
    ...    Device selected expected to be "${desiredText}" but is "${model}"

    Log    Step 13
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    Digital Watchdog DWCA
    IPVD Text Search    ${desiredText}
    ${t}=   Replace String Using Regexp    ${desiredText}    \(\\ \)    %20
    Location should be    ${baseurl}?search=${t}
    IPVD Select Device from Table Randomly
    ${make}=   Get Text    ${IPVD DEVICE MAKE}
    ${model}=   Get Text    ${IPVD DEVICE MODEL}
    Should Contain
    ...    ${make} ${model}
    ...    ${desiredText}
    ...    Device selected expected to be "${desiredText}" but is "${make} ${model}"

    Log    Step 14
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    1920x1080
    IPVD Text Search    ${desiredText}
    Location should be    ${baseurl}?search=${desiredText}
    IPVD Select Device from Table by Row Number    1
    ${make1}=   Get Text    ${IPVD DEVICE MAKE}
    Elements should Not be Visible
    ...    ${IPVD TABLE HEADING MANUFACTURER}${IPVD TABLE HEADING LABEL SORT ARROW}
    Click Element    ${IPVD TABLE HEADING MANUFACTURER}
    IPVD Select Device from Table by Row Number    1
    ${make2}=   Get Text    ${IPVD DEVICE MAKE}
    Element should be Visible
    ...    ${IPVD TABLE HEADING MANUFACTURER}${IPVD TABLE HEADING LABEL SORT ARROW}
    ${u}=   Get Location
    Should Contain
    ...    ${u}
    ...    &sortBy=vendor,ASC
    ...    URL parameters should include &sortBy=vendor,ASC, but doesn't seem to. URL: "${u}"
    Click Element    ${IPVD TABLE HEADING MANUFACTURER}
    ${u}=   Get Location
    Should Contain
    ...    ${u}
    ...    &sortBy=vendor,DESC
    ...    URL parameters should include &sortBy=vendor,DESC, but doesn't seem to. URL: "${u}"
    IPVD Select Device from Table by Row Number    1
    ${make3}=   Get Text    ${IPVD DEVICE MAKE}
    Should be Equal As Strings
    ...    ${make1}
    ...    ${make2}
    ...    1st "${make1}" and 2nd "${make2}" selected device should be the same manufacturers, but weren't.
    Should be True
    ...    '${make2}' < '${make3}'
    ...    2nd "${make2}" selected device should be lexographically less than 3rd "${make3}" selected device, but wasn't.

Text in Search Input is kept after clicking X on Applied Features filter indicator
    [tags]    C49362    IPVD

    Log    Step 1
    Go To IPVD Page
    Click Element    ${IPVD DEVS FILTER PTZ CAMERAS}
    IPVD Text Search    Axis
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}
    Should be Equal As Strings
    ...    ${numberOfFiltersApplied}
    ...    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    1
    ...    Axis
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    ●

    Log    Step 2
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Click Element
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}
    Should be Equal As Strings
    ...    ${numberOfFiltersApplied}
    ...    ${IPVD ADV FILTER TYPE} – ${IPVD ADV TYPE CAMERA}
    ${filterText}=   Get Element Attribute    ${IPVD SEARCH BAR}    value
    Should be Equal As Strings    ${filterText}    Axis
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    1
    ...    Axis

Advanced search
    [tags]    C48968    IPVD

    Log    Step 1
    Go To IPVD Page
    Verify IPVD Advanced Search is Closed
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Open

    Log    Step 2
    Click Element    ${IPVD ADV FEATURES PTZ}
    Wait Until Element Has Style
    ...    ${IPVD ADV FEATURES PTZ}/div
    ...    background-color
    ...    ${COLOR LIGHT16 RGB}
    Wait until Elements are Visible
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element has Class
    ...    ${IPVD ADV FEATURES PTZ}/div
    ...    badge-selected

    Log    Step 3
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    Down
    Click Element    ${IPVD ADV FILTERS MIN RES}
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    Up
    Wait Until Element Has Style
    ...    ${IPVD ADV FEATURES PTZ}/div
    ...    background-color
    ...    ${COLOR LIGHT16 RGB}
    Click Element
    ...    ${IPVD ADV FILTERS MIN RES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/a/span[text()='1080p']
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    Down
    Element Text should be
    ...    ${IPVD ADV FILTERS MIN RES}
    ...    1080p
    Wait until Elements are Visible
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    ●

    Log    Step 4
    Click Element
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element is Not Visible
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element does Not have Class
    ...    ${IPVD ADV FEATURES PTZ}/div
    ...    badge-selected
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    Minimum Resolution – 1080p

    Log    Step 5
    Click Element    ${IPVD ADV FILTERS MFRS}
    Click Element
    ...    ${IPVD ADV FILTERS MFRS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Axis']
    Click Element    ${IPVD ADV FILTERS MFRS}
    Element Text should be
    ...    ${IPVD ADV FILTERS MFRS}
    ...    Axis
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    1
    ...    Axis

    Log    Step 6
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MFRS}
    ...    Down
    Click Element    ${IPVD ADV FILTERS MFRS}
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MFRS}
    ...    Up
    Click Element
    ...    ${IPVD ADV FILTERS MFRS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Hikvision']
    Click Element    ${IPVD ADV FILTERS MFRS}
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS MFRS}
    ...    Down
    Element Text should be
    ...    ${IPVD ADV FILTERS MFRS}
    ...    2 selected
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    3 filters applied
    Validate IPVD Device Table Not Empty

    Log    Step 7
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS TYPES}
    ...    Down
    Click Element    ${IPVD ADV FILTERS TYPES}
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS TYPES}
    ...    Up
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Camera']
    Element Text should be
    ...    ${IPVD ADV FILTERS TYPES}
    ...    Camera
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Encoder']
    Element Text should be
    ...    ${IPVD ADV FILTERS TYPES}
    ...    2 selected
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='DVR']
    Element Text should be
    ...    ${IPVD ADV FILTERS TYPES}
    ...    3 selected
    Click Element    ${IPVD ADV FILTERS TYPES}
    Verify Button Arrow Direction
    ...    ${IPVD ADV FILTERS TYPES}
    ...    Down
    Element Text should be
    ...    ${IPVD ADV FILTERS TYPES}
    ...    3 selected
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    6 filters applied
    Validate IPVD Device Table Not Empty

    Log    Step 8
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Closed
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    6 filters applied
    Validate IPVD Device Table Not Empty

    Log    Step 9
    IPVD Select Device from Table Randomly
    Wait Until Elements Are Visible
    ...    ${IPVD DEVICE DETAILS}

    Log    Step 10
    Click Element
    ...    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD Page
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Open
    Click Element
    ...    ${IPVD ADV FEATURES 2-WAY AUDIO}
    Click Element
    ...    ${IPVD ADV FEATURES PTZ}
    Wait until Elements are Visible
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    7
    ...    2-way
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    ●

    Log    Step 11
    Click Element
    ...    ${IPVD ADV FEATURES ADV PTZ}
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    3 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    Adv.

    Log    Step 12
    Click Element
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element is Not Visible
    ...    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element does Not have Class
    ...    ${IPVD ADV FEATURES PTZ}/div
    ...    badge-selected
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    Adv.

    Log    Step 13
    Click Element
    ...    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD Page
    Go To IPVD Page with arguments    ?debug=true
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Open
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Click Element
    ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Entering the area']
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Element Text should be
    ...    ${IPVD ADV FILTERS ANALYTICS}
    ...    Entering the area
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    Entering the area
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    10
    ...    ●

    Log    Step 14
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Click Element
    ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Somebody appeared']
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Element Text should be
    ...    ${IPVD ADV FILTERS ANALYTICS}
    ...    2 selected
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 analytics events
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    10
    ...    ●

    Log    Step 15
    Click Element
    ...    ${IPVD ADV FEATURES PTZ}
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    3 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    ●
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    10
    ...    ●

    Log    Step 16
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Click Element
    ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Somebody appeared']
    Click Element    ${IPVD ADV FILTERS ANALYTICS}
    Element Text should be
    ...    ${IPVD ADV FILTERS ANALYTICS}
    ...    Entering the area
    Element Text should be
    ...    ${IPVD FILTERS APPLIED BUTTON}
    ...    2 filters applied
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    8
    ...    ●
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    10
    ...    ●
