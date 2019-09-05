*** Settings ***
Variables    getvars.py

*** Variables ***
${ALERT}                              //span[@ng-if='!message.compileContent']
${ALERT CLOSE}                        //div[contains(@class, 'ng-toast')]//span[@ng-bind-html='message.content']/../preceding-sibling::button[@ng-click='!message.dismissOnClick && dismiss()']

${BROWSER}                            Chrome

${LANGUAGE DROPDOWN}                  //nx-header//button[@id='dropdownMenuButton']
${LANGUAGE TO SELECT}                 //nx-header//span[@lang='${LANGUAGE}']/..
${DOWNLOAD LINK}                      //footer//a[@href="/download"]

@{LANGUAGES LIST}                        en_US           en_GB           ru_RU               fr_FR         de_DE              es_ES         hu_HU             zh_CN     zh_TW    ja_JP       ko_KR       tr_TR          th_TH         nl_NL            he_IL      pl_PL         vi_VN
@{LANGUAGES ACCOUNT TEXT LIST}           Account         Account         Учетная запись      Compte        Account            Cuenta        Fiók              帐户      帳號     アカウント      계정         Hesap         บัญชีผู้ใช้  Account         חשבון        Konto         Tài khoản
@{LANGUAGES CREATE ACCOUNT TEXT LIST}    Create Account  Create Account  Зарегистрироваться  Créer compte  Account erstellen  Crear Cuenta  Fiók létrehozása  创建帐户  新建帳號  アカウント作成  계정 만들기  Hesap oluştur  สร้างบัญชี   Account aanmaken  צור חשבון   Utwórz konto  Tạo tài khoản
@{USER TYPE LIST}    ${OWNER TEXT}    ${ADMIN TEXT}    ${ADV VIEWER TEXT}    ${VIEWER TEXT}    ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}

${BACKDROP}                           //ngb-modal-window

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
${ACCOUNT NOT FOUND}                  //form[@name='loginForm']//div[contains(text(), '${ACCOUNT NOT FOUND TEXT}')]
${RESEND ACTIVATION EMAIL LINK}       //form[@name='loginForm']//a[text()='${RESEND ACTIVATION LINK BUTTON TEXT}']
${WRONG PASSWORD MESSAGE}             //form[@name='loginForm']//div[text()="${WRONG PASSWORD}"]
${ACCOUNT NOT FOUND MESSAGE}          //form[@name='loginForm']//div[text()="${ACCOUNT DOES NOT EXIST}"]
${TOO MANY ATTEMPTS MESSAGE}          //form[@name='loginForm']//div[text()="${TOO MANY ATTEMPTS TEXT}"]

${LOG IN NAV BAR}                     //nav//a/span[contains(text(), '${LOG IN BUTTON TEXT}')]/..
${YOU HAVE NO SYSTEMS}                //span[contains(text(),"${YOU HAVE NO SYSTEMS TEXT}")]

#Header
${ACCOUNT DROPDOWN}                   //header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle="dropdown"]
${LOG OUT BUTTON}                     //li[contains(@class, 'collapse-first')]//a/span[contains(text(), "${LOG OUT BUTTON TEXT}")]/..
${LOGO LINK}                          //header//a[@href='/']
${ACCOUNT SETTINGS BUTTON}            //li//a[@href = '/account/']
${CHANGE PASSWORD BUTTON DROPDOWN}    //li//a[@href = '/account/password/']
${RELEASE HISTORY BUTTON}             //a[@href="/downloads/history" and contains(text(), "${RELEASE HISTORY BUTTON TEXT}")]
${SYSTEMS DROPDOWN}                   //header//li[contains(@class, 'collapse-second')]//button[@id='systemsDropdown']
${ALL SYSTEMS}                        //header//li[contains(@class, 'collapse-second')]//a[@href='/systems']

${AUTHORIZED BODY}                    //body[contains(@class, 'authorized')]
${ANONYMOUS BODY}                     //body[contains(@class,'anonymous')]
${CREATE ACCOUNT HEADER}              //header//a[@href='/register']
${CREATE ACCOUNT BODY}                //nx-app//a[@href='/register']

