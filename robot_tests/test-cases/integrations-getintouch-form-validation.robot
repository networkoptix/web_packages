*** Settings ***
Resource          ../resource.robot
Suite Setup       Form Validation
Test Template     Test Get In Touch Invalid
Test Teardown     Run Keyword if Test Failed    Restart
Suite Teardown    Close Browser
Force Tags        form    Threaded File

*** Variables ***
${url}    ${ENV}
${existing email}       ${EMAIL VIEWER}
${valid email}          noptixqa+valid@gmail.com
${sales inquiry}        ${SALES INQUIRY TEXT}
${technical inquiry}    ${TECHNICAL INQUIRY TEXT}
${feedback}             ${FEEDBACK TEXT}
${valid name}           mark hamil
${password}             ${BASE PASSWORD}

*** Test Cases ***                    EXPECTED    NAME             EMAIL                     SUBJECT             BUTTON                                      MESSAGE
Invalid Email 1 noptixqagmail.com     failure     ${valid name}    noptixqagmail.com    ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
Valid sales inquiry valid email       success     ${valid name}    ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
Valid technical inquiry valid email   success     ${valid name}    ${valid email}       ${technical inquiry}    ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
Valid Feedback valid email            success     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
# Using ${SPACE} below for now due to selenium shortcomings. but really want to be testing for ${EMPTY}
Empty name                            failure     ${SPACE}         ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
Invalid Email 2 noptixq@gmail         failure     ${valid name}    noptixqa@gmail       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
Close button no submit                failure     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH CLOSE BUTTON}    Sample message
    [tags]    C54681
Empty message                         failure     ${valid name}    ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     ${EMPTY}
    [tags]    C54681
Cancel button no submit               failure     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH CANCEL BUTTON}   Sample message
    [tags]    C54681



*** Keywords ***
Restart
    Close Browser
    Form Validation

Form Validation
    Open Browser and go to URL    ${url}/integrations
    Log In    ${existing email}    ${BASE PASSWORD}
    Wait Until Element is Visible    ${INTEGRATION TEST INTEGRATION LINK}/..
    Click Element    ${INTEGRATION TEST INTEGRATION LINK}/..
    Wait Until Elements are Visible    ${INTEGRATION GET IN TOUCH BUTTON}    ${INTEGRATION TITLE}
    ${name}=   Get Text    ${INTEGRATION TITLE}
    ${subbed subject}=    Replace String    ${sales inquiry}    {{integration}}    ${name}
    Click Button    ${INTEGRATION GET IN TOUCH BUTTON}
    # These two lines are because Hebrew has double quotes in its text.
    # This makes for issues with strings in xpaths.  These lines convert to single quotes if the language is Hebrew
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL INVALID}
    ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL INVALID TEXT}')]
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}
    ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
    Wait Until Elements Are Visible
    ...    ${INTEGRATION GET IN TOUCH NAME INPUT}
    ...    ${INTEGRATION GET IN TOUCH EMAIL INPUT}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN LIST}
    ...    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}
    ...    ${INTEGRATION GET IN TOUCH SEND BUTTON}
    ...    ${INTEGRATION GET IN TOUCH CANCEL BUTTON}
    ${returned name} =    Get Value    ${INTEGRATION GET IN TOUCH NAME INPUT}
    ${returned email} =   Get Value    ${INTEGRATION GET IN TOUCH EMAIL INPUT}
    Should Be Equal    ${returned name}    ${valid name}
    Should Be Equal    ${returned email}    ${existing email}
    Element Text Should Be    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}//span    ${subbed subject}
    ${name}=   Get Text    //a[@name="companyName"]
    ${subbed legal}=    Replace String    ${INTEGRATION GET IN TOUCH LEGAL TEXT}    {{developer}}    ${name}
    Element Text Should Be    ${INTEGRATION GET IN TOUCH LEGAL}    ${subbed legal}

