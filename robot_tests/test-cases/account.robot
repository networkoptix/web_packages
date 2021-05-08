*** Settings ***
Resource          ../resource.robot
Suite Setup       Account Suite Setup
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Account Suite Teardown
force tags    account    threaded

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}
${CZECH ALERT}    Váš účet byl úspěšně uložen

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
Reset DB and Open New Browser On Failure
#    Close Browser
#    Reset user noperm first/last name
    Set Account Name    ${url}    ${no perm}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Set Account Name    ${url}    ${viewer}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    ${server auth}=   Create List    admin    ${BASE PASSWORD}
    # ${delete 2 id}=   Get Cloud System Id    https://${QA BURBANK IP}:${port5[0]}    ${server auth} 
    # ${delete 1 id}=   Get Cloud System Id    https://${QA BURBANK IP}:${port4[0]}    ${server auth}
    @{auth}=    Create List    ${delete}    ${BASE PASSWORD}
    Disconnect Server via API    ${server auth}   ${sysId3}    ${BASE PASSWORD}    ${EMAIL DELETE USER}
    Disconnect Server via API    ${server auth}    ${sysId4}    ${BASE PASSWORD}    ${EMAIL DELETE USER}

Verify Delete User Dialog
    Wait Until Elements are Visible
    ...    ${DELETE ACCOUNT MODAL BUTTON}
    ...    ${DELETE ACCOUNT CANCEL BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD INPUT}
    ...    ${DELETE ACCOUNT CLOSE BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD LABEL}
    ...    ${DELETE ACCOUNT INFO}
    ...    ${DELETE ACCOUNT HEADER}

Account Suite Setup
    FOR    ${account}    IN    no perm    delete    owner    viewer    adv viewer    live viewer    not owner    admin    custom
        ${random email} =    Register and activate account with random email    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${BASE PASSWORD}
        Set Suite Variable    ${${account}}          ${random email}
    END

    @{system names} =    Create List    
    ...    ${AUTO TESTS}
    ...    ${AUTO TESTS 2}
    ...    Auto Tests 3
    ...    sys delete 1
    ...    sys delete 2

    @{system owners} =    Create List    
    ...    ${owner}
    ...    ${owner}
    ...    ${owner}
    ...    ${delete}
    ...    ${delete}
    
    ${owner email} =    Set Variable    ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${owner}")]
    Set Suite Variable    ${owner email}          ${owner email}

    @{auth}=    Create List    ${owner}    ${password}
    Set Suite Variable    ${auth}    ${auth}   
    Open Browser and go to URL    ${url}
    
    ${random} =	   Evaluate	    random.randint(0, sys.maxsize)
    Set Suite Variable     ${random}    ${random}
    
    @{server auth}=   Create List    admin    qweasd 123

    FOR    ${n}    IN RANGE    5
        ${port} =    Create Docker Server    account${n}-${random}
        Set Suite Variable    ${port${n}}    ${port[0]}
        Sleep     10
        Setup Local System    https://${QA BURBANK IP}:${port${n}}    ${BASE PASSWORD}    ${system names[${n}]}
        ${sysId}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port${n}}    ${system names[${n}]}    ${system owners[${n}]}    ${BASE PASSWORD}
        Set Suite Variable    ${sysId${n}}    ${sysId}
    END
    
    ${SUITE AUTO TESTS USERS} =    Create Dictionary
    ...    ${viewer}=viewer
    ...    ${adv viewer}=advancedViewer
    ...    ${live viewer}=liveViewer
    ...    ${not owner}=viewer
    ...    ${admin}=cloudAdmin
    ...    ${custom}=custom

    Set Suite Variable    ${SUITE AUTO TESTS USERS}    ${SUITE AUTO TESTS USERS} 
    
    FOR    ${user email}   ${user role}    IN ZIP   ${SUITE AUTO TESTS USERS.keys()}     ${SUITE AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${sysId0}    ${user role}    ${user email}
    END
    
Account Suite Tear Down
    Disconnect Server via API    ${auth}    ${sysId0}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId1}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId2}    ${password}    ${owner}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop account0-${random} account1-${random} account2-${random} account3-${random} account4-${random}       
    ${results}    Execute Command    docker container rm account0-${random} account1-${random} account2-${random} account3-${random} account4-${random}       
    Close Connection
    Close All Browsers
    
*** Test Cases ***
Can access the account page from dropdown
    [tags]    
    Log In    ${no perm}    ${password}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON}
    Click Link    ${ACCOUNT SETTINGS BUTTON}
    Title Should Be    ${ACCOUNT SETTINGS TEXT} - ${PRODUCT_NAME}
    Verify in account page

Can access the account page from direct link while logged in
    [tags]    
    Log In    ${no perm}    ${password}
    Go To    ${url}/account
    Verify in account page

Accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page
    [tags]    
    Go To    ${url}/account
    Wait Until Element is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Validate Log Out
    Location Should Be    ${url}/

Accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page
    [tags]    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Go To    ${url}/account
    Verify in account page

