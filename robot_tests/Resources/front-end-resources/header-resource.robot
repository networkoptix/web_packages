*** Keywords ***
Header Suite Teardown
    FOR    ${user email}    IN    @{HEADER TMP USERS}
        ${systems}=  Get Account Systems    ${ENV}    ${user email}    ${base password}
        Delete Account    ${ENV}    ${user email}    ${base password}
    END
    Close All Browsers

Validate Header Button Text
    [Arguments]    ${expected text}    ${systems}=${True}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    ${actual text}=   Get Text    ${SYSTEMS DROPDOWN}/span
    Run Keyword If    ${systems}    Should be equal as strings    ${expected text}${SPACE}${SYSTEMS TITLE TEXT}    ${actual text}
        ...    ELSE    Should be equal as strings    ${expected text}    ${actual text}

Validate Active Tab Text
    [Arguments]    ${expected text}
    Wait Until Elements Are Visible    ${HEADER ACTIVE TAB}
    ${active tab text}=   Get Text    ${HEADER ACTIVE TAB}
    ${active tab text}=   Evaluate    $active_tab_text.strip()
    Should Be Equal As Strings    ${active tab text}    ${expected text}

Validate Active Navigation Item
    [Arguments]    ${item text}
    Wait Until Element is Visible    ${DROPDOWN NAVIGATION GRID}//li[contains(@class, "nav-links") and contains(@class, "active")]//span[contains(text(), "${item text}")]

Validate System Info
    [Arguments]    ${system name}    ${owner name}    # ${online}=${True}
    Wait until element is visible    ${DROPDOWN SYSTEMS TILE}//div[@class="system-info"]//span[@class="system-name" and contains(text(), "${system name}")]    timeout=5
    ${owner txt}=   Get Text  ${DROPDOWN SYSTEMS TILE}//div[@class="system-info"]//span[@class="system-name" and contains(text(), "${system name}")]/following-sibling::span[@class="owner"]
    Should contain    ${owner txt}    ${OWNER TEXT}    ${owner name}
# TODO: add checking online/offline status
#    Run Keyword If    ${online}    Wait until element is visible    ${DROPDOWN SYSTEMS TILE}//div[@class="system-status"]//svg[@id=Layer_1]
#    ...    ELSE    Wait until element is visible    ${DROPDOWN SYSTEMS TILE}//div[@class="system-status"]//svg[@id=Layer_2]

Validate System's Tile
    [Arguments]    ${system name}
    Wait until elements are visible
    ...    ${DROPDOWN NAVIGATION GRID}//h5[text()="${system name}"]
    ...    ${DROPDOWN NAVIGATION GRID}//span[text()="${SPACE}${VIEW}${SPACE}"]
    ...    ${DROPDOWN NAVIGATION GRID}//span[contains(text(), "${SETTINGS TEXT}")]
    ...    ${DROPDOWN NAVIGATION GRID}//span[contains(text(), "${INFORMATION TEXT}")]

Validate Navigation Grid Tile
    [Arguments]    ${tile header}    ${tile pages}
#    Wait until element is visible    ${DROPDOWN NAVIGATION GRID}//h5[text()="${tile header}"]
    FOR    ${page}    IN    @{tile pages}
        ${page title}=   Evaluate    $page['title'].strip()
        Wait until element is visible    ${DROPDOWN NAVIGATION GRID}//h5[text()="${tile header}"]/following-sibling::ul//span[contains(text(), "${page}[title]")]
    END

Verify extra systems number is correct
    [Arguments]    ${expected number}
    ${tiles text}=   Get Text    ${EXTRA SYSTEM TILE}
    Should be equal as strings    +${SPACE}${expected number}${SPACE}${SYSTEMS TITLE TEXT}    ${tiles text}