Test Get In Touch Invalid
    [Arguments]    ${expected}    ${name}    ${email}    ${subject}    ${button}     ${message}
    Wait Until Elements Are Visible
    ...    ${INTEGRATION GET IN TOUCH NAME INPUT}
    ...    ${INTEGRATION GET IN TOUCH EMAIL INPUT}
    Get In Touch Form Validation    ${name}    ${email}    ${subject}    ${button}     ${message}
    # Run Keyword Unless    '''${pass}'''=='''${BASE PASSWORD}''' or '''${pass}'''=='''${symbol password}'''
    # ...    Check Password Outline    ${pass}
    Run Keyword Unless    "${email}"=="${valid email}"    Check Email Outline    ${email}
    Run Keyword If        "${name}"=="${EMPTY}"    Check Name Outline    ${name}
    Run Keyword If        "${message}"=="${EMPTY}"    Check Message Outline    ${message}
    Run Keyword If        "${expected}"=="success"    Validate Integration Message Sent
    ...    ELSE    Validate Integration Message Not Sent
    Run Keyword if    '${expected}' == 'success' or '${button}' == '${INTEGRATION GET IN TOUCH CLOSE BUTTON}'    Run Keywords
    ...    Wait Until Element is Visible    ${INTEGRATION GET IN TOUCH BUTTON}    AND
    ...    Click Button    ${INTEGRATION GET IN TOUCH BUTTON}

Get In Touch Form Validation
    [arguments]    ${name}    ${email}    ${subject}    ${button}     ${message}
    Delete All Text    ${INTEGRATION GET IN TOUCH NAME INPUT}
    Input Text    ${INTEGRATION GET IN TOUCH NAME INPUT}     ${name}
    Clear Element Text    ${INTEGRATION GET IN TOUCH EMAIL INPUT}
    Input Text    ${INTEGRATION GET IN TOUCH EMAIL INPUT}     ${email}
    Input Text    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}     ${message}

    Click Element    ${INTEGRATION GET IN TOUCH DROPDOWN ICON}

    Wait Until Element Is Visible    //*[@id="subject"]//ul[@class="dropdown-menu--list"]/li[1]/a
    Sleep   .5
    Run Keyword If     "${subject}"=="${sales inquiry}"
    ...    Click Link   //*[@id="subject"]//ul[@class="dropdown-menu--list"]/li[1]/a
    ...    ELSE IF     "${subject}"=="${technical inquiry}"
    ...    Click Link   //*[@id="subject"]//ul[@class="dropdown-menu--list"]/li[2]/a
    ...    ELSE IF     "${subject}"=="${feedback}"
    ...    Click Link   //*[@id="subject"]//ul[@class="dropdown-menu--list"]/li[3]/a
    # Sleep     .5
    Wait Until Element is Visible    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}//span
    ${name}=   Get Text    ${INTEGRATION TITLE}
    ${subbed subject}=    Replace String    ${subject}    {{integration}}    ${name}
    Element Text Should Be    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}//span    ${subbed subject}
    click button    ${button}

Check Email Outline
    [Arguments]    ${email}
    Wait Until Element Has Style     ${INTEGRATION GET IN TOUCH EMAIL INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Has Style     ${INTEGRATION GET IN TOUCH EMAIL INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${INTEGRATION GET IN TOUCH FORM}
    # Run Keyword If    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}"
    # ...    Element Should Be Visible    ${EMAIL IS REQUIRED}
    # Run Keyword If    "${email}"=="${existing email}"
    # ...    Element Should Be Visible    ${EMAIL ALREADY REGISTERED}
    # Run Keyword Unless    "${email}"=="${EMPTY}" or "${email}"=="${SPACE}" or "${email}"=="${existing email}"
    # ...    Element Should Be Visible    ${EMAIL INVALID}

Check Name Outline
    [Arguments]    ${name}
    Wait Until Element Has Style    ${INTEGRATION GET IN TOUCH NAME INPUT}    border-color    ${ERROR COLOR}
   # Element Style Should Be    ${INTEGRATION GET IN TOUCH NAME INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${INTEGRATION GET IN TOUCH FORM}

Check Message Outline
    [Arguments]    ${message}
    Element Style Should Be    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}     border-color    ${ERROR COLOR}
   # Element Style Should Be    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}     color    ${ERROR COLOR WITH OPACITY}
    Element Should Be Visible    ${INTEGRATION GET IN TOUCH FORM}

Validate Integration Message Sent
    Check For Alert    ${INTEGRATION GET IN TOUCH MESSAGE SENT}

Validate Integration Message Not Sent
    ${passed} =    Run Keyword And Return Status    Check For Alert    ${INTEGRATION GET IN TOUCH MESSAGE SENT}    timeout=10
    Run Keyword if    ${passed}==True    Fail    Message was sent


