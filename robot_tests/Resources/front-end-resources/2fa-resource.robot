*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Setup
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${login user}    ${user}
    ${rand}=   Generate Random String
    ${system}=   Create Base System    system-admin-${rand}    image=${IMAGE}    owner=${login user}    add users=${False}
    Set Suite Variable    ${server url}    https://${QABURBANK IP}:${system}[port]
    Set Suite Variable    ${system}    ${system}
    ${local system}=   Run Keyword If   '''${mode}'''=='''webadmin'''    Create Base System    system_admin_local_${rand}    image=${IMAGE}
    Set Suite Variable    ${system}
    Set Suite Variable    ${local system}
    Sleep    6

Restart
    Go To    ${url}
    Common Restart Logout    ${url}

2fa Suite Teardown
    Close All Browsers
    Delete Base System    ${system}

2fa Test Teardown
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Toggle 2fa Off Api    ${login user}    ${password}    verification_code=${totp}

Turn on 2fa Functionality
    [Arguments]    ${2fa link method}=without qr scan
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}    
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${SECURITY DROPDOWN}
    Click Link    ${SECURITY DROPDOWN}
    Wait Until Element Is Visible    ${2FA SWITCH}
    Click Element    ${2FA SWITCH}
    Wait Until Element Is Visible    ${2FA PASSWORD MODAL FIELD}
    Input Text    ${2FA PASSWORD MODAL FIELD}    ${BASE PASSWORD}
    Wait Until Element Is Visible    ${2FA PASSWORD MODAL NEXT BTN}
    Click Element    ${2FA PASSWORD MODAL NEXT BTN}
    IF    "${2fa link method}"=="without qr scan"
        Wait Until Element Is Visible    ${2FA QA CODE BTN}
        Click Element    ${2FA QA CODE BTN}
        Wait Until Element Is Visible    ${2FA KEY}
        ${key}=    Get Text    ${2FA KEY}
        Click Element    ${2FA KEY MODAL NEXT BTN}
    ELSE
        ${key}=    Scan QR and decode to key
    END
    ${totp}=    Get 2fa Verification Code    ${key}
    Wait Until Element Is Visible    ${2FA TOTP FIELD}
    Input Text    ${2FA TOTP FIELD}    ${totp}
    Wait Until Element Is Visible    ${2FA VERIFY BTN}
    Click Element    ${2FA VERIFY BTN}
    Wait Until Element Is Visible    ${2FA COPY ALL BTN}
    # Get random login code from the list and save to variable
    ${random integer}=    Evaluate    random.randint(1,8)
    ${random one time backup code}=    Get Text    //two-fa-modal-content//span[text()="${random integer}"]/..
    ${random one time backup code}=    Get Substring    ${random one time backup code}    1
    Click Element    ${2FA OK BTN}
    Set Global Variable    ${2FA KEY VALUE}    ${key}
    [return]    ${random one time backup code}

Turn off 2fa Functionality
    [Arguments]    ${login user}=${login user}    ${password}=${password}
    ${logged in}=    Run Keyword And Return Status    Element Should Be Visible    ${ACCOUNT DROPDOWN}
    IF    "${logged in}" == "False"
        Log In    ${login user}    ${password}    2fa=${True}
    END
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${SECURITY DROPDOWN}
    Click Link    ${SECURITY DROPDOWN}
    Wait Until Element Is Visible    ${2FA SWITCH}
    ${available}=    Run Keyword And Return Status    Element Should Be Visible    ${2FA SWITCH ENABLED}
    IF    "${available}" == "True"
    Click Element    ${2FA SWITCH}
    Wait Until Element Is Visible    ${2FA TOTP FIELD}
    Disable two factor authentication form validations
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Input Text    ${2FA TOTP FIELD}    ${totp}
    Click Element    ${2FA DISABLE MODAL BTN}
    Wait Until Element Is Visible    ${2FA SWITCH DISABLED}
    END

Login with one time backup code
    [arguments]    ${email}    ${password}    ${random one time backup code}
    Log In    ${email}    ${password}    2fa=${True}    2fa backup code=${random one time backup code}
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${SECURITY DROPDOWN}
    Click Link    ${SECURITY DROPDOWN}
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}

Attempt login with used backup code
    [arguments]    ${email}    ${password}    ${random one time backup code}
    Log In    ${email}    ${password}    validate=${False}    2fa=${True}    2fa backup code=${random one time backup code}
    Element Should Contain    ${2FA BACKUP CODE ERROR}    Wrong Backup Code


Scan QR and decode to key
    Wait Until Element Is Visible    //two-fa-modal-content//qr-code
    ${qr screenshot}=    Capture Element Screenshot    //two-fa-modal-content//qr-code
    ${key}=    decode_qr    ${qr screenshot}
    Click Element    ${2FA KEY MODAL NEXT BTN}
    [return]    ${key}

