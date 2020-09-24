*** Settings ***
Variables    getvars.py
Resource     variables/front-end-variables.robot
Resource     variables/cms-variables.robot
Resource     variables/cloud-merge-variables.robot

*** Variables ***
${ALERT}                              //div[contains(@class,'toast-body')]//span[contains(@class,'toast-content')]
${ALERT CLOSE}                        //div[contains(@class,'toast-body')]/button[contains(@class,'close') and @data-dismiss='alert']

${BROWSER}                            Chrome

${LANGUAGE DROPDOWN}                  //nx-language-select//button[@id='dropdownMenuButton']
${LANGUAGE TO SELECT}                 //nx-language-select//span[@lang='${LANGUAGE}']/..
${DOWNLOAD LINK}                      //footer//a[@href="/download" and @class="ng-star-inserted"]

@{USER TYPE LIST}    ${OWNER TEXT}    ${ADMIN TEXT}    ${ADV VIEWER TEXT}    ${VIEWER TEXT}    ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}    Client Custom

${BACKDROP}                           //ngb-modal-backdrop
${MODAL DIALOG}                       //ngb-modal-window/div[contains(@class,'modal-dialog')]/div[contains(@class,'modal-content')]

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
${LOG IN MODAL}                       //form[@name='loginForm']
${EMAIL INPUT}                        //form[@name='loginForm']//input[@id='login_email']
${PASSWORD INPUT}                     //form[@name='loginForm']//input[@id='login_password' and @name="login_password" and @type="password"]
${LOG IN BUTTON}                      //form[@name='loginForm']//nx-process-button//button

${REMEMBER ME CHECKBOX VISIBLE}       //form[@name='loginForm']//input[@id='remember']/following-sibling::span[@class="checkmark"]/..
${REMEMBER ME CHECKBOX REAL}          //form[@name='loginForm']//input[@id='remember']

${FORGOT PASSWORD}                    //form[@name='loginForm']//a[@href='/restore_password']
${LOG IN CLOSE BUTTON}                //button[@data-dismiss='modal']
${ACCOUNT NOT FOUND}                  //form[@name='loginForm']//div[contains(text(),'${ACCOUNT NOT FOUND TEXT}')]
${RESEND ACTIVATION EMAIL LINK}       //form[@name='loginForm']//a[text()='${RESEND ACTIVATION LINK BUTTON TEXT}']
${WRONG PASSWORD MESSAGE}             //form[@name='loginForm']//div[text()="${WRONG PASSWORD}"]
${ACCOUNT NOT FOUND MESSAGE}          //form[@name='loginForm']//div[text()="${ACCOUNT DOES NOT EXIST}"]
${TOO MANY ATTEMPTS MESSAGE}          //form[@name='loginForm']//div[text()="${TOO MANY ATTEMPTS TEXT}"]

${LOG IN NAV BAR}                     //header//nav//a/span[contains(text(),'${LOG IN BUTTON TEXT}')]/..

