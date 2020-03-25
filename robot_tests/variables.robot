*** Settings ***
Variables    getvars.py

*** Variables ***
${ALERT}                              //div[contains(@class,'toast-body')]//span[contains(@class,'toast-content')]
${ALERT CLOSE}                        //div[contains(@class,'toast-body')]/button[contains(@class,'close') and @data-dismiss='alert']

${BROWSER}                            Chrome

${LANGUAGE DROPDOWN}                  //nx-language-select//button[@id='dropdownMenuButton']
${LANGUAGE TO SELECT}                 //nx-language-select//span[@lang='${LANGUAGE}']/..
${DOWNLOAD LINK}                      //footer//a[@href="/download" and @class="ng-star-inserted"]

@{LANGUAGES LIST}                             en_US                  en_GB                  ru_RU                           fr_FR                  de_DE                 es_ES                       hu_HU                  zh_CN      zh_TW      ja_JP          ko_KR       tr_TR              th_TH                  nl_NL                he_IL                  pl_PL                  vi_VN
@{LANGUAGES ACCOUNT TEXT LIST}                Account                Account                Учетная запись                  Compte                 Account               Cuenta                      Fiók                   帐户        帳號       アカウント        계정         Hesap             บัญชีผู้ใช้                 Account             חשבון                   Konto                  Tài khoản
@{LANGUAGES ACCOUNT INFORMATION TEXT LIST}    Account Information    Account Information    Информация об учетной записи    Compte Information     Kontoinformationen    Información de la Cuenta    Account Information    帐户信息    帳戶資訊    アカウント情報    계정 정보    Hesap Bilgileri    Account Information    Accountinformatie    פרטי חשבון             Informacje o koncie    Account Information

@{LANGUAGES CREATE ACCOUNT TEXT LIST}    Create Account  Create Account  Зарегистрироваться  Créer compte  Account erstellen  Crear Cuenta  Fiók létrehozása  创建帐户  新建帳號  アカウント作成  계정 만들기  Hesap oluştur  สร้างบัญชี   Account aanmaken  צור חשבון   Utwórz konto  Tạo tài khoản
@{USER TYPE LIST}    ${OWNER TEXT}    ${ADMIN TEXT}    ${ADV VIEWER TEXT}    ${VIEWER TEXT}    ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}

${BACKDROP}                           //ngb-modal-backdrop
${MODAL DIALOG}                       //ngb-modal-window/div[contains(@class,'modal-dialog')]/div[contains(@class,'modal-content')]

${COMBO TEXT}                         Кенг☿☂⊗⅓您都可以`~!@#$%계정이 이
${CYRILLIC TEXT}                      Кенгшщзх
${SMILEY TEXT}                        ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★
${GLYPH TEXT}                         您都可以享受源源不あなたのアカウント
${SYMBOL TEXT}                        `~!@#$%^&*()_:";'{}[]+<>?,./\
${TM TEXT}                            qweasdzxc123®™
${KOREAN TEXT}                        계정이 이미 활성

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

${LOG IN NAV BAR}                     //nav//a/span[contains(text(),'${LOG IN BUTTON TEXT}')]/..
${YOU HAVE NO SYSTEMS}                //span[contains(text(),"${YOU HAVE NO SYSTEMS TEXT}")]

#Header
${ACCOUNT DROPDOWN}                   //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown"]
${LOG OUT BUTTON}                     //li[contains(@class, 'collapse-first')]//a/span[contains(text(),"${LOG OUT BUTTON TEXT}")]/..
${LOGO LINK}                          //header//a[@href='/']
${ACCOUNT SETTINGS BUTTON}            //li//a[@href = '/account']
${CHANGE PASSWORD BUTTON DROPDOWN}    //li//a[@href = '/account/password']
${RELEASE HISTORY BUTTON}             //a[@href="/downloads/history" and contains(text(),"${RELEASE HISTORY BUTTON TEXT}")]
${SYSTEMS DROPDOWN}                   //header//li[contains(@class, 'collapse-second')]//button[@id='systemsDropdown']
${OPEN IN NX BUTTON}                  //nx-client-button//nx-process-button//button
${OPEN IN NX BUTTON DISABLED}         ${OPEN IN NX BUTTON}${DISABLED}
${ALL SYSTEMS}                        //header//li[contains(@class, 'collapse-second')]//a[@href='/systems']

${AUTHORIZED BODY}                    //body[contains(@class, 'authorized')]
${ANONYMOUS BODY}                     //body[contains(@class,'anonymous')]
${CREATE ACCOUNT HEADER}              //header//a[@href='/register']
${CREATE ACCOUNT BODY}                //nx-app//a[@href='/register']

${LOG IN BODY}                        //nx-app//a[@href='/login']

#Forgot Password
${RESET PASSWORD FORM}                //form[@name='restorePasswordWithCode']
${RESTORE PASSWORD EMAIL INPUT}       //form[@name='restorePassword']//nx-email-input/input
${RESET PASSWORD BUTTON}              //form[@name='restorePassword']//button[contains(@class,'btn btn-primary')]
${RESET PASSWORD INPUT}               //form[@name='restorePasswordWithCode']//input[@id='newPassword']
${SAVE PASSWORD}                      //form[@name='restorePasswordWithCode']//button[contains(@class,'btn btn-primary')]
${RESET EMAIL SENT MESSAGE}           //h1/span[contains(text(),"${RESET EMAIL SENT MESSAGE TEXT}")]
${RESET SUCCESS MESSAGE}              //h1[contains(text(),"${RESET SUCCESS MESSAGE TEXT}")]
${RESET SUCCESS LOG IN LINK}          //div[contains(@class,'process-success')]//a[contains(@class,'btn btn-primary')]
${RESET EYE ICON OPEN}                ${RESET PASSWORD FORM}${EYE ICON OPEN}
${RESET EYE ICON CLOSED}              ${RESET PASSWORD FORM}${EYE ICON CLOSED}

