*** Variables ***

#view-page
${SERVER LIST}                                //nx-system-view-index-page//div[@class="server-list"]
${SERVER LIST MENU}                           //nx-system-view-index-page//media-server-list
${SERVER LIST INFO OFF BTN}                   //nx-system-view-index-page//media-server-list//div[@class="details-toggler"]
${SERVER LIST INFO ON BTN}                    //nx-system-view-index-page//media-server-list//div[@class="details-toggler active"]
${SERVER LIST NAME INFO}                      //nx-system-view-index-page//media-server-list//div[@class="server-name"]
${SERVER LIST SEARCH BAR}                     //nx-system-view-index-page//media-server-list//nx-media-server-list-header//input
${SERVER LIST SEARCH RESULT PANE}             //nx-system-view-index-page//media-server-list//div[@class="server-list"]//div
${SERVER LIST SEARCH CLEAR INPUT}             //nx-system-view-index-page//media-server-list//nx-media-server-list-header//*[local-name() = 'svg']
${CAMERA PAGE LIVE INDICATOR}                 //nx-system-view-index-page//playback-state-indicator//div[@class="is-live active playing"]
${SERVER LIST IP INFO}                        //nx-system-view-index-page//media-server-list//div[@class="server-name"]//span/following-sibling::span
${VERTICAL TOGGLE EAR BEFORE CLICK}           //nx-system-view-index-page//nx-system-view-camera-page//div[contains(@class,"controls-toggling-ear")]/div/div
${STREAM AND CONTROLS VISIBLE}                //nx-system-view-index-page//nx-system-view-camera-page[contains(@class,"controls-shown")]
${SERVER LIST IS VISIBLE}                     //nx-system-view-index-page[contains(@class,"sidebarShown")]
${HORIZONTAL TOGGLE EAR}                      //nx-system-view-index-page//div[contains(@class,"sidebar-toggling-ear")]
${SETTINGS HEADER TAB}                        //nx-app//header//nav//a[text()="${SETTINGS TEXT}"]
${VIEW HEADER TAB}                            //nx-app//header//nav//a[text()="View"]
${VIEW SETTINGS TOGGLER}                      //nx-system-view-index-page//nx-system-view-camera-page//div[@class="settings-toggler"]
${VIEW SETTINGS TRANSPORT WEBM}               //nx-system-view-index-page//nx-system-view-camera-page//div[text()="${VIEW PAGE WEBM TEXT}"]
${VIEW SETTINGS QUALITY HIGH}                 //nx-system-view-index-page//nx-system-view-camera-page//div[text()="${HIGH TEXT}"]
${VIEW SETTINGS QUALITY LOW}                  //nx-system-view-index-page//nx-system-view-camera-page//div[text()="${LOW TEXT}"]
${VIEW SETTINGS MENU EXPAND}                  //nx-system-view-index-page//nx-system-view-camera-page//div[text()="${VIEW PAGE TRANSPORT TEXT}"]
${VIEW SETTINGS TRANSPORT HLS}                //nx-system-view-index-page//nx-system-view-camera-page//div[text()="${VIEW PAGE HLS TEXT}"]
${VIEW SETTINGS QUALITY 1080P}                //nx-system-view-index-page//nx-system-view-camera-page//div[text()="1080p"]
${VIEW CAMERA QUALITY}                        //nx-system-view-index-page//nx-system-view-camera-page//span[@class="name"]/span
${VIEW CAMERA NAME AND QUALITY}               //nx-system-view-index-page//nx-system-view-camera-page//span[@class="name"]
${CAMERA PLAYER}                              //nx-system-view-camera-page//player//player-js
${VIEW CAMERA LOADING}                        //nx-system-view-camera-page//div[@name="placeholder"]//div
${VIEW CAMERA IS LIVE INDICATOR}              //nx-system-view-camera-page//div[@class="is-live active playing"]
${VIEW CAMERA PLAYER OFFLINE}                 //nx-system-view-index-page//nx-player-placeholder//span[text()="${VIEW PAGE CAMERA OFFLINE TEXT}"]
${VIEW CAMERA PLAYER AUTHENTICATION}          //nx-system-view-index-page//nx-player-placeholder//span[text()="${VIEW PAGE CAMERA AUTHENTICATION TEXT}"]
${SYSTEM NAME}                                //div/nx-editable-heading[@id="systemName"]
${SYSTEM OFFLINE}                             //nx-system-view-index-page//div[@name="OFFLINE"]
