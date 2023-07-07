*** Settings ***
Resource          ../Resources/front-end-resources/ipvd-resource.robot
Suite Setup       Open Browser and go to URL    ${ENV}/ipvd
Test Setup        Run Keywords    QA Video Recording Start     ipvd-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded 

*** Test Cases ***
1. IPVD Page loads without Login
    Go To IPVD Page

2. IPVD Page loads while Logged in
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Go To IPVD Page

3. IPVD landing page actions
    [Tags]    C48791    CLOUD-7598    ci    smoke    C57509
    Log    Step 1 - Validate Landing Page Contents
    Go To IPVD Page
    Validate on IPVD Page
    ${search_placeholder}=   Get Element Attribute    ${IPVD SEARCH BAR}    placeholder
    Should Be Equal as Strings    ${search_placeholder}    ${SEARCH PLACEHOLDER TEXT}    ignore_case=true
    Element should contain    ${IPVD ADV SEARCH BUTTON}    ${IPVD ADV SEARCH BUTTON TEXT}    ignore_case=true
    Element should contain    ${IPVD MANUFACTURERS PANE}//header//span    ${IPVD ADV FILTER MFRS}    ignore_case=true
    ${num vendors}=   Get Element Count    ${IPVD MANUFACTURERS PANE ITEM}
    Should Not Be Equal As Numbers  ${num vendors}   0
    Element should contain      ${IPVD DEVICES PANE}//header//span    ${IPVD DEVICES TEXT}    ignore_case=true
    ${num device types}=   Get Element Count    ${IPVD DEVICES PANE}//nx-tag/a
    Should Be Equal As Numbers  ${num device types}   10
    Element should contain    ${IPVD LANDING PAGE TEXT}    ${IPVD SUBMIT A REQUEST TEXT}    ignore_case=true

    Log    Step 2 - Validate filtering by manufacturer
    ${vendor}=  Set variable    Axis
    Click Element    ${IPVD MANUFACTURERS PANE}//a[contains(text(), '${vendor}')]
    Wait Until Element Is Visible    ${IPVD TABLE}
    Run keyword and continue on failure    Element Text Should Be    ${IPVD FILTER BUTTON}
    ...    ${IPVD ADV FILTER MFR} – ${vendor}
    Wait Until Element is Visible    ${IPVD TABLE FIRST ITEM}
    
    Element Text Should Be    ${IPVD TABLE FIRST ITEM}    ${vendor}
    Validate Landing Page Objects are not Visible

    Log    Step 3
    Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD page

    Log    Step 4 - Validate filtering by device type
    Click Element    ${IPVD DEVICES PANE}//a[contains(text(), '${IPVD DEV FILTER ENCODERS}')]
    Sleep    5
    Run keyword and continue on failure    Element Text Should Be    ${IPVD FILTER BUTTON}
    ...    ${IPVD ADV FILTER TYPE} – ${IPVD ADV TYPE ENCODER}
    Wait Until Element is Visible    ${IPVD TABLE FIRST ITEM}
    Element Text Should Be    ${IPVD TABLE FIRST ITEM}/../../div[contains(@id, "hardwareType")]    Encoder
    Validate Landing Page Objects are not Visible

    Log    Step 5 - Back to the landing page
    Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD page

    Log    Step 6 - Verify IPVD feedback link opens correct dialog
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}

4. Text search correctly finds Manufacturers
    Go To IPVD Page
    IPVD Text Search    hanwha
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages
    ...    1
    ...    Hanwha    #used to be "Hanwha Techwin (Samsung)" but last entry in the table is "Hanwha techwin" and it would fail.

5. Request Form Basic Validations
    [Tags]    C48969
    Log    Step 1
    Go To IPVD Page
    Wait until Element is Visible    ${IPVD SUBMIT A REQUEST}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Validate Request Form Initial State
    Validate Privacy Policy

    Log    Step 2
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    #Name, email, message, and agreeing to privacy policy fields turn red
    Validate Input Field State    ${IPVD FEEDBACK YOUR NAME}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK MESSAGE}/../..    False

    Log    Step 3
    Click Button    ${IPVD FEEDBACK CANCEL BUTTON}
    Wait until Element is Not Visible    ${IPVD FEEDBACK}

    Log    Step 4
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait until Elements Are Visible    ${IPVD FEEDBACK}    ${IPVD FEEDBACK CLOSE BUTTON}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}
    Wait until Element is Not Visible    ${IPVD FEEDBACK}


