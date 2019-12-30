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
${FIRST NAME IS REQUIRED}      //span[@class='error-text ng-star-inserted' and contains(text(),"${FIRST NAME IS REQUIRED TEXT}")]
${LAST NAME IS REQUIRED}       //span[@class='error-text ng-star-inserted' and contains(text(),"${LAST NAME IS REQUIRED TEXT}")]

*** Keywords ***
Verify in Account Page
    Wait Until Elements are Visible
    ...    ${ACCOUNT EMAIL}
    ...    ${ACCOUNT FIRST NAME}
    ...    ${ACCOUNT LAST NAME}
    ...    ${ACCOUNT LANGUAGE DROPDOWN}
    ...    ${ACCOUNT DROPDOWN}
    Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    sleep    .5

Restart
    Open Browser and go to URL    ${url}
    Register Keyword To Run On Failure    NONE
    ${status}=   Run Keyword and Return Status    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Register Keyword To Run On Failure    Failure Tasks
    Run Keyword If    ${status}    Log Out via API
    Go To    ${url}

#Restart
#    Open Browser and go to URL    ${url}
#    Register Keyword To Run On Failure    NONE
#    ${status}    Run Keyword And Return Status    Validate Log Out
#    Register Keyword To Run On Failure    Failure Tasks
#    Run Keyword Unless    ${status}    Log Out
#    Go To    ${url}

Reset DB and Open New Browser On Failure
    Close Browser
    Reset user noperm first/last name
    Open Browser and go to URL    ${url}

*** Test Cases ***
Can access the account page from dropdown
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON}
    Click Link    ${ACCOUNT SETTINGS BUTTON}
    # Title Should Be    ${ACCOUNT SETTINGS TEXT} - ${PRODUCT_NAME}
    Verify in account page

Can access the account page from direct link while logged in
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}    ${False}
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
    [tags]    C41573    Threaded    curr
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    ${locator}=   Get WebElement    ${ACCOUNT FIRST NAME}
    Delete All Text    ${locator}
    Click Element    ${ACCOUNT LAST NAME}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

Last name is required
    [tags]    C41573    Threaded
    Go To    ${url}/account
    Log In    ${EMAIL NOPERM}    ${password}    ${False}    button=None
    Verify in Account Page
    ${locator}=   Get WebElement    ${ACCOUNT LAST NAME}
    Delete All Text    ${locator}
    Click Element    ${ACCOUNT FIRST NAME}
    Element Style Should Be    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

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
    Press Keys    ${ACCOUNT FIRST NAME}    ${TAB}
    Element Should Be Focused    ${ACCOUNT LAST NAME}
    Press Keys    ${ACCOUNT LAST NAME}    ${TAB}
    Element Should Be Focused    ${ACCOUNT LANGUAGE DROPDOWN}
    Press Keys    ${ACCOUNT LANGUAGE DROPDOWN}    ${ENTER}
    Press Keys    ${ACCOUNT LANGUAGE DROPDOWN}    ${TAB}
    Element Should Be Focused    //nx-language-select//a//span[1]/..
    Press Keys    //nx-language-select//a//span[1]/..    ${ENTER}
    Element Should Be Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang="cs_CZ"]
    Press Keys    ${ACCOUNT LANGUAGE DROPDOWN}    ${TAB}
    Element Should Be Focused    ${ACCOUNT SAVE}
    Press Keys    ${ACCOUNT SAVE}    ${ENTER}

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
    Wait Until Element is Visible    //header/span[text()='${account}']

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
    
Should open account page in anonymous state
    [tags]    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${ACCOUNT SETTINGS TEXT} - ${PRODUCT_NAME}
    Wait Until Element Is Visible    ${LOG IN MODAL} 
    Check Log In    button=None