Admin and Owner can access account settings by selecting themselves in users List
    [tags]    
    Go To    ${url}
    Log In    ${owner}    ${password}
    Go To    ${url}/systems/${sysId0}
    Go To Users List
    Select User in Users List    ${owner}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Click Button    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Verify in Account Page

Changing first name and saving maintains that setting
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser With Options
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

Changing last name and saving maintains that setting
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Close Browser
    Open Browser With Options 
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    ${TEST LAST NAME}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}

First name is required
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Delete All Text    ${ACCOUNT FIRST NAME}
    Click Element    ${ACCOUNT LAST NAME}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL} 
    Click Button    ${ACCOUNT SAVE}  
    Wait Until Element Is Visible    ${FIRST NAME IS REQUIRED}
    Wait Until Element Has Style    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}  
    # Wait Until Element Has Style    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    # Wait Until Element Has Style   ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${ACCOUNT SAVE}
    Element Should Be Visible    ${ACCOUNT CANCEL}

Last name is required
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Delete All Text   ${ACCOUNT LAST NAME}
    Click Element    ${ACCOUNT FIRST NAME}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL} 
    Click Button    ${ACCOUNT SAVE}  
    Wait Until Element Is Visible    ${LAST NAME IS REQUIRED}
    Wait Until Element Has Style    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style   ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    # Wait Until Element Has Style    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    # Wait Until Element Has Style   ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${ACCOUNT SAVE}
    Element Should Be Visible    ${ACCOUNT CANCEL}

Change first and last name shows in system
    [Tags]    C41573    C30655    
    Go To    ${url}/account
    Log In    ${live viewer}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out
    Go To    ${url}/systems/${sysId0}
    Log In    ${owner}    ${password}    button=None
    Go To Users List
    Select User in Users List   ${live viewer}
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header//span[contains(text(),'nameChanged nameChanged')]
    Log Out
    Go To    ${url}/account
    Log In    ${live viewer}    ${password}    button=None
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged

    # Check that the user's name has changed in system via API
    ${users}=   Get Users    ${AUTO SYS AUTH}    https://${QA BURBANK IP}:${port0} 
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${live viewer}'    Run Keywords
        ...    Should Be Equal As Strings    ${user}[fullName]    nameChanged nameChanged
        ...    AND     Exit For Loop
    END
    Set Account Name    ${url}    ${live viewer}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}

SPACE for first name is not valid
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    ${SPACE}
    Click Element    ${ACCOUNT SAVE}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT FIRST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

SPACE for last name is not valid
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    Mark
    Input Text    ${ACCOUNT LAST NAME}    ${SPACE}
    Click Element    ${ACCOUNT SAVE}
    Element Style Should Be    ${ACCOUNT LAST NAME}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${ACCOUNT LAST NAME}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

Email field is un-editable
    [tags]    C41573    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    Verify in Account Page
    ${read only}    Get Element Attribute    ${ACCOUNT EMAIL}    readOnly
    Should Be True    "${read only}"

Should respond to tab and go in the correct order
    [tags]    C41838    
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

Language is changeable on the account page
    [tags]    C41574    
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None
    ${lang dict} =    Get Lang List
    @{LANGUAGES LIST} =    Get Dictionary Keys    ${lang dict}
    FOR    ${lang}    IN    @{LANGUAGES LIST}
        # &{d} =    Copy Dictionary    &{lang dict}[${lang}]
        # ${info text} =    Set Variable    ${d['ACCOUNT INFORMATION']} 
        ${info text} =    Get From Dictionary   ${lang dict}[${lang}]   ACCOUNT INFORMATION 
        Sleep    1
        Verify in Account Page
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='${lang}']/..
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Wait Until Element is Visible    ${ACCOUNT SAVE}
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"
        ...    Click Button    ${ACCOUNT SAVE}
        Sleep    2    #to allow the system to change languages
        Run Keyword Unless    "${lang}"=="${LANGUAGE}"  
        ...    Wait Until Element is Visible    //header/span[text()='${info text}']
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

Language change affects emails
    [tags]    C41575    
    # Open Mailbox
    # ...    host=${BASE HOST}
    # ...    password=${BASE EMAIL PASSWORD}
    # ...    port=${BASE PORT}
    # ...    user=${BASE EMAIL}
    # ...    is_secure=True
    # Delete All Emails
    # Close Mailbox
    Go to    ${url}/account
    ${subject}=   Set Variable If   '''${LANGUAGE}'''=='''ru_RU'''    Reset your password    Восстановление пароля
    Run Keyword If    '''${subject}'''=='''Восстановление пароля'''    Run Keywords
    ...    Log In    ${no perm}    ${password}    button=None    AND
    ...    Verify in Account Page    AND
    ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}    AND
    ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..    AND
    ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..    AND
    ...    Click Button    ${ACCOUNT SAVE}    AND
    ...    Sleep    5    AND
    ...    Close Browser
    ...    ELSE   Run Keywords
    ...    Log In    ${no perm}    ${password}    button=None    AND
    ...    Verify in Account Page    AND
    ...    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}    AND
    ...    Wait Until Element is Visible    //nx-language-select//button/following-sibling::ul//span[@lang='en_US']/..    AND
    ...    Click Element    //nx-language-select//button/following-sibling::ul//span[@lang='en_US']/..    AND
    ...    Click Button    ${ACCOUNT SAVE}    AND
    ...    Sleep    5    AND
    ...    Close Browser

    Open Browser With Options
    Go To    ${url}/restore_password
    Wait Until Elements are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${no perm}
    Click Button    ${RESET PASSWORD BUTTON}
    Wait Until Element is Visible    ${RESET EMAIL SENT MESSAGE}  
    Sleep    10
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${email}    Wait For Email    recipient=${no perm}    timeout=120    status=UNSEEN
    Check Email Subject
    ...    ${email}
    ...    ${subject}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${email}
    Close Mailbox
    Check Language Logged In    ${no perm}    ${password}

