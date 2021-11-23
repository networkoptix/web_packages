*** Settings ***
Resource          ../resource.robot
Suite Setup       Restart
Test Teardown     Run Keyword If Test Failed    Restart
Test Template     Test Login Invalid
Suite Teardown    Close Browser
Force Tags        form    Threaded 

*** Variables ***
${url}    ${ENV}
${good email}                 ${EMAIL VIEWER}
${good email unregistered}    ${EMAIL UNREGISTERED}
${good password}              ${BASE PASSWORD}
${bad password}               adrhartjad

*** Test Cases ***            EMAIL                         PASS
1. Empty Email                   ${EMPTY}                      ${good password}
2. Empty Password                ${good email}                 ${EMPTY}
3. Invalid Email 1               noptixqagmail.com             ${good password}
4. Invalid Email 2               @gmail.com                    ${good password}
5 Invalid Email 3               noptixqa@gmail..com           ${good password}
6. Invalid Email 4               noptixqa@192.168.1.1.0        ${good password}
7. Invalid Email 5               noptixqa.@gmail.com           ${good password}
8. Invalid Email 6               noptixq..a@gmail.c            ${good password}
9. Invalid Email 7               noptixqa@-gmail.com           ${good password}
10. Invalid Password              ${good email}                 ${bad password}
    [tags]    C41869
11. Valid Email Unregistered      ${good email unregistered}    ${good password}
    [tags]    C41868

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
    Run Keyword Unless
    ...    "${email}" == "${good email}" or "${email}" == "${good email unregistered}"
    ...    Check Email Outline

Check Email Outline
    Wait Until Element Has Style    ${EMAIL INPUT}    border-color    ${ERROR COLOR}

Check Password Outline
    ${class}    Get Element Attribute    ${PASSWORD INPUT}    class
    Should Contain    ${class}    ng-invalid