#Header
${LARGE ACCOUNT DROPDOWN}             //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown" and not(contains(@class,'small-icon-overrides'))]
${SMALL ACCOUNT DROPDOWN}             //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown" and contains(@class,'small-icon-overrides')]
${LARGE CREATE ACCOUNT BUTTON}        //header//a[@href='/register' and not(contains(@class, 'small-button'))]
${SMALL CREATE ACCOUNT BUTTON}        //header//a[@href='/register' and contains(@class, 'small-button')]
${LARGE LOGIN BUTTON}                 //nx-header/header//a[contains(@class, 'login-button')]  
${SMALL LOGIN BUTTON}                 //nx-header/header//ul[contains(@class, 'navbar-right')]//span[contains(@class, 'glyphicon-login')]
${SYSTEM NAME HEADING}                //nx-system-admin-component//div[contains(@class,'header-title')]/h2[@id='editable-title']
${HEADER TAB WRAPPER}                 //nx-header/header//div[contains(@class, 'tab-wrapper')]
${HEADER TAB BUTTONS}                 ${HEADER TAB WRAPPER}/nx-header-tabs
${HEADER TAB DROPDOWN}                ${HEADER TAB WRAPPER}/nx-nav-dropdown
${HEADER ACTIVE TAB}                  ${HEADER TAB WRAPPER}//li[@class='tab-link active']/a
${HEADER LANGUAGE DROPDOWN}           //header//nx-header-language-select
${SYSTEMS DROPDOWN}                   //nx-header//button[@id='systemsDropdown']
${HEADER ICON LINK}                   //nx-header/header//div[@class='app-header-left']//a[contains(@class, 'navbar-brand')]
${LOGO ICON}                          ${HEADER ICON LINK}/img
${LOGO ICON SOURCE}                   ${ENV}/static/images/logo.png
${SYSTEMS GRID}                       //nx-drop-menu//li[contains(@class, 'systems-grid')]
${SYSTEMS GRID TILES}                 ${SYSTEMS GRID}//nx-system-tile

${ACCOUNT DROPDOWN}                   //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown"]
${LOG OUT BUTTON}                     //li[contains(@class, 'collapse-first')]//a/span[contains(text(),"${LOG OUT BUTTON TEXT}")]/..
${WELCOME CAPTION}                    //h1[@class='welcome-caption']/span
${ACCOUNT SETTINGS BUTTON}            //li//a[@href = '/account']
${CHANGE PASSWORD BUTTON DROPDOWN}    //li//a[@href = '/account/password']
${RELEASE HISTORY BUTTON}             //a[@href="/downloads/history" and contains(text(),"${RELEASE HISTORY BUTTON TEXT}")]
${OPEN IN NX BUTTON}                  //nx-client-button//nx-process-button//button
${ALL SYSTEMS}                        //header//li[contains(@class, 'collapse-second')]//a[@href='/systems']

${AUTHORIZED BODY}                    //body[contains(@class, 'authorized')]
${ANONYMOUS BODY}                     //body[contains(@class,'anonymous')]
${CREATE ACCOUNT HEADER}              //header//a[@href='/register']
${CREATE ACCOUNT BODY}                //nx-app//a[@href='/register']

${LOG IN BODY}                        //nx-app//a[@href='/login']

${FIRST NAME IS REQUIRED}             //span[contains(@class,'input-error') and contains(text(),"${FIRST NAME IS REQUIRED TEXT}")]
${LAST NAME IS REQUIRED}              //span[contains(@class,'input-error') and contains(text(),"${LAST NAME IS REQUIRED TEXT}")]
${EMAIL IS REQUIRED}                  //span[contains(@class,'input-error') and contains(text(),"${EMAIL IS REQUIRED TEXT}")]
${EMAIL ALREADY REGISTERED}           //span[contains(@class,'input-error') and contains(text(),"${EMAIL ALREADY REGISTERED TEXT}")]
${EMAIL INVALID}                      //span[contains(@class,'input-error') and contains(text(),"${EMAIL INVALID TEXT}")]
${PASSWORD SPECIAL CHARS}             //div[contains(@class,'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD IS WEAK}                   //div[contains(@class,'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]
${PASSWORD TOO SHORT}                 //div[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}                //div[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#targets the open nx witness button presented when logging in after activating with from=mobile or client
${OPEN NX WITNESS BUTTON FROM =}      //button[text()="${OPEN NX WITNESS BUTTON TEXT}"]

${ACTIVATION SUCCESS}                 //h2[@name="ACCOUNT_ACTIVATED" and contains(text(),"${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]
${ACTIVATION SUCCESS ICON}            //div[@name="ACCOUNT_ACTIVATED"]/svg-icon
${ACTIVATION SUCCESS LOG IN BUTTON}   //nx-app//button[contains(text(), "${LOG IN BUTTON TEXT}")]
${SYSTEM NAME OFFLINE}                //nx-ribbon/div[contains(@class,'alert-ribbon')]/div[@class='message']//div[contains(text(),'${SYSTEM IS OFFLINE TEXT}')]

