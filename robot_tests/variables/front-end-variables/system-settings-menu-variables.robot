*** Variables ***
${email}                              ${EMAIL OWNER}
${password}                           ${BASE PASSWORD}
@{cloud auth}                         ${EMAIL OWNER}    ${BASE PASSWORD}
${url}                                ${ENV}
${impossible search}                  velociraptor
${nothing found}                      Nothing found
${simple criteria}                    s
${and criteria}                       s a
${or criteria}                        s|a

#Systems - left menu
${LEFT MENU}                          //nx-menu
${LEFT MENU BUTTONS}                  ${LEFT MENU}//div[contains(@class, 'nx-menu-section')]//nx-menu-button
${LEFT MENU OVERLAY}                  ${LEFT MENU}/div[contains(@class,'nx-menu')]/div[contains(@class,'nx-menu-overlay')]
${LEFT MENU NO RESULT}                ${LEFT MENU}/div[contains(@class,'nx-menu')]/div[contains(@class,'nx-menu-placeholder')]
${LEFT MENU SEARCH INPUT}             ${LEFT MENU}/nx-search//input
${LEFT MENU SEARCH CLEAR}             ${LEFT MENU}/nx-search//button[contains(@class,'search-clear')]
${LEFT MENU MATCHES CONTENT}          ${LEFT MENU}//div[contains(@class, 'nx-menu-section')]//div[contains(@class, 'level-3-items')]//div[contains(@class, 'menu-level-3-content')]
${LEFT MENU SEARCH MATCHES}           ${LEFT MENU}//div[contains(@class, 'nx-menu-section')]//span[@class='highlighted']

${LEFT MENU LEVEL1 ADMIN}             ${LEFT MENU}//nx-level-1-item/a[@id='admin']
${LEFT MENU LEVEL1 ICON}              ${LEFT MENU LEVEL1 ADMIN}//svg-icon
${LEFT MENU LEVEL3 GENERAL}           ${LEFT MENU LEVEL1 ADMIN}/../..//nx-level-3-item/a[@id="general"]
${LEFT MENU LEVEL3 LIC}               //*[@id="licenses"]//span[contains(text(),"Licen")]
${LEFT MENU LEVEL3 STORAGE}           ${LEFT MENU LEVEL1 ADMIN}/../..//nx-level-3-item/a[@id="cloudStorage"]

${LEFT MENU LEVEL1 USERS}             ${LEFT MENU}//nx-level-1-item/a[@id='users']
${LEFT MENU LEVEL3 USER1}             ${LEFT MENU LEVEL1 USERS}/../..//div[1]/nx-level-3-item/a
${LEFT MENU LEVEL3 USER1 EXT}         ${LEFT MENU LEVEL3 USER1}//span[contains(@class, "menu-level-3-additional")]
${LEFT MENU LEVEL3 USER2}             ${LEFT MENU LEVEL1 USERS}/../..//div[2]/nx-level-3-item/a
${LEFT MENU LEVEL3 USER2 EXT}         ${LEFT MENU LEVEL3 USER2}//span[contains(@class, "menu-level-3-additional")]

${LEFT MENU LEVEL1 SERVERS}           ${LEFT MENU}//nx-level-1-item/a[@id='servers']
    