#Change Password
${CHANGE PASSWORD FORM}               //nx-account-password-component//form
${CURRENT PASSWORD INPUT}             ${CHANGE PASSWORD FORM}//input[@id='password']
${NEW PASSWORD INPUT}                 ${CHANGE PASSWORD FORM}//input[@id='newPassword']
${CHANGE PASSWORD BUTTON}             //nx-account-password-component//nx-apply//nx-process-button//button
${CANCEL CHANGES BUTTON}              //nx-account-password-component//nx-apply//button[contains(text(), "${CANCEL CHANGES BUTTON TEXT}")]
${PASSWORD IS REQUIRED}               //span[contains(@class,'input-error') and contains(text(),"${PASSWORD IS REQUIRED TEXT}")]
${CHANGE PASS EYE ICON OPEN}          ${CHANGE PASSWORD FORM}${EYE ICON OPEN}
${CHANGE PASS EYE ICON CLOSED}        ${CHANGE PASSWORD FORM}${EYE ICON CLOSED}
${CHANGE PASS NO CHANGES}             //div[contains(@class, "placeholder-text-no-changes")]

#Register Form Elements
${REGISTER FORM}                      //form[@id='registerForm']
${REGISTER FIRST NAME INPUT}          ${REGISTER FORM}//input[@id='firstName']
${REGISTER LAST NAME INPUT}           ${REGISTER FORM}//input[@id='lastName']
${REGISTER EMAIL INPUT}               ${REGISTER FORM}//input[@id='registerEmail']
${REGISTER EMAIL INPUT LOCKED}        ${REGISTER FORM}//input[@name='registerEmailLocked']
${REGISTER PASSWORD INPUT}            ${REGISTER FORM}//input[@id='registerPassword']

${TERMS AND CONDITIONS CHECKBOX VISIBLE}    ${REGISTER FORM}//label[@class="nx-checkbox"]
${TERMS AND CONDITIONS CHECKBOX REAL}       ${REGISTER FORM}//input[@id='accept']

${CREATE ACCOUNT BUTTON}              ${REGISTER FORM}//button[contains(text(),"${CREATE ACCOUNT BUTTON TEXT}")]
${TERMS AND CONDITIONS LINK}          ${REGISTER FORM}//a[@href='/content/eula']
${TERMS AND CONDITIONS ERROR}         ${REGISTER FORM}//span[@class='help-block input-error' and contains(text(),"${TERMS AND CONDITIONS ERROR TEXT}")]
${PRIVACY POLICY LINK}                ${REGISTER FORM}//a[@href='${PRIVACY POLICY URL HREF}']
${RESEND ACTIVATION LINK BUTTON}      //form[@name= 'loginForm']//a[contains(text(),"${RESEND ACTIVATION LINK BUTTON TEXT}")]
${REGISTER EYE ICON OPEN}             ${REGISTER FORM}${EYE ICON OPEN}
${REGISTER EYE ICON CLOSED}           ${REGISTER FORM}${EYE ICON CLOSED}

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#Register form errors
${FIRST NAME IS REQUIRED}             //span[contains(@class,'input-error') and contains(text(),"${FIRST NAME IS REQUIRED TEXT}")]
${LAST NAME IS REQUIRED}              //span[contains(@class,'input-error') and contains(text(),"${LAST NAME IS REQUIRED TEXT}")]
${EMAIL IS REQUIRED}                  //span[contains(@class,'input-error') and contains(text(),"${EMAIL IS REQUIRED TEXT}")]
${EMAIL ALREADY REGISTERED}           //span[contains(@class,'input-error') and contains(text(),"${EMAIL ALREADY REGISTERED TEXT}")]
${EMAIL INVALID}                      //span[contains(@class,'input-error') and contains(text(),"${EMAIL INVALID TEXT}")]
${PASSWORD SPECIAL CHARS}             //span[contains(@class,'input-error') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD IS WEAK}                   //span[contains(@class,'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]
${PASSWORD TOO SHORT}                 //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}                //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#targets the open nx witness button presented when logging in after activating with from=mobile or client
${OPEN NX WITNESS BUTTON FROM =}      //button[text()="${OPEN NX WITNESS BUTTON TEXT}"]

${ACCOUNT CREATION SUCCESS}           //h2[@name="ACCOUNT_CREATED" and contains(text(),"${ACCOUNT CREATED TEXT}")]
${ACCOUNT CREATION SUCCESS ICON}      //div[@name="ACCOUNT_CREATED"]/svg-icon
${ACCOUNT CREATION CONFIRMATION}      ${ACCOUNT CREATION SUCCESS}/following-sibling::div[@name="ACCOUNT_CREATED"]

${ACTIVATION SUCCESS}                 //h2[@name="ACCOUNT_ACTIVATED" and contains(text(),"${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]
${ACTIVATION SUCCESS ICON}            //div[@name="ACCOUNT_ACTIVATED"]/svg-icon
${SUCCESS LOG IN BUTTON}              //h1[@class='process-success' and contains(text(),"${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]/following-sibling::h1/a[text()="${LOG IN BUTTON TEXT}"]

${SYSTEM NAME OFFLINE}                //nx-ribbon/div[contains(@class,'alert-ribbon')]/div[@class='message']//div[contains(text(),'${SYSTEM IS OFFLINE TEXT}')]

#In system settings
${SYSTEM NAME}                        //h2[contains(@class,"system-name")]
${FIRST USER OWNER}                   //table[@ng-if='system.users.length']/tbody/tr/td[3]/span[contains(text(),"${OWNER TEXT}")]
${DISCONNECT FROM NX}                 //button/span[text()='${DISCONNECT FROM CLOUD TEXT}']/..
${RENAME SYSTEM}                      //button/span[text()='${RENAME}']/..
${RENAME CANCEL}                      //form[@name='renameForm']//button[text()='${CANCEL BUTTON TEXT}']
${RENAME X BUTTON}                    //form[@name='renameForm']//button[contains(@class,'close')]
${RENAME SAVE}                        //form[@name='renameForm']//button[text()='${SAVE BUTTON TEXT}']

${RENAME INPUT}                       //form[@name='renameForm']//input[@id='systemName']
${RENAME INPUT WITH ERROR}            //form[@name='renameForm']//input[@id='systemName' and contains(@class,'ng-invalid')]
${SYSTEM NAME IS REQUIRED}            //form[@name='renameForm']//span[@class='input-error' and contains(text(),"${SYSTEM NAME IS REQUIRED TEXT}")]

${SYSTEM USER DETAILS}                //nx-system-settings-component//nx-block/..

${SYSTEM SAVE}                        //nx-apply//nx-process-button//button
${SYSTEM CANCEL}                      //nx-apply//button[@type='button']