#In system settings
${SYSTEM NAME}                        //h2[contains(@class,"system-name")]
${FIRST USER OWNER}                   //table[@ng-if='system.users.length']/tbody/tr/td[3]/span[contains(text(),"${OWNER TEXT}")]
${DISCONNECT FROM NX}                 //button/span[text()='${DISCONNECT FROM CLOUD TEXT}']/..
${RENAME SYSTEM}                      //button/span[text()='${RENAME}']/..

${SYSTEM USER DETAILS}                //nx-system-settings-component//nx-block/..

${SYSTEM SAVE}                        //nx-apply//nx-process-button//button
${SYSTEM CANCEL}                      //nx-apply//button[@type='button']

${YOUR ACCESS LEVEL}                  ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'system-owner')]/span[contains(text(),"${YOUR ACCESS LEVEL TEXT}")]

${DISCONNECT FROM MY ACCOUNT}         //button[contains(text(),'${DISCONNECT FROM MY ACCOUNT TEXT}')]

${ACCESS LEVEL DROPDOWN}              ${SYSTEM USER DETAILS}//nx-section//button[@id='permissionsSelect']
${HELP BLOCK}                         ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'help-block')]
${REMOVE USER BUTTON}                 ${SYSTEM USER DETAILS}//button[contains(text(),'${REMOVE USER BUTTON TEXT}')]
${DISABLE USER SWITCH}                ${SYSTEM USER DETAILS}//div[@id='user-active-status']
${USER DISABLED MSG}                  ${SYSTEM USER DETAILS}//span[contains(@class,'text-danger')]
${REMOVE USER MODAL}                  ${MODAL DIALOG}
${REMOVE BUTTON}                      ${MODAL DIALOG}//button[contains(text(),'${REMOVE BUTTON TEXT}')]
${REMOVE CANCEL BUTTON}               ${MODAL DIALOG}//button[contains(text(),"${CANCEL BUTTON TEXT}")]

${USERS LIST LINK}                    //a[@id='users']
${USERS LIST}                         ${USERS LIST LINK}/../../div[contains(@class,'level-3-items')]

${ACCOUNT SETTINGS BUTTON SYSTEM}     //button[@id="accountSettingsButton"]
${SHARE BUTTON SYSTEMS}               //nx-system-settings-component//nx-menu//nx-menu-button//button   # Currently called "Add User"
${SYSTEM NO ACCESS}                   //h2[@name="FAILED_TO_ACCESS_SYSTEM" and contains(text(),"${SYSTEM NO ACCESS TEXT}")]

#Disconnect from my account
${DISCONNECT MODAL WARNING}              ${MODAL DIALOG}//p[contains(text(),"${DISCONNECT MODAL WARNING TEXT}")]
# extra spaces here temporarily
${DISCONNECT MODAL CANCEL}               ${MODAL DIALOG}//button/span[contains(text(),'${CANCEL BUTTON TEXT}')]/..
${DISCONNECT MODAL DISCONNECT BUTTON}    ${MODAL DIALOG}//button[contains(text(),'${DISCONNECT BUTTON TEXT}')]

