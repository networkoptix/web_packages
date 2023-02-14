*** Variables ***
${password}                           ${BASE PASSWORD}
${url}                                ${ENV}
${CZECH ALERT}                        Váš účet byl úspěšně uložen

#account web elements
#${ACCOUNT DROPDOWN}                   //div[@data-testid="accountSettingsDropdown"]/preceding-sibling::button
#${ACCOUNT SETTINGS BUTTON}            //div[@data-testid="accountSettingsDropdown"]//a[@href = '/account/']
#${LOG IN CLOSE BUTTON}                //button[@data-dismiss='modal']
#${ACCOUNT SETTINGS BUTTON SYSTEM}     //button[@data-testid="accountSettingsButton"]
#${ACCOUNT EMAIL}                      //nx-account//a[@id='settings']//span[contains(text(), "noptixautoqa+")]
#${ACCOUNT FIRST NAME}                 //input[@data-testid='firstName']

${ACCOUNT DROPDOWN}                   //header//div[@data-testid="accountSettingsDropdown"]/preceding-sibling::button
${ACCOUNT SETTINGS BUTTON}            //header//li//a[@href = '/account']
${LOG IN CLOSE BUTTON}                //button[@data-dismiss='modal']
${ACCOUNT SETTINGS BUTTON SYSTEM}     //button[@id="accountSettingsButton"]
${ACCOUNT EMAIL}                      //a[@id='settings']
${ACCOUNT FIRST NAME}                 //form[@name='accountForm']//input[@id='firstName']
${ACCOUNT LAST NAME}                  //form[@name='accountForm']//input[@id='lastName']
${ACCOUNT LANGUAGE DROPDOWN}          //nx-language-select//button[@id='dropdownMenuButton']
${ACCOUNT SAVE}                       //nx-process-button[@data-testid="saveSettingsBtn"]//button
${ACCOUNT CANCEL}                     //nx-cancel-button[@data-testid="cancelSettingsBtn"]//button
${TEST FIRST NAME}                    mark
${TEST LAST NAME}                     hamill
${DELETE ACCOUNT BUTTON}              //nx-account-settings-component//nx-block//button[@id="accountSettingsDeleteButton"]
${DELETE ACCOUNT DISABLED BUTTON}     //nx-account-settings-component//nx-block//button[@disabled and contains(text(), "${DELETE ACCOUNT TEXT}")]
${CAN NOT DELETE ACCOUNT TOOLTIP}     //nx-tooltip-component/div[contains(@class,"tooltip-body")]
${DELTE ACCOUNT DIALOG}               //nx-modal-delete-cloud-user-content
${DELETE ACCOUNT MODAL BUTTON}        ${DELTE ACCOUNT DIALOG}//nx-process-button//button[contains(text(),"${DELETE BUTTON TEXT}")]
${DELETE ACCOUNT CANCEL BUTTON}       ${DELTE ACCOUNT DIALOG}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${DELETE ACCOUNT CLOSE BUTTON}        ${DELTE ACCOUNT DIALOG}//button[contains(@class,"close")]
${DELETE ACCOUNT HEADER}              ${DELTE ACCOUNT DIALOG}//h1[contains(text(),"${DELETE ACCOUNT HEADER TEXT}")]
${DELETE ACCOUNT INFO}                ${DELTE ACCOUNT DIALOG}//span[contains(text(),"${DELETE ACCOUNT INFO TEXT}")]
${DELETE ACCOUNT PASSWORD INPUT}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]
${DELETE ACCOUNT PASSWORD LABEL}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]/preceding-sibling::label[@for="password" and contains(text(),"${DELETE ACCOUNT PASSWORD LABEL TEXT}")]
${DELETE ACCOUNT PASSWORD ERROR}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]/following-sibling::label[@for="password"]

${APPLY CHANGES BUTTON}               ${MODAL APPLY DIALOG}//button[contains(text(), '${APPLY CHANGES BUTTON TEXT}')]
${DISCARD CHANGES BUTTON}             ${MODAL APPLY DIALOG}//button[contains(text(), '${DISCARD CHANGES BUTTON TEXT}')]
${CANCEL CHANGES BUTTON}              ${MODAL APPLY DIALOG}//button[contains(text(), '${CANCEL BUTTON TEXT}')]
${APPLY CHANGES QUESTION}             //h1[contains(text(), '${APPLY CHANGES QUESTION TEXT}')]
${NO UNSAVED CHANGES}                 //nx-apply//div[contains(text(), '${NO UNSAVED CHANGES TEXT}')]
${APPLY CHANGES CLOSE BUTTON}         ${MODAL APPLY DIALOG}//button[@class="close"]