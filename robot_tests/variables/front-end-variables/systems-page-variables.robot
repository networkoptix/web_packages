*** Variables ***
${SYSTEMS LIST}                       //nx-systems-list-component
${SYSTEMS LIST BUTTONS}               ${SYSTEMS LIST}//div[contains(@class, 'system-button')]
${SYSTEMS SEARCH INPUT}               ${SYSTEMS LIST}//div[contains(@class,'search-block')]//input
${SYSTEM SEARCH X BUTTON}             ${SYSTEMS SEARCH INPUT}//preceding::a[contains(@class,'input-overlay-right')]
${YOU HAVE NO SYSTEMS}                //span[contains(text(),"${YOU HAVE NO SYSTEMS TEXT}")]
