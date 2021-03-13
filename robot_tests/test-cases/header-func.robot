*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${ENV}
Test Setup        Common Restart Logout    ${ENV}
Suite Teardown    Header Suite Teardown

*** Test Cases ***
# ANON
# HEADER
# Validate header: logo, systemsDropDown, create account, log in, language
# Check header content on services' pages
# Check header content on for developers pages - Platform overview & Knowledgebase

# DROPDOWN
# Open check content(navigation block only), close by clicking dropdown button
# Open and close - clicking outside dropdown
# Clicking inside dropdown but outside links does nothing
# Open on service page and verify the link is highlighted
# Open on for dev page and verify the link is highlighted

# Dropdown content is as expected - validate navigation block
#- Three sections
#- Icons of each sections are correct
#- External links marked with ext icon
# Links in navigation block lead to proper pages


# LOGGED IN
# HEADER
# Validate header: logo, systemsDropdown, account dropdown
# On Systems page - number of systems is shown
# Number of systems is updated correctly

# DROPDOWN
User has no systems connected to cloud
  ${random email}=   Register and activate account with random email    firstname    lastname    ${base password}
  Append To List    ${HEADER TMP USERS}    ${random email}
  Go To    ${ENV}
  Log In    ${random email}    ${base password}
  Wait until element is visible    ${HEADER MAIN BUTTON TEXT}
  Validate Header Button Text    0

  # Systems grid is not displayed
  Click Button    ${SYSTEMS DROPDOWN}
  Wait until element is visible    ${DROPDOWN NAVIGATION GRID}

  # System's section is not displayed
  Wait until elements are not visible
  ...    ${DROPDOWN SYSTEMS GRID}
  ...    ${DROPDOWN NAVIGATION GRID}//span[text()="${SPACE}${VIEW}${SPACE}"]
  ...    ${DROPDOWN NAVIGATION GRID}//span[contains(text(), "${SETTINGS TEXT}")]
  ...    ${DROPDOWN NAVIGATION GRID}//span[contains(text(), "${INFORMATION TEXT}")]

User has one system connected to cloud
    ${random email}=   Register and activate account with random email    firstname    lastname    ${base password}
    Append To List    ${HEADER TMP USERS}    ${random email}
    ${server}=   Setup Docker Server
    Create system and attach to cloud    https://${QA BURBANK IP}    ${server}[port]    ${server}[name]    ${random email}
    Log In    ${random email}    ${base password}

    Log    Verify on system's page
    Wait until element is visible    ${SYSTEM NAME HEADING}    timeout=60
    Validate Header Button Text    ${server}[name]    systems=False

    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Validate System's Tile    ${server}[name]

    Log    Clicking on the main button closes the menu
    Click Button    ${SYSTEMS DROPDOWN}
    Wait until elements are not visible    ${DROPDOWN SYSTEMS GRID}   ${DROPDOWN NAVIGATION GRID}

User has multiple systems connected to cloud
    [Tags]    deb
    ${random email}=   Register and activate account with random email    Main    Owner    ${base password}
    Append To List    ${HEADER TMP USERS}    ${random email}
    ${offline systems}=   Create List
    FOR    ${i}    IN RANGE    1    17
        ${server}=   Setup Docker Server
        ${id}=   Create system and attach to cloud    https://${QA BURBANK IP}    ${server}[port]    ${server}[name]    ${random email}
        Set To Dictionary    ${server}    id=${id}
        Append To List    ${offline systems}    ${server}
        Delete Docker Server    ${server}[name]
    END
    Log In    ${random email}    ${base password}
    Wait until location is    ${ENV}/systems
    Validate Header Button Text    16

    Click Button    ${SYSTEMS DROPDOWN}
    FOR    ${sys}    IN    @{offline systems}
        Validate System Info    ${sys}[name]    Main Owner
    END
    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN NAVIGATION GRID}

    # Header is updated correctly whan a new system is added
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}
    Reload Page
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Slow    Validate Header Button Text    17    timeout=1

    # Menu is updated correctly whan a new system is added
    Click Button    ${SYSTEMS DROPDOWN}
    Validate System Info    ${AUTO TESTS}    ${TEST FIRST NAME} ${TEST LAST NAME}
    Verify extra systems number is correct    2
    Click Button    ${SYSTEMS DROPDOWN}

    FOR    ${sys}    IN     @{offline systems}
        Disconnect    ${ENV}    ${random email}    ${base password}    ${sys}[id]
    END
    Reload Page
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Slow    Validate Header Button Text    ${AUTO TESTS}    False    timeout=1

    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Validate System's Tile    ${AUTO TESTS}
    Click Button    ${SYSTEMS DROPDOWN}

    Disconnect From Account   ${ENV}    ${random email}    ${base password}    ${AUTO TESTS SYSTEM ID}
    Reload Page
    Wait until element is visible    ${SYSTEMS DROPDOWN}
    Slow    Validate Header Button Text    0    timeout=1
    Click Button    ${SYSTEMS DROPDOWN}

# Dropdown content is as expected
#- Three sections
#- Icons of each sections are correct
#- External links marked with ext icon

# Links in systems block lead to proper pages
# Links in navigation block lead to proper pages