${USER EMAIL}                         ${SYSTEM USER DETAILS}//header//h2[contains(@class,'user-email')]
${USER NAME}                          ${USER EMAIL}/following-sibling::span[contains(@class,'user-name')]
${OWNER LABEL}                        ${SYSTEM USER DETAILS}//header//h2/following-sibling::span[contains(@class,'system-owner')]/span[contains(text(),'${OWNER TEXT}')]
${OWNER NAME}                         ${OWNER LABEL}//following-sibling::span//span[contains(text(),'%OWNER_NAME%')]
${OWNER EMAIL}                        ${OWNER LABEL}/following-sibling::span/span[contains(text(),"${EMAIL OWNER}")]
${YOUR ACCESS LEVEL}                  ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'system-owner')]/span[contains(text(),"${YOUR ACCESS LEVEL TEXT}")]

${DISCONNECT FROM MY ACCOUNT}         //button[contains(text(),'${DISCONNECT FROM MY ACCOUNT TEXT}')]

${ACCESS LEVEL DROPDOWN}              ${SYSTEM USER DETAILS}//nx-section//button[@id='permissionsSelect']
${HELP BLOCK}                         ${SYSTEM USER DETAILS}//nx-section//span[contains(@class,'help-block')]
${REMOVE USER BUTTON}                 ${SYSTEM USER DETAILS}//button[contains(text(),'${REMOVE USER BUTTON TEXT}')]
${DISABLE USER SWITCH}                ${SYSTEM USER DETAILS}//input[@id='undefined']
${USER DISABLED MSG}                  ${SYSTEM USER DETAILS}//span[contains(@class,'text-danger')]
${REMOVE USER MODAL}                  ${MODAL DIALOG}
${REMOVE BUTTON}                      ${MODAL DIALOG}//button[contains(text(),'${REMOVE BUTTON TEXT}')]
${REMOVE CANCEL BUTTON}               ${MODAL DIALOG}//button[contains(text(),"${CANCEL BUTTON TEXT}")]

${USERS LIST LINK}                    //a[@id='users']
${USERS LIST}                         ${USERS LIST LINK}/../../div[contains(@class,'level-3-items')]

${SYSTEM ADMINISTRATION LINK}         //a[@id='admin']

${SHARE BUTTON SYSTEMS}               //nx-system-settings-component//nx-menu//nx-menu-button//button
${SHARE BUTTON DISABLED}              ${SHARE BUTTON SYSTEMS}${DISABLED}

${SYSTEM NO ACCESS}                   //h2[@name="FAILED_TO_ACCESS_SYSTEM" and contains(text(),"${SYSTEM NO ACCESS TEXT}")]
${AVAILABLE SYSTEMS LIST}             //a[@href='/systems']
${SYSTEMS SEARCH INPUT}               //nx-systems-list-component//div[contains(@class,'search-block')]//input
${SYSTEM SEARCH X BUTTON}             ${SYSTEMS SEARCH INPUT}//preceding::a[contains(@class,'input-overlay-right')]

${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}    //nx-checkbox[@name="autoDiscoveryEnabled"]
${ENABLE AUTO DISCOVERY CHECKBOX REAL}     //*[@id="autoDiscoveryEnabled"]
${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}      //nx-checkbox[@name="statisticsAllowed"]
${SEND ANONYMOUS USAGE CHECKBOX REAL}      //*[@id="statisticsAllowed"]
${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}     //nx-checkbox[@name="cameraSettingsOptimization"]
${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}     //*[@id="cameraSettingsOptimization"]

${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}        //nx-checkbox[@name='auditTrailEnabled']
${ENABLE AUDIT TRAIL CHECKBOX REAL}        //*[@id='auditTrailEnabled']
${ALLOW ONLY SECURE CHECKBOX VISIBLE}         //nx-checkbox[@name='trafficEncryptionForced']
${ALLOW ONLY SECURE CHECKBOX REAL}         //*[@id='trafficEncryptionForced']
${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}     //nx-checkbox[@name='videoTrafficEncryptionForced']
${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}     //*[@id='videoTrafficEncryptionForced']
${LIMIT SESSION DURATION CHECKBOX VISIBLE}    //nx-checkbox[@name='sessionLimitMinutes']
${LIMIT SESSION DURATION CHECKBOX REAL}    //*[@id='sessionLimitMinutes']
${TIME NUMBER INPUT}                  //*[@type='number']
${TIME DURATION INTERVAL BUTTON}        //*[@id="genericSelect"]
${TIME DURATION INTERVAL TEXT}            ${TIME DURATION INTERVAL BUTTON}/span
${TIME DURATION NEW SELECTION}            //*[@aria-labelledby='genericSelect']//a[contains(@class,"dropdown-item inset")]

#Merge
${MERGE BUTTON SYSTEM}                //button/span[text()="${MERGE SYSTEM BUTTON TEXT}"]/..
${MERGE BUTTON SYSTEM DISABLED}       //button[@disabled]/span[text()="${MERGE SYSTEM BUTTON TEXT}"]
${MERGE DIALOG}                       //nx-modal-merge-content
${MERGE FORM}                         //form[@name="mergeForm"]
${MERGE SYSTEM DROPDOWN}              ${MERGE DIALOG}//button[@id="system"]
${MERGE X BUTTON}                     ${MERGE DIALOG}//button[contains(@class,"close")]
${MERGE OK BUTTON}                    ${MERGE DIALOG}//button[contains(@class,"btn btn-primary") and contains(text(),"${OK TEXT}")]
${MERGE CANCEL BUTTON}                ${MERGE DIALOG}//button[@class="btn btn-default"]
${MERGE BUTTON MODAL}                 ${MERGE DIALOG}//button[@class="btn btn-primary" and contains(text(),"${MERGE SYSTEMS TEXT}")]
${MERGE PASSWORD INPUT}               ${MERGE DIALOG}//input[@id="mergePassword"]
${CURRENTLY MERGING CARD}             //div[contains(@class,"card-body")]
${CURRENTLY MERGING DOTS}             ${CURRENTLY MERGING CARD}//div[contains(@class, "circleG circleG_")]
${MERGE NOT OWNER MESSAGE 2}          ${MERGE DIALOG}//p[@class='help-block-no-height'][2]
${MERGE FAILED DIALOG HEADER}         //nx-modal-generic-content//h1/span[contains(text(),"${SYSTEMS MERGE FAILED TEXT}")]
${MERGE FAILED OK BUTTON}             //nx-modal-generic-content//button[contains(text(),"${OK TEXT}")]
${MERGE FAILED X BUTTON}              //nx-modal-generic-content//button[contains(@class,"close")]
${MERGE CURRENT SYSTEM WITH}          ${MERGE DIALOG}//label[contains(text(),"${MERGE CURRENT SYSTEM WITH TEXT}")]
${MERGE ONLY AS OWNER}                ${MERGE DIALOG}//p[contains(text(),"${YOU CAN ONLY MERGE AS OWNER TEXT}")]
${MERGE CHECKING HINT}                ${MERGE DIALOG}//p[contains(text(),"${CHECKING TEXT}")]
${MERGE ENTER YOUR PASSWORD}          ${MERGE FORM}//label[contains(text(),"${ENTER PASSWORD TO CONTINUE TEXT}")]
${MERGE PASSWORD REQUIRED}            ${MERGE FORM}//label[@class="input-error" and contains(text(),"${PASSWORD IS REQUIRED TEXT}")]
${MERGE PASSWORD INCORRECT}           ${MERGE FORM}//label[@class="input-error" and contains(text(),"${WRONG PASSWORD}")]

