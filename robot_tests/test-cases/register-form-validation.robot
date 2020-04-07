*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}/register
Test Template     Test Register Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        form    Threaded File

*** Variables ***
${url}    ${ENV}
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

*** Test Cases ***                              FIRST       LAST        EMAIL                     PASS                               CHECKED
Invalid Email 1 noptixqagmail.com               mark        hamill      noptixqagmail.com         ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 2 @gmail.com                      mark        hamill      @gmail.com                ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 3 noptixqa@gmail..com             mark        hamill      noptixqa@gmail..com       ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 4 noptixqa@192.168.1.1.0          mark        hamill      noptixqa@192.168.1.1.0    ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 5 noptixqa.@gmail.com             mark        hamill      noptixqa.@gmail.com       ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 6 noptixq..a@gmail.c              mark        hamill      noptixq..a@gmail.c        ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 7 noptixqa@-gmail.com             mark        hamill      noptixqa@-gmail.com       ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 8 space                           mark        hamill      ${SPACE}                  ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 9 myemail@                        mark        hamill      myemail@                  ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 10 myemail@gmail                  mark        hamill      myemail@gmail             ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 11 myemail@.com                   mark        hamill      myemail@.com              ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 12 my@email@gmail.com             mark        hamill      my@email@gmail.com        ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 13 myemail@ gmail.com             mark        hamill      myemail@ gmail.com        ${BASE PASSWORD}                   True
    [tags]    C41557
Invalid Email 14 myemail@gmail.com;             mark        hamill      myemail@gmail.com;        ${BASE PASSWORD}                   True
    [tags]    C41557
Empty Email                                     mark        hamill      ${EMPTY}                  ${BASE PASSWORD}                   True
    [tags]    C41556
Registered Email                                mark        hamill      ${existing email}         ${BASE PASSWORD}                   True


Short Password asdfghj                          mark        hamill      ${valid email}            ${7char password}                  True
    [tags]    C41860
Weak 1 Lowercase Password adrhartjad            mark        hamill      ${valid email}            ${lowercase password}              True
    [tags]    C41860
Weak 2 Uppercase Password ADRHARTJAD            mark        hamill      ${valid email}            ${uppercase password}              True
    [tags]    C41860
Weak 3 Numbers Password 13462344                mark        hamill      ${valid email}            ${numbers password}                True
    [tags]    C41860
Weak 4 Symbol only Password !@#$%^&*()_-+=      mark        hamill      ${valid email}            ${symbol only password}            True
    [tags]    C41860

Fair 1 Lower and Uppercase                      mark        hamill      ${valid email}            ${lower upper password}            True
    [tags]    C41860
Fair 2 Lowercase and numbers                    mark        hamill      ${valid email}            ${lower number password}           True
    [tags]    C41860
Fair 3 Lowercase and Symbols                    mark        hamill      ${valid email}            ${lower symbol password}           True
    [tags]    C41860
Fair 4 Uppercase and numbers                    mark        hamill      ${valid email}            ${upper number password}           True
    [tags]    C41860
Fair 5 Uppercase and Symbols                    mark        hamill      ${valid email}            ${upper symbol password}           True
    [tags]    C41860
Fair 6 Numbers and Symbols                      mark        hamill      ${valid email}            ${number symbol password}          True
    [tags]    C41860

Good 1 qweASD123                                mark        hamill      ${valid email}            ${lower uppper number password}    True
    [tags]    C41860
Good 2 qweASD!@#                                mark        hamill      ${valid email}            ${lower upper symbol password}     True
    [tags]    C41860
Good 3 qwe123!@#                                mark        hamill      ${valid email}            ${lower number symbol password}    True
    [tags]    C41860
Good 4 QWE123!@#                                mark        hamill      ${valid email}            ${upper number symbol password}    True
    [tags]    C41860

Common Password qweasd123                       mark        hamill      ${valid email}            ${common password}                 True
    [tags]    C41860
Cyrillic Password Кенгшщзх                      mark        hamill      ${valid email}            ${CYRILLIC TEXT}                   True
    [tags]    C41860
Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★            mark        hamill      ${valid email}            ${SMILEY TEXT}                     True
    [tags]    C41860
Glyph Password 您都可以享受源源不絕的好禮及優惠    mark        hamill      ${valid email}            ${GLYPH TEXT}                      True
    [tags]    C41860
TM Password qweasdzxc123®™                      mark        hamill      ${valid email}            ${TM TEXT}                         True
    [tags]    C41860
Leading Space Password                          mark        hamill      ${valid email}            ${SPACE}${BASE PASSWORD}           True
    [tags]    C41860
Trailing Space Password                         mark        hamill      ${valid email}            ${BASE PASSWORD}${SPACE}           True
    [tags]    C41860
Middle Space Password qweasd 123                mark        hamill      ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41862
Empty Password                                  mark        hamill      ${valid email}            ${EMPTY}                           True
    [tags]    C41556
Symbol Password pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}    mark        hamill      ${valid email}            ${symbol password}           True
    [tags]    C41861


Invalid First Name                              ${SPACE}    hamill      ${valid email}            ${BASE PASSWORD}                   True

Empty First Name                                ${EMPTY}    hamill      ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41556
Invalid Last Name                               mark        ${SPACE}    ${valid email}            ${BASE PASSWORD}                   True

Empty Last Name                                 mark        ${EMPTY}    ${valid email}            ${BASE PASSWORD}                   True
    [tags]    C41556
