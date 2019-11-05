*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Check Systems Text
    [arguments]    ${user}
    Sleep    1
    Log Out
    Validate Log Out
    Log In    ${user}    ${password}
    Validate Log In
    Wait Until Page Contains Element    ${AUTO TESTS USER}
    Element Text Should Be    ${AUTO TESTS USER}    ${TEST FIRST NAME} ${TEST LAST NAME}
    Wait Until Element Is Not Visible    //h2[.='${YOUR SYSTEM TEXT}']

Reset DB and Open New Browser On Failure
    Close Browser
    Reset user owner first/last name
    Make sure viewer is in the system
    Open Browser and go to URL    ${url}

Restart
    Register Keyword To Run On Failure    NONE
    ${status}    Run Keyword And Return Status    Validate Log In
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out
    Go To    ${url}

*** Test Cases ***
should show list of Systems
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${ACCOUNT DROPDOWN}    ${SYSTEMS TILE}

has system name, owner and OpenInNx button visible on systems page
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}

should show Open in NX client button for online system
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}

should not show Open in NX client button for offline system
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTOTESTS OFFLINE}

should show system's state for systems if they are offline. Otherwise - button Open in Nx
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    ${systems}    Get WebElements    //div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']
    Check Online Or Offline    ${systems}    ${AUTOTESTS OFFLINE TEXT}

should show the no systems connected message when you have no systems
    [tags]    C41866    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Validate Log In
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

should show system name in header dropdown with "Open in Nx Witness" button if user has only one system
    [tags]    C41569    Threaded    123
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Share To    ${EMAIL NOPERM}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120    status=UNSEEN
    Delete All Emails
    Close Mailbox
    Log Out
    Log In    ${EMAIL NOPERM}    ${password}    None
    Validate Log In
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}
    Click Button    ${OPEN IN NX BUTTON}
    Log Out
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Remove User Permissions    ${EMAIL NOPERM}

User have several systems linked to his account
    [tags]    C41570    Threaded
    Log    Step 1
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
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
    ${h}=   Get Element Attribute    ${l}/a    href
    ${n}=   Get Text    ${l}//span[@class='system-name']
    Scroll Element Into View    ${x}
    Click Element    ${x}
    # Expected Result
    Location Should Contain    ${h}
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

should show the system page instead of all systems when user only has one
    [tags]    C41878
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Share To    ${EMAIL NOPERM}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120    status=UNSEEN
    Delete All Emails
    Close Mailbox
    Log Out
    Log In    ${EMAIL NOPERM}    ${password}    None
    Validate Log In
    Wait Until Element Is Visible    ${SYSTEM NAME}
    Log Out
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Remove User Permissions    ${EMAIL NOPERM}

should open system page when clicked on system
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    # Sometimes the name fields refill if you empty them too fast
    sleep    2
    Wait Until Page Does Not Contain Element    //div[@class='preloader']
    Click Element    ${AUTO TESTS TITLE}
    Verify In System    Auto Tests

Should show your system for owner and owner name for non-owners
    [tags]    C41893    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Element Text Should Be    ${AUTO TESTS USER}    ${YOUR SYSTEM TEXT}
    :FOR    ${user}    IN    @{EMAILS LIST}
    \  Run Keyword Unless    "${user}"=="${EMAIL OWNER}"    Check Systems Text    ${user}

Should not show systems dropdown with no systems
    [tags]    C41568    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Validate Log In
    Element Should Not Be Visible    ${SYSTEMS DROPDOWN}

Search should highlight system name
    [tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${AUTO TESTS}"]

Search should highlight owner name
    [tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${TEST FIRST NAME}
    Wait Until Element Is Visible    //span[@class="highlighted" and text()="${TEST FIRST NAME}"]

Search can be cleared by x button
    [tags]    C41891    Threaded
    Log In    ${EMAIL VIEWER}    ${password}
    Validate Log In
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
    [tags]    C41891    Threaded
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Input Text    ${SYSTEMS SEARCH INPUT}    ${EMAIL OWNER}
    Run Keyword And Expect Error    *    Element Should Not Be Visible    ${DIFFERENT OWNER TITLE}

Search should only be visible with 9 or more systems
    [tags]    C41890
    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Elements Are Visible    ${REMOVE USER BUTTON}    ${SHARE BUTTON SYSTEMS}
    Share To    ${EMAIL VIEWER}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL VIEWER}    timeout=120    status=UNSEEN
    Delete All Emails
    Close Mailbox
    Log Out

    Log In    ${EMAIL VIEWER}    ${password}    None
    Validate Log In
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Wait Until Elements Are Visible    ${SYSTEMS SEARCH INPUT}    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Log Out

    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Elements Are Visible    ${REMOVE USER BUTTON}    ${SHARE BUTTON SYSTEMS}
    Remove User Permissions    ${EMAIL VIEWER}
    Log Out

    Log In    ${EMAIL VIEWER}    ${password}    None
    Validate Log In
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Elements Should Not Be Visible    ${SYSTEMS SEARCH INPUT}
    Log Out

    Log In    ${EMAIL OWNER}    ${password}
    Validate Log In
    Go To    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Elements Are Visible    ${REMOVE USER BUTTON}    ${SHARE BUTTON SYSTEMS}
    Share To    ${EMAIL VIEWER}    ${VIEWER TEXT}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL VIEWER}    timeout=120    status=UNSEEN
    Delete All Emails
    Close Mailbox
    Log Out

    Log In    ${EMAIL VIEWER}    ${password}    None
    Validate Log In
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Wait Until Element Is Visible    ${SYSTEMS SEARCH INPUT}
    Log Out

should update owner name in systems list, if it's changed
    [tags]
    Go To    ${url}/account
    Log In    ${EMAIL OWNER}    ${password}    None
    Validate Log In
    Wait Until Elements Are Visible    ${ACCOUNT EMAIL}    ${ACCOUNT FIRST NAME}    ${ACCOUNT LAST NAME}
    #Sleep added here because the account page was populating the first/lastname fields again after Selenium changed it.
    Sleep    1
    Element Text Should Be    ${ACCOUNT EMAIL}    ${EMAIL OWNER}
    Textfield Value Should Be    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    newFirstName
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT LAST NAME}    newLastName
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out
    Log In    ${EMAIL ADMIN}    ${password}    None
    Validate Log In
    Go To    ${url}/systems
    Wait Until Elements Are Visible    ${AUTO TESTS TITLE}    ${AUTO TESTS USER}    ${AUTO TESTS OPEN NX}
    Wait Until Element Contains    ${AUTO TESTS USER}    newFirstName newLastName
    Reset user owner first/last name