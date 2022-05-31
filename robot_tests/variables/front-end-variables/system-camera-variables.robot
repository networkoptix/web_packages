*** Variables ***
${email}                                     ${EMAIL OWNER}
${password}                                  ${BASE PASSWORD}
@{auth}                                      ${email}    ${password}
${url}                                       ${ENV}
@{system camera auth1}=                      admin    QAbur777$
@{system camera auth2}=                      admin    wrongPass
@{system camera auth3}=                      admin    admin
@{system camera auth4}=                      admin    QAbur777$

${CAMERAS LINK}                              //nx-menu//a[@id="cameras"]
${EDITABLE TITLE}                            //nx-text-editable
${CAMERAS VIEW BUTTON}                       //nx-block//header//button[@id="view-camera"]
${CAMERAS DETAILED INFO BUTTON}              //nx-block//header//button[@id="detailed-info"]
${ASPECT RATIO DROPDOWN}                     //button[@id="aspect-ratios"]
${ROTATION DROPDOWN}                         //button[@id="rotations"]
${ENABLE AUDIO CHECKBOX}                     //nx-section//nx-checkbox[@name="audioEnabled"]
${EDIT CREDENTIALS BUTTON}                   //nx-section//button[@id="update-credentials"]
${EDIT CREDENTIALS FORM}                     //form[@name="updateForm"]
${EDIT CREDENTIALS LOGIN INPUT}              ${EDIT CREDENTIALS FORM}//input[@id="cameraLoginCredentials"]
${EDIT CREDENTIALS PASSWORD INPUT}           ${EDIT CREDENTIALS FORM}//input[@id="cameraPasswordCredentials"]
${EDIT CREDENTIALS X BUTTON}                 ${EDIT CREDENTIALS FORM}//button[contains(@class,"close")]
${EDIT CREDENTIALS CANCEL BUTTON}            ${EDIT CREDENTIALS FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${EDIT CREDENTIALS SAVE BUTTON}              ${EDIT CREDENTIALS FORM}//button[contains(text(),"${SAVE BUTTON TEXT}")]
${RECORDING CHECK BOX}                       //nx-switch/div[@id="recording-switch-wrapper"]
${ENABLED RECORDING SLIDER}                  //span[contains(@class,"slider round")]
${RECORD ALWAYS RADIO BUTTON}                //nx-radio//input[@id="always"]
${RECORD MOTION RADIO BUTTON}                //nx-radio//input[@id="motion"]
${RECORD MOTION LOW QUALITY RADIO BUTTON}    //nx-radio//input[@id="motionLowRes"]
${FPS INPUT}                                 //input[@id="fps-numeric"]
${QUALITY DROPDOWN}                          //button[@id="recording-quality"]
${DOT-MENU}                                  //button[@class="dot-menu"]
${ENABLE MOTION DETECTION BUTTON}            //button[@id="enable-motion-detection"]
${DISABLE MOTION DETECTION LINK}             ${DOT-MENU}/following-sibling::div/ul//a[@id="disable-motion"]
${CANVAS}                                    //nx-motion-detection-overlay/canvas
${OFFLINE PLACEHOLDER IAMGE}                 //nx-page-placeholder//div[contains(@class,"placeholder-icon") and @name="NO_SETTINGS"]
${OFFLINE TITLE}                             //nx-page-placeholder//h2[contains(@class,"placeholder-title") and @name="NO_SETTINGS"]
${OFFLINE MESSAGE}                           //nx-page-placeholder//div[contains(@class,"placeholder-message") and @name="NO_SETTINGS"]
${NO CAMERAS PLACEHOLDER IMAGE}              //nx-page-placeholder//div[contains(@class,"placeholder-icon") and @name="NO_CAMS"]
${NO CAMERAS TITLE}                          //nx-page-placeholder//h2[contains(@class,"placeholder-title") and @name="NO_CAMS"]
${NO CAMERAS MESSAGE}                        //nx-page-placeholder//div[contains(@class,"placeholder-message") and @name="NO_CAMS"]
${RECORDING SVG}                             //svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
${OFFLINE SVG}                               //svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
${UNAUTH SVG}                                //svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]
${NO IMAGE PLACEHOLDER}                      //nx-health-image//div[contains(text(),"${NO IMAGE TEXT}" )]
${CAMERA ERROR BAR}                          //nx-alert-block/div[@class="card simple-error"]
${CAMERA ERROR ICON}                         ${CAMERA ERROR BAR}//svg-icon[@data-src="/static/images/icons/error.svg"]
${CAMERA ERROR TEXT}                         ${CAMERA ERROR BAR}//div[@class="warning-margin"]/span
${LICENSE REQUIRED WARNING}                  //*[contains(text(),"${PROFESSIONAL LICENSE REQUIRED TEXT}")]
${ONE LICENSE WILL BE USED WARNING}          //*[contains(text(),"${ONE LICENSE WILL BE USED TEXT}")]
${MOTION DETECTION DISABLED WARNING}         //nx-section//span[contains(@class,"input-error") and contains(text(),"${MOTION DETECTION DISABLED TEXT}")]
${MOTION SENSITIVITY IMAGE}                  //nx-block//div[contains(@class,"preview-wrapper")]//nx-health-image//img
${RECORDING MODE ERROR}                      ${RECORD MOTION LOW QUALITY RADIO BUTTON}/../../../span[contains(text(),"${SELECT RECORDING MODE TEXT}")]
${FPS ERROR}                                 ${FPS INPUT}/..//following-sibling::div/span[contains(text(),"${SELECT FPS TEXT}")]
${QUALITY ERROR}                             ${QUALITY DROPDOWN}/ancestor::nx-select/../following-sibling::div/span[contains(text(),"${SELCT QUALITY TEXT}")]
${SAVE ERROR}                                //nx-apply//div[contains(text(),"${MISSING SETTINGS TEXT}")]
${CAMERAS PAGE CANNOT BE LOADED}             //h2[@name="NO_SETTINGS" and contains(text(),"${THIS PAGE CANNOT BE LOADED TEXT}")]

${GOOD CAM JSON 1}                           {"audioEnabled": false,"cameraId": "{a836b98b-65e2-2304-57e9-a09fc55a50a4}","cameraName": "good cam","motionType":"2","motionMask":"5,0,0,44,32","scheduleEnabled": false,"scheduleTasks":[{"bitrateKbps":0,"dayOfWeek":1,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":2,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":3,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":4,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":5,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":6,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"},{"bitrateKbps":0,"dayOfWeek":7,"endTime":86400,"fps":30,"recordingType":"RT_Always","startTime":0,"streamQuality":"high"}]}
${GOOD CAM JSON 2}                           [{"name":"overrideAr","value":"","resourceId":"{a836b98b-65e2-2304-57e9-a09fc55a50a4}"},{"name":"rotation","value":"0","resourceId":"{a836b98b-65e2-2304-57e9-a09fc55a50a4}"}]                                                                           

${UNAUTH CAM JSON 1}                         {"cameraName":"unauth cam","cameraId":"{7afa626c-b49a-6533-9048-368808899baf}","audioEnabled":false,"scheduleEnabled":false,"motionType":"2","motionMask":"5,0,0,44,32","scheduleTasks":[{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":1},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":2},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":3},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":4},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":5},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":6},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":7}]}
${UNAUTH CAM JSON 2}                         [{"name": "credentials", "value": "test:test", "resourceId": "{7afa626c-b49a-6533-9048-368808899baf}"},{"name":"overrideAr","value":"","resourceId":"{7afa626c-b49a-6533-9048-368808899baf}"},{"name":"rotation","value":"0","resourceId":"{7afa626c-b49a-6533-9048-368808899baf}"}]

${OFFLINE CAM JSON 1}                        {"cameraName":"offline cam","cameraId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}","audioEnabled":false,"scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${OFFLINE CAM JSON 2}                        [{"name":"overrideAr","value":"","resourceId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}"},{"name":"rotation","value":"0","resourceId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}"}]

