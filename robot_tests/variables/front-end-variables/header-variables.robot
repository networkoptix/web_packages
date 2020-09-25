*** Variables ***
# Variables for checking system count in drop menu
@{WIDTHS}               ${320}                                         ${480}                            ${640}                            ${800}
@{COLUMNS SHOWN}        ${1}                                           ${2}                              ${3}                              ${4}
@{MAX SYSTEMS SHOWN}    ${5}                                           ${8}                              ${12}                             ${16}

# Variables for checking correct items hidden on resize
@{ANONYMOUS COMMON}     ${ACCOUNT DROPDOWN}
@{ANONYMOUS LARGE}      ${SMALL ACCOUNT DROPDOWN}                      ${SMALL LOGIN BUTTON}             ${SMALL CREATE ACCOUNT BUTTON}    ${HEADER TAB DROPDOWN}
@{ANONYMOUS MEDIUM}     ${LARGE ACCOUNT DROPDOWN}                      ${LARGE LOGIN BUTTON}             ${LARGE CREATE ACCOUNT BUTTON}    ${HEADER TAB BUTTONS}
@{ANONYMOUS SMALL}      ${LOGO ICON}
@{ANONYMOUS TINY}       ${LOGO ICON}                                   ${HEADER TAB DROPDOWN}            ${HEADER TAB BUTTONS}
@{HIDE ANONYMOUS}       ${ANONYMOUS LARGE}                             ${ANONYMOUS MEDIUM}               ${ANONYMOUS SMALL}                ${ANONYMOUS TINY}

@{LOGGED IN COMMON}     ${SMALL LOGIN BUTTON}                          ${SMALL CREATE ACCOUNT BUTTON}    ${LARGE LOGIN BUTTON}             ${LARGE CREATE ACCOUNT BUTTON}    ${LARGE LOGIN BUTTON}    ${LANGUAGE DROPDOWN}
@{LOGGED IN LARGE}      ${SMALL ACCOUNT DROPDOWN}
@{LOGGED IN MEDIUM}     ${LARGE ACCOUNT DROPDOWN}
@{LOGGED IN SMALL}      ${LARGE ACCOUNT DROPDOWN}
@{LOGGED IN TINY}       ${LARGE ACCOUNT DROPDOWN}                      ${HEADER TAB DROPDOWN}            ${HEADER TAB BUTTONS}
@{HIDE LOGGED IN}       ${LOGGED IN LARGE}                             ${LOGGED IN MEDIUM}               ${LOGGED IN SMALL}                ${LOGGED IN TINY}

@{BREAKPOINTS}          ${1920}                                        ${992}                            ${768}                            ${300}

${VIEW PAGE}            ${url}/systems/${AUTO TESTS SYSTEM ID}/view
