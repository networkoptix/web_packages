*** Settings ***
Library    SeleniumLibrary
Resource    ../../resource.robot
*** Keywords ***
Turn on 2fa Functionality
    [Arguments]    ${2fa link method}=without qr scan
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${SECURITY DROPDOWN}
    Click Link    ${SECURITY DROPDOWN}
    Wait Until Element Is Visible    ${2FA SWITCH}
    Click Element    ${2FA SWITCH}
    Wait Until Element Is Visible    ${2FA PASSWORD MODAL FIELD}
    Input Text    ${2FA PASSWORD MODAL FIELD}    ${BASE PASSWORD}
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
    Click Element    ${2FA VERIFY BTN}
    Wait Until Element Is Visible    ${2FA COPY ALL BTN}
    # Get random login code from the list and save to variable
    ${random integer}=    Evaluate    random.randint(1,8)
    ${random one time backup code}=    Get Text    //ngb-modal-window//span[text()="${random integer}"]//..
    ${random one time backup code}=    Get Substring    ${random one time backup code}    1
    Click Element    ${2FA OK BTN}
    Set Global Variable    ${2FA KEY VALUE}    ${key}
    [return]    ${random one time backup code}

Turn off 2fa Functionality
    Click Element    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${SECURITY DROPDOWN}
    Click Link    ${SECURITY DROPDOWN}
    Wait Until Element Is Visible    ${2FA SWITCH}
    Click Element    ${2FA SWITCH}
    Wait Until Element Is Visible    ${2FA TOTP FIELD}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Input Text    ${2FA TOTP FIELD}    ${totp}
    Click Element    ${2FA DISABLE}
    Wait Until Element Is Visible    ${2FA SWITCH DISABLED}

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