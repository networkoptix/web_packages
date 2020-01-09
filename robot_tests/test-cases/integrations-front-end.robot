*** Settings ***
Library    Collections
Library    SeleniumLibrary
Resource          ../resource.robot
Resource          ../APIresource.robot
Resource          ../variables.robot
Resource          ../variables-env.robot

Suite Setup       Open Browser and Go To Integrations Page Anonymous
Test Teardown     Run Keyword If Test Failed   Go To Integrations Page
Suite Teardown    Close All Browsers
Force Tags        integrations

*** Variables ***
${url}        ${ENV}/integrations
${title}      ${INTEGRATIONS TITLE TEXT} - ${PRODUCT_NAME}
@{auth}       ${BASE EMAIL}    ${BASE EMAIL PASSWORD}

*** Keywords ***
Open Browser and Go To Integrations Page Anonymous
    ${is enabled}=   Integration Store is Enabled    ${auth}
    Run keyword If    ${is enabled} == ${True}    Open Browser and go to URL    ${url}
    ...    ELSE    Fatal Error    Tests cannot be executed. Please enable Integration Store in CMS.

Go To Integrations Page
    Open Browser and go to URL    ${url}
    Validate Integrations Landing Page

Validate Integrations Landing Page
    Wait Until Elements Are Visible
    ...    ${INTEGRATIONS SEARCH}
    ...    ${INTEGRATIONS SEARCH FILTER}
    ...    ${INTEGRATIONS CATALOG}

Get Number of Integration Tiles
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    ${number of integrations}=   Get Length    ${integration tiles}
    [Return]    ${number of integrations}

Validate changes when input text into search field
    [Arguments]    ${text}
    ${initial number of tiles}=   Get Number of Integration Tiles
    Input Text    ${INTEGRATIONS SEARCH INPUT}    ${text}
    Wait Until Element Is Visible    ${INTEGRATIONS SEARCH CLOSE BUTTON}
    Wait Until Location Contains    ?search=${text}
    ${new number of tiles}=    Get Number of Integration Tiles
    Should Be True    ${new number of tiles} < ${initial number of tiles}

Validate Integration Details Page
    Run keyword and continue on failure    Wait Until Elements Are Visible
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
    ...    ${INTEGRATION SUPPORT LINK}
    ...    ${INTEGRATION SUPPORT EMAIL}
    ...    ${INTEGRATION HOW IT WORKS VIDEO}
    ...    ${INTEGRATION HOW IT WORKS CAROUSEL}
    ...    ${INTEGRATION CAROUSEL RIGHT BUTTON}
    ...    ${INTEGRATION CAROUSEL LEFT BUTTON}
    ...    ${INTEGRATION CAROUSEL PREVIEW}
    ...    ${INTEGRATION DOWNLOADS SECTION}
    ...    ${INTEGRATION REQUIREMENTS SECTION}
    ...    ${INTEGRATION HOW IT WORKS HEADER}

Validate Integration Tile
    [Arguments]    ${tile number}
    FOR    ${tile element}    IN    @{INTEGRATION TILE ELEMENTS}
        Run keyword and continue on failure    Element Should Be Visible    ${INTEGRATION TILE}/../div\[${tile number}\]${tile element}
    END

# If a number of integrations is too big, it's better to validate couple of random integration tiles.
# To do so just replace a FOR loop in "Integration Store catalog" test with "Validate Random Tile N times" keyword call
# with list of tiles and desired number of random checks as parameters
# Validate Random Tile N times
#     [Arguments]    ${integration tiles}    ${N}
#     ${number of tiles}=   Get Length   ${integration tiles}
#     FOR    ${index}    IN    1  ${N}
#         ${random index}= 	Evaluate	random.randint(0, ${number of tiles})	modules=random
#         Validate Integration Tile    ${random index}    @{integration tiles}[${random index}]
#     END

