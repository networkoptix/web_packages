*** Settings ***
Variables    getvars.py
Resource     variables/front-end-variables.robot
Resource     variables/cms-variables.robot
Resource     variables/cloud-merge-variables.robot

*** Variables ***
${ALERT}                              //div[contains(@class,'toast')]//span[contains(@class,'toast-content')]
${ALERT CLOSE}                        //div[contains(@class,'toast')]/button[contains(@class,'close') and @data-dismiss='alert']

${BROWSER}                            Chrome

${LANGUAGE DROPDOWN}                  //header//nx-header-language-select//button[@id='dropdownMenuButton']
${LANGUAGE TO SELECT}                 //header//nx-header-language-select//span[@lang='${LANGUAGE}']/..
${DOWNLOAD LINK}                      //footer//a[@href="/download" and @class="ng-star-inserted"]

@{USER TYPE LIST}    ${OWNER TEXT}    ${ADMIN TEXT}    ${ADV VIEWER TEXT}    ${VIEWER TEXT}    ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}    Client Custom

${BACKDROP}                           //ngb-modal-backdrop
${MODAL DIALOG}                       //nx-modal-generic-content

${COMBO TEXT}                         Кенг☿☂⊗⅓您都可以`~!@#$%계정이 이
${CYRILLIC TEXT}                      Кенгшщзх
${SMILEY TEXT}                        ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★
${GLYPH TEXT}                         您都可以享受源源不あなたのアカウント
${SYMBOL TEXT}                        `~!@#$%^&*()_:";'{}[]+<>?,./\
${TM TEXT}                            qweasdzxc123®™
${KOREAN TEXT}                        계정이 이미 활성

#Apply changes dialog
${APPLY CHANGES X BUTTON}             //ngb-modal-window//button[@class="close"]
${APPLY CHANGES APPLY BUTTON}         //ngb-modal-window//button[@type="submit"]
${APPLY CHANGES DISCARD BUTTON}       //ngb-modal-window//button[contains(text(),"")]
${APPLY CHANGES CANCEL BUTTON}        //ngb-modal-window//

#Log In Elements
${LOG IN MODAL}                       //nx-authorize-component/div[@class="authorize-main main-w"]
${LOG IN NEXT BUTTON}                 //nx-authorize-component//button[@type="submit"]
${EMAIL INPUT}                        //nx-authorize-component//input[@id='authorizeEmail']
${PASSWORD INPUT}                     //nx-authorize-component//input[@id='authorizePassword' and @name="password" and @type="password"]
${LOG IN BUTTON}                      //nx-authorize-component//button[@type="submit"]
${LOG IN CREATE ACCOUNT BUTTON}       //nx-authorize-component//footer//button[@type="button"]//span[text()="${CREATE ACCOUNT BUTTON TEXT}"]
${LOG IN BTN REGISTER ACCOUNT PAGE}   //nx-authorize-activate-account-component//footer//span[contains(text(), '${LOG IN BUTTON TEXT}')]
${LOG IN BTN CREATE ACCOUNT PAGE}     //nx-authorize-create-account-component//footer//span[contains(text(), '${LOG IN BUTTON TEXT}')]
${LOG IN BTN ACTIVATE ACCOUNT PAGE}   //nx-authorize-activate-account-component//footer//button[contains(text(), '${LOG IN BUTTON TEXT}')]
${LOG IN BTN RESET PASSWORD PAGE}     //nx-authorize-reset-request-component//footer//button[contains(text(), '${LOG IN BUTTON TEXT}')]
${LOG IN BTN SET NEW PASSWORD PAGE}   //nx-authorize-reset-password-component//footer//nx-process-button//button[contains(text(), '${LOG IN BUTTON TEXT}')]

${REMEMBER ME CHECKBOX VISIBLE}       //form[@name='loginForm']//input[@id='remember']/following-sibling::span[@class="checkmark"]/..
${REMEMBER ME CHECKBOX REAL}          //form[@name='loginForm']//input[@id='remember']

${FORGOT PASSWORD}                    //nx-authorize-component//button/span[text()='${FORGOT PASSWORD TEXT}']/..