#Disconnect from cloud portal
${DISCONNECT FORM}                    //form[@name='disconnectForm']
${DISCONNECT FORM CANCEL}             ${DISCONNECT FORM}//button[text()='${CANCEL BUTTON TEXT}']
${DISCONNECT FORM HEADER}             //h1["${DISCONNECT FORM HEADER TEXT}"]
${DISCONNECT PASSWORD INPUT}          ${DISCONNECT FORM}//input[@id="password"]
${DISCONNECT FORM DISCONNECT BUTTON}    ${DISCONNECT FORM}//button[contains(text(),"${DISCONNECT BUTTON TEXT}")]

#Disconnect from my account
${DISCONNECT MODAL WARNING}              ${MODAL DIALOG}//p[contains(text(),"${DISCONNECT MODAL WARNING TEXT}")]
# extra spaces here temporarily
${DISCONNECT MODAL CANCEL}               ${MODAL DIALOG}//button/span[contains(text(),'${CANCEL BUTTON TEXT}')]/..
${DISCONNECT MODAL DISCONNECT BUTTON}    ${MODAL DIALOG}//button[contains(text(),'${DISCONNECT BUTTON TEXT}')]

${JUMBOTRON}                          //div[@class='jumbotron']
${PROMO BLOCK}                        //div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]
${ALREADY ACTIVATED}                  //h1[contains(@class,"process-success") and contains(text(),"${ALREADY ACTIVATED TEXT}")]

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
${SHARE MODAL}                        //form[@name='addUserForm']
${SHARE EMAIL}                        ${SHARE MODAL}//input[@id='email']
${SHARE PERMISSIONS DROPDOWN}         ${SHARE MODAL}//nx-permissions-select//button[@id='permissionsSelect']
${SHARE BUTTON MODAL}                 ${SHARE MODAL}//button[text()='${ADD BUTTON TEXT}']
${SHARE CANCEL}                       ${SHARE MODAL}//button[text()='${CANCEL BUTTON TEXT}']
${SHARE CLOSE}                        ${SHARE MODAL}//button[@data-dismiss='modal']
${SHARE PERMISSIONS HINT}             ${SHARE MODAL}//span[contains(@class,'help-block')]

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
${ACCOUNT SAVE}                       //nx-apply//nx-process-button//button
${ACCOUNT CANCEL}                     //nx-apply/div/button
${APPLY CHANGES BUTTON}               ${MODAL DIALOG}//button[contains(text(), '${APPLY CHANGES BUTTON TEXT}')]
${DISCARD CHANGES BUTTON}             ${MODAL DIALOG}//button[contains(text(), '${DISCARD CHANGES BUTTON TEXT}')]
${NO UNSAVED CHANGES}                 //nx-apply//div[text()='${NO UNSAVED CHANGES TEXT}']

#Downloads
${DOWNLOADS HEADER}                   //h1[contains(text(),"${DOWNLOADS HEADER TEXT}")]
${DOWNLOAD WINDOWS VMS LINK}          //div[contains(text(),"Windows x64 - Client & Server")]/../..
${DOWNLOAD UBUNTU VMS LINK}           //div[contains(text(),"Ubuntu x64 - Client")]/../..
${DOWNLOAD MAC OS VMS LINK}           //div[contains(text(),"Mac OS - Client")]/../..
${DOWNLOAD ARM VMS LINK}              //div[contains(text(),"ARM") and contains(text(),"Client")]/../..
${ITUNES STORE DOWNLOAD BUTTON}       //a[contains(@class,"mobile-link iOS")]
${PLAY STORE DOWNLOAD BUTTON}         //a[contains(@class,"mobile-link Android")]

${WINDOWS TAB}                        //a[@id="windows"]
${UBUNTU TAB}                         //a[@id="linux"]
${MAC OS TAB}                         //a[@id="macos"]
${ARM TAB}                            //a[@id="arm"]

#History
${RELEASES TAB}                       //span[contains(@class,'tab-heading') and text()='${RELEASES TAB TEXT}']/..
${PATCHES TAB}                        //span[contains(@class,'tab-heading') and text()='${PATCHES TAB TEXT}']/..
${BETAS TAB}                          //span[contains(@class,'tab-heading') and text()='${BETAS TAB TEXT}']/..
${RELEASE NUMBER}                     //div[contains(@class,"active")]//h1

#Integration Landing Page
${INTEGRATIONS COMPONENT}             //nx-app//integrations-component/div[@class="intergations"]
${INTEGRATIONS SEARCH}                ${INTEGRATIONS COMPONENT}//nx-search[@name="filterModel"]/div[@class="nx-search"]
${INTEGRATIONS SEARCH INPUT}          ${INTEGRATIONS SEARCH}//input[contains(@class, "search-input") and contains(@placeholder, "Search")]
${INTEGRATIONS SEARCH CLOSE BUTTON}   ${INTEGRATIONS SEARCH}//button[contains(@class, "search-clear")]
${INTEGRATIONS SEARCH ICON}           ${INTEGRATIONS SEARCH}//span[contains(@class, "icon-search")]
${INTEGRATIONS SEARCH FILTER}         ${INTEGRATIONS SEARCH}//div[contains(@class, "search-tags")]//nav[contains(@aria-label, "table")]/ul[contains(@class, "pagination")]
${INTEGRATIONS SEARCH FILTER ITEM}    ${INTEGRATIONS SEARCH FILTER}/li
${INTEGRATIONS CATALOG}               ${INTEGRATIONS COMPONENT}//integrations-list-component/div[1]

