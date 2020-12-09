*** Variables ***
@{HEADER TMP USERS}
${sys id}    ${AUTO TESTS SYSTEM ID}

# Variables for checking system count in drop menu
@{WIDTHS}    ${320}    ${480}    ${640}    ${800}
@{COLUMNS SHOWN}    ${1}    ${2}    ${3}    ${4}
@{MAX SYSTEMS SHOWN}    ${5}    ${8}    ${12}    ${16}

# Variables for checking correct items hidden on resize
@{ANONYMOUS COMMON}    ${ACCOUNT DROPDOWN}
@{ANONYMOUS LARGE}     ${SMALL ACCOUNT DROPDOWN}    ${SMALL LOGIN BUTTON}    ${SMALL CREATE ACCOUNT BUTTON}    ${HEADER TAB DROPDOWN}
@{ANONYMOUS MEDIUM}    ${LARGE ACCOUNT DROPDOWN}    ${LARGE LOGIN BUTTON}    ${LARGE CREATE ACCOUNT BUTTON}    ${HEADER TAB BUTTONS}
@{ANONYMOUS SMALL}     ${LOGO ICON}
@{ANONYMOUS TINY}      ${LOGO ICON}    ${HEADER TAB DROPDOWN}    ${HEADER TAB BUTTONS}
@{HIDE ANONYMOUS}      ${ANONYMOUS LARGE}    ${ANONYMOUS MEDIUM}    ${ANONYMOUS SMALL}    ${ANONYMOUS TINY}

@{LOGGED IN COMMON}
...    ${SMALL LOGIN BUTTON}
...    ${SMALL CREATE ACCOUNT BUTTON}
...    ${LARGE LOGIN BUTTON}
...    ${LARGE CREATE ACCOUNT BUTTON}
...    ${LARGE LOGIN BUTTON}
...    ${LANGUAGE DROPDOWN}

@{LOGGED IN LARGE}     ${SMALL ACCOUNT DROPDOWN}
@{LOGGED IN MEDIUM}    ${LARGE ACCOUNT DROPDOWN}
@{LOGGED IN SMALL}     ${LARGE ACCOUNT DROPDOWN}
@{LOGGED IN TINY}      ${LARGE ACCOUNT DROPDOWN}    ${HEADER TAB DROPDOWN}    ${HEADER TAB BUTTONS}
@{HIDE LOGGED IN}      ${LOGGED IN LARGE}    ${LOGGED IN MEDIUM}    ${LOGGED IN SMALL}    ${LOGGED IN TINY}

@{BREAKPOINTS}    ${1920}    ${992}    ${768}    ${300}

${VIEW PAGE}    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view

# Main button
#${HEADER MAIN BUTTON}          //button[@id="systemsDropdown"]
${HEADER MAIN BUTTON TEXT}     ${SYSTEMS DROPDOWN}/span

# Dropdown menu
${SYSTEMS DROPDOWN MENU}       //nx-drop-menu/div[@aria-labelledby="systemsDropdown"]
${DROPDOWN SYSTEMS GRID}       ${SYSTEMS DROPDOWN MENU}//ul/li[contains(@class, "systems-grid")]
${DROPDOWN SYSTEMS TILE}       ${DROPDOWN SYSTEMS GRID}/nx-system-tile
${DROPDOWN NAVIGATION GRID}    ${SYSTEMS DROPDOWN MENU}//ul/li[contains(@class, "navigation-grid")]
${DROPDOWN NAVIGATION TILE}    ${DROPDOWN NAVIGATION GRID}/nx-navigation-tile
${NAVIGATION LINK}             ${DROPDOWN NAVIGATION TILE}//li[contains(@class, "nav-link")]
#${NAVIGATION ITEM}             ${DROPDOWN NAVIGATION TILE}/li
${EXTRA SYSTEM TILE}           ${DROPDOWN SYSTEMS GRID}/nx-additional-systems-tile/div
#${NAVIGATION ACTIVE ITEM}      ${DROPDOWN NAVIGATION TILE}//

# System menu items
&{view item}    title=${VIEW}    url=${ENV}/systems/${sys id}/view
&{settings}    title=${SETTINGS TEXT}    url=${ENV}/systems/${sys id}
&{information}    title=${INFORMATION TEXT}    url=${ENV}/systems/${sys id}/health
@{system pages}    ${view item}   ${settings}    ${information}

# For developers menu items
&{platform overview}    title=${PLATFORM OVERVIEW TEXT}    url=${ENV}/docs/developers
&{knowledgebase}    title=${KNOWLEDGEBASE TEXT}    url=${ENV}/docs/developers/knowledgebase
@{for developers int pages}    ${platform overview}   ${knowledgebase}

# Services menu items
&{downloads}    title=${DOWNLOADS TEXT}    url=${ENV}/download
&{ipvd}    title=${IPVD TITLE TEXT}    url=${ENV}/ipvd
&{health viewer}    title=${HEALTH VIEWER TEXT}    url=${ENV}/health-report/viewer
@{services pages}    ${downloads}    ${ipvd}    ${health viewer}