${ACCOUNT NOT FOUND}                  //nx-authorize-component//div[contains(text(),'${ACCOUNT NOT FOUND TEXT}')]
${ACCOUNT DOES NOT EXIST}             //nx-authorize-component//p[contains(text(),'${ACCOUNT DOES NOT EXIST TEXT}')]
${YOU CAN CREATE AN ACCOUNT}          //nx-authorize-component//p[contains(text(),'${YOU CAN CREATE ACCOUNT TEXT}')]
${RESEND ACTIVATION EMAIL LINK}       //nx-authorize-component//a[text()='${RESEND ACTIVATION LINK BUTTON TEXT}']
${WRONG PASSWORD MESSAGE}             //nx-authorize-component//p[text()="${WRONG PASSWORD}"]
${ACCOUNT NOT FOUND MESSAGE}          //nx-authorize-component//p[text()="${ACCOUNT DOES NOT EXIST TEXT}"]
${TOO MANY ATTEMPTS MESSAGE}          //nx-authorize-component//p[text()="${TOO MANY ATTEMPTS TEXT}"]
${RESET PASSWORD INPUT}               //nx-authorize-reset-password-component//form//input[@id="resetPassword"]
${RESET PASSWORD NEXT BUTTON}         //nx-authorize-reset-password-component//footer//nx-process-button//button[@type="submit"]
${RESET PASSWORD SUCCESS MESSAGE}     //nx-authorize-reset-password-component//form//h3[(text()= '${RESET SUCCESS MESSAGE TEXT}')]

${LOG IN NAV BAR}                     //header//nx-new-header//a[contains(text(),'${LOG IN BUTTON TEXT}')]

#Header
${HEADER ICON LINK}                   //nx-header/header//div[@class='app-header-left']//a[contains(@class, 'navbar-brand')]
${LOGO ICON}                          ${HEADER ICON LINK}/img
${LOGO ICON SOURCE}                   ${ENV}/static/images/logo.png
${LARGE ACCOUNT DROPDOWN}             //header//nx-account-settings-select//a[contains(@class,"user-section")]
${SMALL ACCOUNT DROPDOWN}             //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown" and contains(@class,'small-icon-overrides')]
${LARGE CREATE ACCOUNT BUTTON}        //header//a[@href='/register' and not(contains(@class, 'small-button'))]
${SMALL CREATE ACCOUNT BUTTON}        //header//a[@href='/register' and contains(@class, 'small-button')]
${LARGE LOGIN BUTTON}                 //nx-header/header//a[contains(@class, 'login-button')]
${SMALL LOGIN BUTTON}                 //nx-header/header//ul[contains(@class, 'navbar-right')]//span[contains(@class, 'glyphicon-login')]
${HEADER LANGUAGE DROPDOWN}           //header//nx-header-language-select

${SYSTEM NAME HEADING}                //nx-system-admin-component//div[contains(@class,'header-title')]/h2[@id='editable-title']
#${HEADER TAB WRAPPER}                 //nx-header/header//div[contains(@class, 'tab-wrapper')]
${HEADER TAB BUTTONS}                 //nx-header/header/nx-header-tabs
${HEADER TAB DROPDOWN}                //nx-header/header/nx-nav-dropdown
${HEADER ACTIVE TAB}                  //nx-header/header//li[contains(@class, 'tab-link active')]/a
${SYSTEMS DROPDOWN}                   //nx-header//button[@id='systemsDropdown']
${SYSTEMS GRID}                       //nx-drop-menu//li[contains(@class, 'systems-grid')]
${SYSTEMS GRID TILES}                 ${SYSTEMS GRID}//nx-system-tile


${LOG OUT BUTTON}                     //header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),"${LOG OUT BUTTON TEXT}")]/..
${WELCOME CAPTION}                    //h1[@class='welcome-caption']/span
${CHANGE PASSWORD BUTTON DROPDOWN}    //header//li//a[@href = '/account/password']
${SECURITY DROPDOWN}                  //header//li//a[@href = "/account/security"]
${RELEASE HISTORY BUTTON}             //a[@href="/downloads/history" and contains(text(),"${RELEASE HISTORY BUTTON TEXT}")]
${OPEN IN NX BUTTON}                  //nx-client-button//nx-process-button//button[contains(text(), "${OPEN IN NX WITNESS BUTTON TEXT}")]
${ALL SYSTEMS}                        //header//li[contains(@class, 'collapse-second')]//a[@href='/systems']

