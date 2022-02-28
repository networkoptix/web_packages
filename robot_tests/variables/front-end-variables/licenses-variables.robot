*** Variables ***
${LM HOST}        ${LM HOSTS}[stage]
${LM OWNER}       licautotests+owner@gmail.com
${LM PASSWORD}    qweasd123
@{LOCAL AUTH}     admin    ${BASE PASSWORD}
@{LM AUTH}        ${LM OWNER}    ${LM PASSWORD}
@{CLOUD AUTH}     ${LM OWNER}    ${BASE PASSWORD}

&{LM USERS}
...    cloudAdmin=licautotests+admin@gmail.com
...    viewer=licautotests+viewer@gmail.com
...    advancedViewer=licautotests+adviewer@gmail.com
...    custom=licautotests+custom@gmail.com
...    liveViewer=licautotests+liveviewer@gmail.com

&{LIC TYPES}
...    digital=Professional
...    analogencoder=Analog Encoder
...    iomodule=IO Module
...    starter=Starter
...    videowall=Video Wall
...    vmax=VMAX
...    bridge=Bridge
...    nvr=NVR

${TRIAL LICENSE}    0000-0000-0000-0005
${LICENSES LINK}    //a[@id="licenses"]

# System is offline
${THIS PAGE CANNOT BE LOADED}      //h2[@name="NO_SETTINGS" and contains(text(), "${THIS PAGE CANNOT BE LOADED TEXT}")]
${MAKE SURE SERVERS ARE ONLINE}    //div[@name="NO_SETTINGS" and contains(text(), "${MAKE SURE SERVERS ARE ONLINE TEXT}")]

# New License block
${NEW LICENSE HEADER}         //h4[contains(text(), "${NEW LICENSE TEXT}")]
${NEW LICENSE FORM}           //form[@id="newLicenseForm"]
${LICENSE KEY INPUT}          ${NEW LICENSE FORM}//label[contains(text(), "${LICENSE KEY TEXT}")]/following-sibling::div//input[@id="licenseKey"]
${FORMATTED KEY}              ${NEW LICENSE FORM}//span[@id="formattedKey"]
${BIND TO SERVER DROPDOWN}    ${NEW LICENSE FORM}//label[contains(text(), "${BIND TO SERVER TEXT}")]/following-sibling::div//button[@id="bindToServer"]
${SERVER MUST BE AVAILABLE}   ${NEW LICENSE FORM}//div[contains(text(), "${SERVER MUST BE AVAILABLE TEXT}")]
${ACTIVATE BUTTON}            //button[contains(text(), "Activate")]

# Activate Trial block
${ACTIVATE TRIAL FORM}        //form[@id="trialLicenseForm"]
${ACTIVATE TRIAL TEXT}        ${ACTIVATE TRIAL FORM}//div/div[contains(text(), "${YOU HAVE UNUSED TRIAL LICENSE TEXT}")]/following-sibling::div[contains(text(), "${ONCE ACTIVATED TEXT}")]
${ACTIVATE TRIAL BUTTON}      //button[contains(text(), "Activate Trial License")]

# License Summary block
${LICENSES SUMMARY BLOCK}      //nx-license-summary-component//div[@class="card"]
${LICENSES SUMMARY HEADER}     ${LICENSES SUMMARY BLOCK}//h4[contains(text(), "${LICENSES SUMMARY TEXT}")]
${LICENSES SUMMARY THEAD}      ${LICENSES SUMMARY BLOCK}//table/thead/tr/th[contains(text(), "${TYPE TEXT}")]/following-sibling::th[contains(text(), "${CHANNELS TEXT}")]/following-sibling::th[contains(text(), "${AVAILABLE TEXT}")]
${LICENSES SUMMARY TBODY}      ${LICENSES SUMMARY BLOCK}//table/tbody
${LICENSES SUMMARY RECORD}     ${LICENSES SUMMARY TBODY}/tr[contains(@class, "inserted")]

# License Detail block
${LICENSE DETAIL BLOCK}        //nx-license-detail-component/nx-block
${FIRST LICENSE}               ${LICENSE DETAIL BLOCK}//header/h4[1]
#${LICENSE TYPE}               ${LICENSE INFO}/p[contains(@title, "Type")]
#${LICENSE CHANNELS}           ${LICENSE INFO}/p[contains(@title, "Channels")]
#${LICENSE SERVER}             ${LICENSE INFO}/p[contains(@title, "Server")]
#${LICENSE HWID}               ${LICENSE INFO}/p[contains(@title, "Hardware ID")]
#${LICENSE STATUS}             ${LICENSE INFO}/p[contains(@title, "Status")]
#${LICENSE EXPIRES}            ${LICENSE INFO}/p[contains(@title, "Expires")]
#${LICENSE DEACT LEFT}         ${LICENSE INFO}/p[contains(@title, "Deactivation left")]