${LOG IN BODY}                        //nx-app//a[@href='/login']

#Forgot Password
${RESET PASSWORD FORM}                //form[@name='restorePasswordWithCode']
${RESTORE PASSWORD EMAIL INPUT}       //form[@name='restorePassword']//input[@type='email']
${RESET PASSWORD BUTTON}              //form[@name='restorePassword']//button[@ng-click='checkForm()']
${RESET PASSWORD INPUT}               //form[@name='restorePasswordWithCode']//input[@id='newPassword']
${SAVE PASSWORD}                      //form[@name='restorePasswordWithCode']//button[@ng-click='checkForm()']
${RESET EMAIL SENT MESSAGE}           //div[@ng-if='restoringSuccess']/h1
${RESET SUCCESS MESSAGE}              //h1[contains(text(), "${RESET SUCCESS MESSAGE TEXT}")]
${RESET SUCCESS LOG IN LINK}          //div[@ng-if='change.success || changeSuccess']//a[@href='/login']
${RESET EYE ICON OPEN}                ${RESET PASSWORD FORM}${EYE ICON OPEN}
${RESET EYE ICON CLOSED}              ${RESET PASSWORD FORM}${EYE ICON CLOSED}

#Change Password
${CHANGE PASSWORD FORM}               //form[@name='passwordForm']
${CURRENT PASSWORD INPUT}             //form[@name='passwordForm']//input[@ng-model='pass.password']
${NEW PASSWORD INPUT}                 //form[@name='passwordForm']//password-input[@ng-model='pass.newPassword']//input
${CHANGE PASSWORD BUTTON}             //form[@name='passwordForm']//button[@ng-click='checkForm()']
${PASSWORD IS REQUIRED}               //span[contains(@class,'input-error') and contains(text(),"${PASSWORD IS REQUIRED TEXT}")]
${CHANGE PASS EYE ICON OPEN}          ${CHANGE PASSWORD FORM}${EYE ICON OPEN}
${CHANGE PASS EYE ICON CLOSED}        ${CHANGE PASSWORD FORM}${EYE ICON CLOSED}

#Register Form Elements
${REGISTER FORM}                      //form[@id='registerForm']
${REGISTER FIRST NAME INPUT}          ${REGISTER FORM}//input[@id='firstName']
${REGISTER LAST NAME INPUT}           ${REGISTER FORM}//input[@id='lastName']
${REGISTER EMAIL INPUT}               ${REGISTER FORM}//input[@id='registerEmail']
${REGISTER EMAIL INPUT LOCKED}        ${REGISTER FORM}//input['readOnly' and @ng-if='lockEmail']
${REGISTER PASSWORD INPUT}            ${REGISTER FORM}//input[@id='registerPassword']

${TERMS AND CONDITIONS CHECKBOX VISIBLE}    ${REGISTER FORM}//label[@class="nx-checkbox"]/span[contains(@class,"tick")]//*[local-name() = 'svg']
${TERMS AND CONDITIONS CHECKBOX REAL}       ${REGISTER FORM}//input[@id='accept']