${AUTHORIZED BODY}                    //body[contains(@class, 'authorized')]
${ANONYMOUS BODY}                     //body[contains(@class,'anonymous')]//landing-display-component/div
${CREATE ACCOUNT HEADER}              //header//a[@href='/authorize?client_type=create']
${CREATE ACCOUNT BODY}                //landing-component//a[@href='/authorize?client_type=create']

${LOG IN BODY}                        //nx-app//a[@href='/login']

${FIRST NAME IS REQUIRED}             ${REGISTER FIRST NAME INPUT}/following-sibling::p[contains(@class,'error-label') and contains(text(),"${REQUIRED TEXT}")]
${LAST NAME IS REQUIRED}              ${REGISTER LAST NAME INPUT}/following-sibling::p[contains(@class,'error-label') and contains(text(),"${REQUIRED TEXT}")]
${EMAIL IS REQUIRED}                  ${REGISTER EMAIL INPUT}/../following-sibling::p[contains(@class,'error-label') and contains(text(),"${REQUIRED TEXT}")]
${EMAIL ALREADY REGISTERED}           //p[contains(@class,'error-label') and contains(text(),"${EMAIL ALREADY REGISTERED TEXT}")]
${EMAIL INVALID}                      //p[contains(@class,'error-label') and contains(text(),"${EMAIL INVALID TEXT}")]
${PASSWORD SPECIAL CHARS}             //div[contains(@class,'input-error') and contains(text(),"${PASSWORD SPECIAL CHARS TEXT}")]
${PASSWORD IS WEAK}                   //div[contains(@class,'input-error') and contains(text(),"${PASSWORD IS WEAK TEXT}")]
${PASSWORD TOO SHORT}                 //div[contains(@class,'input-error') and contains(text(),"${PASSWORD TOO SHORT TEXT}")]
${PASSWORD TOO COMMON}                //div[contains(@class,'input-error') and contains(text(),"${PASSWORD TOO COMMON TEXT}")]

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#targets the open nx witness button presented when logging in after activating with from=mobile or client
${OPEN NX WITNESS BUTTON FROM =}      //button[text()="${OPEN NX WITNESS BUTTON TEXT}"]

${ACTIVATION SUCCESS}                 //h3[contains(@class,"authorize-header") and contains(text(),"${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]
${ACTIVATION SUCCESS ICON}            //nx-authorize-activate-account-component//svg-icon
${ACTIVATION SUCCESS LOG IN BUTTON}   //nx-authorize-activate-account-component//button[contains(text(), "${LOG IN BUTTON TEXT}")]
${SYSTEM NAME OFFLINE}                //nx-ribbon//div[contains(text(),'${SYSTEM IS OFFLINE TEXT}')]

#In system settings
${SYSTEM NAME}                        //div/nx-editable-heading//nx-text-editable
${SYSTEM OFFLINE}                     //div[contains(text(),"${SYSTEM IS OFFLINE TEXT}")]
${SYSTEM OFFLINE HEADER}              //h2[@name="OFFLINE" and contains(text(),"${SYSTEM OFFLINE TEXT}")]
${THIS SYSTEM IS OFFLINE}             //div[@name="OFFLINE" and contains(text(),"${THIS SYSTEM IS OFFLINE TEXT}")]
${FIRST USER OWNER}                   //table[@ng-if='system.users.length']/tbody/tr/td[3]/span[contains(text(),"${OWNER TEXT}")]
${DISCONNECT FROM NX}                 //button/span[text()='${DISCONNECT FROM CLOUD TEXT}']/..
${RENAME SYSTEM}                      ${SYSTEM NAME}/following-sibling::div[contains(@class, "edit-button")]
${THIS PAGE CANNOT BE LOADED}         //h2[@name="NO_SETTINGS" and contains(text(),"${THIS PAGE CANNOT BE LOADED TEXT}")]
${SYSTEM USER DETAILS}                //nx-system-settings-component//nx-block/..

