*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     account-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Account Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Account Suite Teardown
Force Tags        account

*** Test Cases ***
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

11. Email field is un-editable
    [Tags]    C41573    C94720
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None   api=${False}
    Verify in Account Page
    ${read only}    Get Element Attribute    ${ACCOUNT EMAIL}    readOnly
    Should Be True    "${read only}"

12. Should respond to tab and go in the correct order
    [Tags]    C41838   CLOUD-10162
    [Setup]     Skip    Skipping due to CLOUD-10162
    Go To    ${url}/account
    Log In    ${no perm}    ${password}    button=None   api=${False}
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

16. Should open account page in anonymous state
    [tags]    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/account    ${REGISTER TITLE TEXT}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    ${no perm}    button=None

17. Account Deletion is cancelled
    [Tags]    C69858    C69857        delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None   api=${False}
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
    [Teardown]    Click Button    ${DELETE ACCOUNT CLOSE BUTTON}
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None   api=${False}
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
    [Teardown]    Click Button    ${DELETE ACCOUNT CLOSE BUTTON}
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None   api=${False}
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
    Log In    ${random email}    ${password}    button=None   api=${False}
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${BASE PASSWORD}    validate=${False}     exists=${False}   api=${False}

21. After account deletion user can create account with the same email again
    [Tags]    C69864    delete_account      deb
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None   api=${False}
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}    validate=${False}   exists=${False}   api=${False}

    Go To    ${url}/register
    Register    mark    hamil    ${random email}    ${password}
    Activate    ${random email}

    Wait Until Element Is Visible    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Click Button      ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Log In    ${random email}    ${password}    button=None    reset=${True}   api=${False}
