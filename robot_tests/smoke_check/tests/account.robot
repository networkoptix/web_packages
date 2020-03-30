*** Settings ***
Resource         ../resources/vars.robot
Resource         ../../resource.robot
Resource         ../../APIresource.robot

Suite Setup      Open Browser    ${ENV}    headlesschrome
#Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - Account
Suite Teardown   Reset Account Settings


*** Keywords ***
Reset Account Settings
    CloudPortalAPI.Change Password    ${ENV}    ${email acc}    ${new password}    ${base password}
    Set Account Language    ${ENV}    ${email acc}    ${base password}
    Set Account Name    ${ENV}    ${email acc}    ${base password}    SmokeCheck    Acc
    Close Browser


*** Test Cases ***
Change Account Settings
    [Tags]    C30723    smoke    acc
    Go To   ${ENV}/account
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Log In    ${email acc}    ${base password}    validate=${False}    button=None

    Log    Checking UI
    Run keyword and continue on failure    Wait Until Elements are Visible
    ...    ${ACCOUNT EMAIL}
    ...    ${ACCOUNT FIRST NAME}
    ...    ${ACCOUNT LAST NAME}
    ...    ${ACCOUNT LANGUAGE DROPDOWN}
    ...    ${ACCOUNT DROPDOWN}
    Run keyword and continue on failure   Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}

    Log    Changing settings
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Clear Element Text    ${ACCOUNT LAST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}     nameChanged
    Click Button    ${ACCOUNT LANGUAGE DROPDOWN}
    Wait Until Element is Visible    ${RU LANG BUTTON}
    Click Element    c
    Wait Until Element is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}

    Log    Verifying changes are saved
    ${account data}=   Get Account Data    ${ENV}    ${email acc}    ${base password}
    Should Be Equal as Strings    nameChanged    &{account data}[first_name]
    Should Be Equal as Strings    nameChanged    &{account data}[last_name]
    Should Be Equal as Strings    ru_RU    &{account data}[language]

Change Password
    [Tags]    C30724    acc
    Go To    ${ENV}/account/password
    Wait Until Elements Are Visible    ${CURRENT PASSWORD INPUT}    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${base password}
    Input Text    ${NEW PASSWORD INPUT}    ${new password}
    Click Button    ${CHANGE PASSWORD BUTTON}

    Log Out via API
    ${status}=   CloudPortalAPI.Log In    ${ENV}   ${email acc}    ${new password}

Restore Password
    [Tags]    C30725    acc
#    Go To    ${ENV}/restore_password
#    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
#    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email acc}
#    Sleep    1s
#    Click Button    ${RESET PASSWORD BUTTON}
#    Wait Until Location Is    ${ENV}/restore_password/sent

    ${status}=   CloudPortalAPI.Restore Password    ${ENV}    ${email acc}    None    None
    Should be equal as strings    ${status}    200
    Open Mailbox    host=${BASE HOST}    password=QWEasd!@#    port=${BASE PORT}    user=${email acc}    is_secure=True
    ${email}=   Wait For Email    recipient=${email acc}    timeout=60    status=UNSEEN
    ${link}=   Get Nx Links From Email    ${email}    restore_password
    ${code}=   Get Code From Email Link    ${link}
    ${code}=   Convert Code    ${code}
    Close Mailbox
    ${status}=   CloudPortalAPI.Restore Password    ${ENV}    ${email acc}    ${code}   ${base password}
#    Should be equal as strings    ${status}    200
    Sleep    10s
    ${status}=   CloudPortalAPI.Log In    ${ENV}    ${email acc}    ${base password}
