*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close Browser
force tags    account

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}
${CZECH ALERT}    Váš účet byl úspěšně uložen

*** Keywords ***
Verify in Account Page
    Wait Until Elements are Visible
    ...    ${ACCOUNT EMAIL}
    ...    ${ACCOUNT FIRST NAME}
    ...    ${ACCOUNT LAST NAME}
    ...    ${ACCOUNT LANGUAGE DROPDOWN}
    ...    ${ACCOUNT DROPDOWN}
    ...    ${DELETE ACCOUNT BUTTON}
    Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    sleep    .5

Restart
    Common Restart Logout    ${url}

Reset DB and Open New Browser On Failure
    Close Browser
#    Reset user noperm first/last name
    Set Account Name    ${url}    ${EMAIL NOPERM}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Open Browser and go to URL    ${url}

*** Test Cases ***
Can access the account page from dropdown
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON}
    Click Link    ${ACCOUNT SETTINGS BUTTON}
    Title Should Be    ${ACCOUNT SETTINGS TEXT} - ${PRODUCT_NAME}
    Verify in account page

Can access the account page from direct link while logged in
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Go To    ${url}/account
    Verify in account page

Accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page
    [tags]    Threaded
    Go To    ${url}/account
    Wait Until Element is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Validate Log Out
    Location Should Be    ${url}/

Accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page
    [tags]    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Go To    ${url}/account
    Verify in account page

Admin and Owner can access account settings by selecting themselves in users List
    Go To    ${url}
    Log In    ${EMAIL OWNER}    ${password}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Go To Users List
    Select User in Users List    ${EMAIL OWNER}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Click Button    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Verify in Account Page

Changing first name and saving maintains that setting
    [tags]    C41573
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser and go to URL    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

Changing last name and saving maintains that setting
    [tags]    C41573
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser and go to URL    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    ${TEST LAST NAME}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

First name is required
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    ${locator}=   Get WebElement    ${ACCOUNT FIRST NAME}
    Delete All Text    ${locator}
    Click Element    ${ACCOUNT LAST NAME}
    Wait Until Element Has Style    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

Last name is required
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    ${locator}=   Get WebElement    ${ACCOUNT LAST NAME}
    Delete All Text    ${locator}
    Click Element    ${ACCOUNT FIRST NAME}
    Wait Until Element Has Style    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

Change first and last name shows in system
    [Tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL LIVE VIEWER}    ${password}    ${False}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    ${False}    button=None
    Go To Users List
    Select User in Users List    ${EMAIL LIVE VIEWER}
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header/span[contains(text(),'nameChanged nameChanged')]
    Log Out
    Go To    ${url}/account
    Log In    ${EMAIL LIVE VIEWER}    ${password}    ${False}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST LAST NAME}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

SPACE for first name is not valid
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    ${SPACE}
    Click Element    ${ACCOUNT LAST NAME}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

SPACE for last name is not valid
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    Mark
    Input Text    ${ACCOUNT LAST NAME}    ${SPACE}
    Click Element    ${ACCOUNT FIRST NAME}
    Element Style Should Be    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

Email field is un-editable
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    ${read only}    Get Element Attribute    ${ACCOUNT EMAIL}    readOnly
    Should Be True    "${read only}"

Should respond to tab and go in the correct order
    [tags]    C41838
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Element Should Be Focused    ${ACCOUNT FIRST NAME}
    Press Keys    None    TAB
    Element Should Be Focused    ${ACCOUNT LAST NAME}
    Press Keys    None    TAB
    Element Should Be Focused    ${DELETE ACCOUNT BUTTON}
    Press Keys    None    TAB
    Element Should Be Focused    ${ACCOUNT LANGUAGE DROPDOWN}
    Press Keys    None    ENTER
    Press Keys    None    TAB
    Element Should Be Focused    //nx-language-select//a//span[1]/..
    Press Keys    //nx-language-select//a//span[1]/..    ENTER
    Element Should Be Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang="cs_CZ"]
    Press Keys    None    TAB
    Element Should Be Focused    ${ACCOUNT SAVE}
    Press Keys   None    ENTER

