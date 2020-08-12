*** Settings ***
Resource          ../resource.robot
Suite Setup       Open IPVD Page
Test Template     Test Submit Request Message
Test Teardown     NONE
Suite Teardown    Close All Browsers
Force Tags        form    Threaded-file

*** Variables ***
${url}                  ${ENV}
${name}                 Nx Automated QA
${message}              This is an automated test message.


*** Test Cases ***                   Expect Success     Your Name       Email                  Message
Valid email with all required data        True          ${name}         ${EMAIL OWNER}         ${message}
    [tags]    C48969    Valid    IPVD
Invalid email with all required data 1    False         ${name}         myemail                ${message}
    [tags]    C48969    Invalid    IPVD
Invalid email with all required data 2    False         ${name}         myemail@               ${message}
    [tags]    C48969    Invalid    IPVD
Invalid email with all required data 3    False         ${name}         myemail@gmail          ${message}
    [tags]    C48969    Invalid    IPVD
Invalid email with all required data 4    False         ${name}         my@email@gmail.com     ${message}
    [tags]    C48969    Invalid    IPVD
Invalid email with all required data 5    False         ${name}         myemail@ gmail.com     ${message}
    [tags]    C48969    Invalid    IPVD
Invalid email with all required data 6    False         ${name}         myemail@ gmail.com$    ${message}
    [tags]    C48969    Invalid    IPVD


*** Keywords ***
Test Submit Request Message
    [Arguments]    ${Expect Success}    ${Your Name}    ${Email}    ${Message}
    Go To IPVD page
    Wait Until Element Is Visible    ${IPVD SUBMIT A REQUEST}
    Click Element    ${IPVD SUBMIT A REQUEST}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    Element Text Should Be    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK FOR CAMERAS PAGE}
    Submit Feedback/Request Form    ${Your Name}    ${Email}    ${Message}
    Run Keyword If    ${Expect Success}==True    On Success    ${Email}
    ...    ELSE IF    ${Expect Success}==False   Validate Message Not Sent

On Success
    [Arguments]    ${email}
    Validate Message Sent
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${email}    timeout=120    status=UNSEEN
    Delete Email    ${email}
