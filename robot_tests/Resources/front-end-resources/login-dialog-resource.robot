*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Setup
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${login user}    ${user}

Restart
    Go To    ${url}
    Common Restart Logout    ${url}