#Integration Tile
${INTEGRATION TILE}                   ${INTEGRATIONS COMPONENT}//integrations-list-component//nx-block/div[contains(@class, "card")]/../../..
${INTEGRATION TEST INTEGRATION LINK}   ${INTEGRATION TILE}/a
${INTEGRATION TILE LOGO}              ${INTEGRATION TILE}//div[contains(@class, "card--header-logo")]
${INTEGRATION TILE INFO}              ${INTEGRATION TILE}//div[contains(@class, "card--header-info")]
${INTEGRATION TILE NAME}              ${INTEGRATION TILE}//div[contains(@class, "card--body-name")]
${INTEGRATION TILE TEXT}              ${INTEGRATION TILE}//div[contains(@class, "card--body-descr")]
${INTEGRATION TILE HEADER}            ${INTEGRATION TILE}//div[@class="card--header extended-header"]
#${INTEGRATION TILE BODY}              ${INTEGRATION TILE}//nx-section/child::div[@class="card--body"]
${INTEGRATION TILE FOOTER}            ${INTEGRATION TILE}//div[@class="card--footer"]
@{INTEGRATION TILE ELEMENTS}          //div[contains(@class, "card--header-logo")]    //div[contains(@class, "card--header-info")]    //div[contains(@class, "card--body-name")]    //div[contains(@class, "card--body-descr")]    //div[@class="card--header extended-header"]    //div[@class="card--footer"]

#Integration Details Page
${INTEGRATION DETAILS COMPONENT}          //nx-app//integration-detail-component/div[contains(@class, "integration-details")]
${INTEGRATION CARD}                       ${INTEGRATION DETAILS COMPONENT}//nx-block/div[@class="card"]
${INTEGRATION ALL INTEGRATIONS}           ${INTEGRATION DETAILS COMPONENT}//button/span[contains(text(), "${ALL INTEGRATIONS TEXT}")]
${INTEGRATION RIGHT PANEL}                ${INTEGRATION DETAILS COMPONENT}//div[@class="right-menu"]
${INTEGRATION DOWNLOADS SECTION}          ${INTEGRATION RIGHT PANEL}//nx-block/div[@class="card gray"]/child::div/child::h4/child::header[contains(text(), "${INTEGRATION DOWNLOADS TEXT}")]
${INTEGRATION REQUIREMENTS SECTION}       ${INTEGRATION RIGHT PANEL}//nx-block/div[@class="card gray"]/child::div/child::h4/child::header[contains(text(), "${INTEGRATION REQUIREMENTS TEXT}")]
${INTEGRATION HOW IT WORKS HEADER}        ${INTEGRATION CARD}//header[contains(text(), "${INTEGRATION HOW IT WORKS TEXT}")]
${INTEGRATION HOW TO SETUP HEADER}        ${INTEGRATION CARD}//header[contains(text(), "${INTEGRATION HOW TO SETUP TEXT}")]

#Integration Details Left Panel
${INTEGRATION TITLE}                            ${INTEGRATION DETAILS COMPONENT}//div[contains(@class, "title")]
${INTEGRATION VERSION}                          ${INTEGRATION DETAILS COMPONENT}//div[contains(@class, "version")]
${INTEGRATION HOW IT WORKS LINK}                ${INTEGRATION DETAILS COMPONENT}//nx-menu//a/child::div/child::span[text()="${INTEGRATION HOW IT WORKS TEXT}"]
${INTEGRATION HOW IT WORKS VIDEO}               ${INTEGRATION DETAILS COMPONENT}//nx-external-video
${INTEGRATION HOW IT WORKS CAROUSEL}            ${INTEGRATION DETAILS COMPONENT}//nx-carousel//div[contains(@class, "carousel")]
${INTEGRATION HOW TO SETUP LINK}                ${INTEGRATION DETAILS COMPONENT}//nx-menu//a[@id="how-to-setup"]/child::div/child::span[contains(text(), "${INTEGRATION HOW TO SETUP TEXT}")]
${INTEGRATION HOW TO SETUP VIDEO}               ${INTEGRATION HOW IT WORKS VIDEO}
${INTEGRATION HOW TO SETUP CAROUSEL}            ${INTEGRATION HOW IT WORKS CAROUSEL}
${INTEGRATION CAROUSEL RIGHT BUTTON}            ${INTEGRATION DETAILS COMPONENT}//nx-carousel//span[@role="button"]/div[contains(@class, "right")]
${INTEGRATION CAROUSEL LEFT BUTTON}             ${INTEGRATION DETAILS COMPONENT}
${INTEGRATION CAROUSEL PREVIEW}                 ${INTEGRATION DETAILS COMPONENT}//nx-carousel//div[@class= "btn-group carousel-preview"]
${INTEGRATION CAROUSEL SCREENSHOT NAME}         ${INTEGRATION DETAILS COMPONENT}//div[contains(@class, "carousel-item-caption")]
${INTEGRATION TAGS SECTION}                     ${INTEGRATION DETAILS COMPONENT}//div/child::div/child::label[contains(text(), "${INTEGRATION TAGS TEXT}")]
${INTEGRATION GET IN TOUCH LABEL}               ${INTEGRATION DETAILS COMPONENT}//label[contains(text(), "${INTEGRATION CONTACT TEXT}")]
${INTEGRATION GET IN TOUCH BUTTON}              ${INTEGRATION DETAILS COMPONENT}//button[contains(@class, "btn btn-primary")]
${INTEGRATION DEVELOPER LABEL}                  ${INTEGRATION DETAILS COMPONENT}//label[contains(text(), "${INTEGRATION DEVELOPER TEXT}")]
${INTEGRATION DEVELOPER COMPANY LINK}           ${INTEGRATION DETAILS COMPONENT}//label[text()="${INTEGRATION DEVELOPER TEXT}"]/../following-sibling::div/a
${INTEGRATION DEVELOPER TERMS OF USE LINK}      ${INTEGRATION DETAILS COMPONENT}//a[contains(text(), "${INTEGRATION TERMS OF USE TEXT}")]
${INTEGRATION SUPPORT LABEL}                    ${INTEGRATION DETAILS COMPONENT}//label[contains(text(), "${INTEGRATION SUPPORT TEXT}")]
${INTEGRATION SUPPORT LINK}                     ${INTEGRATION DETAILS COMPONENT}//a[contains(text(), "${INTEGRATION SUPPORT URL TEXT}")]
${INTEGRATION SUPPORT EMAIL}                    ${INTEGRATION DETAILS COMPONENT}//a[contains(text(), "${INTEGRATION SUPPORT EMAIL TEXT}")]

