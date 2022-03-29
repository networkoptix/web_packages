*** Settings ***
Resource          ../Resources/front-end-resources/change-pass-resource.robot
Suite Setup       change-pass-resource.Setup
Test Setup        change-pass-resource.Restart
Test Teardown     Run Keyword If Test Failed    change-pass-resource.Reset DB and Open New Browser On Failure
Suite Teardown    Run Keyword and Ignore Error    change-pass-resource.Clean up
Force Tags        Threaded


*** Test Cases ***
1. Can be accessed via dropdown or direct link
    [tags]    C41576
    ${random user}=   Register and activate account with random email    mark    hamill    ${password}
    Go To    ${url}/account/password
    # note: user below requires a system for verification purposes but no interaction with the system nor any modifications to the account are made - thats why original account used here.
    Log In    ${random user}    ${password}    ${True}    button=None
    Wait Until Elements Are Visible    ${CURRENT PASSWORD INPUT}    ${NEW PASSWORD INPUT}
    Location Should Be    ${url}/account/password
    Title Should Be    ${CHANGE PASSWORD TITLE TEXT} - ${PRODUCT_NAME}
    Go To    ${url}
    #Wait Until Element Is Visible    ${AUTO TESTS TITLE}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Elements Are Visible    ${CHANGE PASSWORD BUTTON DROPDOWN}    ${ACCOUNT SETTINGS BUTTON}    ${LOG OUT BUTTON}
    Click Link    ${CHANGE PASSWORD BUTTON DROPDOWN}
    Wait Until Elements Are Visible    ${CURRENT PASSWORD INPUT}    ${NEW PASSWORD INPUT}
    Location Should Be    ${url}/account/password
    Log Out
    CloudPortalApi.Delete Account    ${random user}    ${password}

2. password can be changed
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Sleep    1
    Wait Until Element is Not Visible    ${CHANGE PASS NO CHANGES}
    Wait Until Elements Are Visible   ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Wait Until Elements Are Not Visible    ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}
    
3. password is actually changed, so login works with new password
    [tags]    C41576
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${ALT PASSWORD}
    Sleep    1
    Wait Until Elements Are Visible   ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Wait Until Elements Are Not Visible    ${CANCEL PASSWORD CHANGES BUTTON}    ${CHANGE PASSWORD BUTTON}
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}
    Log Out
    Go To    ${url}/account/password
    Log In    ${email}    ${password}    button=None    validate=${False}
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
    API Log In    ${email}    ${ALT PASSWORD}
    Reset user password to base    ${email}    ${ALT PASSWORD}

4. password with symbols pass!@#$%^&*()_-+=;:'"`~,./\|?[]{} is valid
    [tags]    C41834
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${symbol password}
    Wait Until Element Is Visible    ${PASSWORD IS FAIR BADGE}
    Wait Until Elements Are Visible   ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}
    Log Out
    Go To    ${url}/account/password
    Log In    ${email}    ${password}    button=None    validate=${False}
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
    API Log In    ${email}    ${symbol password}
    Reset user password to base    ${email}    ${symbol password}

5. password with space in the middle is valid
    [tags]    C41835
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${space password}
    Sleep    1
    Wait Until Elements Are Visible   ${CHANGE PASSWORD BUTTON}    ${CANCEL PASSWORD CHANGES BUTTON}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}
    Log Out
    Go To    ${url}/account/password
    Log In    ${email}    ${password}    button=None    validate=${False}
    Wait Until Element Is Visible    ${WRONG PASSWORD MESSAGE}
    API Log In    ${email}    ${space password}
    Reset user password to base    ${email}    ${space password}

6. more than 255 symbols can be entered in new password field and then are cut to 255
    [Tags]    Threaded
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${300CHARS}
    Input Text    ${NEW PASSWORD INPUT}    ${300CHARS}
    Textfield Should Contain    ${CURRENT PASSWORD INPUT}    ${255CHARS}
    Textfield Should Contain    ${NEW PASSWORD INPUT}    ${255CHARS}
    Click Button    ${ACCOUNT CANCEL}

7. pressing Enter key saves data
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Press Keys    ${NEW PASSWORD INPUT}    ENTER
    Wait Until Element is Visible    ${CHANGE PASS NO CHANGES}

8. pressing Tab key moves focus to the next element
    [tags]    C41841
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Press Keys    ${CURRENT PASSWORD INPUT}    TAB
    Element Should Be Focused    ${NEW PASSWORD INPUT}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Press Keys    ${NEW PASSWORD INPUT}    TAB
    Element Should Be Focused    ${CHANGE PASSWORD BUTTON}
    Click Button    ${ACCOUNT CANCEL}
    
9. displays password masked, shows password and changes eye icon when clicked
    [tags]    C41576
    Log In To Change Password Page
    ${input type}    Get Element Attribute    ${CURRENT PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'
    ${input type}    Get Element Attribute    ${NEW PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'
    Click Element    ${CHANGE PASS EYE ICON CLOSED}
    Wait Until Element Is Visible    ${CHANGE PASS EYE ICON OPEN}
    ${input type}    Get Element Attribute    ${NEW PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'text'
    Click Element    ${CHANGE PASS EYE ICON OPEN}
    Wait Until Element Is Visible    ${CHANGE PASS EYE ICON CLOSED}
    ${input type}    Get Element Attribute    ${NEW PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'

10. Password can't be changed if current password is not provided or incorrect
    [tags]    C41577
    Log In To Change Password Page
    Input Text    ${CURRENT PASSWORD INPUT}    ${EMPTY}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Delete All Text    ${NEW PASSWORD INPUT}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Discard Changes and Log Out
    Go To  ${url}
    Api Log In       ${email}    ${BASE PASSWORD}

11. should open change password page in anonymous state
    [tags]    anonymous
    Open page anonymously    ${url}/account/password    Authorization
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None