${CREATE ACCOUNT BUTTON}              ${REGISTER FORM}//button[contains(text(), "${CREATE ACCOUNT BUTTON TEXT}")]
${TERMS AND CONDITIONS LINK}          ${REGISTER FORM}//a[@href='/content/eula']
${TERMS AND CONDITIONS ERROR}         ${REGISTER FORM}//span[@class='help-block input-error' and contains(text(), "${TERMS AND CONDITIONS ERROR TEXT}")]
${PRIVACY POLICY LINK}                ${REGISTER FORM}//a[@href='${PRIVACY POLICY URL HREF}']
${RESEND ACTIVATION LINK BUTTON}      //form[@name= 'loginForm']//a[contains(text(), "${RESEND ACTIVATION LINK BUTTON TEXT}")]
${REGISTER EYE ICON OPEN}             ${REGISTER FORM}${EYE ICON OPEN}
${REGISTER EYE ICON CLOSED}           ${REGISTER FORM}${EYE ICON CLOSED}

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#Register form errors
${FIRST NAME IS REQUIRED}             //span[contains(@class,'help-block input-error') and contains(text(),"${FIRST NAME IS REQUIRED TEXT}")]
${LAST NAME IS REQUIRED}              //span[contains(@class,'help-block input-error') and contains(text(),"${LAST NAME IS REQUIRED TEXT}")]
${EMAIL IS REQUIRED}                  //span[contains(@class,'help-block input-error') and contains(text(),"${EMAIL IS REQUIRED TEXT}")]
${EMAIL ALREADY REGISTERED}           //span[contains(@class,'help-block input-error') and contains(text(),"${EMAIL ALREADY REGISTERED TEXT}")]
${EMAIL INVALID}                      //span[contains(@class,'help-block input-error') and contains(text(),"${EMAIL INVALID TEXT}")]
${PASSWORD SPECIAL CHARS}             //span[contains(@ng-if,'form[id].$error.pattern &&') and contains(@ng-if,'!form[id].$error.minlength') and contains(text(),'${PASSWORD SPECIAL CHARS TEXT}')]
${PASSWORD TOO SHORT}                 //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO SHORT TEXT}')]
${PASSWORD TOO COMMON}                //span[contains(@class,'input-error') and contains(text(),'${PASSWORD TOO COMMON TEXT}')]
${PASSWORD IS WEAK}                   //span[contains(@class,'input-error') and contains(text(),'${PASSWORD IS WEAK TEXT}')]

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

#targets the open nx witness button presented when logging in after activating with from=mobile or client
${OPEN NX WITNESS BUTTON FROM =}      //button[text()="${OPEN NX WITNESS BUTTON TEXT}"]


${ACCOUNT CREATION SUCCESS}           //h1[@class="process-success d-flex align-items-center flex-column mt-5 ng-star-inserted"]
${ACTIVATION SUCCESS}                 //h1[@ng-if='activate.success && !loading' and contains(text(), "${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]
${SUCCESS LOG IN BUTTON}              //h1[@ng-if='activate.success && !loading' and contains(text(), "${ACCOUNT SUCCESSFULLY ACTIVATED TEXT}")]/following-sibling::h1/a[@href="/login"]
#In system settings
${SYSTEM NAME}                        //h1[@ng-if="gettingSystem.success"]
${FIRST USER OWNER}                   //table[@ng-if='system.users.length']/tbody/tr/td[3]/span[contains(text(),"${OWNER TEXT}")]
${DISCONNECT FROM NX}                 //button[@ng-click='disconnect()']
${RENAME SYSTEM}                      //button[@ng-click='rename()']
${RENAME CANCEL}                      //form[@name='renameForm']//button[text()='${CANCEL BUTTON TEXT}']
${RENAME X BUTTON}                    //form[@name='renameForm']//button[@class='close']
${RENAME SAVE}                        //form[@name='renameForm']//button[text()='${SAVE BUTTON TEXT}']

${RENAME INPUT}                       //form[@name='renameForm']//input[@id='systemName']
${RENAME INPUT WITH ERROR}            //form[@name='renameForm']//input[@id='systemName' and contains(@class,'ng-invalid')]
${SYSTEM NAME IS REQUIRED}            //form[@name='renameForm']//span[@class='input-error' and contains(text(),"${SYSTEM NAME IS REQUIRED TEXT}")]

${OWNER NAME}                         //h3[contains(@class,"user-name") and text()="${TEST FIRST NAME} ${TEST LAST NAME}"]
${OWNER LABEL}                        //h3[contains(@class,"user-name") and text()="${TEST FIRST NAME} ${TEST LAST NAME}"]/../h2[contains(text(), "${OWNER TEXT}")]
${OWNER EMAIL}                        //a[@ng-href="mailto:${EMAIL OWNER}"]
${YOUR PERMISSIONS}                   //ng-include[@src="$root.C.viewsDir + 'components/system-card.html'"]//p[contains(text(), "${YOUR PERMISSIONS TEXT}")]

