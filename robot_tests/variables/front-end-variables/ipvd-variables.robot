*** Variables ***

${url}                  ${ENV}
${name}                 Nx Automated QA
${message}              This is an automated test message.

#IPVD
${IPVD TITLE}                         //header//li[@class="active"]/a[contains(text(),"${IPVD TITLE TEXT}")]
${IPVD LANDING PAGE TEXT}             //nx-ipvd//p

#IPVD Filters
${IPVD FILTERS}                       //nx-ipvd//nx-search/div/div
${IPVD FILTER BUTTON}                 //nx-search//span[@class="filter-label"]
${IPVD FILTER BUTTON X CLOSE}         ${IPVD FILTER BUTTON}/following-sibling::span[contains(@class, "close-icon"])]
${IPVD FILTERS BASIC}                 ${IPVD FILTERS}/div[1]/div
${IPVD SEARCH BAR}                    ${IPVD FILTERS BASIC}/div[1]/input[@name="query"]
${IPVD CLEAR TEXT SEARCH BUTTON}      ${IPVD FILTERS}//button[contains(@class, "search-clear")]
${IPVD FILTERS APPLIED BUTTON}        ${IPVD FILTERS BASIC}/div[2]${IPVD ADV FEATURES CLOSE BUTTON}/..
${IPVD ADV SEARCH BUTTON}             ${IPVD FILTERS BASIC}/div/span[contains(text(),'${IPVD ADV SEARCH BUTTON TEXT}')]/..
${IPVD ARROW}                         //*[contains(@data-src,"/images/icons/text_buttons/arrow_expand.svg")]

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
${IPVD ADV FEATURES AUDIO}            ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE AUDIO}') and not(contains(text(),'${IPVD ADV FEATURE 2-WAY AUDIO}'))]/..
${IPVD ADV FEATURES 2-WAY AUDIO}      ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE 2-WAY AUDIO}')]/..
${IPVD ADV FEATURES PTZ}              ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE PTZ}') and not(contains(text(),'${IPVD ADV FEATURE ADV PTZ}'))]/..
${IPVD ADV FEATURES ADV PTZ}          ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE ADV PTZ}')]/..
${IPVD ADV FEATURES FISHEYE}          ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE FISHEYE}')]/..
${IPVD ADV FEATURES MOTION}           ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE MOTION}')]/..
${IPVD ADV FEATURES I/O}              ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE I/O}')]/..
${IPVD ADV FEATURES H.265}            ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE H.265}')]/..
${IPVD ADV FEATURES MULTI SENSOR}     ${IPVD ADV FEATURES}//nx-tag/a[contains(text(),'${IPVD ADV FEATURE MULTI SENSOR}')]/..
${IPVD ADV FEATURES CLOSE BUTTON}     //span[contains(@class,'close-button')]
#IPVD Manufacturers
${IPVD MANUFACTURERS PANE}            //nx-ipvd//nx-vendor-list/nx-block[@id='vendors']
${IPVD MANUFACTURERS PANE ITEM}       ${IPVD MANUFACTURERS PANE}//*[contains(@class,"float-left mr-1 mb-1")]
${IPVD AND MORE}                      ${IPVD MANUFACTURERS PANE}//div[@class="manufacture-info"]
#IPVD Devices
${IPVD DEVICES PANE}                  //nx-ipvd//nx-vendor-list/nx-block[@id='cameras']
${IPVD DEVS FILTER EXTRA HIGH RES CAMERAS}    ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER EXTRA HIGH RES CAMERAS}')]/..
${IPVD DEVS FILTER CAMERAS WITH ADV PTZ}      ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER CAMERAS WITH ADV PTZ}')]/..
${IPVD DEVS FILTER PTZ CAMERAS}               ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER PTZ CAMERAS}')]/..
${IPVD DEVS FILTER CAMERAS WITH AUDIO}        ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER CAMERAS WITH AUDIO}')]/..
${IPVD DEVS FILTER H.265 CAMERAS}             ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER H.265 CAMERAS}')]/..
${IPVD DEVS FILTER ENCODERS}                  ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER ENCODERS}')]/..
${IPVD DEVS FILTER 2-WAY AUDIO DEVICES}       ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER 2-WAY AUDIO DEVICES}')]/..
${IPVD DEVS FILTER MULTI-SENSOR CAMERAS}      ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER MULTI-SENSOR CAMERAS}')]/..
${IPVD DEVS FILTER FISHEYE CAMERAS}           ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER FISHEYE CAMERAS}')]/..
${IPVD DEVS FILTER I/O MODULES}               ${IPVD DEVICES PANE}//nx-tag/a[contains(text(),'${IPVD DEV FILTER I/O MODULES}')]/..
#IPVD Details
${IPVD DEVICE DETAILS}                       //nx-ipvd//nx-cam-view
${IPVD DEVICE MAKE}                          ${IPVD DEVICE DETAILS}//h4[@class="camera-vendor-model"]//span[1]
${IPVD DEVICE MODEL}                         ${IPVD DEVICE DETAILS}//h4[@class="camera-vendor-model"]//span[2]
${IPVD CLOSE DETAILS BUTTON}                 //nx-ipvd//header//button[contains(@class, "detailsClose")]
${IPVD DEVICE GOOGLE LINK}                   ${IPVD DEVICE DETAILS}//div[contains(@class, "camview-link")]/a[contains(text(), "${IPVD SEARCH IN GOOGLE TEXT}")]
${IPVD DEVICE INFO}                          ${IPVD DEVICE DETAILS}//div[contains(@class,'active-camera-info')]
${IPVD DEVICE INFO PARAMETER}                ${IPVD DEVICE INFO}/div
${IPVD DEVICE RESOLUTION}                    ${IPVD DEVICE INFO}//nx-bool-icon[contains(@param, 'maxResolution')]/..
${IPVD DEVICE FIRMWARE INFO}                 ${IPVD DEVICE DETAILS}//nx-section//div[contains(@class, "firmware-info")]
${IPVD DEVICE FIRMWARE VERSION}              ${IPVD DEVICE FIRMWARE INFO}//h4[contains(text(), "${IPVD FIRMWARE VERSION TEXT}")]
${IPVD DEVICE FIRMWARE VERSION POPULARITY}   ${IPVD DEVICE FIRMWARE INFO}//h4[contains(text(), "${IPVD FIRMWARE VERSION POULARITY TEXT}")]
${IPVD DEVICE FIRMWARE VERSIONS}             ${IPVD DEVICE FIRMWARE INFO}/div
${IPVD DEVICE SHOW ALL LINK}                 ${IPVD DEVICE FIRMWARE INFO}//a[contains(text(), "${IPVD DEVICE SHOW ALL TEXT}")]
${IPVD DEVICE COLLAPSE LINK}                 ${IPVD DEVICE FIRMWARE INFO}//a[contains(text(), "${IPVD DEVICE COLLAPSE TEXT}")]
${IPVD DEVICE LAST UPDATED INFO}             ${IPVD DEVICE DETAILS}//span[contains(text(), "${IPVD LAST UPDATED TEXT}")]

