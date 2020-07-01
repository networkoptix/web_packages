*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Run Keywords    Remove Temporary Users    Close All Browsers
Force Tags        system

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}
@{auth}        ${EMAIL OWNER}    ${password}
@{TMP USERS}

*** Keywords ***
Reset DB and Open New Browser On Failure
    Close Browser
    Set Account Name    ${url}    ${EMAIL OWNER}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Open Browser and go to URL    ${url}

Restart
    Common Restart Logout    ${url}

*** Test Cases ***
System tiles represent actual information
    [Tags]    C41893    Threaded
    Log in    ${EMAIL OWNER}    ${password}
    Wait Until Elements Are Visible
    ...    ${SYSTEMS SEARCH INPUT}
    ...    ${ACCOUNT DROPDOWN}
    ...    ${SYSTEMS TILE}
    ...    ${AUTO TESTS TITLE}
    ...    ${AUTO TESTS USER}
    ...    ${AUTO TESTS OPEN NX}
    ...    ${AUTOTESTS OFFLINE}
    ${systems}=   Get WebElements    //div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']
    Check Online Or Offline    ${systems}    ${AUTOTESTS OFFLINE TEXT}

Should show the no systems connected message when you have no systems
    [Tags]    C41866    Threaded
    Log In    ${EMAIL NOPERM}    ${password}    validate=False
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

Should show system name in header dropdown with "Open in Nx Witness" button if user has only one system
    [Tags]    C41569    Threaded
    ${random email}=   Register and activate account with random email    firstname    lastname    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${random email}

    Log In    ${random email}    ${password}    validate=False
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}
    Click Button    ${OPEN IN NX BUTTON}

User have several systems linked to his account
    [Tags]    C41570    Threaded
    Log    Step 1
    Log In    ${EMAIL OWNER}    ${password}
    # Expected Result
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    ${count1}=   Get Text    ${SYSTEMS DROPDOWN}
    ${count1}=   Remove String Using Regexp    ${count1}    \\D
    Should Be True    ${count1} > 12
    ...    The Systems count was expected to be more than 12, but is ${count1}.

    Log    Step 2
    Click Element    ${SYSTEMS DROPDOWN}
    # Expected Result
    Wait Until Elements Are Visible
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU}
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU ITEMS}
    ...    ${ALL SYSTEMS}
    ${count2}=   Get Element Count
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/a/span[not(text()='All Systems')]/../../../li

    Should Be Equal As Integers   ${count1}    ${count2}
    ${elements}=   Get WebElements    ${SYSTEMS DROPDOWN}${DROPDOWN MENU ITEMS}
    # Confirm height of dropdown menu list is less than total height of all list items within
    ${ulWidth}    ${ulHeight}=   Get Element Size    ${SYSTEMS DROPDOWN}${DROPDOWN MENU LIST}
    ${e}=   Get From List    ${elements}    0
    ${liWidth}    ${liHeight}=   Get Element Size    ${e}
    Should be True    ${ulHeight} < (${liHeight}*${count1})

    Log    Step 3
    ${r}=   Evaluate    random.randint(0, ${count1})    modules=random
    ${r1}=   Evaluate    ${r}+1
    Log    r1: ${r1}
    ${x}=   Get From List    ${elements}    ${r}
    ${l}=   Set Variable    ${SYSTEMS DROPDOWN}${DROPDOWN MENU ITEMS}\[${r1}]
    # Removed becuse the element no longer has an href attribute
    # ${h}=   Get Element Attribute    ${l}/a    href
    ${n}=   Get Text    ${l}//span[@class='system-name']
    Wait Until Element Is Visible    ${x}
    Scroll Element Into View    ${x}
    Click Element    ${x}
    # Expected Result
    # Location Should Contain    ${h}
    Wait Until Element Contains    ${SYSTEM NAME}    ${n}
    ${system}=   Get Text    ${SYSTEMS DROPDOWN}/span[contains(@class,'ellipsis')]
    Should Be Equal As Strings    ${n}    ${system}

    Log    Step 4
    Click Element    ${SYSTEMS DROPDOWN}
    # Expected Result
    Wait Until Elements Are Visible
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU}
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU ITEMS}
    ${l}=   Set Variable
    ...    ${SYSTEMS DROPDOWN}${DROPDOWN MENU ITEMS}//span[@class='system-name']
    ${elements}=   Get WebElements    ${l}
    #Should Contain X Times    ${elements}    ${n}    1
    ${x}=   Set Variable    0
    FOR    ${element}    IN     @{elements}
        ${n2}=   Get Text    ${element}
        ${x1}=   Evaluate    ${x}+1
        ${x}=   Set Variable If    "${n2}" == "${n}"    ${x1}    ${x}
    END
    Should Be Equal As Integers    ${x}    1    Expected only 1 System named ${n}, but found ${x}

    Log    Step 5
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Element    ${ALL SYSTEMS}
    # Expected Result
    ${l}=   Get Location
    Should End With    ${l}    /systems
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}//span[text()]/span/..
    ${count3}=   Get Text    ${SYSTEMS DROPDOWN}//span[text()]/span/..
    ${count3}=   Remove String Using Regexp    ${count3}    \\D
    Should Be True    ${count3} > 12
    ...    The Systems count was expected to be more than 12, but is ${count3}.
    Should Be Equal As Integers    ${count1}    ${count3}