${DISCONNECT FROM MY ACCOUNT}         //button[@ng-click='delete()']
${SHARE BUTTON SYSTEMS}               //div[@process-loading='gettingSystem']//button[@ng-click='share()']
${SHARE BUTTON DISABLED}              //div[@process-loading='gettingSystem']//button[@ng-click='share()' and @ng-disabled='!system.isAvailable || currentlyMerging']
${OPEN IN NX BUTTON}                  //div[@process-loading='gettingSystem']//button[@ng-click='checkForm()']
${OPEN IN NX BUTTON DISABLED}         //div[@process-loading='gettingSystem']//button[@ng-click='checkForm()' and @ng-disabled='buttonDisabled']
${DELETE USER MODAL}                  //ngb-modal-window
${DELETE USER BUTTON}                 //button[contains(text(), '${DELETE USER BUTTON TEXT}')]
${DELETE USER CANCEL BUTTON}          //ngb-modal-window//button[contains(text(), "${CANCEL BUTTON TEXT}")]
${SYSTEM NAME OFFLINE}                //span[@ng-if='!system.isOnline']
${USERS LIST}                         //div[@process-loading='gettingSystemUsers']

${SYSTEM NO ACCESS}                   //div[@ng-if='systemNoAccess']/h1[contains(text(), "${SYSTEM NO ACCESS TEXT}")]
${AVAILABLE SYSTEMS LIST}             //a[@href='/systems']
${SYSTEMS SEARCH INPUT}               //input[@ng-model='search.value']
${SYSTEM SEARCH X BUTTON}             //a[@ng-click="search.value=''"]

#Merge
${MERGE BUTTON SYSTEM}                //button[@ng-click="mergeSystems()"]
${MERGE DIALOG}                       //nx-modal-merge-content
${MERGE FORM}                         //form[@name="mergeForm"]
${MERGE SYSTEM DROPDOWN}              ${MERGE DIALOG}//button[@id="genericSelect"]
${MERGE X BUTTON}                     ${MERGE DIALOG}//button[@class="close"]
${MERGE OK BUTTON}                    ${MERGE DIALOG}//button[contains(@class,"btn btn-primary") and contains(text(),"${OK TEXT}")]
${MERGE CANCEL BUTTON}                ${MERGE DIALOG}//button[@class="btn btn-default"]
${MERGE BUTTON MODAL}                 ${MERGE DIALOG}//button[@class="btn btn-primary" and contains(text(),"${MERGE SYSTEMS TEXT}")]
${MERGE PASSWORD INPUT}               ${MERGE DIALOG}//input[@id="mergePassword"]
${CURRENTLY MERGING CARD}             //div[@ng-if="currentlyMerging"]
${CURRENTLY MERGING DOTS}             ${CURRENTLY MERGING CARD}//div[contains(@class, "circleG circleG_")]
${MERGE NOT OWNER MESSAGE 2}          ${MERGE DIALOG}//p[@class='help-block-no-height'][2]
${MERGE FAILED DIALOG HEADER}         //nx-modal-generic-content//h1[contains(text(),"${SYSTEMS MERGE FAILED TEXT}")]
${MERGE FAILED OK BUTTON}             //nx-modal-generic-content//button[contains(text(),"${OK TEXT}")]
${MERGE FAILED X BUTTON}              //nx-modal-generic-content//button[@class="close"]
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
${DISCONNECT FORM DISCONNECT BUTTON}    ${DISCONNECT FORM}//button[contains(text(), "${DISCONNECT BUTTON TEXT}")]

#Disconnect from my account
${DISCONNECT MODAL WARNING}              //p[contains(text(), "${DISCONNECT MODAL WARNING TEXT}")]
# extra spaces here temporarily
${DISCONNECT MODAL CANCEL}               //button[text()='${CANCEL BUTTON TEXT} ']
${DISCONNECT MODAL DISCONNECT BUTTON}    //button[text()='${DISCONNECT BUTTON TEXT} ']

