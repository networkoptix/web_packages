*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Suite Setup
Test Setup        account-resource.Restart
Test Teardown     Run Keyword If Test Failed    account-resource.Reset DB and Open New Browser On Failure
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

5. Admin and Owner can access account settings by selecting themselves in users List
    [Tags]
    Go To    ${url}
    Log In    ${server 1}[owner]    ${password}
    Go To    ${url}/systems/${server 1}[cloud id]
    Go To Users List
    Select User in Users List    ${server 1}[owner]
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Click Button    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Verify in Account Page

6. Changing first name and saving maintains that setting
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

7. Changing last name and saving maintains that setting
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

8. First name is required
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

9. Last name is required
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

10. Change first and last name shows in system
    [Tags]    C41573    C30655
    Go To    ${url}/account
    Log In    ${server 1}[cloud users][liveViewer]    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out
    Go To    ${url}/systems/${server 1}[cloud id]
    Log In    ${server 1}[owner]    ${password}    button=None
    Go To Users List
    Select User in Users List   ${server 1}[cloud users][liveViewer]
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header//span[contains(text(),'nameChanged nameChanged')]
    Log Out
    Go To    ${url}/account
    Log In    ${server 1}[cloud users][liveViewer]    ${password}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged

    # Check that the user's name has changed in system via API
    ${users}=   Get Users    ${AUTO SYS AUTH}    https://${QA BURBANK IP}:${server 1}[port] 
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${server 1}[cloud users][liveViewer]'    Run Keywords
        ...    Should Be Equal As Strings    ${user}[fullName]    nameChanged nameChanged
        ...    AND     Exit For Loop
    END
    Set Account Name    ${server 1}[cloud users][liveViewer]    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}

11. SPACE for first name is not valid
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    ${SPACE}
    Click Element    ${ACCOUNT SAVE}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
#    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

12. SPACE for last name is not valid
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    Mark
    Input Text    ${ACCOUNT LAST NAME}    ${SPACE}
    Click Element    ${ACCOUNT SAVE}
    Element Style Should Be    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Disabled       ${ACCOUNT SAVE}
    Element Should Be Enabled       ${ACCOUNT CANCEL}
#    Element Should Be Visible    ${LAST NAME IS REQUIRED}

13. Email field is un-editable
    [Tags]    C41573
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    ${read only}    Get Element Attribute    ${ACCOUNT EMAIL}    readOnly
    Should Be True    "${read only}"

14. Should respond to tab and go in the correct order
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

15. Language is changeable on the account page
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
            Wait Until Element is Visible    ${ACCOUNT SAVE}
            Click Button    ${ACCOUNT SAVE}
            Sleep    2    #to allow the system to change languages
            Wait Until Element is Visible    //header/span[text()='${info text}']
        END
    END
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    Wait Until Element is Visible
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
    Click Element
    ...    //nx-language-select//button/following-sibling::ul//span[@lang='${LANGUAGE}']/..
    Click Button    //nx-apply//nx-process-button//button
    Sleep    1
    Verify in Account Page
    Wait Until Element is Visible    //header/span[text()='${ACCOUNT INFORMATION}']

16. Language change affects emails
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

17. Language change is new default
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
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Not Visible    ${ACCOUNT CANCEL}
    sleep    5
    Reload Page
    Wait Until Element is Visible    ${ACCOUNT LANGUAGE DROPDOWN}/span[@lang='${lang}']
    Run Keyword If    "${lang}"=="ja_JP"    Wait Until Element is Visible    //header/span[text()='${ja_JP account info}']
    ...    ELSE IF    "${lang}"=="de_DE"    Wait Until Element is Visible    //header/span[text()='${de_DE account info}']
    Log Out Japanese
    Set Language Anonymous    lang=zh_CN
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    validate=False    button=None
    Set Account Language     ${no perm}    ${password}    ${lang}
    Sleep    5
    Reload Page
    Wait Until Element is Visible    //nx-language-select//button/span[@lang='${lang}']
    Run Keyword If    "${lang}"=="ja_JP"    Wait Until Element is Visible    //header/span[text()='${ja_JP account info}']
    ...    ELSE IF    "${lang}"=="de_DE"    Wait Until Element is Visible    //header/span[text()='${de_DE account info}']
    Check Language Logged In    ${no perm}    ${password}

18. Should open account page in anonymous state
    [tags]    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${REGISTER TITLE TEXT}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None

19. User who owns a system cannot remove themselves
    [Tags]    C69855        delete_account
    Go To    ${url}/account
    Log In    ${server 1}[owner]    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}

20. Delete account button is enabled
    [Tags]    C69854        delete account
    Go To    ${url}/account
    Log In    ${server 1}[cloud users][cloudAdmin]    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Enabled    ${DELETE ACCOUNT BUTTON}

    Log Out
    Sleep   2
    Go To    ${url}/account
    Log In    ${server 1}[cloud users][viewer]    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Enabled    ${DELETE ACCOUNT BUTTON}

21. Delete account button becomes enabled
    [Tags]    C69856        delete_account
    Go To    ${url}/account
    Log In    ${server 4}[owner]    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    Detach Server From Cloud    https://${QA BURBANK IP}:${server 5}[port]    ${server 5}[local auth]
    Reload page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    Detach Server From Cloud    https://${QA BURBANK IP}:${server 4}[port]    ${server 4}[local auth]
    Sleep    20
    Reload page
    Wait Until Element Is Visible    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Enabled    ${DELETE ACCOUNT BUTTON}

22. Account Deletion is cancelled
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

23. Password is required to delete account
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

24. Correct password is required to delete account
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

25. User can delete their own account
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


26. After account deletion user is deleted from all systems that were shared with this user
    [Tags]    C69862    delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Share    ${server 1}[cloud auth]    ${server 1}[cloud id]    ${ACCESS ROLES}[admin]    ${random email}      ${permissions}[cloudAdmin]
    Share    ${server 1}[cloud auth]    ${server 2}[cloud id]    ${ACCESS ROLES}[viewer]    ${random email}     ${permissions}[viewer]
    Share    ${server 1}[cloud auth]    ${server 3}[cloud id]    ${ACCESS ROLES}[custom]    ${random email}     ${permissions}[custom]
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}   validate=${False}    exists=${False}
    Log In    ${server 1}[owner]    ${password}    button=None
    Go To   ${url}/systems/${server 1}[cloud id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${server 2}[cloud id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${server 3}[cloud id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

27. After account deletion user can create account with the same email again
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
    Click Button      ${LOG IN BUTTON}
    Log In    ${random email}    ${password}    button=None    reset=${True}

28. Deletion attempt when Delete Account button is disabled (via API)
    [Tags]    C76389        delete_account
    Delete Account    ${server 1}[owner]    ${password}
    Log In    ${server 1}[owner]    ${password}
