*** Keywords ***
Check Systems Text
    [Arguments]    ${user}
    Sleep    1
    Log Out
    Log In    ${user}    ${password}
    Wait Until Page Contains Element    ${AUTO TESTS USER}
    Element Text Should Be    ${AUTO TESTS USER}    ${TEST FIRST NAME} ${TEST LAST NAME}
    Wait Until Element Is Not Visible    //h2[.='${YOUR SYSTEM TEXT}']