${JUMBOTRON}                          //div[@class='jumbotron']
${PROMO BLOCK}                        //div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]
${ALREADY ACTIVATED}                  //h1[contains(@class,"process-success") and contains(text(),"${ALREADY ACTIVATED TEXT}")]

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
${ADD USER BUTTON SYSTEMS}            //nx-system-settings-component//nx-menu//nx-menu-button//button
${ADD USER MODAL}                     //form[@name='addUserForm']
${ADD USER EMAIL}                     ${ADD USER MODAL}//input[@id='addUserEmail']
${ADD USER PERMISSIONS DROPDOWN}      ${ADD USER MODAL}//nx-permissions-select//button[@id='permissionsSelect']
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
${ACCOUNT EMAIL}                      //account//a[@id='settings']
${ACCOUNT FIRST NAME}                 //form[@name='accountForm']//input[@id='firstName']
${ACCOUNT LAST NAME}                  //form[@name='accountForm']//input[@id='lastName']
${ACCOUNT LANGUAGE DROPDOWN}          //nx-language-select//button[@id='dropdownMenuButton']
${ACCOUNT SAVE}                       //nx-apply//nx-process-button//button[@type="submit"]
${ACCOUNT CANCEL}                     //nx-apply//nx-process-button/following-sibling::button[@type="button"]

${DELETE ACCOUNT BUTTON}              //nx-account-settings-component//nx-block//button[@id="accountSettingsDeleteButton"]
${DELETE ACCOUNT DISABLED BUTTON}     //nx-account-settings-component//nx-block//button[@disabled and contains(text(), "${DELETE ACCOUNT TEXT}")]
${CAN NOT DELETE ACCOUNT TOOLTIP}     //ngb-tooltip-window/div[contains(@class,"tooltip-inner")]
${DELTE ACCOUNT DIALOG}               //nx-modal-delete-cloud-user-content
${DELETE ACCOUNT MODAL BUTTON}        ${DELTE ACCOUNT DIALOG}//nx-process-button//button[contains(text(),"${DELETE BUTTON TEXT}")]
${DELETE ACCOUNT CANCEL BUTTON}       ${DELTE ACCOUNT DIALOG}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${DELETE ACCOUNT CLOSE BUTTON}         ${DELTE ACCOUNT DIALOG}//button[contains(@class,"close")]
${DELETE ACCOUNT HEADER}              ${DELTE ACCOUNT DIALOG}//h1[contains(text(),"${DELETE ACCOUNT HEADER TEXT}")]
${DELETE ACCOUNT INFO}                ${DELTE ACCOUNT DIALOG}//span[contains(text(),"${DELETE ACCOUNT INFO TEXT}")]
${DELETE ACCOUNT PASSWORD INPUT}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]
${DELETE ACCOUNT PASSWORD LABEL}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]/preceding-sibling::label[@for="password" and contains(text(),"${DELETE ACCOUNT PASSWORD LABEL TEXT}")]
${DELETE ACCOUNT PASSWORD ERROR}      ${DELTE ACCOUNT DIALOG}//form[@name="deleteCloudUserForm"]//input[@id="password"]/following-sibling::label[@for="password"]

${APPLY CHANGES BUTTON}               ${MODAL DIALOG}//button[contains(text(), '${APPLY CHANGES BUTTON TEXT}')]
${DISCARD CHANGES BUTTON}             ${MODAL DIALOG}//button[contains(text(), '${DISCARD CHANGES BUTTON TEXT}')]
${CANCEL CHANGES BUTTON}              ${MODAL DIALOG}//button[contains(text(), '${CANCEL CHANGES BUTTON TEXT}')]
${APPLY CHANGES QUESTION}             //h1[contains(text(), '${APPLY CHANGES QUESTION TEXT}')]
${NO UNSAVED CHANGES}                 //nx-apply//div[contains(text(), '${NO UNSAVED CHANGES TEXT}')]
${APPLY CHANGES CLOSE BUTTON}         ${MODAL DIALOG}//button[@class="close"]