Should show the system page instead of all systems when user only has one
    [Tags]    C41878
    ${random email}=   Register and activate account with random email    firstname    lastname    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${random email}

    Log In    ${random email}    ${password}    validate=False
    Wait Until Element Is Visible    ${SYSTEM NAME}

Should open system page when clicked on system
    [Tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    # Sometimes the name fields refill if you empty them too fast
    sleep    2
    Wait Until Page Does Not Contain Element    //div[@class='preloader']
    Click Element    ${AUTO TESTS TITLE}
    Verify In System    Auto Tests

Should show your system for owner and owner name for non-owners
    [Tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Element Text Should Be    ${AUTO TESTS USER}    ${YOUR SYSTEM TEXT}
    FOR    ${user}    IN    @{EMAILS LIST}
        Run Keyword Unless    "${user}"=="${EMAIL OWNER}"    Check Systems Text    ${user}
    END

Should not show systems dropdown with no systems
    [Tags]    C41568    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Element Should Not Be Visible    ${SYSTEMS DROPDOWN}

Search should highlight system name
    [Tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${AUTO TESTS}"]

Search should highlight owner name
    [Tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${TEST FIRST NAME}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${TEST FIRST NAME}"]

Search can be cleared by x button
    [Tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    ${tiles}    Get WebElements    //div[contains(@class,"card ")]
    ${len}    Get Length    ${tiles}
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    ${EMPTY}
    Input Text    ${SYSTEMS SEARCH INPUT}    Tests
    Wait For Condition    return document.getElementsByClassName('card ').length < ${len}    30
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    Tests
    Wait Until Element Is Visible    ${SYSTEM SEARCH X BUTTON}
    Click Link    ${SYSTEM SEARCH X BUTTON}
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}
    Textfield Value Should Be    ${SYSTEMS SEARCH INPUT}    ${EMPTY}
    ${tiles2}    Get WebElements    //div[contains(@class,"card ")]
    ${len2}    Get Length    ${tiles2}
    Should Be Equal    ${len}    ${len2}

Searching for owner email should only show systems with that owner
    [Tags]    C41891    Threaded
    Log In    ${EMAIL OWNER}    ${password}    validate=False
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${EMAIL OWNER}
    Wait Until Element Is Not Visible    ${DIFFERENT OWNER TITLE}

Search should only be visible with 9 or more systems
    [Tags]    C41890
    Log In    ${EMAIL VIEWER}    ${password}    validate=False
    Go To    ${url}/systems
    Wait Until Element Is Visible    ${SYSTEMS SEARCH INPUT}

    ${user id}=   Get Cloud User Id By Email    ${auth}    ${EMAIL VIEWER}    ${AUTO TESTS SYSTEM ID}
    Remove User    ${auth}    ${AUTO SYS IP}    ${user id}
    Wait Until Element Is Not Visible    ${SYSTEMS SEARCH INPUT}

    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEMS SEARCH INPUT}

Should open systems page in anonymous state
    [Tags]    anonymous
    Go To    ${url}/systems
    Wait Until Location Is    ${url}/systems
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None

Should update owner name in systems list, if it's changed
    [Tags]
    Set Account Name    ${url}    ${EMAIL OWNER}    ${password}    newFirstName    newLastName

    Log In    ${EMAIL ADMIN}    ${password}
    Go To    ${url}/systems
    Wait Until Elements Are Visible    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Wait Until Element Contains    ${AUTO TESTS USER}    newFirstName newLastName

    Set Account Name    ${url}    ${EMAIL OWNER}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}