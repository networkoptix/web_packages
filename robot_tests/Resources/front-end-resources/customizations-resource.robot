*** Variables ***
${email}             ${EMAIL OWNER}
${password}          ${BASE PASSWORD}
${url}               ${ENV}
${503 URL}           ${url}/static/503.html

*** Keywords ***
Restart
    Close All Browsers
    Open Browser and go to URL    ${url}
