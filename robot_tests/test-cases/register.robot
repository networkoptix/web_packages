*** Settings ***
Resource          ../Resources/front-end-resources/register-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Run Keywords    QA Video Recording Start        register-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop         Open New Browser and Reset DB On Failure
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***
1. Should open register page in anonymous state by clicking Register button on top right corner
    [tags]    smoke    ci
    Wait Until Element Is Visible    ${CREATE ACCOUNT HEADER}
    Click Link    ${CREATE ACCOUNT HEADER}
    Location Should Be    ${url}/authorize?client_type=create
    Validate on Register Page


5. Should register user with correct credentials
    [tags]    smoke    ci
    ${email}    Get Random Email Robot    ${BASE EMAIL}
    Register    mark    hamill    ${email}    ${password}
    Validate Register Success


21. Check registration email links, colors, cloud name, and user name
    [tags]    C24211    C43021    Customizations    smoke    ci
    ${email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Check Language Anonymous
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${email}    ${password}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${email}    timeout=120    status=UNSEEN
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore

    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    Check Email User Names    ${email text}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}

    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}}    ${TEST FIRST NAME} ${TEST LAST NAME}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    %PRODUCT_NAME%    ${PRODUCT_NAME}
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/activate
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

