*** Settings ***
Resource          ../Resources/front-end-resources/downloads-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Run Keywords    QA Video Recording Start      downloads-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded


*** Test Cases ***
3. Going to the downloads page anonymous asks for login and closing takes you back to home
    [tags]    C42069
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    Click Link    ${DOWNLOAD LINK}
    # Run keyword and continue on failure    Title Should Be    ${DOWNLOAD TITLE TEXT} - ${PRODUCT_NAME}
    ${status} =    Run Keyword and Return Status    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Run Keyword If    ${status}    Run Keywords
    ...    Click Button    ${LOG IN CLOSE BUTTON}    AND
    ...    Wait Until Location Is    ${url}/

4. Going to the downloads page anonymous asks for login and login shows downloads page
    [tags]    C42069
    Go to download page
