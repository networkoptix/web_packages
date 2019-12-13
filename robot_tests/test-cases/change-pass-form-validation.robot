*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Change Password Dialog
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        form    Threaded File

*** Variables ***
${url}    ${ENV}
${no upper password}    adrhartjad
${7char password}       asdfghj
${common password}      qweasd123
${weak password}        asqwerdf
${fair password}        qweasd1234

${PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),'${PASSWORD IS REQUIRED TEXT}')]
${PASSWORD SPECIAL CHARS}
...    //span[contains(@class, 'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD TOO SHORT}
...    //span[contains(@class, 'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}
...    //span[contains(@class, 'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]
${PASSWORD IS WEAK}
...    //span[contains(@class, 'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]
${CURRENT PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]

*** Test Cases ***              OLD PW                    NEW PW
Incorrect Old Password          ${7char password}         ${BASE PASSWORD}
    [tags]    C41577
Empty Old password              ${EMPTY}                  ${BASE PASSWORD}
    [tags]    C41577
Short New Password              ${BASE PASSWORD}          ${7char password}
    [tags]    C41578
Common New Password             ${BASE PASSWORD}          ${common password}
    [tags]    C41578
Weak New Password               ${BASE PASSWORD}          ${weak password}
    [tags]    C41578
Fair New Password               ${EMPTY}                  ${fair password}
    [tags]    C41578
Cyrillic New Password           ${BASE PASSWORD}          ${CYRILLIC TEXT}
    [tags]    C41578
Smiley New Password             ${BASE PASSWORD}          ${SMILEY TEXT}
    [tags]    C41578
Glyph New Password              ${BASE PASSWORD}          ${GLYPH TEXT}
    [tags]    C41578
TM New Password                 ${BASE PASSWORD}          ${TM TEXT}
    [tags]    C41578
Leading Space New Password      ${BASE PASSWORD}          ${SPACE}${BASE PASSWORD}
    [tags]    C41578
Trailing Space New Password     ${BASE PASSWORD}          ${BASE PASSWORD}${SPACE}
    [tags]    C41578
Empty New Password              ${BASE PASSWORD}          ${EMPTY}
    [tags]    C41832
Empty Both                      ${EMPTY}                  ${EMPTY}
    [tags]    C41832

*** Keywords ***
Restart
    Close Browser
    Open Change Password Dialog

Open Change Password Dialog
    Open Browser and go to URL    ${url}/account/password
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}    None
    Validate Log In
    Wait Until Element Is Not Visible    ${LOG IN MODAL}
    Wait Until Elements Are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}

Test Passwords Invalid
    [Arguments]    ${old pw}    ${new pw}
    Reload Page
    Wait Until Elements Are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Change Password Form Validation    ${old pw}    ${new pw}
    Run Keyword Unless    "${old pw}" == "${BASE PASSWORD}" or "${old pw}" == "${7char password}"
    ...    Check Old Password Outline
    Run Keyword Unless    "${new pw}" == "${BASE PASSWORD}"    Check New Password Outline    ${new pw}
    Run Keyword If    "${old pw}" == "${7char password}"    Check Old Password Alert

Change Password Form Validation
    [arguments]    ${old password}    ${new password}
    Sleep    .3    #added to make sure the page is loaded fully
    Input Text    ${CURRENT PASSWORD INPUT}    ${old password}
    Input Text    ${NEW PASSWORD INPUT}    ${new password}
    Check Password Badge    ${new password}
    Run keyword unless  '${old password}' == '${EMPTY}' and '${new password}' == '${EMPTY}'    Wait until Element is Visible    ${CHANGE PASSWORD BUTTON}
    Run keyword unless  '${old password}' == '${EMPTY}' and '${new password}' == '${EMPTY}'    Click Button    ${CHANGE PASSWORD BUTTON}

Check Old Password Outline
#    Wait Until Element Is Visible
#    ...    ${CURRENT PASSWORD INPUT}/parent::div/parent::div[contains(@class,'has-error')]
    ${class_attribute_value}=   Get Element Attribute     ${CURRENT PASSWORD INPUT}    class
    Should Contain    ${class_attribute_value}    invalid   touched
    Page Should Contain    ${CURRENT PASSWORD IS REQUIRED TEXT}
    Element Should Be Visible    ${CURRENT PASSWORD IS REQUIRED}

Check Old Password Alert
    Check For Alert    ${CANNOT SAVE PASSWORD}${SPACE}${SPACE}${PASSWORD INCORRECT}

Check New Password Outline
    [Arguments]    ${new pw}
    Run Keyword Unless    "${new pw}"=="${fair password}"    Wait Until Element Is Visible
    ...    //nx-password-input[@name='newPassword' and contains(@class, 'ng-invalid')]//input[@id="newPassword"]
    # The first "Run Keyword If" is added because a click out of filed is required for showing "Password is required"  error message
    Run Keyword If    "${new pw}"=="${EMPTY}" or "${new pw}"=="${SPACE}"    Input text    ${CURRENT PASSWORD INPUT}    ${EMPTY}
    Run Keyword If    "${new pw}"=="${EMPTY}" or "${new pw}"=="${SPACE}"    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    Run Keyword If    "${new pw}"=="${7char password}"    Element Should Be Visible    ${PASSWORD TOO SHORT}
    Run Keyword If
    ...    "${new pw}"=="${CYRILLIC TEXT}" or "${new pw}"=="${SMILEY TEXT}" or "${new pw}"=="${GLYPH TEXT}" or "${new pw}"=="${TM TEXT}" or "${new pw}"=="${SPACE}${BASE PASSWORD}" or "${new pw}"=="${BASE PASSWORD}${SPACE}"
    ...    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    Run Keyword If    "${new pw}"=="${common password}"    Element Should Be Visible    ${PASSWORD TOO COMMON}
    Run Keyword If    "${new pw}"=="${weak password}"    Element Should Be Visible    ${PASSWORD IS WEAK}

Check Password Badge
    [arguments]    ${pass}
    Run Keyword Unless    "${pass}"=="${EMPTY}"
    ...    Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If
    ...    "${pass}"=="${7char password}"
    ...    Element Should Be Visible    ${PASSWORD TOO SHORT BADGE}
    ...    ELSE IF
    ...    "${pass}"=="${no upper password}" or "${pass}"=="${weak password}"
    ...    Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF
    ...    "${pass}"=="${common password}"
    ...    Element Should Be Visible    ${PASSWORD TOO COMMON BADGE}
    ...    ELSE IF
    ...    "${pass}"=="${CYRILLIC TEXT}" or "${pass}"=="${SMILEY TEXT}" or "${pass}"=="${GLYPH TEXT}" or "${pass}"=="${TM TEXT}" or "${pass}"=="${SPACE}${BASE PASSWORD}" or "${pass}"=="${BASE PASSWORD}${SPACE}"
    ...    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF
    ...    "${pass}"=="${fair password}"    Element Should Be Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF
    ...    "${pass}"=="${BASE PASSWORD}"    Element Should Be Visible    ${PASSWORD IS GOOD BADGE}