#Get in Touch Modal
${INTEGRATION GET IN TOUCH FORM}                //ngb-modal-window//div[@class="modal-content"]//form[@name="messageForm"]
${INTEGRATION GET IN TOUCH HEADER}              ${INTEGRATION GET IN TOUCH FORM}//div[contains(@class, "header")]
${INTEGRATION GET IN TOUCH TITLE}               ${INTEGRATION GET IN TOUCH HEADER}//h1[contains(@class, "title")]
${INTEGRATION GET IN TOUCH CLOSE BUTTON}        ${INTEGRATION GET IN TOUCH HEADER}//button[contains(@class, "close")]
${INTEGRATION GET IN TOUCH CLOSE BUTTON ICON}   ${INTEGRATION GET IN TOUCH HEADER}//div[contains(@class, "close-content")]/span[contains(@class, "close-icon")]
${INTEGRATION GET IN TOUCH BODY}                ${INTEGRATION GET IN TOUCH FORM}//div[contains(@class, "body")]/form[@name="feedbackForm"]
${INTEGRATION GET IN TOUCH FOOTER}              ${INTEGRATION GET IN TOUCH FORM}//div[contains(@class, "footer")]
${INTEGRATION GET IN TOUCH TO EMAIL LABEL}      ${INTEGRATION GET IN TOUCH BODY}//label[@for="to_email"]
${INTEGRATION GET IN TOUCH TO EMAIL CONTENT}    ${INTEGRATION GET IN TOUCH BODY}//div[@id="to_email"]
${INTEGRATION GET IN TOUCH NAME LABEL}          ${INTEGRATION GET IN TOUCH BODY}//label[@for="user_name"]
${INTEGRATION GET IN TOUCH NAME INPUT}          ${INTEGRATION GET IN TOUCH BODY}//input[@id="user_name"]
${INTEGRATION GET IN TOUCH EMAIL LABEL}         ${INTEGRATION GET IN TOUCH BODY}//label[@for="user_email"]
${INTEGRATION GET IN TOUCH EMAIL INPUT}         ${INTEGRATION GET IN TOUCH BODY}//input[@id="user_email"]
${INTEGRATION GET IN TOUCH SUBJECT LABEL}       ${INTEGRATION GET IN TOUCH BODY}//label[@for="subject"]
${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}     ${INTEGRATION GET IN TOUCH BODY}//button[@id="subject"]
${INTEGRATION GET IN TOUCH DROPDOWN ICON}       ${INTEGRATION GET IN TOUCH BODY}//div[@class="dropdown"]//div[@class="nav-arrow"]
${INTEGRATION GET IN TOUCH DROPDOWN LIST}       ${INTEGRATION GET IN TOUCH BODY}//div[@class="dropdown"]
${INTEGRATION GET IN TOUCH MESSAGE LABEL}       ${INTEGRATION GET IN TOUCH BODY}//label[@for="message"]
${INTEGRATION GET IN TOUCH MESSAGE INPUT}       ${INTEGRATION GET IN TOUCH BODY}//textarea[@id="message"]
${INTEGRATION GET IN TOUCH PRIVACY LINKS}       ${INTEGRATION GET IN TOUCH BODY}//div[contains(@class, "form-group")]//a[text()="${PRIVACY POLICY LINK TEXT}"]
${INTEGRATION GET IN TOUCH SEND BUTTON}         ${INTEGRATION GET IN TOUCH FOOTER}//nx-process-button/div/button
${INTEGRATION GET IN TOUCH CANCEL BUTTON}       ${INTEGRATION GET IN TOUCH FOOTER}//button[contains(@type, "button")]
${INTEGRATION GET IN TOUCH LEGAL}               ${INTEGRATION GET IN TOUCH FORM}//form[@name="feedbackForm"]/div[6]

#IPVD
${IPVD TITLE}                         //header//li[@class="active"]/a[contains(text(),"${IPVD TITLE TEXT}")]
${IPVD LANDING PAGE TEXT}             //ipvd//p

