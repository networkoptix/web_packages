*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Restart
    Close Browser
    Open Browser and go to URL    ${url}
    Wait Until Elements Are Visible    ${LOG IN NAV BAR}
    Click Link    ${LOG IN NAV BAR}

Test Login Invalid
    [Arguments]    ${email}    ${pass}
    Reload Page
    IF    "${EMAIL}" == "${good email}"
        Log In Email Form Validation    ${EMAIL}
        Log In Password Form Validation    ${pass}
        IF    "${PASS}" == "${bad password}"
            Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
        END
    ELSE IF    "${EMAIL}" == "${good email unregistered}"
        Log In Email Form Validation    ${EMAIL}
        Wait Until Element Is Visible    ${ACCOUNT NOT FOUND MESSAGE}
    ELSE
        Log In Email Form Validation    ${EMAIL}
        Check Email Outline
    END

Log In Email Form Validation
    [Arguments]    ${email}
    Wait Until Element Is Visible    ${EMAIL INPUT}
    Input Text    ${EMAIL INPUT}    ${email}
    click button    ${LOG IN NEXT BUTTON}

Log In Password Form Validation
    [Arguments]    ${pass}
    Wait Until Element Is Visible    ${PASSWORD INPUT}
    Input Text    ${PASSWORD INPUT}    ${pass}
    click button    ${LOG IN BUTTON}

Outline Error
    [Arguments]    ${email}    ${pass}
    Run Keyword If    "${pass}" == "${EMPTY}"    Check Password Outline
    IF    "${email}" != "${good email}" and "${email}" != "${good email unregistered}"
        Check Email Outline
    END

Check Email Outline
    Wait Until Element Has Style    ${EMAIL INPUT}    border-color    ${ERROR COLOR}

Check Password Outline
    ${class}    Get Element Attribute    ${PASSWORD INPUT}    class
    Should Contain    ${class}    ng-invalid