#Downloads
${DOWNLOADS HEADER}                   //h1[contains(text(),"${DOWNLOADS HEADER TEXT}")]
${DOWNLOAD WINDOWS VMS LINK}          //div[contains(text(),"Windows x64 - Client & Server")]/../..
${DOWNLOAD LINUX VMS LINK}            //div[contains(text(),"Ubuntu x64 - Client")]/../..
${DOWNLOAD MAC OS VMS LINK}           //div[contains(text(),"Mac OS - Client")]/../..
${DOWNLOAD ARM VMS LINK}              //div[contains(text(),"ARM") and contains(text(),"Client")]/../..
${ITUNES STORE DOWNLOAD BUTTON}       //a[contains(@class,"mobile-link iOS")]
${PLAY STORE DOWNLOAD BUTTON}         //a[contains(@class,"mobile-link Android")]
${DOWNLOAD VMS NAME}                  //h3[contains(text(),"${DOWNLOAD TITLE TEXT}")]
${DOWNLOAD VERSION NUMBER}            //h2[@class="version-number d-flex"]/b
${WHATS NEW LINK}                     //a[contains(text(),"${WHATS NEW TEXT}")]

${WINDOWS TAB}                        //a[@id="windows"]
${LINUX TAB}                         //a[@id="linux"]
${MAC OS TAB}                         //a[@id="macos"]
${ARM TAB}                            //a[@id="arm"]

#History
${RELEASES TAB}                       //span[contains(@class,'tab-heading') and text()='${RELEASES TAB TEXT}']/..
${PATCHES TAB}                        //span[contains(@class,'tab-heading') and text()='${PATCHES TAB TEXT}']/..
${BETAS TAB}                          //span[contains(@class,'tab-heading') and text()='${BETAS TAB TEXT}']/..
${RELEASE NUMBER}                     //div[contains(@class,"active")]//h1


#Footer
${FOOTER ABOUT LINK}                  //footer//a[contains(text(),"${ABOUT}")]
${FOOTER KNOWN LIMITS LINK}           //footer//a[contains(text(),"${KNOWN LIMITATIONS}")]
${FOOTER INTEGRATIONS LINK}           //footer//a[contains(text(),"${INTEGRATIONS TITLE TEXT}")]
${FOOTER SUPPORT LINK}                //footer//a[contains(text(),"${SUPPORT}")]
${FOOTER TERMS LINK}                  //footer//a[contains(text(),"${TERMS}")]
${FOOTER PRIVACY LINK}                //footer//a[contains(text(),"${PRIVACY}")]
${FOOTER COPYRIGHT LINK}              //footer//a[contains(text(),"${COPYRIGHT SYMBOL}") and contains(text(),"${YEAR}") and contains(text(),"${COMPANY}")]
${FOOTER SUPPORTED DEVICES LINK}      //footer//a[contains(text(),"${SUPPORTED DEVICES}")]

#Misc
${PAGE NOT FOUND}                     //h2[@name="404" and contains(text(),'${PAGE NOT FOUND TEXT}')]
${TAKE ME HOME}                       //a[@href='/' and contains(text(),"${GO TO MAIN PAGE TEXT}")]
${404 ICON}                           //div[@name="404"]/svg-icon

${RELEASE NUMBER}                     //div[contains(@class,"active")]//div[@ng-repeat="release in activeBuilds"]//h1/b

${PRIVACY POLICY HEADER}              //h1[contains(text(),'Personal data and privacy policy')]