${JUMBOTRON}                          //div[@class='jumbotron']
${PROMO BLOCK}                        //div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]
${ALREADY ACTIVATED}                  //h1[@ng-if='!activate.success && !loading' and contains(text(),"${ALREADY ACTIVATED TEXT}")]

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
${SHARE MODAL}                        //form[@name='shareForm']
${SHARE EMAIL}                        //form[@name='shareForm']//input[@id='email']
${SHARE PERMISSIONS DROPDOWN}         //form[@name='shareForm']//nx-permissions-select//button[@id='permissionsSelect']
${SHARE BUTTON MODAL}                 //form[@name='shareForm']//button[text()='${SHARE BUTTON TEXT}']
${SHARE CANCEL}                       //form[@name='shareForm']//button[text()='${CANCEL BUTTON TEXT}']
${SHARE CLOSE}                        //form[@name='shareForm']//button[@data-dismiss='modal']
${SHARE PERMISSIONS HINT}             //form[@name='shareForm']//span[contains(@class,'help-block')]

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
${ACCOUNT EMAIL}                      //form[@name='accountForm']//input[@ng-model='userEmail']
${ACCOUNT FIRST NAME}                 //form[@name='accountForm']//input[@ng-model='account.first_name']
${ACCOUNT LAST NAME}                  //form[@name='accountForm']//input[@ng-model='account.last_name']
${ACCOUNT LANGUAGE DROPDOWN}          //form[@name='accountForm']//nx-language-select//button[@id='dropdownMenuButton']
${ACCOUNT SAVE}                       //form[@name='accountForm']//button[@ng-click='checkForm()']

#Downloads
${DOWNLOADS HEADER}                   //h1["Downloads"]
${DOWNLOAD WINDOWS VMS LINK}          //div[text()="Windows x64 - Client and Server"]/../..
${DOWNLOAD UBUNTU VMS LINK}           //div[text()="Ubuntu x64 - Client only"]/../..
${DOWNLOAD MAC OS VMS LINK}           //div[text()="Mac OS X - Client only"]/../..
${ITUNES STORE DOWNLOAD BUTTON}       //a[@class="mobile-link iOS"]
${PLAY STORE DOWNLOAD BUTTON}         //a[@class="mobile-link Android"]

${WINDOWS TAB}                        //a[@id="windows"]
${UBUNTU TAB}                         //a[@id="linux"]
${MAC OS TAB}                         //a[@id="macos"]

#History
${RELEASES TAB}                       //span[@class='tab-heading' and text()='Releases']/..
${PATCHES TAB}                        //span[@class='tab-heading' and text()='Patches']/..
${BETAS TAB}                          //span[@class='tab-heading' and text()='Betas']/..
${RELEASE NUMBER}                     //div[contains(@class,"active")]//h1

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
${IPVD ADV FILTERS DROPDOWN MENU}     /../div[@class='dropdown-menu']
${IPVD ADV FILTERS DROPDOWN MENU ITEMS}    ${IPVD ADV FILTERS DROPDOWN MENU}/ul/li
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
${IPVD ADV FEATURES CLOSE BUTTON}     //span[@class='close-button']
#IPVD Manufacturers
${IPVD MANUFACTURERS PANE}            //ipvd//nx-vendor-list/nx-block[@id='vendors']
${IPVD MANUFACTURERS PANE ITEM}       ${IPVD MANUFACTURERS PANE}//*[@class="float-left mr-1 mb-1"]
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
${IPVD DEVICE RESOLUTION}             ${IPVD DEVICE DETAILS}//div[text()='Resolution(max)']//following::div[1]
${IPVD CLOSE DETAILS BUTTON}          //ipvd//header//span[@class="glyphicon close-icon detailsClose"]
#IPVD Table
${IPVD TABLE}                         //ipvd//table
${IPVD TABLE HEADING MANUFACTURER}    ${IPVD TABLE}/thead//div[text()='Manufacturer']
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
${IPVD FEEDBACK CLOSE BUTTON}         ${IPVD FEEDBACK}//button[@class='close']

