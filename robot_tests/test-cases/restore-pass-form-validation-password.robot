*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Restore Password Dialog With Link
Test Template     Test Password Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        email    form    Threaded File

*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}
${existing email}       ${EMAIL VIEWER}

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

${FORM WITH ERROR}             //form[@name='restorePasswordWithCode']//nx-password-input[contains(@class,'ng-invalid')]/input

${PASSWORD IS REQUIRED}        //div[contains(@class,'input-error') and contains(text(),'${PASSWORD IS REQUIRED TEXT}')]
${PASSWORD SPECIAL CHARS}      //div[contains(@class,'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD TOO SHORT}          //div[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}         //div[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]
${PASSWORD IS WEAK}            //div[contains(@class,'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]

*** Test Cases ***                                    NEW PW
Empty New Password                                    ${EMPTY}
    [tags]    C26260
Password Too Short asdfghj                            ${7char password}
    [tags]    C41876
Common Password qweasd123                             ${common password}
    [tags]    C41876
Cyrillic Password Кенгшщзх                            ${CYRILLIC TEXT}
    [tags]    C41876
Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★                  ${SMILEY TEXT}
    [tags]    C41876
Glyph Password 您都可以享受源源不絕的好禮及優惠          ${GLYPH TEXT}
    [tags]    C41876
TM Password qweasdzxc123®™                            ${TM TEXT}
    [tags]    C41876
Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    ${symbol password}
    [tags]    C41876
Leading Space Password                                ${SPACE}${BASE PASSWORD}
    [tags]    C41876
Trailing Space Password                               ${BASE PASSWORD}${SPACE}
    [tags]    C41876

Weak 1 Lowercase Password adrhartjad                  ${lowercase password}
    [tags]    C41860
Weak 2 Uppercase Password ADRHARTJAD                  ${uppercase password}
    [tags]    C41860
Weak 3 Numbers Password 13462344                      ${numbers password}
    [tags]    C41860
Weak 4 Symbol only Password !@#$%^&*()_-+=            ${symbol only password}
    [tags]    C41860

Fair 1 Lower and Uppercase                            ${lower upper password}
    [tags]    C41860
Fair 2 Lowercase and numbers                          ${lower number password}
    [tags]    C41860
Fair 3 Lowercase and Symbols                          ${lower symbol password}
    [tags]    C41860
Fair 4 Uppercase and numbers                          ${upper number password}
    [tags]    C41860
Fair 5 Uppercase and Symbols                          ${upper symbol password}
    [tags]    C41860
Fair 6 Numbers and Symbols                            ${number symbol password}
    [tags]    C41860

Good 1 qweASD123                                      ${lower uppper number password}
    [tags]    C41860
Good 2 qweASD!@#                                      ${lower upper symbol password}
    [tags]    C41860
Good 3 qwe123!@#                                      ${lower number symbol password}
    [tags]    C41860
Good 4 QWE123!@#                                      ${upper number symbol password}
    [tags]    C41860

*** Keywords ***
Restart
    Close Browser
    Open Restore Password Dialog With Link

Open Restore Password Dialog With Link
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${password}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${user}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    delete email    ${email}
    Log In    ${user}    ${password}
    Log Out
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${user}
    Click Button    ${RESET PASSWORD BUTTON}
    ${link}    Get Email Link    ${user}    restore_password    timeout=300
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}

Test Password Invalid
    [Arguments]   ${new pw}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${new pw}
    Check New Password Badge    ${new pw}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Click Button    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Check New Password Outline    ${new pw}

Check New Password Badge
    [arguments]    ${new pw}
    Run Keyword Unless    '''${new pw}'''=='''${EMPTY}'''    Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If    '''${new pw}''' in ${weak passwords}         Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${new pw}''' in ${incorrect passwords}    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${new pw}''' in ${fair passwords}         Element Should Be Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${new pw}''' in ${good passwords}         Element Should Be Visible    ${PASSWORD IS GOOD BADGE}

Check New Password Outline
    [Arguments]   ${new pw}
    Wait Until Element Is Visible    ${FORM WITH ERROR}
    Run Keyword If    '''${new pw}'''=='''${EMPTY}''' or '''${new pw}'''=='''${SPACE}'''    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    ...    ELSE IF    '''${new pw}'''=='''${7char password}'''    Element Should Be Visible    ${PASSWORD TOO SHORT}
    ...    ELSE IF    '''${new pw}''' in ${incorrect passwords}    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    ...    ELSE IF    '''${new pw}'''=='''${common password}'''    Element Should Be Visible    ${PASSWORD TOO COMMON}
    ...    ELSE IF    '''${new pw}''' in ${weak passwords}    Element Should Be Visible    ${PASSWORD IS WEAK}
