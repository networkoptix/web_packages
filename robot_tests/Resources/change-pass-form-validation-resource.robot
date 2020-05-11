*** Keywords ***
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
    Check Password Badge    ${new password}    //h4
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


