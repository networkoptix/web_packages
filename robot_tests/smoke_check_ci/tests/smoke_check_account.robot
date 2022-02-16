*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Account Suite Setup
Test Teardown    Run Keyword if Test Failed    Account Test Restart
Suite Teardown   Account Suite Teardown

*** Keywords ***
Account Suite Setup
    Skip    Customization settings on CI hosts are broken
    Base Suite Setup

    ${email acc}=   Register and activate account with random email    SmokeCheck    Auth    ${base password}
    Set Suite Variable    ${email acc}

Account Suite Teardown
    Skip    Customization settings on CI hosts are broken
    ${restored}=   Run keyword and return status    Change Password    ${email acc}    ${restored password}    ${password}
    Log    Password restored: ${restored}
    Close Browser

Account Test Restart
    ${changed}=   Run keyword and return status    Change Password    ${email acc}    ${new password}    ${password}
    ${restored}=   Run keyword and return status    Change Password    ${email acc}    ${restored password}    ${password}
    Set Account Language    ${email acc}    ${password}
    Set Account Name    ${email acc}    ${password}    SmokeCheck    Acc
    Common Restart Logout    ${ENV}

*** Test Cases ***
Change Account Settings
    [Tags]    C30723    acc

    Go To   ${ENV}/account
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Log In    ${email acc}    ${password}    button=None

    Log    Checking UI
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON}
    Click Element    ${ACCOUNT SETTINGS BUTTON}
    Verify in Account Page

    Log    Changing settings
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Clear Element Text    ${ACCOUNT LAST NAME}
    Slow    Input Text    ${ACCOUNT FIRST NAME}    firstnameChanged    timeout=0.1
    Slow    Input Text    ${ACCOUNT LAST NAME}     lastnameChanged    timeout=0.1
    Slow    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}    timeout=0.1
    Wait Until Element is Visible    //span[@lang="ru_RU"]/following-sibling::span[contains(text(),"Русский")]
    Click Element    //span[@lang="ru_RU"]/following-sibling::span[contains(text(),"Русский")]
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Click Button    ${ACCOUNT SAVE}
#    Translations don't work
#    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
#    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check For Alert    Ваша учетная запись успешно сохранена
    Wait Until Element Is Visible    //nx-apply//div[contains(text(), 'Нет несохраненных изменений')]
    Wait Until Elements Are Not Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}

    ${current language}=   Get Element Attribute    ${ACCOUNT LANGUAGE DROPDOWN}/span[@class="lang-sm"]    lang
    Should Be Equal As Strings    ${current language}    ru_RU

    Log    Verifying changes are saved - API
    ${account data}=   Get Account Data    ${email acc}    ${password}
    Should Be Equal as Strings    firstnameChanged    ${account data}[first_name]
    Should Be Equal as Strings    lastnameChanged    ${account data}[last_name]
    Should Be Equal as Strings    ru_RU    ${account data}[language]

    Set Account Language    ${email acc}    ${password}
    Reload page
    Log Out

Change Password
    [Tags]    C30724    acc
    Go To   ${ENV}/account
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Log In    ${email acc}    ${password}    button=None

    Log    Step 1: Change password
    Wait Until Element Is Visible   ${CHANGE PASSWORD LEFT MENU LINK}
    Click Element   ${CHANGE PASSWORD LEFT MENU LINK}
    Wait Until Location Contains    /account/password
    Wait Until Elements Are Visible    ${CURRENT PASSWORD INPUT}    ${NEW PASSWORD INPUT}
    Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Slow    Input Text    ${CURRENT PASSWORD INPUT}    ${password}    timeout=0.1
    Slow    Input Text    ${NEW PASSWORD INPUT}    ${new password}    timeout=0.1
    Slow    Click Button    ${ACCOUNT SAVE}    timeout=0.1
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}

    Log    Step 2: Log out and try to login with old password
    Log Out
    Log In    ${email acc}    ${password}    validate=${False}
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}

    Log    Step 3: Try to login with new password
    Slow    Input Text   ${PASSWORD INPUT}    ${new password}    timeout=0.1
    Slow    Click Button    ${LOG IN BUTTON}    timeout=0.1
    Validate Log In    ${email acc}    ${new password}
    Log Out

Restore Password
    [Tags]    C30725    acc

    Log    Step 1
    Click Element    ${LOG IN NAV BAR}
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${email acc}
    Click Button    ${LOG IN NEXT BUTTON}

    Wait Until Element is Visible    ${FORGOT PASSWORD}
    Click Button    ${FORGOT PASSWORD}
    Wait Until Element is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    Textfield Should Contain    ${RESTORE PASSWORD EMAIL INPUT}    ${email acc}
    Wait Until Element Is Visible    ${RESET PASSWORD BUTTON}

    Log    Step2: Click on "Reset Password" button
    Click Button    ${RESET PASSWORD BUTTON}
    Wait Until Element Is Visible    //p[contains(text(), "${RESET EMAIL SENT MESSAGE TEXT}")]
#    Starting from 21.1 the url is just ${ENV}/authorize
#    Wait Until Location Contains    restore_password/sent
    Wait Until Location Is    ${ENV}/authorize
    Log    Step 3: Check email inbox
    ${link}=   Run Keyword If    'nxvms' in $env    Get Email Link    ${email acc}    restore_password
    ${code}=   Run Keyword If    'nxvms' not in $env    Get Code From Email    ${email acc}    restore_password

    Log    Step 4: Click on Restore Password button
    Run Keyword If    'nxvms' in $env    Go To    ${link}
       ...    ELSE    Go To    ${ENV}/authorize/restore_password/${code}

    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${RESET NEXT BUTTON}

    Log    Step 5: Reset Password and validate success
    Slow    Input Text    ${RESET PASSWORD INPUT}    ${restored password}    timeout=0.1
    Slow    Click Button    ${RESET NEXT BUTTON}    timeout=0.1
#    Starting from 21.1 the url is just ${ENV}/authorize
#    Wait Until Location Contains    restore_password/success
#    Wait Until Location Is    ${ENV}/authorize
    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET LOGIN BUTTON}

    Log    Steps 6: Click on "Success Log In" button and validate the form
    Click Button   ${RESET LOGIN BUTTON}
    Wait Until Elements Are Visible
    ...    ${PASSWORD INPUT}
    ...    ${LOG IN BUTTON}

    Log    Step 7: Log in with old password
#    Slow    Input Text    ${EMAIL INPUT}    ${email acc}    timeout=0.1
    Slow    Input Text    ${PASSWORD INPUT}    ${new password}    timeout=0.1
    Slow    Click Button    ${LOG IN BUTTON}    timeout=0.1
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}

    Log    Step 8: Log in with new password
    Log In    ${email acc}    ${restored password}    button=${LOG IN BUTTON}    reset=${True}
