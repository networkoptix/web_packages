*** Settings ***
Resource          resource.robot
Suite Setup       Open IPVD Page
Test Template     Test Submit Feedback Message
Test Teardown     NONE
Suite Teardown    Close All Browsers
Force Tags        form    Threaded

*** Variables ***
${url}                  ${ENV}
${name}                 Nx Automated QA
${message}              This is an automated test message.


*** Test Cases ***                   Expect Success     Your Name       Email                  Message
1. Valid email with all required data        True          ${name}         ${EMAIL OWNER}         ${message}
    [tags]    C54182    Valid    IPVD
2. Invalid email with all required data 1    False         ${name}         myemail                ${message}
    [tags]    C54182    Invalid    IPVD
3. Invalid email with all required data 2    False         ${name}         myemail@               ${message}
    [tags]    C54182    Invalid    IPVD
4. Invalid email with all required data 3    False         ${name}         myemail@gmail          ${message}
    [tags]    C54182    Invalid    IPVD
5. Invalid email with all required data 4    False         ${name}         my@email@gmail.com     ${message}
    [tags]    C54182    Invalid    IPVD
6. Invalid email with all required data 5    False         ${name}         myemail@ gmail.com     ${message}
    [tags]    C54182    Invalid    IPVD
7. Invalid email with all required data 6    False         ${name}         myemail@ gmail.com$    ${message}
    [tags]    C54182    Invalid    IPVD


*** Keywords ***
Language Support
    ${IPVD FEEDBACK ABOUT}    Replace String    ${IPVD FEEDBACK ABOUT}     {{model}}    ${model}
    Element Should Contain    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK ABOUT}

Test Submit Feedback Message
    [Arguments]    ${Expect Success}    ${Your Name}    ${Email}    ${Message}
    Go To IPVD page
    #Search for Axis and click any camera from list
    IPVD Text Search    Axis
    IPVD Select Device From Table Randomly
    Wait Until Element Is Visible    ${IPVD SEND DEVICE FEEDBACK}
    Click Element    ${IPVD SEND DEVICE FEEDBACK}
    Wait Until Element Is Visible    ${IPVD FEEDBACK}
    ${model} =   Get Text    ${IPVD DEVICE MODEL}
    ${IPVD FEEDBACK ABOUT}    Replace String    ${IPVD FEEDBACK ABOUT}     {{model}}    ${model}
    Element Should Contain    ${IPVD FEEDBACK TITLE}    ${IPVD FEEDBACK ABOUT}
    Submit Feedback/Request Form    ${Your Name}    ${Email}    ${Message}
    Run Keyword If    ${Expect Success}==True    On Success    ${Email}
    ...    ELSE IF    ${Expect Success}==False   Validate Message Not Sent

On Success
    [arguments]    ${email}
    Validate Message Sent
    # Commented out as we don't have access to the current email and it gets changed at random
    #Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    #${email}    Wait For Email    recipient=${email}    timeout=120    status=UNSEEN
    #Delete Email    ${email}