${SYSTEM SAVE}                        //nx-apply//nx-process-button//button
${SYSTEM CANCEL}                      //nx-cancel-button//button

${YOUR ACCESS LEVEL}                  ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'system-owner')]/span[contains(text(),"${YOUR ACCESS LEVEL TEXT}")]

${DISCONNECT FROM MY ACCOUNT}         //button[contains(text(),'${DISCONNECT FROM MY ACCOUNT TEXT}')]

${ACCESS LEVEL DROPDOWN}              ${SYSTEM USER DETAILS}//nx-section//button[@id='componentId']
${ACCESS LEVEL DROPDOWN MENU}         ${SYSTEM USER DETAILS}//nx-section//ul[contains(@class, "dropdown-menu")]
${HELP BLOCK}                         ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'help-block')]
${REMOVE USER BUTTON}                 ${SYSTEM USER DETAILS}//button[contains(text(),'${REMOVE USER BUTTON TEXT}')]
${DISABLE USER SWITCH}                ${SYSTEM USER DETAILS}//input[@id='user-active-status-switch']
${USER DISABLED MSG}                  ${SYSTEM USER DETAILS}//span[contains(@class,'text-danger')]

${REMOVE USER MODAL}                  //nx-modal-remove-user-content
${REMOVE BUTTON}                      ${REMOVE USER MODAL}//button[contains(text(),'${REMOVE BUTTON TEXT}')]
${REMOVE CANCEL BUTTON}               ${REMOVE USER MODAL}//button[contains(text(),"${CANCEL BUTTON TEXT}")]

${USERS LIST LINK}                    //a[@id='users']
${USERS LIST}                         ${USERS LIST LINK}/../../div[contains(@class,'level-3-items')]


${SHARE BUTTON SYSTEMS}               //nx-system-settings-component//nx-menu//nx-menu-button//button   # Currently called "Add User"
${SYSTEM NO ACCESS}                   //h2[@name="FAILED_TO_ACCESS_SYSTEM" and contains(text(),"${SYSTEM NO ACCESS TEXT}")]

${NEW FEATURE MODAL}                  //nx-modal-new-feature-content
${NEW FEATURE CLOSE BUTTON}           ${NEW FEATURE MODAL}//button//span[contains(@class,"close-icon")]/../..

#Disconnect from my account
${DISCONNECT MODAL WARNING}              ${MODAL DIALOG}//p[contains(text(),"${DISCONNECT MODAL WARNING TEXT}")]
# extra spaces here temporarily
${DISCONNECT MODAL CANCEL}               ${MODAL DIALOG}//button/span[contains(text(),'${CANCEL BUTTON TEXT}')]/..
${DISCONNECT MODAL DISCONNECT BUTTON}    ${MODAL DIALOG}//button[contains(text(),'${DISCONNECT BUTTON TEXT}')]
${DISCONNECT MODAL BUTTON}               ${MODAL DIALOG}//button/span[contains(text(),'${DISCONNECT BUTTON TEXT}')]

${JUMBOTRON}                          //div[@class='mainContainer']
${PROMO BLOCK}                        //div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]
${ALREADY ACTIVATED}                  //h1[contains(@class,"process-success") and contains(text(),"${ALREADY ACTIVATED TEXT}")]

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
${ADD USER BUTTON SYSTEMS}            //nx-system-settings-component//nx-menu//nx-menu-button//button
${ADD USER MODAL}                     //form[@name='addUserForm']
${ADD USER EMAIL}                     ${ADD USER MODAL}//input[@id='addUserEmail']
${ADD USER PERMISSIONS DROPDOWN}      ${ADD USER MODAL}//nx-permissions-select//button[@id='componentId']
${ADD USER BUTTON MODAL}              ${ADD USER MODAL}//button[text()='${ADD BUTTON TEXT}']
${ADD USER CANCEL}                    ${ADD USER MODAL}//button[text()='${CANCEL BUTTON TEXT}']
${ADD USER CLOSE}                     ${ADD USER MODAL}//button[@data-dismiss='modal']
${ADD USER PERMISSIONS HINT}          ${ADD USER MODAL}//span[contains(@class,'help-block')]

