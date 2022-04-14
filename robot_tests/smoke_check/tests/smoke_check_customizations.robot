*** Settings ***
Resource    ../smoke_check_resource.robot
Suite Setup      Customizations Suite Setup
Suite Teardown   Close Browser
Force Tags    customizations

*** Keywords ***
Customizations Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${customizations}=   Get Customizations    ${cloud auth}
    Set Suite Variable    ${customizations}

*** Test Cases ***
Check Customizations
    ${open portal failed}=   Create List
    ${log in failed}=   Create List
    FOR    ${host}    IN    @{customizations}
        Go To    https://${host}
        ${status}=   Run Keyword and return status    Wait until elements are visible
        ...    //div[@class="mainContainer"]
        ...    //a[@role="button" and contains(@href, "register")]
        ...    //span[contains(@class, "login")]/..
        IF    ${status} == ${False}
            Append To List    ${open portal failed}    ${host}
        END

        ${status}=   Run Keyword and return status    API Log In     ${email customizations}    ${password}    env=https://${host}
        IF    ${status} == ${False}
            Append To List    ${log in failed}    ${host}
        END

    END
    Run Keyword If    ${log in failed}    Fail    Fail to log in: ${log in failed}
    Run Keyword If    ${open portal failed}    Fail    Fail to open portal: ${open portal failed}