#IPVD Table
${IPVD TABLE}                         //nx-ipvd//table
${IPVD TABLE HEADING MANUFACTURER}    ${IPVD TABLE}/thead//div[text()='${IPVD ADV FILTER MFR}']
${IPVD TABLE HEADING LABEL SORT ARROW}    /../div[2]
${IPVD TABLE ROWS}                    ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')]
${IPVD TABLE FIRST ITEM}              ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')][1]
${IPVD TABLE LAST ITEM}               ${IPVD TABLE}/tbody/tr[not(@class='table-row-spacer')][last()]
#IPVD Pagination
${IPVD PAGINATION}                    //ipvd//nx-paginator
${IPVD PREVIOUS PAGE BUTTON}          ${IPVD PAGINATION}/a[@id="paginator-prev"]
${IPVD FIRST PAGE BUTTON}             ${IPVD PAGINATION}/a[@id="paginator-tile-first"]
${IPVD LAST PAGE BUTTON}              ${IPVD PAGINATION}/a[@id="paginator-tile-last"]
${IPVD NEXT PAGE BUTTON}              ${IPVD PAGINATION}/a[@id="paginator-next"]
#IPVD Export
${IPVD EXPORT TO CSV LINK}            //ipvd//div[@class='export-button']/a[contains(text(), "${IPVD EXPORT TO CSV TEXT}")]
#IPVD Feedback
${IPVD SUBMIT A REQUEST LINK}        ${IPVD LANDING PAGE TEXT}//span[@id="request"]
${IPVD SUBMIT A REQUEST}              //nx-ipvd//span[contains(text(),"${IPVD SUBMIT A REQUEST TEXT}")]
${IPVD SEND DEVICE FEEDBACK}          //nx-ipvd//a[contains(text(),"${IPVD SEND DEVICE FEEDBACK TEXT}")]
${IPVD FEEDBACK}                      //nx-modal-message-content//form[@name='messageForm']
${IPVD FEEDBACK TITLE}                ${IPVD FEEDBACK}//h1
${IPVD FEEDBACK FORM}                 ${IPVD FEEDBACK}//form[@name='feedbackForm']
${IPVD FEEDBACK YOUR NAME}            ${IPVD FEEDBACK FORM}//input[@id='user_name']
${IPVD FEEDBACK EMAIL}                ${IPVD FEEDBACK FORM}//input[@id='user_email']
${IPVD FEEDBACK MESSAGE}              ${IPVD FEEDBACK FORM}//textarea[@id='message']
${IPVD FEEDBACK PRIVACY POLICY}       ${IPVD FEEDBACK FORM}//a[text()="${PRIVACY POLICY LINK TEXT}"]
${IPVD FEEDBACK SEND BUTTON}          ${IPVD FEEDBACK}//button[text()="${SEND BUTTON TEXT}"]
${IPVD FEEDBACK CANCEL BUTTON}        ${IPVD FEEDBACK}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${IPVD FEEDBACK CLOSE BUTTON}         ${IPVD FEEDBACK}//button[contains(@class,'close')]

${NOTHING FOUND PLACEHOLDER}          //div[contains(@class,'text-placeholder') and contains(text(),"${NOTHING FOUND}")]