${NO AUDIO CAM JSON 1}                       {"cameraName":"no audio cam","cameraId":"{785d421b-62a6-47fc-7fe8-9df96682284c}","audioEnabled":false,"scheduleEnabled":true,"motionType":"2","motionMask":"5,0,0,44,32","scheduleTasks":[{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":1},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":2},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":3},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":4},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":5},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":6},{"fps":23,"recordingType":"RT_MotionOnly","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":7}]}
${NO AUDIO CAM JSON 2}                       [{"name":"overrideAr","value":"","resourceId":"{785d421b-62a6-47fc-7fe8-9df96682284c}"},{"name":"rotation","value":"0","resourceId":"{785d421b-62a6-47fc-7fe8-9df96682284c}"}]

${NO LICENSE CAM JSON 1}                     {"cameraName":"no license cam","cameraId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}","audioEnabled":false,"scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${NO LICENSE CAM JSON 2}                     [{"name":"overrideAr","value":"","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"},{"name":"rotation","value":"0","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"}]

${TRIPLE STATE CAM JSON 1}                   {"cameraName":"triple state cam","cameraId":"{a836b98b-65e2-2304-57e9-a09fc55a50a4}","audioEnabled":false,"scheduleEnabled":true,"motionType":"2","motionMask":"5,0,0,44,32","scheduleTasks":[{"bitrateKbps":0,"dayOfWeek":1,"endTime":86400,"fps":3,"recordingType":"RT_Always","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":2,"endTime":86400,"fps":2,"recordingType":"RT_MotionOnly","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":3,"endTime":86400,"fps":2,"recordingType":"RT_MotionAndLowQuality","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":4,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":5,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":6,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":7,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"}]}
${TRIPLE STATE CAM JSON 2}                   [{"name":"overrideAr","value":"","resourceId":"{a836b98b-65e2-2304-57e9-a09fc55a50a4}"},{"name":"rotation","value":"0","resourceId":"{a836b98b-65e2-2304-57e9-a09fc55a50a4}"}]

${RTSP CAM JSON 1}                           {"cameraName":"RTSP cam","cameraId":"{b4c59e97-4386-fa97-9a80-c3378fb90df6}","audioEnabled":false,"overrideAr":"","rotation":"0","scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${RTSP CAM JSON 2}                           [{"name":"overrideAr","value":"","resourceId":"{b4c59e97-4386-fa97-9a80-c3378fb90df6}"},{"name":"rotation","value":"0","resourceId":"{b4c59e97-4386-fa97-9a80-c3378fb90df6}"}]

${HTTP CAM JSON 1}                           {"cameraName":"HTTP cam","cameraId":"{980c3e68-7a17-2427-0883-72f3e60547d8}","audioEnabled":false,"overrideAr":"","rotation":"0","scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${HTTP CAM JSON 2}                           [{"name":"overrideAr","value":"","resourceId":"{980c3e68-7a17-2427-0883-72f3e60547d8}"},{"name":"rotation","value":"0","resourceId":"{980c3e68-7a17-2427-0883-72f3e60547d8}"}]

${UDP CAM JSON 1}                           {"cameraName":"UDP cam","cameraId":"{b2aed2f3-a880-14e4-f7da-4d8c6df338de}","audioEnabled":false,"overrideAr":"","rotation":"0","scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${UDP CAM JSON 2}                           [{"name":"overrideAr","value":"","resourceId":"{b2aed2f3-a880-14e4-f7da-4d8c6df338de}"},{"name":"rotation","value":"0","resourceId":"{b2aed2f3-a880-14e4-f7da-4d8c6df338de}"}]