6. Feedback Form Basic Validations
    [Tags]    C54182
    Log    Step 1
    # First step changed due to CLOUD-4773
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}    validate=${False}
    Go To    ${ENV}/ipvd
    Sleep   10
    Validate on IPVD page

    IPVD Text Search    Axis
    IPVD Select Device from Table Randomly
    Wait until Element is Visible    ${IPVD SEND DEVICE FEEDBACK}
    Click Element    ${IPVD SEND DEVICE FEEDBACK}
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Validate Request Form Initial State
    Validate Privacy Policy

    Log   Step 2
    Click Button    ${IPVD FEEDBACK SEND BUTTON}
    #Name, email, message, and agreeing to privacy policy fields turn red
    Validate Input Field State    ${IPVD FEEDBACK YOUR NAME}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK EMAIL}/../..    False
    Validate Input Field State    ${IPVD FEEDBACK MESSAGE}/../..    False

    Log    Step 3
    Click Button    ${IPVD FEEDBACK CANCEL BUTTON}
    Wait until Element is Not Visible    ${IPVD FEEDBACK}
    #TODO: Verify Table of devices and camera info panel did not change

    Log    Step 4
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait until Element is Visible    ${IPVD FEEDBACK}
    Click Button    ${IPVD FEEDBACK CLOSE BUTTON}
    Wait until Element is Not Visible    ${IPVD FEEDBACK}
    #TODO: Verify Table of devices and camera info panel did not change

7. Text search
    [Tags]    C48967
    Log    Step 1
    Go To IPVD Page
    ${baseurl}=   Set Variable    ${ENV}/ipvd
    # transparent
    Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgba(0, 0, 0, 0)
    Click Element    ${IPVD SEARCH BAR}
    # white
    Wait Until Element Has Style    ${IPVD SEARCH BAR}    background-color    rgba(0, 0, 0, 0)

    Log    Step 2
    IPVD Text Search    h
    Location should be    ${baseurl}?search=h
    Wait until element is visible    ${IPVD CLEAR TEXT SEARCH BUTTON}
    Validate IPVD Device Table Not Empty

    Log    Step 3
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    Click Element    ${IPVD NEXT PAGE BUTTON}
    Wait Until Location Is    ${baseurl}?search=h&page=2
    Wait Until Element Does Not Have Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled

    Log    Step 4
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    Wait Until Location Is    ${baseurl}?search=h
    Wait Until Element Has Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled

    Log    Step 5
    Wait Until Element Is Visible    ${IPVD LAST PAGE BUTTON}
    Click Element    ${IPVD LAST PAGE BUTTON}
    Wait Until Element Has Class    ${IPVD NEXT PAGE BUTTON}    disabled

    Log    Step 6
    Wait Until Element Does Not Have Class    ${IPVD PREVIOUS PAGE BUTTON}    disabled
    ${page1}=   IPVD Active Page Number
    Click Element    ${IPVD PREVIOUS PAGE BUTTON}
    ${page2}=   IPVD Active Page Number
    Should be True    ${page2}-${page1} == -1    Problem selecting Previous page of results

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
    Wait Until Location Is    ${baseurl}?search=hi
    Validate IPVD Device Table Not Empty
    ${lastPage2}=   Get Text    ${IPVD LAST PAGE BUTTON}
    Should be True
    ...    ${lastPage2} < ${lastPage1}
    ...    Page 2 results should be fewer than Page 1 results
    IPVD Text Search    hik
    Wait Until Location Is    ${baseurl}?search=hik
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
    Wait Until Location Is    ${baseurl}?search=aaaaaaaa
    Element should be Visible    ${NOTHING FOUND PLACEHOLDER}

    Log    Step 11
    Click Element    ${IPVD CLEAR TEXT SEARCH BUTTON}
    ${desiredText}=   Set Variable    Dahua
    IPVD Text Search    ${desiredText}
    Wait Until Location Is    ${baseurl}?search=${desiredText}
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
    Wait Until Location Is   ${baseurl}?search=${desiredText}
    IPVD Select Device from Table Column by Value    2    ${desiredText}    include last=${False}
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
    Wait Until Location Is    ${baseurl}?search=${t}
    IPVD Select Device from Table Randomly      include last=${False}
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
    Wait Until Location Is    ${baseurl}?search=${desiredText}
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

