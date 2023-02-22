*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Integrations Test Teardown
    QA Video Recording Stop
    Run Keyword If Test Failed   Go To Integrations Page

Integrations Test Setup
    QA Video Recording Start     
    Go To    ${ENV}

Open Browser and Go To Integrations Page Anonymous
    ${is enabled}=   Integration Store is Enabled    ${auth}
    IF    ${is enabled}==${True}
        Open Browser and go to URL    ${url integrations}
    ELSE
        Fatal Error    Tests cannot be executed. Please enable Integration Store in CMS.
    END

Go To Integrations Page
    Go To    ${url integrations}
    Validate Integrations Landing Page

Validate Integrations Landing Page
    Wait Until Element is Visible
    ...    ${INTEGRATIONS CATALOG}
    Wait Until Element Is Not Visible    //div[@class="placeholder-content"]

Get Number of Integration Tiles
    Validate Integrations Landing Page
    @{integration tiles}=   Get WebElements    ${INTEGRATION TILE}
    ${number of integrations}=   Get Length    ${integration tiles}
    [Return]    ${number of integrations}

Each Integration Tile Contains
    [Arguments]    ${text1}    ${text2}=11111
    ${number of tiles}=   Get Number of Integration Tiles
    FOR  ${idx}  IN RANGE  ${number of tiles}
        ${idx}=    Evaluate     ${idx}+1
        Wait Until Element is Visible    ${INTEGRATION TILE}/parent::div/div\[${idx}\]//*[contains(text(),"${text1}") or contains(text(),"${text2}")]
    END    

Any Integration Tile Contains
    [Arguments]    ${text1}
    ${number of tiles}=   Get Number of Integration Tiles
    FOR  ${idx}  IN RANGE  ${number of tiles}
        ${idx}=    Evaluate     ${idx}+1
        ${status}=   Run Keyword and Return Status    Wait Until Element is Visible    ${INTEGRATION TILE}/parent::div/div\[${idx}\]//*[contains(text(),"${text1}") or contains(text(),"${text2}")]    .5
        Exit For Loop If    ${status}=="PASS"
    END    

Validate changes when input text into search field
    [Arguments]    ${text}
    ${initial number of tiles}=   Get Number of Integration Tiles
    Input Text    ${INTEGRATIONS SEARCH INPUT}    ${text}
    Wait Until Element Is Visible    ${INTEGRATIONS SEARCH CLOSE BUTTON}
    Wait Until Location Contains    ?search=${text}
    ${new number of tiles}=    Get Number of Integration Tiles
    Should Be True    ${new number of tiles} < ${initial number of tiles}

Validate Integration Details Page
    [arguments]    ${all}=True
    Run Keyword if    ${all}==True    Wait Until Elements Are Visible    @{all fields}
    ...    ELSE    Wait Until Elements Are Visible    @{required fields}

Validate Integration Tile
    [Arguments]    ${tile number}
    FOR    ${tile element}    IN    @{INTEGRATION TILE ELEMENTS}
        Run keyword and continue on failure    Wait Until Element is Visible    ${INTEGRATION TILE}/../div\[${tile number}\]${tile element}
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

Number of Integrations Should be Lower
    [Arguments]    ${previous}
    ${current}=   Get Number of Integration Tiles
    ${result}=   Evaluate    ${current}<${previous}
    Should Be True    ${result}
    [Return]    ${current}

Number of Integrations Should be Higher
    [Arguments]    ${previous}
    ${current}=   Get Number of Integration Tiles
    ${result}=   Evaluate    ${current}>${previous}
    Should Be True    ${result}
    [Return]    ${current}