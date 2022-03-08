*** Keywords ***
Register Random User
    ${email}=   Get Random Email    ${BASE EMAIL}
    Register And Activate Account    mark    hamill    ${email}    ${password}
    [Return]    ${email}

Send "Restore Password" Email
    [Arguments]    ${email}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Elements Are Visible    ${FORGOT PASSWORD BUTTON}
    Click Element    ${FORGOT PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${email}
    Wait Until Elements Are Visible      ${RESET PASSWORD BUTTON}
    Click Button    ${RESET PASSWORD BUTTON}

Get Restore Code and Open the Link
    [Arguments]    ${email}    ${restore}=${False}    ${new password}=${EMPTY}
    @{auth}=   Create List   ${BASE EMAIL}    ${password}
    ${code}=   Get Code From Email    ${email}    restore_password
    Go To    ${url}/authorize/restore_password/${code}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${RESET NEXT BUTTON}
    Run Keyword If    ${restore} == ${True} and '${new password}' != '${EMPTY}'  Run Keywords
    ...    Input Text    ${RESET PASSWORD INPUT}    ${new password}
    ...    AND    Click Button    ${RESET NEXT BUTTON}
    ...    AND    Wait Until Elements Are Visible    ${RESET SUCCESS MESSAGE}    ${RESET SUCCESS INSTRUCTION}    ${RESET LOGIN BUTTON}
    [Return]    ${code}

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
    Run Keyword Unless    '${email}'=='${EMAIL UNREGISTERED}' or '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'    restore-pass-resource.Check Email Outline    ${email}
    Run Keyword If    '${email}'=='${EMAIL UNREGISTERED}'    Check Error Content and Reset Button Disabled
    IF    '${email}'=='${SPACE}myemail@gmail.com' or '${email}'=='myemail@gmail.com${SPACE}'
        restore-pass-resource.Restart
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
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Click Button    ${SAVE PASSWORD}
    Run Keyword Unless    '''${new pw}''' in ${good passwords} or '''${new pw}''' in ${fair passwords}    Check New Password Outline and Error Message    ${new pw}    ${RESET PASSWORD FORM}    ${RESET PASSWORD INPUT}    resetPassword

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
