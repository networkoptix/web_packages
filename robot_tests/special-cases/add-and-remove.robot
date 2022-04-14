#This is a script which will add 30 users and then delete them.
#It was made for testing CLOUD-1675
*** Settings ***
Resource          ../resource.robot
Resource          ../variables.robot
Suite Teardown    Close All Browsers

*** Variables ***
${email}           ${EMAIL OWNER}
${password}        ${BASE PASSWORD}
${url}             ${CLOUD TEST}
${how many}        30

*** Keywords ***
Log in to Auto Tests System
    [arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    None
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    IF    '${email}' != '${EMAIL OWNER}' and '${email}' != '${EMAIL ADMIN}'
        Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    END
Check For Alert2
    [arguments]    ${alert text}
    Wait Until Element Is Visible    ${ALERT}
    Element Should Be Visible    ${ALERT}
    Element Text Should Be    ${ALERT}    ${alert text}
    Wait Until Page Does Not Contain Element    ${ALERT}

*** Test Cases ***
Add Then Remove
    @{emails}    Get Many Random Emails    ${how many}    ${BASE EMAIL}
    Open Browser and go to URL    ${url}
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    FOR    ${x}    IN RANGE    ${how many}
        Click Button    ${ADD USER BUTTON SYSTEMS}
        Wait Until Elements Are Visible    ${ADD USER EMAIL}    ${ADD USER BUTTON MODAL}
        Input Text    ${ADD USER EMAIL}    @{emails}[${x}]
        Click Button    ${ADD USER BUTTON MODAL}
        Check For Alert2    ${NEW PERMISSIONS SAVED}
    END
    Register Keyword To Run On Failure    Capture Page Screenshot
    FOR    ${x}    IN RANGE    ${how many}
        Run Keyword And Continue On Failure    Remove User Permissions    @{emails}[${x}]
    END
    Close Browser
