*** Variables ***

${LOCAL}                              https://localhost:9000/
${CLOUD TEST}                         https://cloud-test.hdw.mx
${CLOUD DEV}                          https://dev2.cloud.hdw.mx
${CLOUD DEV3}                         https://dev3.cloud.hdw.mx
${CLOUD DEV3 AUTO SYSTEM}             http://10.1.5.160:7001
${CLOUD TEST REGISTER}                https://cloud-test.hdw.mx/register
${CLOUD STAGE}                        https://cloud-stage.hdw.mx
${DOWNLOADS DOMAIN}                   updates.networkoptix.com
${ENV}                                ${CLOUD TEST}
#${AUTO SYS IP}                        ${CLOUD TEST AUTO SYSTEM}
${AUTO TESTS DEV2 IP}                 https://10.1.5.147
${AUTO TESTS DEV2 PORT}               7001
@{AUTO SYS AUTH}                      admin    qweasd 123
${SCREENSHOTDIRECTORY}                Screenshots

${BROWSER}                            Chrome

#Emails
${BASE EMAIL}                         ${TEST EMAIL}@gmail.com
${BASE EMAIL DOMAIN}                  @gmail.com
${BASE EMAIL PASSWORD}                qweasd!@#$%
${BASE HOST}                          imap.gmail.com
${BASE PORT}                          993
${EMAIL VIEWER}                       ${TEST EMAIL}+viewer${BASE EMAIL DOMAIN}
${EMAIL ADV VIEWER}                   ${TEST EMAIL}+advviewer${BASE EMAIL DOMAIN}
${EMAIL LIVE VIEWER}                  ${TEST EMAIL}+liveviewer${BASE EMAIL DOMAIN}
${EMAIL OWNER}                        ${TEST EMAIL}+owner${BASE EMAIL DOMAIN}
${EMAIL NOT OWNER}                    ${TEST EMAIL}+notowner${BASE EMAIL DOMAIN}
${EMAIL ADMIN}                        ${TEST EMAIL}+admin${BASE EMAIL DOMAIN}
${EMAIL CUSTOM}                       ${TEST EMAIL}+custom${BASE EMAIL DOMAIN}
${EMAIL CLIENT CUSTOM}                ${TEST EMAIL}+clientcustom${BASE EMAIL DOMAIN}
${EMAIL AUTO TESTS ANCHOR}            ${TEST EMAIL}+autotestsanchor${BASE EMAIL DOMAIN}
${EMAIL AUTO TESTS 2 ANCHOR}          ${TEST EMAIL}+autotests2anchor${BASE EMAIL DOMAIN}
&{AUTO TESTS USERS}
...    ${EMAIL VIEWER}=viewer
...    ${EMAIL ADV VIEWER}=advancedViewer
...    ${EMAIL LIVE VIEWER}=liveViewer
...    ${EMAIL NOT OWNER}=viewer
...    ${EMAIL ADMIN}=cloudAdmin
...    ${EMAIL CUSTOM}=custom
...    ${EMAIL AUTO TESTS ANCHOR}=viewer

&{permissions}
...    cloudAdmin=GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission
...    viewer=GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission
...    liveViewer=GlobalAccessAllMediaPermission
...    advancedViewer=GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission
...    custom=GlobalViewArchivePermission
    
&{role names}
...    cloudAdmin=Administrator
...    viewer=Viewer
...    liveViewer=Live Viewer
...    advancedViewer=Advanced Viewer
...    custom=Custom
    
&{reverse role names}
...    Administrator=cloudAdmin
...    Viewer=viewer
...    Live Viewer=liveViewer
...    Advanced Viewer=advancedViewer
...    Custom=custom

${EMAIL MERGE OWNER 1}                ${TEST EMAIL}+mergeowner1${BASE EMAIL DOMAIN}
${EMAIL MERGE OWNER 2}                ${TEST EMAIL}+mergeowner2${BASE EMAIL DOMAIN}
${EMAIL MERGE OWNER 3.0}              ${TEST EMAIL}+mergeowner3.0${BASE EMAIL DOMAIN}
@{EMAILS LIST}                        ${EMAIL VIEWER}    ${EMAIL ADV VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL OWNER}    ${EMAIL ADMIN}    ${EMAIL CUSTOM}
${ALT BASE EMAIL}                     qaburbank@gmail.com
${ALT EMAIL VIEWER}                   qaburbank+viewer@gmail.com
${ALT EMAIL ADV VIEWER}               qaburbank+advviewer@gmail.com
${ALT EMAIL LIVE VIEWER}              qaburbank+liveviewer@gmail.com
${ALT EMAIL OWNER}                    qaburbank+owner@gmail.com
${ALT EMAIL NOT OWNER}                qaburbank+notowner@gmail.com
${ALT EMAIL ADMIN}                    qaburbank+admin@gmail.com
${ALT EMAIL CUSTOM}                   qaburbank+custom@gmail.com
${ALT EMAIL CLIENT CUSTOM}            qaburbank+clientcustom@gmail.com
${ADMIN FIRST NAME}                   mark
${ADMIN LAST NAME}                    hamil
${EMAIL UNREGISTERED}                 ${TEST EMAIL}+unregistered1${BASE EMAIL DOMAIN}
${EMAIL NOPERM}                       ${TEST EMAIL}+noperm${BASE EMAIL DOMAIN}
${BASE PASSWORD}                      qweasd 123
${ALT PASSWORD}                       qweasd1234

${TEST FIRST NAME}                    testFirstName
${TEST LAST NAME}                     testLastName

#Related to Auto Tests system
${AUTO TESTS}                         Auto Tests
${AUTO TESTS TITLE}                   ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']
${AUTO TESTS USER}                    ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']/following-sibling::span[contains(@class,'user-name')]
${AUTO TESTS OPEN NX}                 ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']/..//nx-client-button
${SYSTEM NAME AUTO TESTS HEADER}      //header//li/a/span[text()="${AUTO TESTS}"]
${SYSTEMS TILE}                       //div[contains(@class,'system-button')]
${NOT OWNER IN SYSTEM}                //div[@process-loading='gettingSystemUsers']//tbody//tr//td[contains(text(),'${EMAIL NOT OWNER}')]
${VIEWER IN SYSTEM}                   //div[@process-loading='gettingSystemUsers']//tbody//tr//td[contains(text(),'${EMAIL VIEWER}')]
# Space to @class 'users ' is added due to the bug: CLOUD-4903
${USER IN SYSTEM}                     //nx-level-3-item//span[@class='user ' and contains(text(),'%user%')]

${DIFFERENT OWNER TITLE}              ${SYSTEMS TILE}//h2[text()='different owner']
&{ACCESS ROLES}                       liveViewer=liveViewer    viewer=viewer    advancedViewer=advancedViewer    admin=cloudAdmin    custom=custom

#AUTO TESTS 2 is an offline system used for testing offline status on the systems page and offline status on the system page
${AUTO TESTS 2}                       Auto Tests 2
${AUTO TESTS OFFLINE TITLE}           ${SYSTEMS TILE}//h2[text()='${AUTO TESTS 2}']
${AUTOTESTS OFFLINE}                  ${AUTO TESTS OFFLINE TITLE}/following-sibling::nx-tag/div[contains(text(),"${AUTOTESTS OFFLINE TEXT}")]
${AUTOTESTS OFFLINE OPEN NX}          ${AUTO TESTS OFFLINE TITLE}/..//nx-client-button