${EDIT PERMISSIONS EMAIL}             //form[@name='shareForm']//input[@ng-model='user.email']
${EDIT PERMISSIONS DROPDOWN}          //form[@name='shareForm']//button[@id='permissionsSelect']
${EDIT PERMISSIONS SAVE}              //form[@name='shareForm']//button[text()='${SAVE BUTTON TEXT}']
${EDIT PERMISSIONS CANCEL}            //form[@name='shareForm']//button[@ng-click='close()']
${EDIT PERMISSIONS CLOSE}             //div[@uib-modal-transclude]//div[@ng-if='settings.title']//button[@ng-click='close()']
${EDIT PERMISSIONS ADMINISTRATOR}     //form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Administrator']
${EDIT PERMISSIONS ADVANCED VIEWER}   //form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Advanced Viewer']
${EDIT PERMISSIONS VIEWER}            //form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Viewer']
${EDIT PERMISSIONS LIVE VIEWER}       //form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Live Viewer']
${EDIT PERMISSIONS CUSTOM}            //form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Custom']
${EDIT PERMISSIONS HINT}              //form[@name='shareForm']//span[contains(@class,'help-block')]

#Account Page



#Downloads
${DOWNLOADS HEADER}                   //h1[contains(text(),"${DOWNLOADS HEADER TEXT}")]
${DOWNLOAD WINDOWS VMS LINK}          //a[contains(@class, "download-button")]
${DOWNLOAD WINDOWS VMS TEXT}          ${DOWNLOAD WINDOWS VMS LINK}//div[contains(text(),"Windows x64 - Client installer")]
${DOWNLOAD LINUX VMS LINK}            //a[contains(@class, "download-button")]
${DOWNLOAD LINUX VMS TEXT}            ${DOWNLOAD LINUX VMS LINK}//div[contains(text(),"Ubuntu x64 - Client installer")]
${DOWNLOAD MAC OS VMS LINK}           //a[contains(@class, "download-button")]
${DOWNLOAD MAC OS VMS TEXT}           ${DOWNLOAD MAC OS VMS LINK}//div[contains(text(),"Mac OS - Client installer")]
${DOWNLOAD ARM VMS LINK}              //a[contains(@class, "download-button")]
${DOWNLOAD ARM VMS TEXT}              ${DOWNLOAD ARM VMS LINK}//div[contains(text(),"ARM") and contains(text(),"Client")]

${ITUNES STORE DOWNLOAD BUTTON}       //a[contains(@class,"mobile-link iOS")]
${PLAY STORE DOWNLOAD BUTTON}         //a[contains(@class,"mobile-link Android")]
${DOWNLOAD VMS NAME}                  //h3[contains(text(),"${DOWNLOAD TITLE TEXT}")]
${DOWNLOAD VERSION NUMBER}            //h2[@class="version-number d-flex"]/b
${WHATS NEW LINK}                     //a[contains(text(),"${WHATS NEW TEXT}")]

${WINDOWS TAB}                        //a[@id="windows"]
${LINUX TAB}                          //a[@id="linux"]
${MAC OS TAB}                         //a[@id="macos"]
${ARM TAB}                            //a[@id="arm"]
${SDK TAB}                            //a[@id="sdk"]

#History
${RELEASE NOTES HEADER}               //h1[contains(text(), "${RELEASE NOTES TEXT}")]
${RELEASES TAB}                       //span[contains(@class,'tab-heading') and text()='${RELEASES TAB TEXT}']/..
${PATCHES TAB}                        //span[contains(@class,'tab-heading') and text()='${PATCHES TAB TEXT}']/..
${BETAS TAB}                          //span[contains(@class,'tab-heading') and text()='${BETAS TAB TEXT}']/..
${RELEASE NUMBER}                     //div//h1[contains(@class,"title")]


