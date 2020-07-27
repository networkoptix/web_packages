*** Settings ***
Resource          ../resource.robot
Resource          ../variables-env.robot

Suite Setup       Open Browser and go to URL    ${ENV}
Test Setup        Go To    ${ENV}
Test Teardown     Run Keyword If Test Failed   Go To Integrations Page
Suite Teardown    Close All Browsers
Force Tags        integrations    Threaded File

*** Variables ***
${url}        ${ENV}/integrations
${title}      ${INTEGRATIONS TITLE TEXT} - ${PRODUCT_NAME}
@{auth}       ${BASE EMAIL}    ${BASE EMAIL PASSWORD}

*** Test Cases ***
Integration Store title and URL are correct
    [Tags]    C54622
    Go To Integrations Page
    Wait Until Location Is    ${url}
    Title Should Be    ${title}
    Validate Integrations Landing Page

Integration Store catalog
    [Tags]    C54622
    Go To Integrations Page
    Wait Until Element Is Visible    ${INTEGRATION TILE}
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    ${number of tiles}=   Get Length    ${integration tiles}
    FOR    ${index}    IN RANGE    ${number of tiles}
        ${tile number}=   Evaluate    ${index}+1
        Validate Integration Tile    ${tile number}
    END
#    Validate Random Tile N times    ${integration tiles}    3

Changing page should change the layout to a max of four colunmns
    [Tags]    C54622
    Go To Integrations Page
    Set Window Size    5000    1080
    Sleep    1
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    FOR    ${tile}    IN    @{integration tiles}
        Element Style Should be   ${tile}    flex-basis    25%
    END

    Set Window Size    500    1080
    Sleep    1
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    FOR    ${tile}    IN    @{integration tiles}
        Element Style Should be   ${tile}    flex-basis    100%
    END

    Set Window Size    1920    1080

Integration Store Search
    [Tags]    	C54620
    Go To Integrations Page
    Wait Until Element is Visible    ${INTEGRATION TILE}
    
    ${initial number of tiles}=   Get Number of Integration Tiles
    ${number of filters}=    Get Element Count    ${INTEGRATIONS SEARCH FILTER ITEM}
    Should be equal as numbers    ${number of filters}    9

    Log    Step 2
    Validate changes when input text into search field    v
    Validate changes when input text into search field    vi
    Validate changes when input text into search field    vis

    Click Element    ${INTEGRATIONS SEARCH CLOSE BUTTON}
    ${number of tiles}=   Get Number of Integration Tiles
    Should be equal as numbers    ${initial number of tiles}   ${number of tiles}
    ${actual url}=   Get Location
    Should be equal as strings    ${actual url}    ${url}

    Input Text     ${INTEGRATIONS SEARCH INPUT}    vis
    Wait Until Location is    ${url}?search=vis
    Each Integration Tile Contains    vis    Vis

    Log    Step 3
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[3]
    Wait Until Location Is    ${url}?search=vis&tags=objectDetection
    Wait Until Element is Visible    ${INTEGRATIONS SEARCH FILTER}/li[3]//span[contains(@class, "tag-close-icon")]
    ${current}=   Number of Integrations Should be Lower    ${number of tiles}
    Each Integration Tile Contains    vis    Vis

    Log    Step 4
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[7]
    Wait Until Location Is    ${url}?search=vis&tags=objectDetection,health
    Wait Until Element is Visible    ${INTEGRATIONS SEARCH FILTER}/li[7]//span[contains(@class, "tag-close-icon")]
    ${current}=   Number of Integrations Should be Higher    ${current}
    Each Integration Tile Contains    vis    Vis
    Each Integration Tile Contains    Object Detection    ${EMPTY}
    Each Integration Tile Contains    Health Monitoring    ${EMPTY}

    Log    Step 5
    Click Element     ${INTEGRATIONS SEARCH CLOSE BUTTON}
    Textfield Should Contain    ${INTEGRATIONS SEARCH INPUT}    ${EMPTY}
    Wait Until Location Is    ${url}?tags=objectDetection,health
    ${current}=   Number of Integrations Should be Higher    ${current}

    Log    Step 6
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[3]//span[contains(@class, "tag-close-icon")]
    Wait Until Location Is    ${url}?tags=health
    ${current}=   Number of Integrations Should be Lower    ${current}

    Log    Step 7
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[7]//span[contains(@class, "tag-close-icon")]
    Wait Until Location Is    ${url}
    ${current}=   Number of Integrations Should be Higher    ${current}
    Go Back
    Wait Until Location Is    ${url}?tags=health
    ${current}=   Number of Integrations Should be Lower    ${current}
    Go Back
    Wait Until Location Is    ${url}?tags=objectDetection,health
    ${current}=   Number of Integrations Should be Lower    ${current}
    Go Back
    Wait Until Location Is    ${url}?search=vis&tags=objectDetection,health
    ${current}=   Number of Integrations Should be Higher    ${current}
    Go Forward
    Wait Until Location Is    ${url}?tags=objectDetection,health
    ${current}=   Number of Integrations Should be Lower    ${current}
    Go To Integrations Page

Integration Store Integration Details Required Fields
    [Tags]    C54623
    Go To Integrations Page
    Wait Until Element Is Visible    ${INTEGRATION TILE}
    CLick Element    ${INTEGRATION TEST INTEGRATION LINK}//h3[text()="${INTEGRATION REQUIRED FIELDS}"]/ancestor::a/..
    Validate Integration Details Page    all=False
    Go To Integrations Page

