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
${7char password}              asdfghj
${common password}             qweasd123
${weak password}               asqwerdf
${symbol password}             !@#$%^&*()_-+=;:'"`~,./\|?[]{}
${fair password}               qweasd1234

${FORM WITH ERROR}             //form[@name='restorePasswordWithCode']//nx-password-input[contains(@class,'ng-invalid')]/input

${PASSWORD IS REQUIRED}        //span[contains(@class,'input-error') and contains(text(),'${PASSWORD IS REQUIRED TEXT}')]
${PASSWORD SPECIAL CHARS}      //span[contains(@class,'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD TOO SHORT}          //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}         //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]
${PASSWORD IS WEAK}            //span[contains(@class,'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]

*** Test Cases ***                                    NEW PW
Empty New Password                                    ${EMPTY}
    [tags]    C26260
Password Too Short asdfghj                            ${7char password}
    [tags]    C41876
Common Password qweasd123                             ${common password}
    [tags]    C41876
Weak Password asqwerdf                                ${weak password}
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
Fair New Password                                     ${fair password}
    [tags]    C41876
Good New Password                                     ${BASE PASSWORD}
    [tags]    C41876

*** Keywords ***
Restart
    Close Browser
    Open Restore Password Dialog With Link

Open Restore Password Dialog With Link
    Open Browser and go to URL    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${EMAIL OWNER}
    Click Button    ${RESET PASSWORD BUTTON}
    ${link}    Get Email Link    ${EMAIL OWNER}    restore_password    timeout=300
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}

Test Password Invalid
    [Arguments]   ${new pw}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${new pw}
    Check New Password Badge    ${new pw}
    Run Keyword Unless    '''${new pw}'''=='''${fair password}''' or '''${new pw}'''=='''${BASE PASSWORD}'''    Click Button    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}'''=='''${fair password}''' or '''${new pw}'''=='''${BASE PASSWORD}'''    Check New Password Outline    ${new pw}

Check New Password Badge
    [arguments]    ${pass}
    Run Keyword Unless    '''${pass}'''=='''${EMPTY}'''              Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If    '''${pass}'''=='''${7char password}'''     Element Should Be Visible    ${PASSWORD TOO SHORT BADGE}
    ...    ELSE IF    '''${pass}'''=='''${weak password}'''      Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${pass}'''=='''${common password}'''    Element Should Be Visible    ${PASSWORD TOO COMMON BADGE}
    ...    ELSE IF    '''${pass}'''=='''${CYRILLIC TEXT}''' or '''${pass}'''=='''${SMILEY TEXT}''' or '''${pass}'''=='''${GLYPH TEXT}''' or '''${pass}'''=='''${TM TEXT}''' or '''${pass}'''=='''${SPACE}${BASE PASSWORD}''' or '''${pass}'''=='''${BASE PASSWORD}${SPACE}'''    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${pass}'''=='''${fair password}'''      Element Should Be Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${pass}'''=='''${BASE PASSWORD}'''      Element Should Be Visible    ${PASSWORD IS GOOD BADGE}

Check New Password Outline
    [Arguments]   ${new pw}
    Wait Until Element Is Visible    ${FORM WITH ERROR}
    Run Keyword If    '''${new pw}'''=='''${EMPTY}''' or '''${new pw}'''=='''${SPACE}'''    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    ...    ELSE IF    '''${new pw}'''=='''${7char password}'''    Element Should Be Visible    ${PASSWORD TOO SHORT}
    ...    ELSE IF    '''${new pw}'''=='''${CYRILLIC TEXT}''' or '''${new pw}'''=='''${SMILEY TEXT}''' or '''${new pw}'''=='''${GLYPH TEXT}''' or '''${new pw}'''=='''${TM TEXT}''' or '''${new pw}'''=='''${SPACE}${BASE PASSWORD}''' or '''${new pw}'''=='''${BASE PASSWORD}${SPACE}'''    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    ...    ELSE IF    '''${new pw}'''=='''${common password}'''    Element Should Be Visible    ${PASSWORD TOO COMMON}
    ...    ELSE IF    '''${new pw}'''=='''${weak password}'''    Element Should Be Visible    ${PASSWORD IS WEAK}
