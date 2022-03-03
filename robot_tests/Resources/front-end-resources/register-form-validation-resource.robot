*** Keywords ***
Register Form Validation
    [arguments]    ${first name}    ${last name}    ${email}    ${password}    ${checked}
    Clear Element Text    ${REGISTER PASSWORD INPUT}
    Input Text    ${REGISTER FIRST NAME INPUT}    ${first name}
    Input Text    ${REGISTER LAST NAME INPUT}    ${last name}
    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Click Element    ${REGISTER PASSWORD INPUT}
    sleep    .1
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run Keyword If    '''${password}'''!='''${EMPTY}'''     Check Password Badge    ${password}    ${REGISTER FORM}
    Run Keyword If    "${checked}"=="True"    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Sleep    .1    #On Ubuntu it was going too fast
    click button    ${CREATE ACCOUNT BUTTON}

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

Check First Name Outline
    [Arguments]    ${first}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    border-bottom-color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    border-top-color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    border-right-color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    border-left-color    ${ERROR COLOR WITH OPACITY}
    Element Style Should Be    ${REGISTER FIRST NAME INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${FIRST NAME IS REQUIRED}

Check Last Name Outline
    [Arguments]    ${last}
    Element Style Should Be    ${REGISTER LAST NAME INPUT}    border-color    ${ERROR COLOR}
    Element Style Should Be    ${REGISTER LAST NAME INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${LAST NAME IS REQUIRED}

Check Terms and Conditions Error
    Wait Until Element Is Visible    ${TERMS AND CONDITIONS ERROR}

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
    ...    Check New Password Outline and Error Message    ${pass}    ${REGISTER FORM}     ${REGISTER PASSWORD INPUT}    createAccountPassword
    Run Keyword Unless    "${email}"=="${valid email}"    register-form-validation-resource.Check Email Outline    ${email}
    Run Keyword Unless    "${first}"=="mark"    Check First Name Outline    ${first}
    Run Keyword Unless    "${last}"=="hamill"    Check Last Name Outline    ${last}
    Run Keyword Unless    "${checked}"=="True"    Check Terms and Conditions Error

Restart
    Close Browser
    Open Browser and go to URL    ${url}/authorize?client_type=create