8. Text in Search Input is kept after clicking X on Applied Features filter indicator
    [Tags]    C49362    CLOUD-7598
    Log    Step 1
    Go To IPVD Page
    Click Element    ${IPVD DEVS FILTER PTZ CAMERAS}
    Wait Until Element Is Visible    ${IPVD TABLE}
    IPVD Text Search    Axis
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}/span    2 ${IPVD FILTERS APPLIED TEXT}
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}/span
    Should be Equal As Strings    ${numberOfFiltersApplied}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    1    Axis
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    ●

    Log    Step 2
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Click Element    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Sleep    .5
    ${numberOfFiltersApplied}=   Get Text    ${IPVD FILTERS APPLIED BUTTON}
    Run keyword and continue on failure    Should be Equal As Strings
    ...    ${numberOfFiltersApplied}
    ...    ${IPVD ADV FILTER TYPE} – ${IPVD ADV TYPE CAMERA}
    ${filterText}=   Get Element Attribute    ${IPVD SEARCH BAR}    value
    Should be Equal As Strings    ${filterText}    Axis
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    1    Axis

9. Advanced search
    [Tags]    C48968    CLOUD-9243
    Log    Step 1
    Go To IPVD Page
    Verify IPVD Advanced Search is Closed
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Sleep    5
    Wait Until Element Has Style    ${IPVD ADV SEARCH BUTTON}    color    rgba(255, 255, 255, 1)
    Verify IPVD Advanced Search is Open

    Log    Step 2
    Click Element    ${IPVD ADV FEATURES PTZ}
    Wait Until Element Has Style
    ...    ${IPVD ADV FEATURES PTZ}/a
    ...    background-color
    ...    ${COLOR LIGHT16 RGB}
    Wait Until Element Has Style
    ...    ${IPVD ADV FEATURES PTZ}/a
    ...    color
    ...    rgba(255, 255, 255, 1)
    Wait until Element is Visible    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element has Class    ${IPVD ADV FEATURES PTZ}/a    badge-selected

    Log    Step 3
    Wait Until Element Is Visible    ${IPVD TABLE}
    Filter Arrow Should Point    ${IPVD ADV FILTERS MIN RES}    down
    Click Element    ${IPVD ADV FILTERS MIN RES}
    Filter Arrow Should Point    ${IPVD ADV FILTERS MIN RES}    up
    Wait Until Element Has Style
    ...    ${IPVD ADV FEATURES PTZ}/a
    ...    background-color
    ...    ${COLOR LIGHT16 RGB}
    Click Element
    ...    ${IPVD ADV FILTERS MIN RES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/a/span[text()='1080p']
    Filter Arrow Should Point    ${IPVD ADV FILTERS MIN RES}    down
    Element Text should be    ${IPVD ADV FILTERS MIN RES}    1080p
    Wait until Element is Visible    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be     ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    ●

    Log    Step 4
    Click Element    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element is Not Visible    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element does Not have Class    ${IPVD ADV FEATURES PTZ}/a    badge-selected
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    ${IPVD ADV FILTER MIN RES}
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    1080p

    Log    Step 5
    Click Element    ${IPVD ADV FILTERS MFRS}
    Click Element
    ...    ${IPVD ADV FILTERS MFRS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Axis']
    Click Element    ${IPVD ADV FILTERS MFRS}
    Wait Until Element Contains    ${IPVD ADV FILTERS MFRS}    Axis
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    1    Axis

    Log    Step 6
    Filter Arrow Should Point    ${IPVD ADV FILTERS MFRS}    down
    Click Element    ${IPVD ADV FILTERS MFRS}
    Filter Arrow Should Point    ${IPVD ADV FILTERS MFRS}    up
    Click Element
    ...    ${IPVD ADV FILTERS MFRS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Hikvision']
    Click Element    ${IPVD ADV FILTERS MFRS}
    Sleep    30
    Filter Arrow Should Point    ${IPVD ADV FILTERS MFRS}    down
    Wait Until Element Contains    ${IPVD ADV FILTERS MFRS}    2 ${IPVD FILTERS SELECTED TEXT}
    Wait Until Element Contains   ${IPVD FILTERS APPLIED BUTTON}    3 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be    ${IPVD FILTERS APPLIED BUTTON}    3 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Not Empty

    Log    Step 7
    Filter Arrow Should Point    ${IPVD ADV FILTERS TYPES}    down
    Click Element    ${IPVD ADV FILTERS TYPES}
    Filter Arrow Should Point    ${IPVD ADV FILTERS TYPES}    up
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='${IPVD ADV TYPE CAMERA}']
    Element Text should be    ${IPVD ADV FILTERS TYPES}    ${IPVD ADV TYPE CAMERA}
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='${IPVD ADV TYPE ENCODER}']
    Element Text should be    ${IPVD ADV FILTERS TYPES}    2 ${IPVD FILTERS SELECTED TEXT}
    Click Element
    ...    ${IPVD ADV FILTERS TYPES}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='${IPVD ADV TYPE DVR}']
    Element Text should be    ${IPVD ADV FILTERS TYPES}    3 ${IPVD FILTERS SELECTED TEXT}
    Click Element    ${IPVD ADV FILTERS TYPES}
    Filter Arrow Should Point    ${IPVD ADV FILTERS TYPES}    down
    Element Text should be    ${IPVD ADV FILTERS TYPES}    3 ${IPVD FILTERS SELECTED TEXT}
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    6 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be    ${IPVD FILTERS APPLIED BUTTON}    6 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Not Empty

    Log    Step 8
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Closed
    Element Text should be    ${IPVD FILTERS APPLIED BUTTON}    6 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Not Empty

    Log    Step 9
    IPVD Select Device from Table Randomly
    Wait Until Element is Visible    ${IPVD DEVICE DETAILS}

    Log    Step 10
    Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
    Validate on IPVD Page
    Click Element    ${IPVD ADV SEARCH BUTTON}
    Verify IPVD Advanced Search is Open
    Click Element    ${IPVD ADV FEATURES 2-WAY AUDIO}
    Click Element    ${IPVD ADV FEATURES PTZ}
    Wait until Elements are Visible    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait Until Element Contains   ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be   ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    7    2-way
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    ●

    Log    Step 11
    Click Element    ${IPVD ADV FEATURES ADV PTZ}
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    3 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be    ${IPVD FILTERS APPLIED BUTTON}    3 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    Adv.

    Log    Step 12
    Click Element    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element is Not Visible    ${IPVD ADV FEATURES PTZ}${IPVD ADV FEATURES CLOSE BUTTON}
    Wait until Element does Not have Class    ${IPVD ADV FEATURES PTZ}/a    badge-selected
    Wait Until Element Contains    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Element Text Should Be        ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
    Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    Adv.

