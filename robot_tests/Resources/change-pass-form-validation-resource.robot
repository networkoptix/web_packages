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
