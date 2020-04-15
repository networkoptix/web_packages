*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Change Password Dialog
Test Template     Test Passwords Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        form    Threaded File

*** Variables ***
${url}    ${ENV}
${lowercase password}    adrhartjad
${uppercase password}    ADRHARTJAD
${numbers password}      13462344
${7char password}       asdfghj
${symbol only password}    !@#$%^&*()_-+=
@{weak passwords}    ${7char password}    ${uppercase password}    ${lowercase password}    ${common password}    ${7char password}    ${numbers password}    ${symbol only password}

${lower upper password}    multPASS
${lower number password}    mult1234
${lower symbol password}    mult!@#$
${upper number password}    MULT1234
${upper symbol password}    MULT!@#$
${number symbol password}    1234!@#$
@{fair passwords}    ${lower upper password}    ${lower number password}    ${lower symbol password}    ${upper number password}    ${upper symbol password}    ${number symbol password}    ${symbol password}

${lower uppper number password}    qweASD123
${lower upper symbol password}    qweASD!@#
${lower number symbol password}    qwe123!@#
${upper number symbol password}   QWE123!@#
@{good passwords}    ${lower uppper number password}    ${lower upper symbol password}    ${lower number symbol password}    ${upper number symbol password}    ${BASE PASSWORD}

${symbol password}      pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}
${common password}      qweasd123
${valid email}          noptixqa+valid@gmail.com

@{incorrect passwords}    ${CYRILLIC TEXT}    ${SMILEY TEXT}    ${GLYPH TEXT}    ${TM TEXT}    ${SPACE}${BASE PASSWORD}    ${BASE PASSWORD}${SPACE}

${PASSWORD SPECIAL CHARS}
...    //div[contains(@class, 'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD TOO SHORT}
...    //div[contains(@class, 'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}
...    //div[contains(@class, 'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]
${PASSWORD IS WEAK}
...    //div[contains(@class, 'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]
${CURRENT PASSWORD IS REQUIRED}
...    //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]

*** Test Cases ***              OLD PW                    NEW PW
Incorrect Old Password          ${7char password}         ${BASE PASSWORD}
    [tags]    C41577
Empty Old password              ${EMPTY}                  ${BASE PASSWORD}
    [tags]    C41577
Short New Password              ${BASE PASSWORD}          ${7char password}
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

Weak 1 Lowercase Password adrhartjad           ${BASE PASSWORD}       ${lowercase password}
    [tags]    C41578
Weak 2 Uppercase Password ADRHARTJAD           ${BASE PASSWORD}       ${uppercase password}
    [tags]    C41578
Weak 3 Numbers Password 13462344                ${BASE PASSWORD}      ${numbers password}
    [tags]    C41578
Weak 4 Symbol only Password !@#$%^&*()_-+=     ${BASE PASSWORD}       ${symbol only password}
    [tags]    C41578

Fair 1 Lower and Uppercase                      ${BASE PASSWORD}      ${lower upper password}
    [tags]    C41578
Fair 2 Lowercase and numbers                   ${BASE PASSWORD}       ${lower number password}
    [tags]    C41578
Fair 3 Lowercase and Symbols                   ${BASE PASSWORD}       ${lower symbol password}
    [tags]    C41578
Fair 4 Uppercase and numbers                  ${BASE PASSWORD}        ${upper number password}
    [tags]    C41578
Fair 5 Uppercase and Symbols                  ${BASE PASSWORD}        ${upper symbol password}
    [tags]    C41578
Fair 6 Numbers and Symbols                     ${BASE PASSWORD}       ${number symbol password}
    [tags]    C41578

Good 1 qweASD123                              ${BASE PASSWORD}        ${lower uppper number password}
    [tags]    C41578
Good 2 qweASD!@#                                ${BASE PASSWORD}      ${lower upper symbol password}
    [tags]    C41578
Good 3 qwe123!@#                               ${BASE PASSWORD}       ${lower number symbol password}
    [tags]    C41578
Good 4 QWE123!@#                              ${BASE PASSWORD}        ${upper number symbol password}
    [tags]    C41578

*** Keywords ***
Restart
    Close Browser
    Open Change Password Dialog

Open Change Password Dialog
    Open Browser and go to URL    ${url}/account/password
    Log In    ${EMAIL VIEWER}    ${BASE PASSWORD}    button=None
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
    Run Keyword Unless    '''${new pw}''' == "${BASE PASSWORD}"    Check New Password Outline    ${new pw}
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
    Run Keyword Unless    '''${new pw}''' in ${fair passwords} or '''${new pw}''' in ${good passwords}    Wait Until Element Is Visible
    ...    //nx-password-input[@name='newPassword' and contains(@class, 'ng-invalid')]//input[@id="newPassword"]
    # The first "Run Keyword If" is added because a click out of filed is required for showing "Password is required"  error message
    Run Keyword If    '''${new pw}'''=="${EMPTY}" or "${new pw}"=="${SPACE}"    Input text    ${CURRENT PASSWORD INPUT}    ${EMPTY}
    Run Keyword If    '''${new pw}'''=="${EMPTY}" or "${new pw}"=="${SPACE}"    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    ...    ELSE IF    '''${new pw}'''=="${7char password}"    Element Should Be Visible    ${PASSWORD TOO SHORT}
    ...    ELSE IF    '''${new pw}''' in "${incorrect passwords}"    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    ...    ELSE IF    '''${new pw}'''=="${common password}"    Element Should Be Visible    ${PASSWORD TOO COMMON}
    ...    ELSE IF    '''${new pw}''' in "${weak passwords}"    Element Should Be Visible    ${PASSWORD IS WEAK}

Check Password Badge
    [arguments]    ${new pw}
    Run Keyword Unless    '''${new pw}'''=='''${EMPTY}'''    Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If    '''${new pw}''' in ${weak passwords}         Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${new pw}''' in ${incorrect passwords}    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${new pw}''' in ${fair passwords}         Element Should Be Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${new pw}''' in ${good passwords}         Element Should Be Visible    ${PASSWORD IS GOOD BADGE}
