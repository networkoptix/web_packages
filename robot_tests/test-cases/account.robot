*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     account-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Account Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Account Suite Teardown
Force Tags        account

*** Test Cases ***
1. Can access the account page from dropdown
    [Tags]    smoke
    Log In    ${no perm}    ${password}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON}
    Click Link    ${ACCOUNT SETTINGS BUTTON}
    Verify in account page
    Title Should Be    ${ACCOUNT SETTINGS TEXT} - ${PRODUCT_NAME}

2. Can access the account page from direct link while logged in
    [Tags]
    Log In    ${no perm}    ${password}
    Go To    ${url}/account
    Verify in account page

3. Accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page
    [Tags]
    [Setup]    No Operation
    [Teardown]    No Operation
    Skip    No more close button. Login has changed.
    Go To    ${url}/account
    Wait Until Element is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Validate Log Out
    Location Should Be    ${url}/

4. Accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page
    [Tags]
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Go To    ${url}/account
    Verify in account page

5. Changing first name and saving maintains that setting
    [Tags]    C41573    smoke
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser and go to URL    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

6. Changing last name and saving maintains that setting
    [Tags]    C41573    smoke
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser and go to URL   ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    ${TEST LAST NAME}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

7. First name is required
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Delete All Text    ${ACCOUNT FIRST NAME}
    Click Element    ${ACCOUNT LAST NAME}
    Wait Until Element Has Style    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
    Wait Until Element Has Style    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
#    Wait Until Element Is Visible    ${FIRST NAME IS REQUIRED}

8. Last name is required
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Delete All Text    ${ACCOUNT LAST NAME}
    Click Element    ${ACCOUNT FIRST NAME}
    Wait Until Element Has Style    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
    Wait Until Element Has Style    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
#    Wait Until Element Is Visible    ${FIRST NAME IS REQUIRED}



9. SPACE for first name is not valid
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    ${SPACE}
    Click Element    //header/h4[contains(text(),'${ACCOUNT INFORMATION}')]
    Element Style Should Be    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
#    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

10. SPACE for last name is not valid
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    Mark
    Input Text    ${ACCOUNT LAST NAME}    ${SPACE}
    Click Element    //header/h4[contains(text(),'${ACCOUNT INFORMATION}')]
    Element Style Should Be    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
#    Element Should Be Visible    ${LAST NAME IS REQUIRED}

11. Email field is un-editable
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    ${read only}    Get Element Attribute    ${ACCOUNT EMAIL}    readOnly
    Should Be True    "${read only}"

12. Should respond to tab and go in the correct order
    [Tags]    C41838
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
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

13. Language is changeable on the account page
    [Tags]    C41574    smoke
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Reload Page
    ${lang dict} =    Get Lang List
    @{LANGUAGES LIST} =    Get Dictionary Keys    ${lang dict}
    FOR    ${lang}    IN    @{LANGUAGES LIST}
        # &{d} =    Copy Dictionary    &{lang dict}[${lang}]
        # ${info text} =    Set Variable    ${d['ACCOUNT INFORMATION']} 
        ${info text} =    Get From Dictionary   ${lang dict}[${lang}]   ACCOUNT INFORMATION 
        Sleep    1
        Verify in Account Page
        IF    "${lang}"!="${LANGUAGE}"
            Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
            Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']
            Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']/..
#            Wait Until Element is Visible    ${ACCOUNT SAVE}
#            Click Button    ${ACCOUNT SAVE}
            Sleep    2    #to allow the system to change languages
            Wait Until Element is Visible    //header//h4[contains(text(),'${info text}')]
        END
    END
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    Wait Until Element is Visible
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
    Click Element
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
#    Click Button    //nx-apply//nx-process-button//button
    Sleep    1
    Verify in Account Page
    Wait Until Element is Visible    //header/h4[contains(text(),'${ACCOUNT INFORMATION}')]

