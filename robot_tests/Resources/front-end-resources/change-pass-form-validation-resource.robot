*** Keywords ***
Change Password Form Validation
    [arguments]    ${old password}    ${new password}
    Sleep    .3    #added to make sure the page is loaded fully
    Input Text    ${CURRENT PASSWORD INPUT}    ${old password}
    Input Text    ${NEW PASSWORD INPUT}    ${new password}
    Run Keyword Unless    '${new password}' == '${EMPTY}'    Check Password Badge    ${new password}    ${CHANGE PASSWORD BUTTON}
    Run Keyword Unless  '${old password}' == '${EMPTY}' and '${new password}' == '${EMPTY}'    Wait until Element is Visible    ${CHANGE PASSWORD BUTTON}
    Run Keyword If    '${new password}' == '${BASE PASSWORD}'    Click Button    ${CHANGE PASSWORD BUTTON}
    ...    ELSE    Click Element    //h4

Check Old Password Outline
#    Wait Until Element Is Visible
#    ...    ${CURRENT PASSWORD INPUT}/parent::div/parent::div[contains(@class,'has-error')]
    ${class_attribute_value}=   Get Element Attribute     ${CURRENT PASSWORD INPUT}    class
    Should Contain    ${class_attribute_value}    invalid   touched
    Page Should Contain    ${CURRENT PASSWORD IS REQUIRED TEXT}
    Element Should Be Visible    ${CURRENT PASSWORD IS REQUIRED}

Check Old Password Alert
    Check For Alert    ${CANNOT SAVE PASSWORD}${SPACE}${PASSWORD INCORRECT}


