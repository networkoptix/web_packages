*** Variables ***
${url integrations}        ${ENV}/integrations
${title}      ${VMS_NAME} ${INTEGRATIONS TITLE TEXT} - ${PRODUCT_NAME}
@{auth}       ${BASE EMAIL}    ${BASE EMAIL PASSWORD}

#Integration Landing Page
${INTEGRATIONS COMPONENT}             //nx-app//integrations-component/div[@class="intergations"]
${INTEGRATIONS SEARCH}                ${INTEGRATIONS COMPONENT}//nx-search[@name="filterModel"]/div[@class="nx-search"]
${INTEGRATIONS SEARCH INPUT}          ${INTEGRATIONS SEARCH}//input[contains(@class, "search-input") and contains(@placeholder, "${SEARCH PLACEHOLDER TEXT}")]
${INTEGRATIONS SEARCH CLOSE BUTTON}   ${INTEGRATIONS SEARCH}//button[contains(@class, "search-clear")]
${INTEGRATIONS SEARCH ICON}           ${INTEGRATIONS SEARCH}//span[contains(@class, "icon-search")]
${INTEGRATIONS SEARCH FILTER}         ${INTEGRATIONS SEARCH}//div[contains(@class, "search-tags")]//nav[contains(@aria-label, "table")]/ul[contains(@class, "pagination")]
${INTEGRATIONS SEARCH FILTER ITEM}    ${INTEGRATIONS SEARCH FILTER}/li
${INTEGRATIONS CATALOG}               ${INTEGRATIONS COMPONENT}//integrations-list-component/div[1]
${INTEGRATION PREVIEW BANNER}         //nx-ribbon//div[@class="message" and contains(text(),"${INTEGRATION BANNER MESSAGE TEXT}")]/following-sibling::div[@class="action"]/a[contains(text(),"${INTEGRATION BANNER ACTION TEXT}")]

#Integration Tile
${INTEGRATION TILE}                   ${INTEGRATIONS COMPONENT}//integrations-list-component//nx-block/div[contains(@class, "card")]/../../..
${INTEGRATION TEST INTEGRATION LINK}  ${INTEGRATION TILE}//a
${INTEGRATION TILE LOGO}              //div[contains(@class, "card--header-logo")]
${INTEGRATION TILE INFO}              //div[contains(@class, "card--header-info")]
${INTEGRATION TILE NAME}              //div[contains(@class, "card--body-name")]
${INTEGRATION TILE TEXT}              //div[contains(@class, "card--body-descr")]
${INTEGRATION TILE HEADER}            //div[@class="card--header extended-header"]
#${INTEGRATION TILE BODY}              ${INTEGRATION TILE}//nx-section/child::div[@class="card--body"]
${INTEGRATION TILE FOOTER}            //div[@class="card--footer"]
@{INTEGRATION TILE ELEMENTS}          ${INTEGRATION TILE LOGO}    ${INTEGRATION TILE NAME}    ${INTEGRATION TILE TEXT}    ${INTEGRATION TILE HEADER}    ${INTEGRATION TILE FOOTER}

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
${INTEGRATION CAROUSEL PREVIEW}                 ${INTEGRATION DETAILS COMPONENT}//nx-carousel//div[contains(@class, "btn-group carousel-preview")]
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
${INTEGRATION GET IN TOUCH DROPDOWN ICON}       ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}//svg-icon[contains(@data-src,"/images/icons/text_buttons/arrow_expand.svg")]
${INTEGRATION GET IN TOUCH DROPDOWN LIST}       ${INTEGRATION GET IN TOUCH BODY}//div[@class="dropdown-menu"]
${INTEGRATION GET IN TOUCH MESSAGE LABEL}       ${INTEGRATION GET IN TOUCH BODY}//label[@for="message"]
${INTEGRATION GET IN TOUCH MESSAGE INPUT}       ${INTEGRATION GET IN TOUCH BODY}//textarea[@id="message"]
${INTEGRATION GET IN TOUCH PRIVACY LINKS}       ${INTEGRATION GET IN TOUCH BODY}//div[contains(@class, "form-group")]//a[text()="${PRIVACY POLICY LINK TEXT}"]
${INTEGRATION GET IN TOUCH SEND BUTTON}         ${INTEGRATION GET IN TOUCH FOOTER}//nx-process-button/div/button
${INTEGRATION GET IN TOUCH CANCEL BUTTON}       ${INTEGRATION GET IN TOUCH FOOTER}//button[contains(@type, "button")]
${INTEGRATION GET IN TOUCH LEGAL}               ${INTEGRATION GET IN TOUCH FORM}//form[@name="feedbackForm"]/div[6]


@{all fields}=
...    ${INTEGRATION ALL INTEGRATIONS}
# Removed temporarily as there isn't a good way to target it
# ...    ${INTEGRATION VERSION}
...    ${INTEGRATION HOW IT WORKS LINK}
...    ${INTEGRATION HOW TO SETUP LINK}
...    ${INTEGRATION TAGS SECTION}
...    ${INTEGRATION GET IN TOUCH LABEL}
...    ${INTEGRATION GET IN TOUCH BUTTON}
...    ${INTEGRATION DEVELOPER LABEL}
...    ${INTEGRATION DEVELOPER COMPANY LINK}
...    ${INTEGRATION DEVELOPER TERMS OF USE LINK}
...    ${INTEGRATION SUPPORT LABEL}
# Removed temporarily as there isn't a good way to target it
#...    ${INTEGRATION SUPPORT LINK}
#...    ${INTEGRATION SUPPORT EMAIL}
...    ${INTEGRATION HOW IT WORKS VIDEO}
...    ${INTEGRATION HOW IT WORKS CAROUSEL}
...    ${INTEGRATION CAROUSEL RIGHT BUTTON}
...    ${INTEGRATION CAROUSEL LEFT BUTTON}
...    ${INTEGRATION CAROUSEL PREVIEW}
...    ${INTEGRATION DOWNLOADS SECTION}
...    ${INTEGRATION REQUIREMENTS SECTION}
...    ${INTEGRATION HOW IT WORKS HEADER}

@{required fields}=
...    ${INTEGRATION ALL INTEGRATIONS}
# Removed temporarily as there isn't a good way to target it
# ...    ${INTEGRATION VERSION}
...    ${INTEGRATION HOW IT WORKS LINK}
...    ${INTEGRATION HOW TO SETUP LINK}
...    ${INTEGRATION TAGS SECTION}
...    ${INTEGRATION GET IN TOUCH LABEL}
...    ${INTEGRATION GET IN TOUCH BUTTON}
...    ${INTEGRATION DEVELOPER LABEL}
...    ${INTEGRATION DEVELOPER COMPANY LINK}
...    ${INTEGRATION SUPPORT LABEL}
# Removed temporarily as there isn't a good way to target it
#...    ${INTEGRATION SUPPORT EMAIL}
...    ${INTEGRATION HOW IT WORKS HEADER}