#IPVD Filters
${IPVD FILTERS}                       //ipvd//nx-search/div/div
${IPVD FILTERS BASIC}                 ${IPVD FILTERS}/div[1]/div
${IPVD SEARCH BAR}                    ${IPVD FILTERS BASIC}/div[1]/input[@name="query"]
${IPVD CLEAR TEXT SEARCH BUTTON}      ${IPVD SEARCH BAR}/../button
${IPVD FILTERS APPLIED BUTTON}        ${IPVD FILTERS BASIC}/div[2]${IPVD ADV FEATURES CLOSE BUTTON}/..
${IPVD ADV SEARCH BUTTON}             ${IPVD FILTERS BASIC}/div/span[contains(text(),'${IPVD ADV SEARCH BUTTON TEXT}')]/..
#IPVD Advanced Filters
${IPVD ADV FILTERS}                   ${IPVD FILTERS}/div[2]/div
${IPVD ADV FILTERS MIN RES}           ${IPVD ADV FILTERS}//nx-select/../label[contains(text(),'${IPVD ADV FILTER MIN RES}')]/..//button[1]
${IPVD ADV FILTERS MFRS}              ${IPVD ADV FILTERS}//nx-multi-select/../label[contains(text(),'${IPVD ADV FILTER MFRS}')]/..//button[1]
${IPVD ADV FILTERS TYPES}             ${IPVD ADV FILTERS}//nx-multi-select/../label[contains(text(),'${IPVD ADV FILTER TYPES}')]/..//button[1]
${IPVD ADV FILTERS ANALYTICS}         ${IPVD ADV FILTERS}//nx-multi-select/../label[contains(text(),'${IPVD ADV FILTER ANALYTICS}')]/..//button[1]
${IPVD ADV FILTERS DROPDOWN MENU}     ${DROPDOWN MENU}
${IPVD ADV FILTERS DROPDOWN MENU ITEMS}    ${DROPDOWN MENU ITEMS}
#IPVD Advanced Filters Features
${IPVD ADV FEATURES}                  ${IPVD ADV FILTERS}//div/label[text()='Features']/..
${IPVD ADV FEATURES AUDIO}            ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE AUDIO}') and not(contains(text(),'${IPVD ADV FEATURE 2-WAY AUDIO}'))]/..
${IPVD ADV FEATURES 2-WAY AUDIO}      ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE 2-WAY AUDIO}')]/..
${IPVD ADV FEATURES PTZ}              ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE PTZ}') and not(contains(text(),'${IPVD ADV FEATURE ADV PTZ}'))]/..
${IPVD ADV FEATURES ADV PTZ}          ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE ADV PTZ}')]/..
${IPVD ADV FEATURES FISHEYE}          ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE FISHEYE}')]/..
${IPVD ADV FEATURES MOTION}           ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE MOTION}')]/..
${IPVD ADV FEATURES I/O}              ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE I/O}')]/..
${IPVD ADV FEATURES H.265}            ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE H.265}')]/..
${IPVD ADV FEATURES MULTI SENSOR}     ${IPVD ADV FEATURES}//nx-tag/div[contains(text(),'${IPVD ADV FEATURE MULTI SENSOR}')]/..
${IPVD ADV FEATURES CLOSE BUTTON}     //span[contains(@class,'close-button')]
#IPVD Manufacturers
${IPVD MANUFACTURERS PANE}            //ipvd//nx-vendor-list/nx-block[@id='vendors']
${IPVD MANUFACTURERS PANE ITEM}       ${IPVD MANUFACTURERS PANE}//*[contains(@class,"float-left mr-1 mb-1")]
${IPVD AND MORE}                      ${IPVD MANUFACTURERS PANE}//div[@class="manufacture-info"]
#IPVD Devices
${IPVD DEVICES PANE}                  //ipvd//nx-vendor-list/nx-block[@id='cameras']
${IPVD DEVS FILTER EXTRA HIGH RES CAMERAS}    ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER EXTRA HIGH RES CAMERAS}')]/..
${IPVD DEVS FILTER CAMERAS WITH ADV PTZ}      ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER CAMERAS WITH ADV PTZ}')]/..
${IPVD DEVS FILTER PTZ CAMERAS}               ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER PTZ CAMERAS}')]/..
${IPVD DEVS FILTER CAMERAS WITH AUDIO}        ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER CAMERAS WITH AUDIO}')]/..
${IPVD DEVS FILTER H.265 CAMERAS}             ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER H.265 CAMERAS}')]/..
${IPVD DEVS FILTER ENCODERS}                  ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER ENCODERS}')]/..
${IPVD DEVS FILTER 2-WAY AUDIO DEVICES}       ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER 2-WAY AUDIO DEVICES}')]/..
${IPVD DEVS FILTER MULTI-SENSOR CAMERAS}      ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER MULTI-SENSOR CAMERAS}')]/..
${IPVD DEVS FILTER FISHEYE CAMERAS}           ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER FISHEYE CAMERAS}')]/..
${IPVD DEVS FILTER I/O MODULES}               ${IPVD DEVICES PANE}//nx-tag/div[contains(text(),'${IPVD DEV FILTER I/O MODULES}')]/..
#IPVD Details
${IPVD DEVICE DETAILS}                //ipvd//nx-cam-view
${IPVD DEVICE MAKE}                   ${IPVD DEVICE DETAILS}//div[@class="camera-vendor-model"]//span[1]
${IPVD DEVICE MODEL}                  ${IPVD DEVICE DETAILS}//div[@class="camera-vendor-model"]//span[2]
${IPVD DEVICE RESOLUTION}             ${IPVD DEVICE DETAILS}//div[@class='active-camera-info']//nx-bool-icon[contains(@param, 'maxResolution')]/..
${IPVD CLOSE DETAILS BUTTON}          //ipvd//header//span[@class="glyphicon close-icon detailsClose"]
#IPVD Table
${IPVD TABLE}                         //ipvd//table
${IPVD TABLE HEADING MANUFACTURER}    ${IPVD TABLE}/thead//div[text()='${IPVD ADV FILTER MFR}']
${IPVD TABLE HEADING LABEL SORT ARROW}    /../div[2]
${IPVD TABLE ROWS}                    ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')]
${IPVD TABLE FIRST ITEM}              ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')][1]
${IPVD TABLE LAST ITEM}               ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')][last()]
#IPVD Pagination
${IPVD PAGINATION}                    //ipvd//ngb-pagination/ul
${IPVD PREVIOUS PAGE BUTTON}          ${IPVD PAGINATION}/li[1]
${IPVD FIRST PAGE BUTTON}             ${IPVD PAGINATION}/li[1]/following::li[1]
${IPVD LAST PAGE BUTTON}              ${IPVD PAGINATION}/li[last()]/preceding::li[1]
${IPVD NEXT PAGE BUTTON}              ${IPVD PAGINATION}/li[last()]
#IPVD Export
${IPVD EXPORT TO CSV}                 //ipvd//div[@class='export-button']
#IPVD Feedback
${IPVD SUBMIT A REQUEST LINK}        ${IPVD LANDING PAGE TEXT}//a
${IPVD SUBMIT A REQUEST}              //ipvd//a[contains(text(),"${IPVD SUBMIT A REQUEST TEXT}")]
${IPVD SEND DEVICE FEEDBACK}          //ipvd//a[contains(text(),"${IPVD SEND DEVICE FEEDBACK TEXT}")]
${IPVD FEEDBACK}                      //nx-modal-message-content//form[@name='messageForm']
${IPVD FEEDBACK TITLE}                ${IPVD FEEDBACK}//h1
${IPVD FEEDBACK FORM}                 ${IPVD FEEDBACK}//form[@name='feedbackForm']
${IPVD FEEDBACK YOUR NAME}            ${IPVD FEEDBACK FORM}//input[@id='user_name']
${IPVD FEEDBACK EMAIL}                ${IPVD FEEDBACK FORM}//input[@id='user_email']
${IPVD FEEDBACK MESSAGE}              ${IPVD FEEDBACK FORM}//textarea[@id='message']
${IPVD FEEDBACK PRIVACY POLICY}       ${IPVD FEEDBACK FORM}//a[text()="${PRIVACY POLICY LINK TEXT}"]
${IPVD FEEDBACK SEND BUTTON}          ${IPVD FEEDBACK}//button[text()="${SEND BUTTON TEXT}"]
${IPVD FEEDBACK CANCEL BUTTON}        ${IPVD FEEDBACK}//button[text()="${CANCEL BUTTON TEXT}"]
${IPVD FEEDBACK CLOSE BUTTON}         ${IPVD FEEDBACK}//button[contains(@class,'close')]