#Misc
${PAGE NOT FOUND}                     //h2[@name="404" and contains(text(),'${PAGE NOT FOUND TEXT}')]
${TAKE ME HOME}                       //button/a[text()="${GO TO MAIN PAGE TEXT}"]
${404 ICON}                           //div[@name="404"]/svg-icon
${OFFLINE BADGE}                      //a[contains(@class, "badge") and contains(text(), "${AUTOTESTS OFFLINE TEXT}")]
${RELEASE NUMBER}                     //div[contains(@class,"active")]//div[@ng-repeat="release in activeBuilds"]//h1/b
${RESET PASSWORD PAGE BUTTON}         //nx-authorize-reset-request-component//footer//nx-process-button//button[contains(text(), '${RESET PASSWORD BUTTON TEXT}')]

${PRIVACY POLICY HEADER}              //h1[contains(text(),'Personal data and privacy policy')]

${DROPDOWN MENU}                      /..//div[contains(@class,'dropdown-menu')]
${DROPDOWN MENU LIST}                 ${DROPDOWN MENU}/ul[contains(@class,'dropdown-menu--list')]
${DROPDOWN MENU ITEMS}                ${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/../../..//li

${DISABLED}                           \[@disabled]

#Password badges
${PASSWORD BADGE}                     //nx-password-input-tag-validation
${PASSWORD IS WEAK BADGE}             ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),'${PASSWORD IS WEAK BADGE TEXT}')]
${PASSWORD IS FAIR BADGE}             ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),'${PASSWORD IS FAIR BADGE TEXT}')]
${PASSWORD IS GOOD BADGE}             ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),'${PASSWORD IS GOOD BADGE TEXT}')]
${PASSWORD IS TOO SHORT BADGE}        ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),'${PASSWORD IS TOO SHORT BADGE TEXT}')]
${PASSWORD IS TOO COMMON BADGE}       ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),'${PASSWORD IS TOO COMMON BADGE TEXT}')]
${PASSWORD INCORRECT BADGE}           ${PASSWORD BADGE}//nx-tag//a[contains(@class,"badge") and contains(text(),"${PASSWORD INCORRECT BADGE TEXT}")]
${PASSWORD BADGE TOOLTIP}             //nx-tooltip-component

#Already logged in modal
${LOGGED IN STAY LOGGED IN BUTTON}    ${MODAL DIALOG}//button[contains(text(),'${STAY LOGGED IN BUTTON TEXT}')]
${LOGGED IN OK BUTTON}                ${MODAL DIALOG}//button[contains(text(),'${OK TEXT}')]
${LOGGED IN LOG OUT BUTTON}           ${MODAL DIALOG}//button/span[contains(text(),'${LOG OUT BUTTON TEXT}')]/..
${LOGGED IN NEW ACCOUNT BUTTON}       ${MODAL DIALOG}//button/span[contains(text(),'${CREATE NEW ACCOUNT BUTTON TEXT}')]/..
${LOGGED IN CANCEL BUTTON}            ${MODAL DIALOG}//button/span[contains(text(),'${CANCEL BUTTON TEXT}')]/..
${LOGGED IN CLOSE BUTTON}             ${MODAL DIALOG}//button//span[@class="close-icon"]/../..

