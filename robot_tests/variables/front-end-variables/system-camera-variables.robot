*** Variables ***
${CAMERAS LINK}                              //nx-menu//a[@id="cameras"]
${EDITABLE TITLE}                            //h2[@id="editable-title"]
${CAMERAS VIEW BUTTON}                       //h4//button[@id="view-camera"]
${CAMERAS DETAILED INFO BUTTON}              //h4//button[@id="detailed-info"]
${ASPECT RATIO DROPDOWN}                     //button[@id="aspect-ratios"]
${ROTATION DROPDOWN}                         //button[@id="rotations"]
${ENABLE AUDIO CHECKBOX}                    //nx-section//nx-checkbox[@name="audioEnabled"]
${EDIT CREDENTIALS BUTTON}                   //nx-section//button[@id="update-credentials"]
${EDIT CREDENTIALS FORM}                     //form[@name="updateForm"]
${EDIT CREDENTIALS LOGIN INPUT}              ${EDIT CREDENTIALS FORM}//input[@id="cameraLoginCredentials"]
${EDIT CREDENTIALS PASSWORD INPUT}           ${EDIT CREDENTIALS FORM}//input[@id="cameraPasswordCredentials"]
${EDIT CREDENTIALS X BUTTON}                 ${EDIT CREDENTIALS FORM}//button[contains(@class,"close")]
${EDIT CREDENTIALS CANCEL BUTTON}            ${EDIT CREDENTIALS FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${EDIT CREDENTIALS SAVE BUTTON}              ${EDIT CREDENTIALS FORM}//button[contains(text(),"${SAVE BUTTON TEXT}")]
${RECORDING CHECK BOX}                       //nx-switch/div[@id="recording"]
${ENABLED RECORDING SLIDER}                  //span[contains(@class,"slider round")]
${RECORD ALWAYS RADIO BUTTON}                //nx-radio//input[@id="Record always"]
${RECORD MOTION RADIO BUTTON}                //nx-radio//input[@id="Record only motion"]
${RECORD MOTION LOW QUALITY RADIO BUTTON}    //nx-radio//input[@id="Motion + low-res"]
${FPS INPUT}                                 //input[@id="fps"]
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
${LICENSE REQUIRED WARNING}                  //nx-switch[@componentid="recording"]/following-sibling::div[contains(text(),"${PROFESSIONAL LICENSE REQUIRED TEXT}")]
${ONE LICENSE WILL BE USED WARNING}          //nx-switch[@componentid="recording"]/following-sibling::div[contains(text(),"${ONE LICENSE WILL BE USED TEXT}")]
${MOTION DETECTION DISABLED WARNING}         //nx-section//span[contains(@class,"input-error") and contains(text(),"${MOTION DETECTION DISABLED TEXT}")]
${MOTION SENSITIVITY IMAGE}                  //nx-block//div[contains(@class,"preview-wrapper")]//nx-health-image//img
${RECORDING MODE ERROR}                      ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(text(),"${SELECT RECORDING MODE TEXT}")]
${FPS ERROR}                                 ${FPS INPUT}/following-sibling::span[contains(text(),"${SELECT FPS TEXT}")]
${QUALITY ERROR}                             ${QUALITY DROPDOWN}/ancestor::nx-select/span[contains(text(),"${SELCT QUALITY TEXT}")]
${SAVE ERROR}                                //nx-apply//div[contains(text(),"${MISSING SETTINGS TEXT}")]

${GOOD CAM JSON 1}                           {"audioEnabled": false,"cameraId": "{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}","cameraName": "good cam","motionType":"2","motionMask":"5,0,0,44,32","scheduleEnabled": false}
${GOOD CAM JSON 2}                           [{"name":"overrideAr","value":"","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"},{"name":"rotation","value":"0","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"}]

${UNAUTH CAM JSON 1}                         {"cameraName":"unauth cam","cameraId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}","audioEnabled":false,"scheduleEnabled":false,"motionType":"2","motionMask":"5,0,0,44,32","scheduleTasks":[{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":1},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":2},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":3},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":4},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":5},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":6},{"fps":23,"recordingType":"RT_Always","streamQuality":"high","bitrateKbps":0,"endTime":86400,"startTime":0,"dayOfWeek":7}]}
${UNAUTH CAM JSON 2}                         [{"name":"overrideAr","value":"","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"},{"name":"rotation","value":"0","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"}]

${OFFLINE CAM JSON 1}                        {"cameraName":"offline cam","cameraId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}","audioEnabled":false,"scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${OFFLINE CAM JSON 2}                        [{"name":"overrideAr","value":"","resourceId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}"},{"name":"rotation","value":"0","resourceId":"{f8ad7b53-e604-4444-7481-64c1ce8cd742}"}]

${NO AUDIO CAM JSON 1}                       {"cameraName":"no audio cam","cameraId":"{785d421b-62a6-47fc-7fe8-9df96682284c}","audioEnabled":false,"scheduleEnabled":true,"motionType":"2","motionMask":"5,0,0,44,32"}
${NO AUDIO CAM JSON 2}                       [{"name":"overrideAr","value":"","resourceId":"{785d421b-62a6-47fc-7fe8-9df96682284c}"},{"name":"rotation","value":"0","resourceId":"{785d421b-62a6-47fc-7fe8-9df96682284c}"}]

${NO LICENSE CAM JSON 1}                     {"cameraName":"no license cam","cameraId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}","audioEnabled":false,"scheduleEnabled":false,"motionType":"0","motionMask":"5,0,0,44,32"}
${NO LICENSE CAM JSON 2}                     [{"name":"overrideAr","value":"","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"},{"name":"rotation","value":"0","resourceId":"{1de10ba8-3ed7-5ee1-f3d6-8e0d1b9d0036}"}]

${TRIPLE STATE CAM JSON 1}                   {"cameraName":"triple state cam","cameraId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}","audioEnabled":false,"overrideAr":"","rotation":"0","scheduleEnabled":true,"motionType":"2","motionMask":"5,0,0,44,32","scheduleTasks":[{"bitrateKbps":0,"dayOfWeek":1,"endTime":86400,"fps":3,"recordingType":"RT_Always","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":2,"endTime":86400,"fps":2,"recordingType":"RT_MotionOnly","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":3,"endTime":86400,"fps":2,"recordingType":"RT_MotionAndLowQuality","startTime":0,"streamQuality":"low"},{"bitrateKbps":0,"dayOfWeek":4,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":5,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":6,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"},{"bitrateKbps":0,"dayOfWeek":7,"endTime":86400,"fps":0,"recordingType":"RT_Never","startTime":0,"streamQuality":"highest"}]}
${TRIPLE STATE CAM JSON 2}                   [{"name":"overrideAr","value":"","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"},{"name":"rotation","value":"0","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"}]
