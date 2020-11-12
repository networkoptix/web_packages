*** Settings ***
Resource    ../smoke_check_resource.robot
Suite Setup      Open browser and go to URL    ${ENV}    False    False
Suite Teardown   Close Browser

*** Test Cases ***
Check Customizations
    FOR    ${host}    IN    @{customizations.values()}
        Go To    ${host}
        ${status}=   Run Keyword and return status    Wait until elements are visible
        ...    //div[@class="mainContainer"]
        ...    //a[@role="button" and contains(@href, "register")]
        ...    //span[contains(@class, "login")]/..
        ${open portals failed}=   Set Variable If   ${status} == ${False}    ${True}

        ${status}=   Run Keyword and return status    CloudPortalAPI.Log In    ${host}    ${email customizations}    ${password}
        Log    ${host} OK: ${status}
        ${log in failed}=   Set Variable If   ${status} == ${False}    ${True}
    END
    Run Keyword If    $log_in_failed    Fail    Fail to log in on portal: Check all customizations in logs
    Run Keyword If    $open_portals_failed    Fail    Fail to open portal: Check all customizations in logs