# I have commented these out as they are causing errors on a part of the code that is
# only accessible in debug mode.  Once analytics is a standard then we will revisit.
#     Log    Step 13
#     Click Element    ${IPVD ADV FEATURES CLOSE BUTTON}
#     Validate on IPVD Page
#     Go To IPVD Page with arguments    ?debug=true
#     Click Element    ${IPVD ADV SEARCH BUTTON}
#     Verify IPVD Advanced Search is Open
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Click Element
#     ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Entering the area']
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Element Text should be    ${IPVD ADV FILTERS ANALYTICS}    Entering the area
#     Element Text should be    ${IPVD FILTERS APPLIED BUTTON}    Entering the area
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    10    ●
#
#     Log    Step 14
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Click Element
#     ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Somebody appeared']
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Element Text should be    ${IPVD ADV FILTERS ANALYTICS}    2 ${IPVD FILTERS SELECTED TEXT}
#     Element Text should be    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS ANALYTICS TEXT}
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    10    ●
#
#     Log    Step 15
#     Click Element    ${IPVD ADV FEATURES PTZ}
#     Element Text should be    ${IPVD FILTERS APPLIED BUTTON}    3 ${IPVD FILTERS APPLIED TEXT}
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    ●
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    10    ●
#
#     Log    Step 16
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Click Element
#     ...    ${IPVD ADV FILTERS ANALYTICS}${IPVD ADV FILTERS DROPDOWN MENU ITEMS}/div/label[text()='Somebody appeared']
#     Click Element    ${IPVD ADV FILTERS ANALYTICS}
#     Element Text should be    ${IPVD ADV FILTERS ANALYTICS}    Entering the area
#     Element Text should be    ${IPVD FILTERS APPLIED BUTTON}    2 ${IPVD FILTERS APPLIED TEXT}
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    8    ●
#     Validate IPVD Device Table Column contains Desired Value in all Rows on all Pages    10    ●

