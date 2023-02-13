*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Restore Pass Test Teardown
    Run Keyword If Test Failed    restore-pass-resource.Open New Browser On Failure

Register Random User
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}
    [Return]    ${email}

Send "Restore Password" Email
    [Arguments]    ${email}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Element    ${LOG IN NEXT BUTTON}
    Wait Until Elements Are Visible    ${FORGOT PASSWORD BUTTON}
    Click Element    ${FORGOT PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Wait Until Elements Are Visible      ${RESET PASSWORD BUTTON}
    Click Button    ${RESET PASSWORD BUTTON}

Get Restore Code and Open the Link
    [Arguments]    ${email}    ${restore}=${False}    ${new password}=${EMPTY}
    @{auth}=   Create List   ${BASE EMAIL}    ${password}
    ${link}=   Get Email Link   ${email}    restore_password
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${RESET NEXT BUTTON}
    Run Keyword If    ${restore} == ${True} and '${new password}' != '${EMPTY}'  Run Keywords
    ...    Input Text    ${RESET PASSWORD INPUT}    ${new password}
    ...    AND    Click Button    ${RESET NEXT BUTTON}
    ...    AND    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS INSTRUCTION}    ${RESET LOGIN BUTTON}
    [Return]    ${link}

Restore Pass Validation Setup
    Open Browser and go to URL    ${url}
    ${user}=   Get Random Email Robot    ${BASE EMAIL}
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
    Open Browser and Go to URL    ${url}/authorize
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
    IF    '${email}' != '${EMPTY}'
        Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    END
    Click Button    ${RESET PASSWORD BUTTON}
    IF    '${email}'!='${EMAIL UNREGISTERED}' and '${email}'!='${SPACE}myemail@gmail.com' and '${email}'!='myemail@gmail.com${SPACE}'
        Check Email Outline    ${email}
    END
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
            Wait Until Element Is Visible    ${RESTORE PASS EMAIL IS REQUIRED}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        ELSE
            Wait Until Element Is Visible    ${EMAIL INVALID}
            Element Should Be Disabled    ${RESET PASSWORD BUTTON}
        END
    END

Open Restore Password Dialog With Code
    ${user} =   Register Random User
    Open Browser and go to URL    ${url}/authorize
    Send "Restore Password" Email   ${user}
    Get Restore Code and Open the Link    ${user}
    Set Suite Variable    ${user}   ${user}
    ${speed normal} =  Get Selenium Speed
    Set Suite Variable      ${speed normal}    ${speed normal}
    Set Selenium Speed    .01

Test Password Invalid
    [Arguments]   ${new pw}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
    Input Text    ${RESET PASSWORD INPUT}    ${new pw}
    #Check New Password Badge    ${new pw}
    Check Password Badge    ${new pw}    ${SAVE PASSWORD}
    IF    '''${new pw}''' not in ${good passwords} and '''${new pw}''' not in ${fair passwords}
        Click Button    ${SAVE PASSWORD}
        Check New Password Outline and Error Message    ${new pw}    ${RESET NEXT BUTTON}    ${RESET PASSWORD INPUT}    resetPassword
    END

Restart Restore Pass Form Password
    Close Browser
    Delete Account    ${user}    ${password}
    Open Restore Password Dialog With Code

Teardown
    Close Browser
    Delete Account    ${user}    ${password}
    Set Selenium Speed     ${speed normal}

Restart Restore Pass
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}