Validate "Get in Touch" Form
    Wait Until Elements Are Visible
    ...    ${INTEGRATION GET IN TOUCH FORM}
    ...    ${INTEGRATION GET IN TOUCH HEADER}
    ...    ${INTEGRATION GET IN TOUCH TITLE}
    ...    ${INTEGRATION GET IN TOUCH CLOSE BUTTON}
    ...    ${INTEGRATION GET IN TOUCH CLOSE BUTTON ICON}
    ...    ${INTEGRATION GET IN TOUCH BODY}
    ...    ${INTEGRATION GET IN TOUCH FOOTER}
    ...    ${INTEGRATION GET IN TOUCH TO EMAIL LABEL}
    ...    ${INTEGRATION GET IN TOUCH TO EMAIL CONTENT}
    ...    ${INTEGRATION GET IN TOUCH NAME LABEL}
    ...    ${INTEGRATION GET IN TOUCH NAME INPUT}
    ...    ${INTEGRATION GET IN TOUCH EMAIL LABEL}
    ...    ${INTEGRATION GET IN TOUCH EMAIL INPUT}
    ...    ${INTEGRATION GET IN TOUCH SUBJECT LABEL}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN ICON}
    ...    ${INTEGRATION GET IN TOUCH MESSAGE LABEL}
    ...    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}
    ...    ${INTEGRATION GET IN TOUCH PRIVACY LINKS}
    ...    ${INTEGRATION GET IN TOUCH SEND BUTTON}
    ...    ${INTEGRATION GET IN TOUCH CANCEL BUTTON}

Fill in "Get in Touch" Form and Submit
    [Arguments]
    ...    ${name}=${TEST FIRST NAME}${SPACE}${TEST LAST NAME}
    ...    ${email}=${ALT BASE EMAIL}
    ...    ${message}=Test Get in Touch Form
    Input Text    ${INTEGRATION GET IN TOUCH NAME INPUT}    ${name}
    Input Text    ${INTEGRATION GET IN TOUCH EMAIL INPUT}    ${email}
    Input Text    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}    ${message}
    Click Button    ${INTEGRATION GET IN TOUCH SEND BUTTON}

*** Test Cases ***
Integration Store title and URL are correct
    [Tags]    C54622
    Location Should Be    ${url}
    Title Should Be    ${title}
    Validate Integrations Landing Page

Integration Store catalog
    [Tags]    C54622
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    ${number of tiles}=   Get Length    ${integration tiles}
    FOR    ${index}    IN RANGE    ${number of tiles}
        ${tile number}=   Evaluate    ${index}+1
        Validate Integration Tile    ${tile number}
    END
#    Validate Random Tile N times    ${integration tiles}    3

Integration Store Search
    [Tags]    	C54620
    Wait Until Elements Are Visible
    ...  ${INTEGRATIONS SEARCH INPUT}
    ...  ${INTEGRATIONS SEARCH ICON}
    ...  ${INTEGRATIONS SEARCH FILTER}

    ${initial number of tiles}=   Get Number of Integration Tiles
    ${number of filters}=    Get Element Count    ${INTEGRATIONS SEARCH FILTER ITEM}
    Should be equal as numbers    ${number of filters}    9

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
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[5]
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[8]
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition,storage
    Click Element    ${INTEGRATIONS SEARCH FILTER}/li[8]//span[contains(@class, "tag-close-icon")]
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition
    Go Back
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition,storage
    Go Back
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition
    Go Back
    Wait Until Location Is    ${url}?search=vis
    Go Forward
    Wait Until Location Is    ${url}?search=vis&tags=faceRecognition


Integration Store Integration Details
    [Tags]    C54623
    Wait Until Element Is Visible    ${INTEGRATION TILE}
    CLick Link    ${INTEGRATION TEST INTEGRATION LINK}
    Validate Integration Details Page

Send messages using Integration Contact "Get in touch" form
    [Tags]    C54681
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}
    Validate "Get in Touch" Form

    Log    Validating close buttons
    Click Element    ${INTEGRATION GET IN TOUCH CLOSE BUTTON}
    Element Should Not Be Visible    ${INTEGRATION GET IN TOUCH FORM}
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}
    Click Element    ${INTEGRATION GET IN TOUCH CANCEL BUTTON}
    Element Should Not Be Visible    ${INTEGRATION GET IN TOUCH FORM}
    Click Element    ${INTEGRATION GET IN TOUCH BUTTON}

    Log    Validating privacy links
    @{privacy links}=   Get WebElements    ${INTEGRATION GET IN TOUCH PRIVACY LINKS}
    ${num of privacy links}=   Get length    ${privacy links}
    Should be equal as numbers    ${num of privacy links}    2
    ${privacy link href}=   Get Element Attribute    @{privacy links}[1]    href
    Should Contain    ${privacy link href}    ${PRIVACY POLICY URL HREF}

    Log    Send messages - positive
    Fill in "Get in Touch" Form and Submit
    Wait Until Element Is Not Visible    ${INTEGRATION GET IN TOUCH FORM}






