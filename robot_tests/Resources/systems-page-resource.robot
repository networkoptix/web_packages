*** Keywords ***
Remove Temporary Users
    FOR    ${user}    IN     @{TMP USERS}
        ${user id}=   Get Cloud User Id By Email    ${auth}    ${user}    ${AUTO TESTS SYSTEM ID}
        Remove User    ${auth}    ${AUTO SYS IP}    ${user id}
    END

Check Systems Text
    [Arguments]    ${user}
    Sleep    1
    Log Out
    Log In    ${user}    ${password}
    Wait Until Page Contains Element    ${AUTO TESTS USER}
    Element Text Should Be    ${AUTO TESTS USER}    ${TEST FIRST NAME} ${TEST LAST NAME}
    Wait Until Element Is Not Visible    //h2[.='${YOUR SYSTEM TEXT}']