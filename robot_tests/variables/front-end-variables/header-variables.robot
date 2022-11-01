*** Variables ***
@{HEADER TMP USERS}

# Variables for checking system count in drop menu
@{WIDTHS}    ${320}    ${480}    ${640}    ${800}
@{COLUMNS SHOWN}    ${1}    ${2}    ${3}    ${4}
@{MAX SYSTEMS SHOWN}    ${5}    ${8}    ${12}    ${16}

# Variables for checking correct items hidden on resize
@{ANONYMOUS COMMON}    ${ACCOUNT DROPDOWN}
@{ANONYMOUS LARGE}     ${SMALL ACCOUNT DROPDOWN}    ${SMALL LOGIN BUTTON}    ${SMALL CREATE ACCOUNT BUTTON}    ${HEADER TAB DROPDOWN}
@{ANONYMOUS MEDIUM}    ${LARGE ACCOUNT DROPDOWN}    ${LARGE LOGIN BUTTON}    ${LARGE CREATE ACCOUNT BUTTON}    ${HEADER TAB BUTTONS}
@{ANONYMOUS SMALL}     ${LOGO ICON}
@{ANONYMOUS TINY}      ${LOGO ICON}    ${HEADER TAB BUTTONS}    #${HEADER TAB DROPDOWN}
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

# Header
${HEADER MAIN BUTTON TEXT}     ${SYSTEMS DROPDOWN}/span
${HEADER TAB LINK}             //header//nx-header-tabs/li/a
${HEADER ACTIVE TAB LINK}      //header//nx-header-tabs//li[contains(@class, 'active')]/a
${VIEW TAB}                    ${HEADER TAB LINK}\[contains(text(), "${VIEW}")]
${SETTINGS TAB}                ${HEADER TAB LINK}\[contains(text(), "${SETTINGS TEXT}")]
${INFORMATION TAB}             ${HEADER TAB LINK}\[contains(text(), "${INFORMATION TEXT}")]

# Dropdown menu
${SYSTEMS DROPDOWN MENU}       //nx-drop-menu/div[@aria-labelledby="systemsDropdown"]
${DROPDOWN SYSTEMS GRID}       ${SYSTEMS DROPDOWN MENU}//ul/li[contains(@class, "systems-grid")]
${DROPDOWN SYSTEMS TILE}       ${DROPDOWN SYSTEMS GRID}/nx-system-tile
${DROPDOWN NAVIGATION GRID}    ${SYSTEMS DROPDOWN MENU}//ul/li[contains(@class, "navigation-grid")]
${DROPDOWN NAVIGATION TILE}    ${DROPDOWN NAVIGATION GRID}/nx-navigation-tile
${NAVIGATION LINK}             ${DROPDOWN NAVIGATION TILE}//li[contains(@class, "nav-link")]
${EXTRA SYSTEM TILE}           ${DROPDOWN SYSTEMS GRID}/nx-additional-systems-tile/div

# For developers menu items
&{platform overview}    title=${PLATFORM OVERVIEW TEXT}    url=${ENV}/docs/developers
&{knowledgebase}    title=${KNOWLEDGEBASE TEXT}    url=${ENV}/docs/developers/knowledgebase
@{for developers int pages}    ${platform overview}   ${knowledgebase}
${FOR DEVELOPERS LINK}    ${DROPDOWN NAVIGATION TILE}//div[@class="section-title"]/h5[contains(text(), "${FOR DEVELOPERS TEXT}")]

# Services menu items
&{downloads}    title=${DOWNLOADS TEXT}    url=${ENV}/download
&{ipvd}    title=${IPVD TITLE TEXT}    url=${ENV}/ipvd
&{health viewer}    title=${HEALTH VIEWER TEXT}    url=${ENV}/health-report/viewer
&{integrations}     title=${INTEGRATIONS TITLE TEXT}    url=${ENV}/integrations
@{services pages}    ${downloads}    ${ipvd}    ${health viewer}    ${integrations}

# External links
${EXTERNAL LINKS TITLE}    ${DROPDOWN NAVIGATION TILE}//div[@class="section-title"]/h5[contains(text(), "${EXTERNAL LINKS TEXT}")]
${EXTERNAL LINK}    ${EXTERNAL LINKS TITLE}/../following-sibling::ul//a

&{FOR DEVS EXTERNAL LINKS}
   ...   ${DEVELOPER TOOLS TEXT}=https://support.networkoptix.com/hc/en-us/sections/360007229354-Developer-Tools
   ...   ${API DOCUMENTATION TEXT}=https://support.networkoptix.com/hc/en-us/articles/219573367-Nx-Server-HTTP-REST-API
   ...   ${DEVELOPER SUPPORT TEXT}=https://support.networkoptix.com/hc/en-us/community/topics/115000552988-Developer-Forum

&{EXTERNAL LINKS}
   ...   ${HARDWARE CALCULATOR}=http://networkoptix.com/calculator/
   ...   ${SUPPORT}=${SUPPORT URL}/
   ...   ${PRIVACY POLICY}=${PRIVACY POLICY URL FULL}
