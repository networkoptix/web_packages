*** Variables ***
${SYSTEMS SEARCH INPUT}               //nx-systems-list-component//div[contains(@class,'search-block')]//input
${SYSTEM SEARCH X BUTTON}             ${SYSTEMS SEARCH INPUT}//preceding::a[contains(@class,'input-overlay-right')]
${YOU HAVE NO SYSTEMS}                //span[contains(text(),"${YOU HAVE NO SYSTEMS TEXT}")]