Language change is new default
    [tags]    C41574    
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
    Wait Until Element is Visible    //nx-language-select//button/span[@lang='${lang}']
    Run Keyword If    "${lang}"=="ja_JP"    Wait Until Element is Visible    //header/span[text()='${ja_JP account info}']
    ...    ELSE IF    "${lang}"=="de_DE"    Wait Until Element is Visible    //header/span[text()='${de_DE account info}']
    Check Language Logged In    ${no perm}    ${password}

Should open account page in anonymous state
    [tags]    anonymous    
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${PRODUCT_NAME}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None

User who owns a system cannot remove themselves
    [tags]    C69855        delete_account
    Go To    ${url}/account
    Log In    ${owner}    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}

Delete account button is enabled
    [tags]    C69854        delete account
    Go To    ${url}/account
    Log In    ${admin}    ${password}    button=None
    Verify in Account Page
    Element Should Be Enabled    ${DELETE ACCOUNT BUTTON}

    Log Out
    Go To    ${url}/account
    Log In    ${viewer}    ${password}    button=None
    Verify in Account Page
    Element Should Be Enabled    ${DELETE ACCOUNT BUTTON}

Delete account button becomes enabled
    [tags]    C69856        delete_account
    # ${server auth}=    Create List    admin    ${BASE PASSWORD}
    # Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port3}    Delete User 1    ${delete}    ${BASE PASSWORD}
    # Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port4}    Delete User 2    ${delete}    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${delete}    ${password}    button=None
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    Detach Server From Cloud    https://${QA BURBANK IP}:${port3}    ${auth}
    Reload page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    Detach Server From Cloud    https://${QA BURBANK IP}:${port4}    ${auth}
    Reload page
    Wait Until Element Is Visible    ${DELETE ACCOUNT BUTTON}
    Element Should Be Enabled    ${DELETE ACCOUNT BUTTON}

Account Deletion is cancelled
    [tags]    C69858    C69857        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Click Button    ${ DELETE ACCOUNT CANCEL BUTTON}

    Wait Until Element is Visible    ${DELETE ACCOUNT BUTTON}
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Click Button    ${DELETE ACCOUNT CLOSE BUTTON}
    Wait Until Element is Visible    ${DELETE ACCOUNT BUTTON}

Password is required to delete account
    [tags]    C69859        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Sleep    1    # Clicking the delete button too fast causes there to not be a message
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Contains    ${DELETE ACCOUNT PASSWORD ERROR}    ${PASSWORD IS REQUIRED TEXT}
    Wait Until Element Has Style    ${DELETE ACCOUNT PASSWORD ERROR}    color    ${ERROR COLOR WITH OPACITY}
    Validate Log In    ${random email}

Correct password is required to delete account
    [tags]    C69860        delete_account
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

User can delete their own account
    [tags]    C69861        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${BASE PASSWORD}    validate=${False}
    Wait Until Element is Visible    ${ACCOUNT NOT FOUND}

After account deletion user is deleted from all systems that were shared with this user
    [tags]    C69862        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Share    ${auth}    ${sysId0}    ${ACCESS ROLES}[admin]    ${random email}
    Share    ${auth}    ${sysId1}    ${ACCESS ROLES}[viewer]    ${random email}
    Share    ${auth}    ${sysId2}    ${ACCESS ROLES}[custom]    ${random email}

    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}   validate=${False}
    Wait Until Element is Visible    ${ACCOUNT NOT FOUND}
    Log In    ${owner}    ${password}    button=None
    Go To   ${url}/systems/${sysId0}
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${sysId1}
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${sysId2}
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

After account deletion user can create account with the same email again
    [tags]    C69864        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}    validate=${False}
    Wait Until Element is Visible    ${ACCOUNT NOT FOUND}
    
    Go To    ${url}/register
    Register    mark    hamil    ${random email}    ${password}    
    Activate    ${random email}
    Log In    ${random email}    ${password}

Deletion attempt when Delete Account button is disabled (via API)
    [tags]    C76389        delete_account
    Delete Account    ${ENV}    ${owner}    ${password}
    Log In    ${owner}    ${password}