Invalid All                                     ${SPACE}    ${SPACE}    noptixqagmail.com         ${7char password}                  True
    [tags]    C41556
Terms Unchecked                                 mark        hamill      ${valid email}            ${BASE PASSWORD}                   False
    [tags]    C41556
Empty All                                       ${EMPTY}    ${EMPTY}    ${SPACE}                  ${EMPTY}                           False
    [tags]    C41556

*** Keywords ***
Restart
    Close Browser
    Open Browser and go to URL    ${url}/register

Test Register Invalid
    [Arguments]    ${first}    ${last}    ${email}    ${pass}    ${checked}
    Reload Page
    # These two lines are because Hebrew has double quotes in its text.
    # This makes for issues with strings in xpaths.  These lines convert to single quotes if the language is Hebrew
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL INVALID}
    ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL INVALID TEXT}')]
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}
    ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
    Wait Until Elements Are Visible
    ...    ${REGISTER FIRST NAME INPUT}
    ...    ${REGISTER LAST NAME INPUT}
    ...    ${REGISTER EMAIL INPUT}
    ...    ${REGISTER PASSWORD INPUT}
    ...    ${CREATE ACCOUNT BUTTON}
    Elements Should Not Be Visible    ${EMAIL INVALID}
    ...    ${EMAIL ALREADY REGISTERED}
    ...    ${EMAIL IS REQUIRED}
    ...    ${PASSWORD BADGE}
    ...    ${PASSWORD IS REQUIRED}
    ...    ${PASSWORD SPECIAL CHARS}
    ...    ${PASSWORD IS WEAK}
    ...    ${FIRST NAME IS REQUIRED}
    ...    ${LAST NAME IS REQUIRED}
    ...    ${TERMS AND CONDITIONS ERROR}
    Register Form Validation    ${first}    ${last}    ${email}    ${pass}    ${checked}
    Run Keyword Unless    '''${pass}''' in ${good passwords} or '''${pass}''' in ${fair passwords}
    ...    Check Password Outline    ${pass}
    Run Keyword Unless    "${email}"=="${valid email}"    Check Email Outline    ${email}
    Run Keyword Unless    "${first}"=="mark"    Check First Name Outline    ${first}
    Run Keyword Unless    "${last}"=="hamill"    Check Last Name Outline    ${last}
    Run Keyword Unless    "${checked}"=="True"    Check Terms and Conditions Error

Register Form Validation
    [arguments]    ${first name}    ${last name}    ${email}    ${password}    ${checked}
    Clear Element Text    ${REGISTER PASSWORD INPUT}
    Input Text    ${REGISTER FIRST NAME INPUT}    ${first name}
    Input Text    ${REGISTER LAST NAME INPUT}    ${last name}
    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Click Element    ${REGISTER PASSWORD INPUT}
    sleep    .1
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run Keyword If    '''${password}'''!='''${EMPTY}'''     Check Password Badge    ${password}
    Run Keyword If    "${checked}"=="True"    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Sleep    .1    #On Ubuntu it was going too fast
    click button    ${CREATE ACCOUNT BUTTON}

Check Password Badge
    [arguments]    ${pass}
    Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If    '''${pass}''' in ${weak passwords}
    ...    Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${pass}''' in ${incorrect passwords}
    ...    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${pass}''' in ${fair passwords}
    ...    Move focus and check badge    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${pass}''' in ${good passwords}
    ...    Move focus and check badge    ${PASSWORD IS GOOD BADGE}

Check Email Outline
    [Arguments]    ${email}
    Sleep    2
    Element Style Should Be    ${REGISTER EMAIL INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${REGISTER EMAIL INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Run Keyword If    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}"
    ...    Element Should Be Visible    ${EMAIL IS REQUIRED}
    Run Keyword If    "${email}"=="${existing email}"
    ...    Element Should Be Visible    ${EMAIL ALREADY REGISTERED}
    Run Keyword Unless    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}" or "${email}"=="${existing email}"
    ...    Element Should Be Visible    ${EMAIL INVALID}

Check Password Outline
    [Arguments]    ${pass}
    Element Style Should Be    ${REGISTER PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${REGISTER PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Run Keyword If    '''${pass}'''=='''${EMPTY}''' or '''${pass}'''=='''${SPACE}'''
    ...    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    ...    ELSE IF    '''${pass}'''=='''${7char password}'''
    ...    Element Should Be Visible    ${PASSWORD TOO SHORT}
    ...    ELSE IF    '''${pass}''' in ${incorrect passwords}
    ...    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    ...    ELSE IF    '''${pass}'''=='''${common password}'''
    ...    Element Should Be Visible    ${PASSWORD TOO COMMON}
    ...    ELSE IF    '''${pass}''' in ${weak passwords}
    ...    Element Should Be Visible    ${PASSWORD IS WEAK}

Check First Name Outline
    [Arguments]    ${first}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

Check Last Name Outline
    [Arguments]    ${last}
    Element Style Should Be    ${REGISTER LAST NAME INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${REGISTER LAST NAME INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

Check Terms and Conditions Error
    Wait Until Element Is Visible    ${TERMS AND CONDITIONS ERROR}

Move focus and check badge
    [Arguments]    ${badge}
    Element Should Be Visible    ${badge}
    Click Element    ${REGISTER FORM}
    Element Should Be Visible    ${badge}