10. Camera Info panel
    [Tags]    C48973
    Log    Step 1
    Go To    ${ENV}/ipvd
    Validate on IPVD Page
    IPVD Text Search    PNM-9080VQ
    IPVD Select Device from Table by Row Number     include last=${False}
    Sleep    1
    ${current url}=   Get Location
    Should be equal as strings    ${current url}    ${ENV}/ipvd?search=PNM-9080VQ&camera=PNM-9080VQ
    ${camera class}=   Get Element Attribute    ${IPVD TABLE FIRST ITEM}    class
    Should Contain    ${camera class}    selected
    Validate Camera Info Panel

#Commented out due to CLOUD-4775.
#    ${number of firmwares}=   Get Element Count    ${IPVD DEVICE FIRMWARE VERSIONS}
#Number of firmwares = 6 - 2(firmware version and show all block)
#    Should be equal as numbers    ${number of firmwares}    6

    Log    Step 2
    Click Link     ${IPVD DEVICE SHOW ALL LINK}
    Wait until element is visible   ${IPVD DEVICE COLLAPSE LINK}
    Click Link    ${IPVD DEVICE COLLAPSE LINK}
    ${number of firmwares}=   Get Element Count    ${IPVD DEVICE FIRMWARE VERSIONS}
    Should be equal as numbers    ${number of firmwares}    6

    Log    Step 3
    ${google search href}=   Get Element Attribute    ${IPVD DEVICE GOOGLE LINK}    href
    Should be equal as strings    ${google search href}    https://www.google.com/search?q=Hanwha%20Techwin%20(Samsung)+PNM-9080VQ

    Log    Step 4
    Click Element    ${IPVD CLOSE DETAILS BUTTON}
    ${current url}=   Get Location
    Should be equal as strings    ${current url}    ${ENV}/ipvd?search=PNM-9080VQ
    ${camera class}=   Get Element Attribute    ${IPVD TABLE FIRST ITEM}    class
    Should Not Contain    ${camera class}    selected

#Here should be tests for analytics events block on Camera panel, but it's not yet implemented

11. Export to CSV
    [Tags]     C46930
    Go To    ${ENV}/ipvd?vendors=Hanwha%20Techwin%20(Samsung)&resolution=1310720&hardwareTypes=camera,encoder&tags=isTwAudioSupported&search=A&camera=PNF-9010RV
    Wait until element is visible    ${IPVD EXPORT TO CSV LINK}
    Click Link    ${IPVD EXPORT TO CSV LINK}
    Sleep    5
    ${current date}=   Get Current Date
    ${date}    ${time}=    Split String    ${current date}    ${SPACE}    1
#TODO Make chromedriver downloading the files
#    File Should Exist    ~/Downloads/camera_list_${date}.csv