14. Language change affects emails
    [Tags]    C41575
    # Open Mailbox
    # ...    host=${BASE HOST}
    # ...    password=${BASE EMAIL PASSWORD}
    # ...    port=${BASE PORT}
    # ...    user=${BASE EMAIL}
    # ...    is_secure=True
    # Delete All Emails
    # Close Mailbox
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    extra=sendemail
    Register And Activate Account    Mark    Hamill    ${random email}    ${password}
    Go to    ${url}/account
    ${subject}=   Set Variable If   '''${LANGUAGE}'''=='''ru_RU'''    Reset your password    Восстановление пароля
    Run Keyword If    '''${subject}'''=='''Восстановление пароля'''    Run Keywords
    ...    Log In    ${random email}    ${password}    button=None    AND
    ...    Verify in Account Page    AND
    ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}    AND
    ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..    AND
    ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..    AND
    ...    Click Button    ${ACCOUNT SAVE}    AND
    ...    Sleep    5    AND
    ...    Close Browser
    ...    ELSE   Run Keywords
    ...    Log In    ${random email}    ${password}    button=None    AND
    ...    Verify in Account Page    AND
    ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}    AND
    ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='en_US']/..    AND
    ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='en_US']/..    AND
    ...    Click Button    ${ACCOUNT SAVE}    AND
    ...    Sleep    5    AND
    ...    Close Browser

    Open Browser and go to URL    ${url}
    Send "Restore Password" Email   ${random email}
    Sleep    10
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${email}    Wait For Email    recipient=${random email}    timeout=120    status=UNSEEN
    Check Email Subject
    ...    ${email}
    ...    ${subject}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${email}
    Close Mailbox
    Check Language Logged In    ${random email}    ${password}

15. Language change is new default
    [Tags]    C41574
    ${lang dict} =    Get Lang List
    ${ja_JP account info} =    Get From Dictionary    ${lang dict}[ja_JP]    ACCOUNT INFORMATION
    ${de_DE account info} =    Get From Dictionary    ${lang dict}[de_DE]    ACCOUNT INFORMATION
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    ${lang}    Set Variable If    "${LANGUAGE}"=="ja_JP"    de_DE
    ...    "${LANGUAGE}"!="ja_JP"    ja_JP
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/following-sibling::ul//span[@lang='${lang}']
    Click Element    ${ACCOUNT LANGUAGE DROPDOWN}/following-sibling::ul//span[@lang='${lang}']/..
#    Click Button    ${ACCOUNT SAVE}
#    Wait Until Element Is Not Visible    ${ACCOUNT CANCEL}
    sleep    5
    Reload Page
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang='${lang}']
    IF    "${lang}"=="ja_JP"    
        Wait Until Element is Visible    //header/h4[text()='${ja_JP account info}']
    ELSE IF    "${lang}"=="de_DE"    
        Wait Until Element is Visible    //header/h4[text()='${de_DE account info}']
    END
    Log Out Japanese
    Set Language Anonymous    lang=zh_CN
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    validate=False    button=None
    Set Account Language     ${no perm}    ${password}    ${lang}
    Sleep    5
    Reload Page
    Wait Until Element is Visible    //nx-language-select//button/span[@lang='${lang}']
    IF    "${lang}"=="ja_JP"    
        Wait Until Element is Visible    //header/h4[text()='${ja_JP account info}']
    ELSE IF    "${lang}"=="de_DE"    
        Wait Until Element is Visible    //header/h4[text()='${de_DE account info}']
    END
    Check Language Logged In    ${no perm}    ${password}

16. Should open account page in anonymous state
    [tags]    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${REGISTER TITLE TEXT}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    ${no perm}    button=None



17. Account Deletion is cancelled
    [Tags]    C69858    C69857        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Wait Until Element Is Enabled    ${DELETE ACCOUNT BUTTON}
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Click Button    ${ DELETE ACCOUNT CANCEL BUTTON}

    Wait Until Element is Visible    ${DELETE ACCOUNT BUTTON}
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Click Button    ${DELETE ACCOUNT CLOSE BUTTON}
    Wait Until Element is Visible    ${DELETE ACCOUNT BUTTON}

18. Password is required to delete account
    [Tags]    C69859        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Sleep    1    # Clicking the delete button too fast causes there to not be a message
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD INPUT}    border-color    ${ERROR COLOR}
#    Wait Until Element Contains    ${DELETE ACCOUNT PASSWORD ERROR}    ${PASSWORD IS REQUIRED TEXT}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD ERROR}    color    ${ERROR COLOR WITH OPACITY}
    Validate Log In    ${random email}

19. Correct password is required to delete account
    [Tags]    C69860        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    qweasdqwe

    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Is Visible    ${DELETE ACCOUNT PASSWORD ERROR}
    Wait Until Element Contains    ${DELETE ACCOUNT PASSWORD ERROR}    ${WRONG PASSWORD}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD ERROR}    color    ${ERROR COLOR WITH OPACITY}
    Validate Log In    ${random email}

20. User can delete their own account
    [Tags]    C69861   delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${BASE PASSWORD}    validate=${False}     exists=${False}

21. After account deletion user can create account with the same email again
    [Tags]    C69864    delete_account      deb
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}    validate=${False}   exists=${False}
    
    Go To    ${url}/register
    Register    mark    hamil    ${random email}    ${password}    
    Activate    ${random email}
    
    Wait Until Element Is Visible    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Click Button      ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Log In    ${random email}    ${password}    button=None    reset=${True}
