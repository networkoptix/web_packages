*** Variables ***
${IMAGE}                              ${IMAGE 4.2}
${IMAGE 5.0}                          5.0_test
${IMAGE 4.3}                          4.3_test
${IMAGE 4.2}                          4.2_test
${IMAGE 4.1}                          4.1_test
${IMAGE 4.0}                          4.0_test

${LOCAL}                              https://localhost:9000/
${CLOUD TEST}                         https://cloud-test.hdw.mx
${CLOUD DEV}                          https://dev2.cloud.hdw.mx
${CLOUD DEV3}                         https://dev3.cloud.hdw.mx
${CLOUD TEST REGISTER}                https://cloud-test.hdw.mx/register
${CLOUD STAGE}                        https://cloud-stage.hdw.mx
${DOWNLOADS DOMAIN}                   updates.networkoptix.com
${ENV}                                ${CLOUD TEST}
@{AUTO SYS AUTH}                      admin    qweasd 123


${BROWSER}                            Chrome

${MODE}                               cloud

${QA BURBANK SYSTEM IP}                10.1.5.106
${QA BURBANK SYSTEM ID}                032c7c41-0ddd-48d7-ab09-616bfad7b5cc

#Emails
${BASE EMAIL}                         ${TEST EMAIL}+sendemail@gmail.com
${BASE EMAIL DOMAIN}                  @gmail.com
${BASE EMAIL PASSWORD}                lvhnwgmuoofzmvza

${BASE HOST}                          imap.gmail.com
${BASE PORT}                          993
${EMAIL VIEWER}                       ${TEST EMAIL}+viewer${BASE EMAIL DOMAIN}
${EMAIL ADV VIEWER}                   ${TEST EMAIL}+advviewer${BASE EMAIL DOMAIN}
${EMAIL LIVE VIEWER}                  ${TEST EMAIL}+liveviewer${BASE EMAIL DOMAIN}
${EMAIL OWNER}                        ${TEST EMAIL}+owner${BASE EMAIL DOMAIN}
${EMAIL NOT OWNER}                    ${TEST EMAIL}+notowner${BASE EMAIL DOMAIN}
${EMAIL ADMIN}                        ${TEST EMAIL}+admin${BASE EMAIL DOMAIN}
${EMAIL CUSTOM}                       ${TEST EMAIL}+custom${BASE EMAIL DOMAIN}
${EMAIL CUSTOM CAMERAS}               ${TEST EMAIL}+customcameras${BASE EMAIL DOMAIN}
${EMAIL CUSTOM CAMERAS LIMITED}       ${TEST EMAIL}+customcameraslimited${BASE EMAIL DOMAIN}
${EMAIL CLIENT CUSTOM}                ${TEST EMAIL}+clientcustom${BASE EMAIL DOMAIN}
${EMAIL AUTO TESTS ANCHOR}            ${TEST EMAIL}+autotestsanchor${BASE EMAIL DOMAIN}
${EMAIL AUTO TESTS 2 ANCHOR}          ${TEST EMAIL}+autotests2anchor${BASE EMAIL DOMAIN}
${EMAIL MOBILE CAMERA DEV}            ${TEST EMAIL}+mobile_camera-developer${BASE EMAIL DOMAIN}
${EMAIL DELETE USER}                  ${TEST EMAIL}+deleteuser${BASE EMAIL DOMAIN}
${EMAIL PORTAL MANAGER}               ${TEST EMAIL}+portal_manager${BASE EMAIL DOMAIN}
${EMAIL SUPER USER}                   ${TEST EMAIL}+super${BASE EMAIL DOMAIN}
${EMAIL FACE REC DEV}                 ${TEST EMAIL}+face_recognition-developer${BASE EMAIL DOMAIN}

${EMAIL MOBILE CAMERA DEV}            ${TEST EMAIL}+mobile_camera-developer${BASE EMAIL DOMAIN}
${EMAIL MOBILE CAMERA DEV}            ${TEST EMAIL}+mobile_camera-developer${BASE EMAIL DOMAIN}
${EMAIL PORTAL MANAGER}               ${TEST EMAIL}+portal_manager${BASE EMAIL DOMAIN}
${EMAIL SUPER USER}                   ${TEST EMAIL}+super${BASE EMAIL DOMAIN}
${EMAIL FACE REC DEV}                 ${TEST EMAIL}+face_recognition-developer${BASE EMAIL DOMAIN}

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
...    custom=NoGlobalPermissions

&{role names}
...    cloudAdmin=${ADMIN TEXT}
...    viewer=${VIEWER TEXT}
...    liveViewer=${LIVE VIEWER TEXT}
...    advancedViewer=${ADV VIEWER TEXT}
...    custom=${CUSTOM TEXT}

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



#Related to Auto Tests system
${AUTO TESTS}                         Auto Tests
${AUTO TESTS TITLE}                   ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']
${AUTO TESTS USER}                    ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']/following-sibling::span[contains(@class,'user-name')]
${AUTO TESTS OPEN NX}                 ${SYSTEMS TILE}//h2[text()='${AUTO TESTS}']/..//nx-client-button
${SYSTEM NAME AUTO TESTS HEADER}      //header//li/a/span[text()="${AUTO TESTS}"]
${SYSTEMS TILE}                       //div[contains(@class,'system-button')]
${NOT OWNER IN SYSTEM}                //div[@process-loading='gettingSystemUsers']//tbody//tr//td[contains(text(),'${EMAIL NOT OWNER}')]
${VIEWER IN SYSTEM}                   //div[@process-loading='gettingSystemUsers']//tbody//tr//td[contains(text(),'${EMAIL VIEWER}')]
${USER IN SYSTEM}                     //nx-level-3-item//span[contains(@class,'user') and contains(text(),'%user%')]
${NOPTIXAUTOQA SYSTEM ID}             a994749e-02a1-41c4-8ba4-ce3c4f91a40d
${NOPTIXAUTOQA SYSTEM NAME}           ${SYSTEMS TILE}//h2[text()='d37113eeb066']

${DIFFERENT OWNER TITLE}              ${SYSTEMS TILE}//h2[text()='different owner']
&{ACCESS ROLES}                       liveViewer=liveViewer    viewer=viewer    advancedViewer=advancedViewer    admin=cloudAdmin    custom=custom

#AUTO TESTS 2 is an offline system used for testing offline status on the systems page and offline status on the system page
${AUTO TESTS 2}                       Auto Tests 2
${AUTO TESTS OFFLINE TITLE}           ${SYSTEMS TILE}//h2[text()='${AUTO TESTS 2}']
${AUTOTESTS OFFLINE}                  ${AUTO TESTS OFFLINE TITLE}/following-sibling::nx-tag/div[contains(text(),"${AUTOTESTS OFFLINE TEXT}")]
${AUTOTESTS OFFLINE OPEN NX}          ${AUTO TESTS OFFLINE TITLE}/..//nx-client-button

#Cameras
${NOAUTH CAMERA PASSWORD}             qweasd123

#Docker server machine info
${QA BURBANK IP}                      10.1.5.34
${QA BURBANK USER}                    qaburbank
${QA BURBANK PASS}                    QABurbank777$
