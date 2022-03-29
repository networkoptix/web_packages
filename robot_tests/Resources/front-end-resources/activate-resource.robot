*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Clear emails
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${emails}    Run Keyword And Ignore Error    Wait For Email    timeout=120
    Run Keyword And Ignore Error    Delete all emails
    Close Mailbox

Restart
    Open Browser and go to URL    ${url}
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser