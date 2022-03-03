*** Keywords ***
Change Password Form Validation
    [arguments]    ${old password}    ${new password}
    Sleep    .3    #added to make sure the page is loaded fully
    Input Text    ${CURRENT PASSWORD INPUT}    ${old password}
    Input Text    ${NEW PASSWORD INPUT}    ${new password}
    Run Keyword Unless    '${new password}' == '${EMPTY}'    Check Password Badge    ${new password}    ${CHANGE PASSWORD BUTTON}
    Run Keyword Unless  '${old password}' == '${EMPTY}' and '${new password}' == '${EMPTY}'    Wait until Element is Visible    ${CHANGE PASSWORD BUTTON}
    Run Keyword If    '${new password}' == '${BASE PASSWORD}'    Click Button    ${CHANGE PASSWORD BUTTON}
    ...    ELSE    Click Element    ${PASSWORD HEADLINE}

Check Old Password Outline
#    Wait Until Element Is Visible
#    ...    ${CURRENT PASSWORD INPUT}/parent::div/parent::div[contains(@class,'has-error')]
    ${class_attribute_value}=   Get Element Attribute     ${CURRENT PASSWORD INPUT}    class
    Should Contain    ${class_attribute_value}    invalid   touched
    Page Should Contain    ${CURRENT PASSWORD IS REQUIRED TEXT}
    Element Should Be Visible    ${CURRENT PASSWORD IS REQUIRED}

Check Old Password Alert
    Check For Alert    ${CANNOT SAVE PASSWORD}:${SPACE}${PASSWORD INCORRECT}

Open Change Password Dialog
    ${email}=    Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${email}    ${email}
    Open Browser and go to URL    ${url}/account/password
    Log In    ${email}    ${BASE PASSWORD}    button=None
    Validate Log In    ${email}
    Wait Until Element Is Not Visible    ${LOG IN MODAL}
    Wait Until Elements Are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}

Test Passwords Invalid
    [Arguments]    ${old pw}    ${new pw}
    Sleep    0.5
    Reload Page
    Wait Until Elements Are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${old pw}
    Input Text    ${NEW PASSWORD INPUT}    ${new pw}
    Run Keyword Unless    '${new pw}' == '${EMPTY}'    Check Password Badge    ${new pw}    ${CHANGE PASSWORD BUTTON}
    Run Keyword Unless  '${old pw}' == '${EMPTY}' and '${new pw}' == '${EMPTY}'    Wait until Element is Visible    ${CHANGE PASSWORD BUTTON}
    Run Keyword If    '${new pw}' == '${BASE PASSWORD}'    Click Button    ${CHANGE PASSWORD BUTTON}
    ...    ELSE    Click Element    ${PASSWORD HEADLINE}
    Run Keyword Unless    "${old pw}" == "${BASE PASSWORD}" or "${old pw}" == "${7char password}"
    ...    Check Old Password Outline
    Run Keyword Unless    '''${new pw}''' == "${BASE PASSWORD}"    
    ...    Check New Password Outline and Error Message    ${new pw}    ${CHANGE PASSWORD BUTTON}    ${NEW PASSWORD INPUT}     newPassword
    Run Keyword If    "${old pw}" == "${7char password}"    Check Old Password Alert
    ${status} =   Run Keyword and Return Status    Should Contain Any    ${TEST NAME}    Good    Fair
    Run Keyword If    ${status}    Wait Until Element is Not Visible    ${CHANGE PASSWORD BUTTON}
    
Restart
    Close Browser
    Open Change Password Dialog
    
Teardown
    # Delete Account    ${ENV}   ${email}    ${lower upper password}
    Close Browser