${NOTHING FOUND PLACEHOLDER}          //div[contains(@class,'text-placeholder') and contains(text(),"${NOTHING FOUND}")]

#Footer
${FOOTER ABOUT LINK}                  //footer//a[contains(text(),"${ABOUT} ${PRODUCT_NAME}")]
${FOOTER KNOWN LIMITS LINK}           //footer//a[contains(text(),"${KNOWN LIMITATIONS}")]
${FOOTER SUPPORT LINK}                //footer//a[contains(text(),"${SUPPORT}")]
${FOOTER TERMS LINK}                  //footer//a[contains(text(),"${TERMS}")]
${FOOTER PRIVACY LINK}                //footer//a[contains(text(),"${PRIVACY}")]
${FOOTER COPYRIGHT LINK}              //footer//a[contains(text(),"${COPYRIGHT SYMBOL}") and contains(text(),"${YEAR}") and contains(text(),"${COMPANY}")]
${FOOTER SUPPORTED DEVICES LINK}      //footer//a[contains(text(),"${SUPPORTED DEVICES}"]

#Misc
${PAGE NOT FOUND}                     //h1[contains(text(), '${PAGE NOT FOUND TEXT}')]
${TAKE ME HOME}                       //a[@href='/' and contains(text(), "${TAKE ME HOME TEXT}")]

${WINDOWS TAB}                        //a[@ng-click="select()"]//span[text()="Windows"]/../..
${UBUNTU TAB}                         //a[@ng-click="select()"]//span[text()="Ubuntu Linux"]/../..
${MAC OS TAB}                         //a[@ng-click="select()"]//span[text()="Mac OS"]/../..

${RELEASE NUMBER}                     //div[contains(@class,"active")]//div[@ng-repeat="release in activeBuilds"]//h1/b

${PRIVACY POLICY HEADER}              //h1[contains(text(),'Personal data and privacy policy')]

#Password badges
${PASSWORD BADGE}                     //span[contains(@class,"badge")]
${PASSWORD TOO SHORT BADGE}           //span[contains(@class,"badge") and contains(text(),'${PASSWORD TOO SHORT BADGE TEXT}')]
${PASSWORD TOO COMMON BADGE}          //span[contains(@class,"badge") and contains(text(),'${PASSWORD TOO COMMON BADGE TEXT}')]
${PASSWORD IS WEAK BADGE}             //span[contains(@class,"badge") and contains(text(),'${PASSWORD IS WEAK BADGE TEXT}')]
${PASSWORD IS FAIR BADGE}             //span[contains(@class,"badge") and contains(text(),'${PASSWORD IS FAIR BADGE TEXT}')]
${PASSWORD IS GOOD BADGE}             //span[contains(@class,"badge") and contains(text(),'${PASSWORD IS GOOD BADGE TEXT}')]
${PASSWORD INCORRECT BADGE}           //span[contains(@class,"badge") and contains(text(),"${PASSWORD INCORRECT BADGE TEXT}")]

#Already logged in modal
${LOGGED IN CONTINUE BUTTON}          //ngb-modal-window//button[contains(text(),'${CONTINUE BUTTON TEXT}')]
${LOGGED IN LOG OUT BUTTON}           //ngb-modal-window//button[contains(text(),'${LOG OUT BUTTON TEXT}')]

${CONTINUE BUTTON}                    //ngb-modal-window//button[contains(text(), '${CONTINUE BUTTON TEXT}')]
${CONTINUE MODAL}                     //ngb-modal-window

${300CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmyy
${255CHARS}                           QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopas

#Eye icons for password forms
${EYE ICON OPEN}             //span[@class="glyphicon glyphicon-eye-open ng-star-inserted"]
${EYE ICON CLOSED}           //span[@class="glyphicon glyphicon-eye-close ng-star-inserted"]

#ASCII
${ESCAPE}                             \\27
${ENTER}                              \\13
${TAB}                                \\9
${SPACEBAR}                           \\32
${BACKSPACE}                          \\8