${300CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmyy
${255CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopas

#Eye icons for password forms
${EYE ICON OPEN}             //svg-icon[contains(@data-src,"/images/icons/text_buttons/eye.svg")]
${EYE ICON CLOSED}           //svg-icon[contains(@data-src,"/images/icons/text_buttons/eye_closed.svg")]

# Form validation passwords
${LOWERCASE PASSWORD}    adrhartjad
${UPPERCASE PASSWORD}    ADRHARTJAD
${NUMBERS PASSWORD}      13462344
${7CHAR PASSWORD}       asdfghj
${SYMBOL ONLY PASSWORD}    !@#$%^&*()_-+=
@{WEAK PASSWORDS}    ${UPPERCASE PASSWORD}    ${LOWERCASE PASSWORD}    ${COMMON PASSWORD}    ${NUMBERS PASSWORD}    ${SYMBOL ONLY PASSWORD}

${LOWER UPPER PASSWORD}    multPASS
${LOWER NUMBER PASSWORD}    mult1234
${LOWER SYMBOL PASSWORD}    mult!@#$
${UPPER NUMBER PASSWORD}    MULT1234
${UPPER SYMBOL PASSWORD}    MULT!@#$
${NUMBER SYMBOL PASSWORD}    1234!@#$
@{FAIR PASSWORDS}    ${LOWER UPPER PASSWORD}    ${LOWER NUMBER PASSWORD}    ${LOWER SYMBOL PASSWORD}    ${UPPER NUMBER PASSWORD}    ${UPPER SYMBOL PASSWORD}    ${NUMBER SYMBOL PASSWORD}    ${SYMBOL PASSWORD}

${LOWER UPPPER NUMBER PASSWORD}    qweASD123
${LOWER UPPER SYMBOL PASSWORD}    qweASD!@#
${LOWER NUMBER SYMBOL PASSWORD}    qwe123!@#
${UPPER NUMBER SYMBOL PASSWORD}   QWE123!@#
@{GOOD PASSWORDS}    ${LOWER UPPPER NUMBER PASSWORD}    ${LOWER UPPER SYMBOL PASSWORD}    ${LOWER NUMBER SYMBOL PASSWORD}    ${UPPER NUMBER SYMBOL PASSWORD}    ${BASE PASSWORD}

${SYMBOL PASSWORD}      pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}
${COMMON PASSWORD}      qweasd123

@{INCORRECT PASSWORDS}    ${CYRILLIC TEXT}    ${SMILEY TEXT}    ${GLYPH TEXT}    ${TM TEXT}    ${SPACE}${BASE PASSWORD}    ${BASE PASSWORD}${SPACE}

#Local User in System Users
${LOCAL USER LOGIN}                  //h2
${LOCAL USER NAME}                   //input[@id='fullName']
${LOCAL USER EMAIL}                  //input[@id='email']
${LOCAL USER CHANGE PASSWORD BUTTON}     //button[text()="${CHANGE PASSWORD BUTTON TEXT}"]
${LOCAL USER CHANGE PASSWORD SAVE}    //form[@name="changePasswordForm"]//button[text()="${SAVE BUTTON TEXT}"]
${LOCAL USER CHANGE PASSWORD CANCEL}    //form[@name="changePasswordForm"]//button[text()="${CANCEL BUTTON TEXT}"]
${LOCAL USER PASSWORD INPUT}         //input[@id="newPassword"]
${LOCAL USER DELETE BUTTON}          //button[text()="${DELETE USER TEXT}"]
${LOCAL USER DELETE CONFIRM BUTTON}  //div[@class="process-button"]/button
${LOCAL USER DELETE CANCEL BUTTON}    //div[@class="modal-dialog"]//button[text()="${CANCEL BUTTON TEXT}"]
${USER CANCEL}                        //nx-apply//nx-cancel-button/button[@type="reset"]
${ACCOUNT CREATION EMAIL SUCCESS}     //nx-authorize-component//nx-authorize-activate-account-component//main//h3
${ACTIVATE MODAL LOGIN BTN}           //nx-authorize-component//nx-authorize-activate-account-component//main//nx-process-button//button[@type="submit"]
${LOCAL USER NAME HEADER}             //nx-system-user-component//nx-block//header//span[contains(@class,"user-name")]

#svg icons
${USERS ICON}                      *[name()="svg-icon" and contains(@data-src,"/images/icons/standard/users.svg")]
${LOCAL USER ICON}                 *[name()="svg-icon" and contains(@data-src,"/images/icons/standard/user.svg")]
${CAMERAS ICON}                    *[name()="svg-icon" and contains(@data-src,"/images/icons/standard/cameras.svg")]
${SERVERS ICON}                    *[name()="svg-icon" and contains(@data-src,"/images/icons/standard/servers.svg")]
${SYSTEMS ICON}                    *[name()="svg-icon" and contains(@data-src,"/images/icons/standard/systems.svg")]
${PLACEHOLDER ICON}                //*[name()="svg-icon" and contains(@data-src,"/images/placeholders/section/system_settings_placeholder.svg")]
${PLACEHOLDER NO SETTINGS}         //*[name()="svg-icon" and contains(@data-src,"/images/placeholders/page/NoSettings.svg")]

${FROM EMAIL DEFAULT}                   ${False}