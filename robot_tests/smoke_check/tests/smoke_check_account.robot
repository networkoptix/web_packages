*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Account Suite Setup
Test Teardown    Run Keyword if Test Failed    Account Test Restart
Suite Teardown   Account Suite Teardown

*** Keywords ***
Account Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${email}=   Get Random Email Robot    ${email base}
    Run Keyword If     'nxvms' not in $env    Run Keywords
       ...    Register And Activate Account    SmokeCheck    Acc    ${email}    ${password}    AND
       ...    Set Suite Variable    ${email acc}    ${email}

Account Suite Teardown
    ${restored}=   Run keyword and return status    Change Password    ${ENV}    ${email acc}    ${restored password}    ${password}
    Close Browser

Account Test Restart
    ${changed}=   Run keyword and return status    Change Password    ${ENV}    ${email acc}    ${new password}    ${password}
    ${restored}=   Run keyword and return status    Change Password    ${ENV}    ${email acc}    ${restored password}    ${password}
    Set Account Language    ${ENV}    ${email acc}    ${password}
    Set Account Name    ${ENV}    ${email acc}    ${password}    SmokeCheck    Acc
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

    Set Account Language    ${ENV}    ${email acc}    ${password}
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
    Wait Until Elements Are Visible    ${EMAIL INPUT}    ${FORGOT PASSWORD}
    Input Text    ${EMAIL INPUT}    ${email acc}
    Click Link    ${FORGOT PASSWORD}
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}

    Log    Step2: Click on "Reset Password" button
    Click Button    ${RESET PASSWORD BUTTON}
    Wait Until Element Is Visible    //span[contains(text(), "${RESET EMAIL SENT MESSAGE TEXT}")]
    Wait Until Location Contains    restore_password/sent

    Log    Step 3: Check email inbox
    ${link}=   Run Keyword If    'nxvms' in $env    Get the link from email    ${email base}    ${email acc}    ${email password}    restore_password
    ${code}=   Run Keyword If    'nxvms' not in $env    Get Code From Email    ${cloud auth}    ${email acc}    restore_password

    Log    Step 4: Click on Restore Password button
    Run Keyword If    'nxvms' in $env    Go To    ${link}
       ...    ELSE    Go To    ${ENV}/restore_password/${code}

    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${RESET PASSWORD OK BUTTON}

    Log    Step 5: Reset Password and validate success
    Slow    Input Text    ${RESET PASSWORD INPUT}    ${restored password}    timeout=0.1
    Slow    Click Button    ${RESET PASSWORD OK BUTTON}    timeout=0.1
    Wait Until Location Contains    restore_password/success
    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS LOG IN LINK}

    Log    Steps 6: Click on "Success Log In" button and validate the form
    Click Link  ${RESET SUCCESS LOG IN LINK}
    Wait Until Elements Are Visible
    ...    ${EMAIL INPUT}
    ...    ${PASSWORD INPUT}
    ...    ${REMEMBER ME CHECKBOX VISIBLE}
    ...    ${FORGOT PASSWORD}
    ...    ${LOG IN CLOSE BUTTON}

    Log    Step 7: Log in with old password
    Slow    Input Text    ${EMAIL INPUT}    ${email acc}    timeout=0.1
    Slow    Input Text    ${PASSWORD INPUT}    ${new password}    timeout=0.1
    Slow    Click Button    ${LOG IN BUTTON}    timeout=0.1
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}

    Log    Step 8: Log in with new password
    Log In    ${email acc}    ${restored password}    button=None
