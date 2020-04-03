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
@{TMP USERS}

*** Test Cases ***
# Rename server
#     Log in to User and System    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
#     click Rename
#     follow prompts
#     verify name is changed

# Restart server
#     Log in to user system and servers    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    # Restart server
    # Wait
    # verify back online

# Reset to Defaults
#     Log in to user system and servers    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
    # reset server
    # unsure of expected

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



# Full info 2 servers
    # goes to the right place

# offline Rename server
# offline Restart server
# offline Reset to Defaults
# offline Change port
# offline Check staus
# offline Full info
    # Maybe all these don't work offline?  If all are diabled just one Cases

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