Generate totp and login
    [arguments]    ${email}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Wait Until Element Is Visible    ${2FA AUTH CODE FIELD}
    2fa log in verification code form validations    ${email}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${2FA AUTH CODE FIELD}    ${totp}
    Click Element    ${2FA AUTH CODE LOG IN BTN}

Generate totp wait for a minute and try to login
    [arguments]    ${email}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Wait Until Element Is Visible    ${2FA AUTH CODE FIELD}
    2fa log in verification code form validations    ${email}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${2FA AUTH CODE FIELD}    ${totp}
    Sleep    60
    Click Element    ${2FA AUTH CODE LOG IN BTN}
    Wait Until Element Is Visible    ${2FA ERROR LOGIN CODE}
    Element Should Not Be Visible    ${ACCOUNT DROPDOWN}

Type in backup code and login
    [Arguments]    ${2fa backup code}    ${email}
    Wait Until Element Is Visible    ${2FA BACKUP CODE BTN}
    2fa log in verification code form validations    ${email}
    Click Element    ${2FA BACKUP CODE BTN}
    Wait Until Element Is Visible    ${2FA BACKUP CODE FIELD}
    2fa log in backup code form validations    ${email}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${2FA BACKUP CODE FIELD}   ${2fa backup code}
    Click Element    ${2FA BACKUP CODE LOG IN BTN}

Disable two factor authentication form validations
    Element Should Be Visible    ${2FA DISABLE MODAL HEADER}
    Element Should Be Visible    ${2FA DISABLE MODAL DESCRIPTION}
    Element Should Be Visible    ${2FA DISABLE MODAL BTN}
    Wait Until Element Has Style    ${2FA DISABLE MODAL BTN}    background-color    ${2FA DISABLE MODAL RED COLOR}
    Element Should Be Visible    ${2FA DISABLE MODAL CANCEL BTN}

Check or uncheck 2fa ask for verification checkbox
    Wait Until Element Is Visible    ${2FA VERIFICATION CHECKBOX}
    ${checked}=    Get Checkbox Value    ${2FA VERIFICATION CHECKBOX ID}
    IF    ${checked}
        Click Element    ${2FA VERIFICATION CHECKBOX}
        Log    checkbox unchecked
    ELSE
        Click Element    ${2FA VERIFICATION CHECKBOX}
        Log    checkbox checked
    END
    Wait Until Element Is Visible    ${2FA SECURITY PAGE SAVE BTN}
    Click Element    ${2FA SECURITY PAGE SAVE BTN}
    Wait Until Element Is Visible    ${2FA TOTP FIELD}
    Element Should Be Visible    ${2FA SETTINGS MODAL HEADER}
    IF    ${checked}
        Element Should Be Visible    ${2FA SETTINGS MODAL DESCRIPTION CHECK}
    ELSE
        Element Should Be Visible    ${2FA SETTINGS MODAL DESCRIPTION UNCHECK}
    END
    Element Should Be Visible    ${2FA SETTINGS MODAL INSTRUCTIONS}
    Element Should Be Visible    ${2FA SETTINGS MODAL APPLY BTN}
    Element Should Be Visible    ${2FA SETTINGS MODAL CANCEL BTN}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Input Text    ${2FA TOTP FIELD}    ${totp}
    Click Element    ${2FA SETTINGS MODAL APPLY BTN}

2fa log in verification code form validations
    [arguments]    ${email}
    Element Should Be Visible    ${2FA CLOUD ILLUSTRATION}
    Element Should Be Visible    ${2FA LOG IN CLOUD}
    Element Should Be Visible    //nx-authorize-component//nx-authorize-auth-code-component//span[text()="${email}"]
    Element Should Be Visible    ${2FA AUTH CODE FIELD}
    Element Should Be Visible    ${2FA CODE INSTRUCTIONS}
    Element Should Be Visible    ${2FA BACK BTN}
    Element Should Be Visible    ${2FA BACKUP CODE BTN}
    Element Should Be Visible    ${2FA LOG IN BTN}

2fa log in backup code form validations
    [arguments]    ${email}
    Element Should Be Visible    ${2FA BK CLOUD ILLUSTRATION}
    Element Should Be Visible    ${2FA BK LOG IN CLOUD}
    Element Should Be Visible    //nx-authorize-component//nx-authorize-backup-code-component//span[text()="${email}"]
    Element Should Be Visible    ${2FA BK CODE FIELD}
    Element Should Be Visible    ${2FA BK CODE HELP}
    Element Should Be Visible    ${2FA BK CODE CONTACT}
    Element Should Be Visible    ${2FA BK BACK BTN}
    Element Should Be Visible    ${2FA AUTH CODE BTN}
    Element Should Be Visible    ${2FA BK LOG IN BTN}