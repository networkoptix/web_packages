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
Rename server close button works
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Click Button    ${RENAME CLOSE BUTTON}

Rename server cancel button works
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Click Button    ${RENAME CANCEL BUTTON}
    Element Should Not be Visible    ${RENAME SERVER FORM}

Rename server requires a name
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Delete All Text    ${$RENAME SERVER INPUT}
    Click Button    ${RENAME SAVE BUTTON}
    Wait Until Element is Visible    ${RENAME ERROR TEXT}
    Element Text Should Be    ${RENAME ERROR TEXT}    ${SERVER NAME REQUIRED}

Server name can be changed
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${$RENAME SERVER INPUT}    server 1 name changed
    Click Button    ${RENAME SAVE BUTTON}
    Check for Alert    ${SERVER NAME SAVED}
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${$RENAME SERVER INPUT}    server 1
    Click Button    ${RENAME SAVE BUTTON}
    Check for Alert    ${SERVER NAME SAVED}


# Restart server
#     Log in to user system and servers    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    # Restart server
    # Wait
    # verify back online

# Change port
#     Log in to user system and servers    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
#     Verify on Servers Page

# Check staus
    # Log in to user system and servers    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    # take offline
    # check status
    # bring online
    # check status

Full info 1 server
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${FULL INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health/servers
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}



Full info 2 servers
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Button    ${FULL INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health/servers
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}

Offline system server settings
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Wait Until Element is Visible    ${SERVER NOT ACCESIBLE IMAGE}
    Element Should not be Visible    ${PORT INPUT}
    Element Should not be Visible    ${RENAME SERVER BUTTON}
    Element Should not be Visible    ${RESTART SESRVER BUTTON}
    Element Should not be Visible    ${FULL INFO BUTTON}

Offline two servers
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Click Link    //span[contains(text(),"server 2")]/../..
    Wait Until Elements are Visible    ${CHECK STATUS BUTTON}    ${OFFLINE BADGE}
    Wait Until Element has Style    ${OFFLINE BADGE}    text-transform    uppercase
    Element Should be Disabled    ${PORT INPUT}
    Element Should be Disabled    ${RENAME SERVER BUTTON}
    Element Should be Disabled    ${RESTART SESRVER BUTTON}

Owner has Access
    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
Admin has Access
    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
Viewer does not have Access
    Log in to user and system    ${EMAIL VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element Should not be Visible    ${SERVERS LINK}
Advanced Viewer does not have Access
    Log in to user and system    ${EMAIL ADV VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element Should not be Visible    ${SERVERS LINK}
Live Viewer does not have Access
    Log in to user and system    ${EMAIL LIVE VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element Should not be Visible    ${SERVERS LINK}
Custom User does not have Access
    Log in to user and system    ${EMAIL CUSTOM}    ${AUTO TESTS SYSTEM ID}
    Element Should not be Visible    ${SERVERS LINK}
# More than one server