Integration Store Integration Details All Fields
    [Tags]    C54623
    Go To Integrations Page
    Wait Until Element Is Visible    ${INTEGRATION TILE}
    CLick Element    ${INTEGRATION TILE}//h3[text()="${INTEGRATION ALL FIELDS}"]/ancestor::a/..
    Validate Integration Details Page

Send messages using Integration Contact "Get in touch" form
    [Tags]    C54681
    Go To Integrations Page
    Click Element    ${INTEGRATION TEST INTEGRATION LINK}/..
    Wait Until Element is Visible    ${INTEGRATION GET IN TOUCH BUTTON}
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}
    Validate "Get in Touch" Form

    Log    Validating close buttons
    Click Element    ${INTEGRATION GET IN TOUCH CLOSE BUTTON}
    Element Should Not Be Visible    ${INTEGRATION GET IN TOUCH FORM}
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}
    Click Button    ${INTEGRATION GET IN TOUCH CANCEL BUTTON}
    Element Should Not Be Visible    ${INTEGRATION GET IN TOUCH FORM}
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}

    Log    Validating privacy links
    @{privacy links}=   Get WebElements    ${INTEGRATION GET IN TOUCH PRIVACY LINKS}
    ${num of privacy links}=   Get length    ${privacy links}
    Should be equal as numbers    ${num of privacy links}    2
    ${privacy link href}=   Get Element Attribute    ${privacy links}[1]    href
    Should Contain    ${privacy link href}    ${PRIVACY POLICY URL HREF}

Integration store shows nothing found when there are no published integrations
    [Tags]    C55073
    ${loc}=   get location    
    ${dw}=   Replace String    ${loc}    https://    https://dw.
    Go To    ${dw}/integrations
    Wait Until Element Is Visible    ${NOTHING FOUND PLACEHOLDER}

Anonymous and basic user does not see disabled integration store
    [Tags]    C54635
    ${loc}=   get location    
    ${hanwha}=   Replace String    ${loc}    https://    https://hanwha.
    Go To    ${hanwha}
    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    Element Should Not be Visible    ${FOOTER INTEGRATIONS LINK}
    Go To    ${hanwha}/integrations
    Wait Until Location Contains    404
    
    Log In    ${EMAIL VIEWER}    ${BASE PASSWORD}
    Go to    ${hanwha}/integrations
    Wait Until Location Contains    404
    Log Out
    Sleep    1


Developer user can see disabled integration store
    [Tags]    C54633
    ${loc}=   get location    
    ${hanwha}=   Replace String    ${loc}    https://    https://hanwha.
    Go To    ${hanwha}
    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    Element Should Not be Visible    ${FOOTER INTEGRATIONS LINK}
    Log In    ${EMAIL MOBILE CAMERA DEV}    ${BASE PASSWORD}
    Go To    ${hanwha}/integrations
    Wait Until Element is Visible    ${INTEGRATION PREVIEW BANNER}
    Each Integration Tile Contains    Mine
    Log Out
    Sleep    1

Portal manager user can see disabled integration store
    [Tags]    C54632	
    ${loc}=   get location    
    ${hanwha}=   Replace String    ${loc}    https://    https://hanwha.
    Go To    ${hanwha}
    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    Element Should Not be Visible    ${FOOTER INTEGRATIONS LINK}
    Log In    ${EMAIL PORTAL MANAGER}    ${BASE PASSWORD}
    Go To    ${hanwha}/integrations
    Wait Until Element is Visible    ${INTEGRATION PREVIEW BANNER}
    Any Integration Tile Contains   In Review
    Log Out
    Sleep    1
    
Superuser can see disabled integration store
    [Tags]    C54669	
    ${loc}=   get location    
    ${hanwha}=   Replace String    ${loc}    https://    https://hanwha.
    Go To    ${hanwha}
    Wait Until Element Is Visible    ${FOOTER SUPPORT LINK}
    Element Should Not be Visible    ${FOOTER INTEGRATIONS LINK}
    Log In    ${EMAIL SUPER USER}    ${BASE PASSWORD}
    Go To    ${hanwha}/integrations
    Wait Until Element is Visible    ${INTEGRATION PREVIEW BANNER}
    ${num of tiles}=   Get Number of Integration Tiles
    Any Integration Tile Contains    Draft
    Log Out
    Sleep    1

Anonymous and basic user can access enabled integration store
    [Tags]    C54631
    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Validate Integrations Landing Page
    Close Browser

    Open Browser and go to URL    ${ENV}/integrations
    Validate Integrations Landing Page
    Close Browser

    Open Browser and go to URL    ${ENV}
    Log In    ${EMAIL VIEWER}    ${BASE PASSWORD}
    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Validate Integrations Landing Page
    Log Out
    Sleep    1

Developer user can see enabled integration store and their own integrations
    [Tags]    C54629
    Log In    ${EMAIL FACE REC DEV}    ${BASE PASSWORD}
    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Any Integration Tile Contains    Mine
    Log Out
    Sleep    1

Portal manager user can see enabled integration store and integrations in review
    [Tags]    C54628
    Log In    ${EMAIL PORTAL MANAGER}    ${BASE PASSWORD}
    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Wait Until Element is Visible    ${INTEGRATION PREVIEW BANNER}
    Any Integration Tile Contains    In Review
    Log Out
    Sleep    1

Super user can see enabled integration store and integrations in draft
    [Tags]    C54668
    Log In    ${EMAIL SUPER USER}    ${BASE PASSWORD}
    Wait Until Element Is Visible    ${FOOTER INTEGRATIONS LINK}
    Click Link    ${FOOTER INTEGRATIONS LINK}
    Wait Until Element is Visible    ${INTEGRATION PREVIEW BANNER}
    Any Integration Tile Contains    Draft
    Log Out
    Sleep    1