${NOTHING FOUND PLACEHOLDER}          //div[contains(@class,'text-placeholder') and contains(text(),"${NOTHING FOUND}")]

#Health Monitor
${HM INFORMATION TAB LINK}               //header/nav//a[text()="${INFORMATION TEXT}"]

${HM SYSTEM OFFLINE}                     //h2[contains(text(), "${SYSTEM OFFLINE TEXT}")]
${HM SYSTEM CANNOT BE ACCESSED}          //div[contains(text(), "${SYSTEM CANNOT BE ACCESSED TEXT}")]

${HM NO ALERTS}                          //h2[contains(text(), "${NO ALERTS TEXT}")]
${HM SYSTEM DOING WELL}                  //div[contains(text(), "${SYSTEM DOING WELL TEXT}")]

${HM IMPORTED REPORT RIBBON}             //nx-ribbon//div[@class="message"]//div[contains(text(), "${VIEWING IMPORTED REPORT TEXT}")]
${HM FILE DROP INPUT}                    //input[contains(@class,"ngx-file-drop__file-input")]

${HM ALERTS PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="alerts"]
${HM SYSTEM PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="systems"]
${HM SERVERS PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="servers"]
${HM ALERTS PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="alerts"]
${HM CAMERAS PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="cameras"]
${HM STORAGES PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="storages"]
${HM INTERFACES PAGE LINK}       //nx-menu//nx-level-1-item/a[@id="networkInterfaces"]
${HM REFRESH REPORT}                     //div[contains(@class,"menuLinks")]/nx-health-update
${HM DOWNLOAD FULL REPORT}               //div[contains(@class,"menuLinks")]/div

${HM ERROR ICON}                         //*[@d="m8.7654 0.19789 0.13845 0.086751c0.17761 0.12482 0.32636 0.28537 0.43572 0.47141l6.4568 10.984c0.4228 0.71928 0.16574 1.6356-0.57416 2.0466-0.23315 0.12951-0.49703 0.19764-0.76555 0.19764h-12.914c-0.85219 0-1.543-0.67157-1.543-1.5 0-0.26104 0.070077-0.51756 0.2033-0.74421l6.4568-10.984c0.39793-0.67697 1.2563-0.93815 1.9727-0.62387l0.13253 0.06571z"]
${HM WARNING ICON}                       //*[@d="m12 16c0 0.55228-0.44772 1-1 1h-2c-0.55228 0-1-0.44772-1-1h4zm-8-1v-1h1v-5.5c0-3.0376 2.2386-5.5 5-5.5 2.7614 0 5 2.4624 5 5.5v5.5h1v1h-12z"]

${HM TABLE}                              //div[@id="nx-table"]
${HM SINGLE ENTITY}                      //nx-single-entity
${FIRST CARD HEADER}                     ${HM SINGLE ENTITY}//h4/header

${HM DETAILS PANEL}                      //nx-block//nx-section/div[@class="card--body section clearfix"]

${HM ALERTS TOTAL}                       ${HM TABLE}/div[contains(@class,"table-header")]
${HM CAMERA TABLE ERRORS}                ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Camera"]
${HM CAMERA TABLE WARNINGS}              ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Camera"]
${HM CAMERA CARD ERRORS}                 //div[@class="card"]/div[text()="Cameras"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM CAMERA CARD WARNINGS}               //div[@class="card"]/div[text()="Cameras"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM SERVER TABLE OFFLINE}               ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Server"]
${HM SERVER TABLE WARNINGS}              ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Server"]
${HM SERVER CARD OFFLINE}                //div[@class="card"]/div[text()="Servers"]/following-sibling::div//div[text()="Offline"]/following-sibling::nx-alert-counter//span
${HM SERVER CARD WARNINGS}               //div[@class="card"]/div[text()="Servers"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM STORAGE TABLE ERRORS}               ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Storage"]
${HM STORAGE TABLE WARNINGS}             ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Storage"]
${HM STORAGE CARD ERRORS}                //div[@class="card"]/div[text()="Storage Locations"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM STORAGE CARD WARNINGS}              //div[@class="card"]/div[text()="Storage Locations"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM NETWORK INTERFACE TABLE ERRORS}     ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Interface"]
${HM NETWORK INTERFACE TABLE WARNINGS}   ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Interface"]
${HM NETWORK INTERFACE CARD ERRORS}      //div[@class="card"]/div[text()="Network Interfaces"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM NETWORK INTERFACE CARD WARNINGS}    //div[@class="card"]/div[text()="Network Interfaces"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM NEXT PAGE LINK}                     //ngb-pagination//a[@aria-label="Next"]
${HM PREVIOUS PAGE LINK}                 //ngb-pagination//a[@aria-label="Previous"]
${HM PAGE NUMBER LINK}                   //ngb-pagination//a[text()=
${HM CURRENT PAGE NUMBER LINK}           //ngb-pagination//span[text()="(current)"]/parent::a
${HM FIRST TABLE PAGE ELEMENT}           //ngb-pagination//a[@aria-label="Previous" and @tabindex="-1"]
${HM LAST TABLE PAGE ELEMENT}            //ngb-pagination//a[@aria-label="Next" and @tabindex="-1"]
${HM ALERTS LINK ERRORS}                 ${HM ALERTS PAGE LINK}/div[2]/div[1]/nx-alert-counter/div/span
${HM ALERTS LINK WARNINGS}               ${HM ALERTS PAGE LINK}/div[2]/div[2]/nx-alert-counter/div/span

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
