*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Restore Password Dialog
Test Template     Test Email Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        email    form    Threaded-file

*** Variables ***
${url}    ${ENV}
${password}     ${BASE PASSWORD}
${EMAIL IS REQUIRED}   //span[contains(@class,'input-error') and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
${EMAIL INVALID}       //span[contains(@class,'input-error') and contains(text(),'${EMAIL INVALID TEXT}')]

*** Test Cases ***                        EMAIL
Empty Email                               ${EMPTY}
    [tags]    C26260
Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41875
Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41875
Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41875
Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41875
Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41875
Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41875
Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41875
Invalid Email 8 myemail                   myemail
    [tags]    C41875
Invalid Email 9 myemail@                  myemail@
    [tags]    C41875
Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41875
Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41875
Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41875
Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41875
Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41875
Space Email                               ${SPACE}
Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C41875
Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C41875
Unregistered Email                        ${EMAIL UNREGISTERED}
    [tags]    C41870

*** Keywords ***
Restart
    Close Browser
    Open Restore Password Dialog

Open Restore Password Dialog
    Open Browser and go to URL    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}

Test Email Invalid
    [Arguments]   ${email}
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Click Button    ${RESET PASSWORD BUTTON}
    Run Keyword Unless    '${email}'=='${EMAIL UNREGISTERED}' or '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'    Check Email Outline    ${email}
    Run Keyword If    '${email}'=='${EMAIL UNREGISTERED}'    Check For Alert Dismissable    ${CANNOT SEND CONFIRMATION EMAIL}${SPACE}${SPACE}${ACCOUNT DOES NOT EXIST}
    Run Keyword If    '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'    Go To    ${url}/restore_password

Check Email Outline
    [Arguments]    ${email}
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}/parent::nx-email-input/parent::form//span[contains(@class,'input-error')]
    Run Keyword If    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}"    Wait Until Element Is Visible    ${EMAIL IS REQUIRED}
    Run Keyword Unless    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}"    Wait Until Element Is Visible    ${EMAIL INVALID}
