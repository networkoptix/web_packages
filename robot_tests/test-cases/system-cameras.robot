*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Common Restart Logout    ${url}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Test Cases ***
Rename Camera
    Change name
    Save
    API call to check name changed
View button
Detailed Info
Apect Ratio
Rotation
Audio
Authentication
Record Always
Record Motion
Record Motion + Low Quality
Change FPS
Change Quality
Disabled Motion With Recording
Enabled Motion

Offline Info?
