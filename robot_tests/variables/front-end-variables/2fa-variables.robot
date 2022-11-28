*** Variables ***

${email}                                    ${EMAIL OWNER}
${password}                                 ${BASE PASSWORD}
${url}                                      ${ENV}

#2fa web elements
${2FA SWITCH}                               //nx-account-security-component//nx-switch//input[@id="2fa-active-status-switch"]//..
${2FA SWITCH ENABLED}                       //nx-account-security-component//input[(@id="2fa-active-status-switch") and (@class="selected")]//..
${2FA SWITCH DISABLED}                      //nx-account-security-component//input[(@id="2fa-active-status-switch") and (@class="")]//..
${2FA ENABLE BUTTON}                        //button[contains(text(), "${ENABLE 2FA TEXT}")]
${2FA DISABLE BUTTON}                       //button[contains(text(), "${DISABLE 2FA TEXT}")]
${2FA DISABLED BADGE}                       //a[@id="tag-tag" and contains(text(), "${DISABLED TEXT}")]
${2FA ENABLED BADGE}                        //a[@id="tag-tag" and contains(text(), "${ENABLED TEXT}")]
${2FA PASSWORD MODAL FIELD}                 //nx-two-fa-modal-content//input[@id="login_password"]
${2FA PASSWORD MODAL NEXT BTN}              //nx-two-fa-modal-content//svg-icon[contains(@data-src,"/images/icons/standard/arrow_right.svg")]
${2FA QA CODE BTN}                          //nx-two-fa-modal-content//button[@id="qrMode"]
${2FA KEY MODAL NEXT BTN}                   //nx-two-fa-modal-content//button[@id="nextWizardCode"]
${2FA KEY}                                  //nx-two-fa-modal-content//nx-info-block//div[@class="block-section-values"]//p[contains(@title,"Key")]
${2FA TOTP FIELD}                           //nx-two-fa-modal-content//input[@id="tfaCodeInput"]
${2FA VERIFY BTN}                           //nx-two-fa-modal-content//button[text()="${2FA VERIFY BTN TEXT}"]
${2FA COPY ALL BTN}                         //nx-two-fa-modal-content//span[text()="${2FA COPY ALL BTN TEXT}"]
${2FA OK BTN}                               //nx-two-fa-modal-content//button[@id="wizardDone"]
${2FA BACKUP CODE ERROR}                    //nx-authorize-backup-code-component//p
${2FA AUTH CODE FIELD}                      //nx-authorize-component//nx-authorize-auth-code-component//input[@id="authCode"]
${2FA AUTH CODE LOG IN BTN}                 //nx-authorize-component//nx-process-button//button[@type="submit"]
${2FA BACKUP CODE BTN}                      //nx-authorize-auth-code-component//span[text()="${2FA BACKUP CODE BTN TEXT}"]
${2FA BACKUP CODE FIELD}                    //nx-authorize-backup-code-component//input[@id="backupCode"]
${2FA BACKUP CODE LOG IN BTN}               //nx-authorize-backup-code-component//nx-process-button//button[@type="submit"]
${2FA CLOUD ILLUSTRATION}                   //nx-authorize-component//nx-authorize-auth-code-component//svg-icon[contains(@data-src,"/images/placeholders/section/cloud_header.svg")]
${2FA LOG IN CLOUD}                         //nx-authorize-component//nx-authorize-auth-code-component//h3[contains(text(),"${2FA LOG IN CLOUD TEXT}")]
${2FA CODE INSTRUCTIONS}                    //nx-authorize-component//nx-authorize-auth-code-component//p[text()="${2FA CODE INSTRUCTIONS TEXT}"]
${2FA BACK BTN}                             //nx-authorize-component//nx-authorize-auth-code-component//span[text()="${BACK TEXT}"]
${2FA LOG IN BTN}                           //nx-authorize-auth-code-component//nx-process-button//button[text()="${LOG IN BUTTON TEXT}"]
${2FA BK CLOUD ILLUSTRATION}                //nx-authorize-component//nx-authorize-backup-code-component//svg-icon[contains(@data-src,"/images/placeholders/section/cloud_header.svg")]
${2FA BK LOG IN CLOUD}                      //nx-authorize-component//nx-authorize-backup-code-component//h3[text()="${2FA LOG IN CLOUD TEXT}"]
${2FA BK CODE FIELD}                        //nx-authorize-component//nx-authorize-backup-code-component//input[@id="backupCode"]
${2FA BK CODE HELP}                         //nx-authorize-component//nx-authorize-backup-code-component//span[text()="${2FA BACKUP CODE HELP TEXT}"]
${2FA BK CODE CONTACT}                      //nx-authorize-component//nx-authorize-backup-code-component//a[text()="${2FA BACKUP CODE CONTACT SUPPORT TEXT}"]
${2FA BK BACK BTN}                          //nx-authorize-component//nx-authorize-backup-code-component//span[text()="${BACK TEXT}"]
${2FA AUTH CODE BTN}                        //nx-authorize-backup-code-component//span[text()="${2FA AUTH CODE BTN TEXT}"]
${2FA BK LOG IN BTN}                        //nx-authorize-backup-code-component//nx-process-button//button[text()="${LOG IN BUTTON TEXT}"]
${2FA VERIFICATION CHECKBOX}                //nx-account-security-component//nx-section//nx-checkbox//input[@id="skip-tfauth"]/..
${2FA VERIFICATION CHECKBOX ID}             //nx-account-security-component//nx-section//nx-checkbox//input[@id="skip-tfauth"]
${2FA ERROR LOGIN CODE}                     //nx-authorize-component//nx-authorize-auth-code-component//p[contains(text(),"${2FA INVALID CODE TEXT}")]
${2FA DISABLE MODAL HEADER}                 //nx-two-fa-modal-content//h1[contains(text(),"${2FA DISABLE MODAL HEADER TEXT}")]
${2FA DISABLE MODAL DESCRIPTION}            //nx-two-fa-modal-content//form//label[text()="${2FA DISABLE MODAL DESCRIPTION TEXT}"]
${2FA DISABLE MODAL BTN}                    //nx-two-fa-modal-content//button[@id="disableFinish" or @type="submit"]
${2FA DISABLE MODAL RED COLOR}              rgba(194, 38, 38, 1)
${2FA DISABLE MODAL CANCEL BTN}             //nx-two-fa-modal-content//button[(@type="reset") or contains(text(),"${CANCEL BUTTON TEXT}")]
${2FA SECURITY PAGE SAVE BTN}               //nx-account-security-component//nx-apply//button[@type="submit"]
${2FA SECURITY PAGE CANCEL BTN}             //nx-account-security-component//nx-apply//button[@type="reset"]
${2FA SETTINGS MODAL HEADER}                //nx-two-fa-modal-content//h1[contains(text(),"${2FA SETTINGS MODAL HEADER TEXT}")]
${2FA SETTINGS MODAL DESCRIPTION UNCHECK}   //nx-two-fa-modal-content//p[text()="${2FA SETTINGS MODAL DESCRIPTION TEXT2}"]
${2FA SETTINGS MODAL DESCRIPTION CHECK}     //nx-two-fa-modal-content//p[text()="${2FA SETTINGS MODAL DESCRIPTION TEXT1}"]
${2FA SETTINGS MODAL ON INSTRUCTIONS}       //nx-two-fa-modal-content//label[text()="${2FA SETTINGS MODAL INST ON TEXT}"]
${2FA SETTINGS MODAL OFF INSTRUCTIONS}      //nx-two-fa-modal-content//label[text()="${2FA SETTINGS MODAL INST OFF TEXT}"]
${2FA SETTINGS MODAL APPLY BTN}             //nx-two-fa-modal-content//nx-process-button//child::div
${2FA SETTINGS MODAL CANCEL BTN}            //nx-two-fa-modal-content//button[(@type="reset") or contains(text(),"${CANCEL BUTTON TEXT}")]