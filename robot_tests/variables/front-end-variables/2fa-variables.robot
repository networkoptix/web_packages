*** Variables ***

#2fa
${2FA SWITCH}                     //nx-account-security-component//nx-switch//input[@id="2fa-active-status-switch"]//..
${2FA SWITCH ENABLED}             //nx-account-security-component//input[(@id="2fa-active-status-switch") and (@class="selected")]//..
${2FA SWITCH DISABLED}            //nx-account-security-component//input[(@id="2fa-active-status-switch") and (@class="")]//..
${2FA PASSWORD MODAL FIELD}       //two-fa-modal-content//input[@id="login_password"]
${2FA PASSWORD MODAL NEXT BTN}    //two-fa-modal-content//button[@id="nextWizardQR"]
${2FA QA CODE BTN}                //two-fa-modal-content//button[@id="qrMode"]
${2FA KEY MODAL NEXT BTN}         //two-fa-modal-content//button[@id="nextWizardCode"]
${2FA KEY}                        //two-fa-modal-content//nx-info-block//div[@class="block-section-values"]//p[contains(@title,"Key")]
${2FA TOTP FIELD}                 //two-fa-modal-content//input[@id="tfaCodeInput"]
${2FA VERIFY BTN}                 //two-fa-modal-content//button[@id="nextWizardFinish"]
${2FA COPY ALL BTN}               //two-fa-modal-content//span[text()="Copy all"]
${2FA OK BTN}                     //two-fa-modal-content//button[@id="wizardDone"]
${2FA DISABLE}                    //ngb-modal-window//two-fa-modal-content//button[@id="disableFinish"]
${2FA BACKUP CODE ERROR}          //nx-authorize-backup-code-component//p
${2FA AUTH CODE FIELD}            //nx-authorize-component//nx-authorize-auth-code-component//input[@id="authCode"]
${2FA AUTH CODE LOG IN BTN}       //nx-authorize-component//nx-process-button//button[@type="submit"]
${2FA BACKUP CODE BTN}            //nx-authorize-auth-code-component//span[text()="${2FA BACKUP CODE BTN TEXT}"]
${2FA BACKUP CODE FIELD}          //nx-authorize-backup-code-component//input[@id="backupCode"]
${2FA BACKUP CODE LOG IN BTN}     //nx-authorize-backup-code-component//nx-process-button//button[@type="submit"]