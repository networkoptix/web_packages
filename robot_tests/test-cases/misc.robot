*** Settings ***
Resource          ../resource.robot
Test Teardown     Close Browser
Force Tags        Threaded


*** Test Cases ***
1. 404 page shows when going to a url that doesn't exist and gives a link back to home page
    [Tags]    C41565
    Open Browser and go to URL    ${url}/wfvyuieyuisgweyugv
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Click Link    ${TAKE ME HOME}
    Location Should Be    ${url}/

2. Failed to access system page correctly shows when going to a non-existent system
    Open Browser and go to URL    ${url}
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}
    Go To    ${url}/systems/htgfjtrdtrtyrrtydrydcrtydrtrdrtdrtdrtdrtd
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    <br>    ${EMPTY}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    \n    ${EMPTY}
    FOR    ${x}   IN RANGE    4
        ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    ${SPACE}${SPACE}    ${SPACE}
    END        
    Wait Until Elements Are Visible      
    ...    ${SYSTEM NO ACCESS}    
    ...    //div[normalize-space()\="${THIS LINK IS BROKEN TEXT}"]    
    ...    //button//a[@href\='/']/..
    ...    timeout=120 

3. The logo takes you to the systems page when logged in
    [Tags]    C41540
    Open Browser and go to URL    ${url}/authorize/register
    Log In    ${EMAIL OWNER}    ${BASE PASSWORD}    button=${LOG IN BTN CREATE ACCOUNT PAGE}
    Go To    ${url}/${NOPTIXAUTOQA SYSTEM ID}
    Wait Until Element Is Visible    ${HEADER ICON LINK}
    Click Link    ${HEADER ICON LINK}
    Wait Until Element Is Visible    ${NOPTIXAUTOQA SYSTEM NAME}
    Location Should Be    ${url}/systems

4. Language can be changed on landing page
    [Tags]    C41549
    Open Browser and go to URL    ${url}
    Set Language Anonymous    de_DE
    Wait Until Element is Visible    //header//a/span[contains(text(),"Account erstellen")]