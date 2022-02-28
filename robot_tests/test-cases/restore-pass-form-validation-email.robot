*** Settings ***
Resource          ../resource.robot
Suite Setup       Restore Pass Validation Setup
Test Template     Test Email Invalid
Test Teardown     Run Keyword If Test Failed    Restart
Suite Teardown    Run Keyword and Ignore Error    Restore Pass Validation Teardown
Force Tags        email    form    Threaded

*** Variables ***
${url}    ${ENV}
${password}     ${BASE PASSWORD}
${EMAIL IS REQUIRED}   //p[contains(@class,'error-label') and contains(text(),"${ENTER EMAIL TEXT}")]
${EMAIL INVALID}       //p[contains(@class,'error-label') and contains(text(),"${EMAIL INVALID TEXT}")]
${EMAIL IS REQUIRED HEBREW}   //p[contains(@class,'error-label') and contains(text(),"${EMAIL IS REQUIRED TEXT}")]
${EMAIL INVALID HEBREW}       //p[contains(@class,'error-label') and contains(text(),"${EMAIL INVALID TEXT}")]

*** Test Cases ***                        EMAIL
1. Empty Email                               ${EMPTY}
    [tags]    C26260   CLOUD-8445
2. Invalid Email 1 noptixqagmail.com         noptixqagmail.com
    [tags]    C41875
3. Invalid Email 2 @gmail.com                @gmail.com
    [tags]    C41875
4. Invalid Email 3 noptixqa@gmail..com       noptixqa@gmail..com
    [tags]    C41875
5. Invalid Email 4 noptixqa@192.168.1.1.0    noptixqa@192.168.1.1.0
    [tags]    C41875    CLOUD-8445
6. Invalid Email 5 noptixqa.@gmail.com       noptixqa.@gmail.com
    [tags]    C41875
7. Invalid Email 6 noptixq..a@gmail.c        noptixq..a@gmail.c
    [tags]    C41875
8. Invalid Email 7 noptixqa@-gmail.com       noptixqa@-gmail.com
    [tags]    C41875
9. Invalid Email 8 myemail                   myemail
    [tags]    C41875
10. Invalid Email 9 myemail@                  myemail@
    [tags]    C41875
11. Invalid Email 10 myemail@gmail            myemail@gmail
    [tags]    C41875    CLOUD-8445
12. Invalid Email 11 myemail@.com             myemail@.com
    [tags]    C41875
13. Invalid Email 12 my@email@gmail.com       my@email@gmail.com
    [tags]    C41875
14. Invalid Email 13 myemail@ gmail.com       myemail@ gmail.com
    [tags]    C41875
15. Invalid Email 14 myemail@gmail.com;       myemail@gmail.com;
    [tags]    C41875
16. Space Email                               ${SPACE}
    [tags]    CLOUD-8445
17. Leading Space Email                       ${SPACE}myemail@gmail.com
    [tags]    C41875
18. Trailing Space Email                      myemail@gmail.com${SPACE}
    [tags]    C41875   CLOUD-8445
19. Unregistered Email                        ${EMAIL UNREGISTERED}
    [tags]    C41870

*** Keywords ***
Restore Pass Validation Setup
    ${user}=   Get Random Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${user}    ${password}
    Set Suite Variable     ${user}    ${user}
    Open Restore Password Dialog
    
Restore Pass Validation Teardown
    Close Browser
    Delete Account    ${user}    ${password}

Restart
    Close Browser
    Open Restore Password Dialog

Open Restore Password Dialog
    Open Browser and go to URL    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${user}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Elements Are Visible    ${FORGOT PASSWORD BUTTON}
    Click Element    ${FORGOT PASSWORD BUTTON}
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}

Test Email Invalid
    [Arguments]   ${email}
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}
    IF    '${email}' == '${EMPTY}'
        Delete All Text    ${RESTORE PASSWORD EMAIL INPUT}
        Sleep    1
        Click Element    //h3
        Delete All Text    ${RESTORE PASSWORD EMAIL INPUT}
        Sleep    1
        Click Element    //h3
    END
    Run Keyword Unless  '${email}' == '${EMPTY}'    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Click Button    ${RESET PASSWORD BUTTON}
    Run Keyword Unless    '${email}'=='${EMAIL UNREGISTERED}' or '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'    Check Email Outline    ${email}
    Run Keyword If    '${email}'=='${EMAIL UNREGISTERED}'    Check Error Content and Reset Button Disabled
    IF    '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'
        Restart
    END

Check Email Outline
    [Arguments]    ${email}
    Wait Until Element Is Visible    ${RESTORE PASSWORD EMAIL INPUT}/parent::form[contains(@class,'ng-invalid')]
    IF    "${LANGUAGE}"=="he_IL"
        IF    $"${email}"=="${EMPTY}" or "${email}"=="${SPACE}"
            Wait Until Element Is Visible    ${EMAIL IS REQUIRED HEBREW}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        ELSE
            Wait Until Element Is Visible    ${EMAIL INVALID HEBREW}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        END
    ELSE
        IF    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}"
            Wait Until Element Is Visible    ${EMAIL IS REQUIRED}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        ELSE
            Wait Until Element Is Visible    ${EMAIL INVALID}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        END
    END
    