${DROPDOWN MENU}                      /..//div[contains(@class,'dropdown-menu')]
${DROPDOWN MENU LIST}                 ${DROPDOWN MENU}/ul[contains(@class,'dropdown-menu--list')]
${DROPDOWN MENU ITEMS}                ${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/../../..//li

${DISABLED}                           \[@disabled]

#Password badges
${PASSWORD BADGE}                     //nx-tag//div[contains(@class,"badge")]
${PASSWORD IS WEAK BADGE}             //nx-tag//div[contains(@class,"badge") and contains(text(),'${PASSWORD IS WEAK BADGE TEXT}')]
${PASSWORD IS FAIR BADGE}             //nx-tag//div[contains(@class,"badge") and contains(text(),'${PASSWORD IS FAIR BADGE TEXT}')]
${PASSWORD IS GOOD BADGE}             //nx-tag//div[contains(@class,"badge") and contains(text(),'${PASSWORD IS GOOD BADGE TEXT}')]
${PASSWORD INCORRECT BADGE}           //nx-tag//div[contains(@class,"badge") and contains(text(),"${PASSWORD INCORRECT BADGE TEXT}")]

#Already logged in modal
${LOGGED IN STAY LOGGED IN BUTTON}    ${MODAL DIALOG}//button[contains(text(),'${STAY LOGGED IN BUTTON TEXT}')]
${LOGGED IN OK BUTTON}                ${MODAL DIALOG}//button[contains(text(),'${OK TEXT}')]
${LOGGED IN LOG OUT BUTTON}           ${MODAL DIALOG}//button/span[contains(text(),'${LOG OUT BUTTON TEXT}')]/..
${LOGGED IN NEW ACCOUNT BUTTON}       ${MODAL DIALOG}//button/span[contains(text(),'${CREATE NEW ACCOUNT BUTTON TEXT}')]/..
${LOGGED IN CANCEL BUTTON}           ${MODAL DIALOG}//button/span[contains(text(),'${CANCEL BUTTON TEXT}')]/..

${300CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmyy
${255CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopas

#Eye icons for password forms
${EYE ICON OPEN}             //span[@class="glyphicon glyphicon-eye-open ng-star-inserted"]
${EYE ICON CLOSED}           //span[@class="glyphicon glyphicon-eye-close ng-star-inserted"]

# Form validation passwords
${LOWERCASE PASSWORD}    adrhartjad
${UPPERCASE PASSWORD}    ADRHARTJAD
${NUMBERS PASSWORD}      13462344
${7CHAR PASSWORD}       asdfghj
${SYMBOL ONLY PASSWORD}    !@#$%^&*()_-+=
@{WEAK PASSWORDS}    ${7CHAR PASSWORD}    ${UPPERCASE PASSWORD}    ${LOWERCASE PASSWORD}    ${COMMON PASSWORD}    ${7CHAR PASSWORD}    ${NUMBERS PASSWORD}    ${SYMBOL ONLY PASSWORD}

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
${LOCAL USER LOGIN}                  //input[@id='name']
${LOCAL USER NAME}                   //input[@id='fullName']
${LOCAL USER EMAIL}                  //input[@id='email']
${LOCAL USER CHANGE PASSWORD BUTTON}     //button[text()="${CHANGE PASSWORD BUTTON TEXT}"]
${LOCAL USER CHANGE PASSWORD SAVE}    //form[@name="changePasswordForm"]//button[text()="${SAVE BUTTON TEXT}"]
${LOCAL USER CHANGE PASSWORD CANCEL}    //form[@name="changePasswordForm"]//button[text()="${CANCEL BUTTON TEXT}"]
${LOCAL USER PASSWORD INPUT}         //input[@id="newPassword"]
${LOCAL USER DELETE BUTTON}          //button[text()="${DELETE USER TEXT}"]
${LOCAL USER DELETE CONFIRM BUTTON}  //div[@class="process-button"]/button
${LOCAL USER DELETE CANCEL BUTTON}    //div[@class="modal-dialog"]//button[text()="${CANCEL BUTTON TEXT}"]

#svg icons
${USERS ICON}                      *[name()="svg-icon" and @data-src="/static/images/icons/standard/users.svg"]
${LOCAL USER ICON}                 *[name()="svg-icon" and @data-src="/static/images/icons/standard/user.svg"]
${CAMERAS ICON}                    *[name()="svg-icon" and @data-src="/static/images/icons/standard/cameras.svg"]
${SERVERS ICON}                    *[name()="svg-icon" and @data-src="/static/images/icons/standard/servers.svg"]
${SYSTEMS ICON}                    *[name()="svg-icon" and @data-src="/static/images/icons/standard/systems.svg"]