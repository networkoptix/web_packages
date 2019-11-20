*** Settings ***
Library    Collections
Resource          ../resource.robot
Resource          ../APIresource.robot
Resource          ../variables.robot
Resource          ../variables-env.robot

Suite Setup       Open Browser and Go To Integrations Page Anonimous
#Test Setup        Go To Integrations Page
Test Teardown     Run Keyword If Test Failed   Go To Integrations Page
Suite Teardown    Close All Browsers
Force Tags        integrations

*** Variables ***
${url}        ${ENV}/integrations
${title}      Integrations - ${PRODUCT_NAME}
@{auth}       ${BASE EMAIL}    ${BASE EMAIL PASSWORD}

*** Keywords ***
Open Browser and Go To Integrations Page Anonimous
    ${is enabled}=   Integration Store is Enabled    ${auth}
    Run keyword If    ${is enabled} == ${True}    Open browser    ${url}    ${BROWSER}
    ...    ELSE    Fatal Error    Tests cannot be executed. Please enable Integration Store in CMS.

Go To Integrations Page
    Go To    ${url}
    Validate Landing Page

Validate Integrations Landing Page
    Wait Until Elements Are Visible
    ...    ${INTEGRATIONS SEARCH}
    ...    ${INTEGRATIONS SEARCH FILTER}
    ...    ${INTEGRATIONS CATALOG}

Validate Integration Details Page
    Run keyword and continue on failure    Wait Until Elements Are Visible
    ...    ${INTEGRATION ALL INTEGRATIONS}
    ...    ${INTEGRATION VERSION}
    ...    ${INTEGRATION HOW IT WORKS LINK}
    ...    ${INTEGRATION HOW TO SETUP LINK}
    ...    ${INTEGRATION TAGS SECTION}
    ...    ${INTEGRATION GET IN TOUCH LABEL}
    ...    ${INTEGRATION GET IN TOUCH BUTTON}
    ...    ${INTEGRATION DEVELOPER LABEL}
#    ...    ${INTEGRATION DEVELOPER COMPANY LINK}
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

#Validate Integration Tile
#    [Arguments]    ${integration tile}
#    @{integration tile contents}=   Get Child WebElements    ${integration tile}
#    Log List    ${integration tile contents}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE HEADER}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE BODY}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE FOOTER}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE LOGO}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE INFO}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE NAME}
#    Should Contain    ${integration tile contents}    ${INTEGRATION TILE TEXT}

Validate Get in Touch Form
    Run keyword and continue on failure    Wait Until Elements Are Visible
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
    ...    ${INTEGRATION GET IN TOUCH TOPIC LABEL}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN BUTTON}
    ...    ${INTEGRATION GET IN TOUCH DROPDOWN ICON}
    ...    ${INTEGRATION GET IN TOUCH MESSAGE LABEL}
    ...    ${INTEGRATION GET IN TOUCH MESSAGE INPUT}
    ...    ${INTEGRATION GET IN TOUCH BOTTOM TEXT}
    ...    ${INTEGRATION GET IN TOUCH SEND BUTTON}
    ...    ${INTEGRATION GET IN TOUCH CANCEL BUTTON}


*** Test Cases ***
Integration Store title and URL are correct
    Location Should Be    ${url}
    Run keyword and expect error    Title should have been 'Integrations - Nx Cloud' but was 'Integrations'.
    ...    Title Should Be    ${title}
    Validate Integrations Landing Page

#Integration Store catalog
#    [Tags]    C54622
#    @{integration tiles}=   Get WebElements   ${INTEGRATION TILE}
#    Log List    ${integration tiles}
#    FOR    ${integration tile}    IN    @{integration tiles}
#        Validate Integration Tile    ${integration tile}
#    END

#Integration Store Search
#    [Tags]    	C54620
#

Integration Store Integration Details
    [Tags]    C54623
    Wait Until Element Is Visible    ${INTEGRATION TILE}
    CLick Link    ${INTEGRATION TEST INEGRATION LINK}
    Validate Integration Details Page

Send messages using Integration Contact Get in touch form
    [Tags]    C54681
    Click Element   ${INTEGRATION GET IN TOUCH BUTTON}
    Validate Get in Touch Form