Language is changeable on the account page
    [tags]    C41574
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    FOR    ${lang}    ${account}   IN ZIP    ${LANGUAGES LIST}    ${LANGUAGES ACCOUNT INFORMATION TEXT LIST}
        Sleep    1
        Verify in Account Page
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']/..
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"    Click Button    ${ACCOUNT SAVE}
        Sleep    1    #to allow the system to change languages
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Wait Until Element is Visible    //header/span[text()='${account}']
    END
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    Wait Until Element is Visible
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
    Click Element
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
    Click Button    ${ACCOUNT SAVE}
    Sleep    1
    Verify in Account Page
    Wait Until Element is Visible    //header/span[text()='${ACCOUNT INFORMATION}']

Language change affects emails
    [tags]    C41575
    ${russian subject}    Set Variable    Восстановление пароля
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    Wait Until Element is Visible
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..
    Click Element
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..
    Click Button    ${ACCOUNT SAVE}
    Sleep    5
    Close Browser

    Open Browser and go to URL    ${url}
    Go To    ${url}/restore_password
    Wait Until Elements are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${EMAIL NOPERM}
    Click Button    ${RESET PASSWORD BUTTON}
    Wait Until Element is Visible    ${RESET EMAIL SENT MESSAGE}
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${email}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120    status=UNSEEN
    Check Email Subject
    ...    ${email}
    ...    ${russian subject}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${email}
    Close Mailbox
    Check Language Logged In    ${EMAIL NOPERM}    ${password}

Language change is new default
    [tags]    C41574
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    ${lang}    Set Variable If    "${LANGUAGE}"=="ja_JP"    de_DE
    ...    "${LANGUAGE}"!="ja_JP"    ja_JP
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/following-sibling::ul//span[@lang='${lang}']
    Click Element    ${ACCOUNT LANGUAGE DROPDOWN}/following-sibling::ul//span[@lang='${lang}']/..
    Click Button    ${ACCOUNT SAVE}
    Sleep    1    #to allow the system to change languages
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang='${lang}']
    Run Keyword If    "${lang}"=="ja_JP"    Wait Until Element is Visible    //header/span[text()='${LANGUAGES ACCOUNT INFORMATION TEXT LIST}[9]']
    ...    ELSE IF    "${lang}"=="de_DE"    Wait Until Element is Visible    //heade/span[text()='${LANGUAGES ACCOUNT INFORMATION TEXT LIST}[4]']
    Log Out No Language
    Set Language Anonymous    lang=zh_CN
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Wait Until Element is Visible    //nx-language-select//button/span[@lang='${lang}']
    Run Keyword If    "${lang}"=="ja_JP"    Wait Until Element is Visible    //header/span[text()='${LANGUAGES ACCOUNT INFORMATION TEXT LIST}[9]']
    ...    ELSE IF    "${lang}"=="de_DE"    Wait Until Element is Visible    //header/span[text()='${LANGUAGES ACCOUNT INFORMATION TEXT LIST}[4]']
    Check Language Logged In    ${EMAIL NOPERM}    ${password}

Should open account page in anonymous state
    [tags]    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${PRODUCT_NAME}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None

User who owns a system cannot remove themselves
    Go To    ${url}/account
    Log In    ${EMAIL OWNER}    ${password}    ${False}    button=None
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}

User can delete their own account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    ${False}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Wait Until Elements are Visible
    ...    ${DELETE ACCOUNT MODAL BUTTON}
    ...    ${CANCEL DELETE ACCOUNT BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD INPUT}

    Click Button    ${CANCEL DELETE ACCOUNT BUTTON}
    Wait Until Element is Visible    ${DELETE ACCOUNT BUTTON}
    Click Button    ${DELETE ACCOUNT BUTTON}
    Wait Until Elements are Visible
    ...    ${DELETE ACCOUNT MODAL BUTTON}
    ...    ${CANCEL DELETE ACCOUNT BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD INPUT}

    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element is Visible    ${DELETE ACCOUNT PASSWORD LABEL}
    Element Text Should Be    ${DELETE ACCOUNT PASSWORD LABEL}    ${PASSWORD IS REQUIRED TEXT}

    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    qweasdqwe
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Contains    ${DELETE ACCOUNT PASSWORD LABEL}    ${WRONG PASSWORD}

    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${BASE PASSWORD}    ${False}
    Wait Until Element is Visible    ${ACCOUNT NOT FOUND}