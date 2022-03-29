*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Setup
    ${email} =    Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    ${email} =    Set Suite Variable    ${email}
    Open browser and set user language to current
    
Open browser and set user language to current
    Open Browser and go to URL    ${url}
    Log In    ${email}    ${password}
    sleep    3
    Log Out

Log In To Change Password Page
    Log In    ${email}    ${BASE PASSWORD}
    Go To    ${url}/account/password
    Wait Until Elements Are Visible    ${CURRENT PASSWORD INPUT}    ${NEW PASSWORD INPUT}

Discard Changes and Log Out
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element Is Visible    ${LOG OUT BUTTON}
    Click Link    ${LOG OUT BUTTON}
    Wait until Elements are Visible    ${MODAL DIALOG}    ${DISCARD CHANGES BUTTON}
    Click Button    ${DISCARD CHANGES BUTTON}
    Validate Log Out

Reset user password to base
    [Arguments]    ${email}    ${current password}
    Change Password    ${email}    ${current password}    ${BASE PASSWORD}

Restart
    Common Restart Logout    ${url}

Clean up
    Register Keyword To Run On Failure    NONE
    # ${status}    Run Keyword And Return Status    Validate Log In    ${email}
    # Register Keyword To Run On Failure    Failure Tasks
    # Run Keyword If    ${status}    Log Out
    # Restore Password using API    ${email}    ${password}
    Close All Browsers

Reset DB and Open New Browser On Failure
    Restore Password using API    ${email}    ${BASE PASSWORD}
    Close Browser
    Open Browser and go to URL    ${url}