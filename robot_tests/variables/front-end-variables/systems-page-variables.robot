*** Variables ***
${SYSTEMS HEADER}                     //h1/span[contains(text(), "${SYSTEMS TITLE TEXT}")]
${SYSTEMS LIST}                       //nx-systems-list-component
${SYSTEMS LIST BUTTONS}               ${SYSTEMS LIST}//div[contains(@class, 'system-button')]
${SYSTEMS SEARCH INPUT}               ${SYSTEMS LIST}//div[contains(@class,'search-block')]//input
${SYSTEM SEARCH X BUTTON}             ${SYSTEMS SEARCH INPUT}//following-sibling::button[contains(@class,'search-clear')]
${YOU HAVE NO SYSTEMS}                //span[contains(text(),"${YOU HAVE NO SYSTEMS TEXT}")]
