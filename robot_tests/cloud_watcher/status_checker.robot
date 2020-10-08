*** Settings ***
Resource          ../resource.robot
Library           CloudWatcher.py
Suite Setup       Open Browser and go to url    https://status.nxvms.com
Suite Teardown    Close Browser

*** Variables ***
${cloud services}    //div[contains(@class, "card-header")]/h6[contains(text(), "Cloud Services")]
${cloud system conncetivity}    //div[contains(@class, "card-header")]/h6[contains(text(), "Cloud Systems Connectivity")]
${error record}    //div[contains(@class, "card-body nx-error")]
@{error list}

*** Test Cases ***
Check status.nxvms.com
    Wait until elements are visible    ${cloud services}    ${cloud system conncetivity}
    Sleep    1
    ${all errors}=   Get WebElements    ${error record}
    FOR   ${r}    IN    @{all errors}
        Log    ${r}
    END
    Print Status Errors    ${all errors}
    Send Text    Hello from robot
