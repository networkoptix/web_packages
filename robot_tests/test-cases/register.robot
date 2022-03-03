*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        register-resource.Restart
Test Teardown     Open New Browser and Reset DB On Failure
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***
1. Should open register page in anonymous state by clicking Register button on top right corner
    Wait Until Element Is Visible    ${CREATE ACCOUNT HEADER}
    Click Link    ${CREATE ACCOUNT HEADER}
    Location Should Be    ${url}/authorize?client_type=create
    Validate on Register Page

2. Should open register page from register success page by clicking Register button on top right corner
    [Tags]    email
    ${email}    Get Random Email        ${BASE EMAIL}     sendemail=${True}
    Register    'mark'    'hamill'    ${email}    ${password}
    Activate    ${email}
    Go To    ${url}
    Wait Until Element Is Visible    ${CREATE ACCOUNT HEADER}
    Click Link    ${CREATE ACCOUNT HEADER}
    Location Should Be    ${url}/authorize?client_type=create

3. Should open register page in anonymous state by clicking Register button on homepage
    Close Browser
    Open Browser and go to URL    ${url}
    Wait Until Element Is Visible    ${CREATE ACCOUNT BODY}
    Click Link    ${CREATE ACCOUNT BODY}
    Wait Until Location Is    ${url}/authorize?client_type=create

#I am assuming this means directly going to the /authorize?client_type=create url and not clicking a button
4. Should open register page in anonymous state
    [tags]    C24211    anonymous
    Run keyword and continue on failure    Open page anonymously    ${url}/authorize?client_type=create    ${REGISTER TITLE TEXT}
    Wait Until Element Is Visible    ${REGISTER FORM}

5. Should register user with correct credentials
    ${email}    Get Random Email    ${BASE EMAIL}
    Register    mark    hamill    ${email}    ${password}
    Validate Register Success

6. Should allow !#$%&'*+-/=?^_`{|}~ in email field
    [documentation]    This is here because testing activation with the '&' freaks out Python's imaplib so we test that our form accepts it.
    [tags]
    ${email}    Get Random Symbol Email    ${BASE EMAIL}
    Register    mark    hamill    ${email}    ${password}
    Validate Register Success

7. With valid inputs no errors are displayed
    [tags]    C41557
    ${email}    Get Random Email    ${BASE EMAIL}
    Wait Until Element Is Visible    ${CREATE ACCOUNT HEADER}
    Click Link    ${CREATE ACCOUNT HEADER}
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER PASSWORD INPUT}    ${CREATE ACCOUNT BUTTON}
    Input Text    ${REGISTER FIRST NAME INPUT}    ${TEST FIRST NAME}
    Input Text    ${REGISTER LAST NAME INPUT}    ${TEST LAST NAME}
    ${read only}    Run Keyword And Return Status    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}
    ${email}    Get Random Email    ${BASE EMAIL}
    Run Keyword Unless    ${read only}    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Element    ${REGISTER FORM}
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL INVALID}    //span[@ng-if="registerForm.registerEmail.$touched && registerForm.registerEmail.$error.email" and contains(text(),'${EMAIL INVALID TEXT}')]
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}    //span[@ng-if="registerForm.registerEmail.$touched && registerForm.registerEmail.$error.required" and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
    @{list}    Set Variable    ${FIRST NAME IS REQUIRED}    ${LAST NAME IS REQUIRED}    ${LAST NAME IS REQUIRED}    ${EMAIL IS REQUIRED}    ${PASSWORD SPECIAL CHARS}    ${PASSWORD IS WEAK}    ${EMAIL INVALID}
    FOR    ${element}    IN    @{list}
            Element Should Not Be Visible    ${element}
    END

8. Displays password masked, shows password and changes eye icon when clicked
    [tags]    C24211
    Go To    ${url}/authorize?client_type=create
    Wait Until Elements Are Visible    ${REGISTER PASSWORD INPUT}    ${REGISTER EYE ICON CLOSED}
    ${input type}    Get Element Attribute    ${REGISTER PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'
    Click Element    ${REGISTER EYE ICON CLOSED}
    Wait Until Element Is Visible    ${REGISTER EYE ICON OPEN}
    ${input type}    Get Element Attribute    ${REGISTER PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'text'
    Click Element    ${REGISTER EYE ICON OPEN}
    Wait Until Element Is Visible    ${REGISTER EYE ICON CLOSED}
    ${input type}    Get Element Attribute    ${REGISTER PASSWORD INPUT}    type
    Should Be Equal    '${input type}'    'password'

9. Should respond to Enter key and save data
    ${email}    Get Random Email    ${BASE EMAIL}
    Go To    ${url}/authorize?client_type=create
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER EMAIL INPUT}    ${REGISTER PASSWORD INPUT}
    Input Text    ${REGISTER FIRST NAME INPUT}    mark
    Input Text    ${REGISTER LAST NAME INPUT}    hamil
    Input Text    ${REGISTER EMAIL INPUT}    ${email}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Press Keys    ${REGISTER PASSWORD INPUT}    ENTER
    Validate Register Success

10. Should respond to Tab key
    [tags]    C41867
    Wait Until Element Is Visible    ${CREATE ACCOUNT HEADER}
    Click Link    ${CREATE ACCOUNT HEADER}
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER EMAIL INPUT}    ${REGISTER PASSWORD INPUT}
    Sleep    1
    Element Should Be Focused    ${REGISTER EMAIL INPUT}
    Press Keys    None    TAB
    Sleep    1
    Element Should Be Focused    ${REGISTER FIRST NAME INPUT}
    Press Keys    None    TAB
    Element Should Be Focused    ${REGISTER LAST NAME INPUT}
    Press Keys    None    TAB
    Element Should Be Focused    ${REGISTER PASSWORD INPUT}
    Press Keys    None    TAB
    Element Should Be Focused    ${TERMS AND CONDITIONS CHECKBOX REAL}

# Press keys ${SPACE} doesn't really hit space -> replaced by ASCII code
    Press Keys    None    SPACE
    Wait Until Page Contains Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}//span[@class="tick checked"]
    Press Keys    None    SPACE
    Wait Until Page Contains Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}//span[contains(@class,"unchecked")]

    Press Keys    None    TAB
    get locations
    Press Keys    None    ENTER
    Element Should Be Focused    ${TERMS AND CONDITIONS LINK}
    ${tabs}    Get Window Handles
    Switch Window    ${tabs}[1]
    Location Should Be    ${url}${TERMS URL}
    Switch Window    ${tabs}[0]
    Press Keys    None    TAB
    Element Should Be Focused    ${PRIVACY POLICY LINK}
    Press Keys    None    ENTER
    Sleep    5
    ${tabs}    Get Window Handles
    Switch Window    ${tabs}[2]
    Location Should Be    ${PRIVACY POLICY URL FULL}
    Switch Window    ${tabs}[0]

    Clear Register Fields
    Press Keys    None    TAB
    Element Should Be Focused    ${REGISTER LOG IN BUTTON}
    Press Keys    None    TAB
    Element Should Be Focused    ${REGISTER BACK BUTTON}
    Press Keys    None    TAB
    Element Should Be Focused    ${CREATE ACCOUNT BUTTON}
    Press Keys    None    ENTER
    Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}    //nx-register-component//span[(text()='${EMAIL IS REQUIRED TEXT}')]
    Wait Until Elements Are Visible    ${FIRST NAME IS REQUIRED}    ${LAST NAME IS REQUIRED}    ${EMAIL IS REQUIRED}    ${PASSWORD IS REQUIRED}

11. Should open Terms and conditions in a new page
    [tags]    C41558
    Go To    ${url}/authorize?client_type=create
    Wait Until Element Is Visible    ${TERMS AND CONDITIONS LINK}
    Click Link    ${TERMS AND CONDITIONS LINK}
    Sleep    2    #This is specifically for Firefox
    ${tabs}    Get Window Handles
    Switch Window    ${tabs}[1]
    Location Should Be    ${url}/content/eula

12. Should open Privacy Policy in a new page
    [tags]    C41558
    Go To    ${url}/authorize?client_type=create
    Wait Until Element Is Visible    ${PRIVACY POLICY LINK}
    Click Link    ${PRIVACY POLICY LINK}
    Sleep    2    #This is specifically for Firefox
    ${windows}    Get Window Handles
    Switch Window    ${windows}[1]
    Location Should Be    ${PRIVACY POLICY URL FULL}

#13. Should suggest user to create new account, if he was logged in and goes to registration link
#    Log In    ${EMAIL OWNER}    ${password}
#    Go To    ${url}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
#    Click Button    ${LOGGED IN STAY LOGGED IN BUTTON}
#    Wait Until Elements Are Visible    ${SYSTEMS DROPDOWN}    ${ACCOUNT DROPDOWN}    ${SYSTEMS TILE}    #${SYSTEMS SEARCH INPUT}
#    Location Should Be    ${url}/systems
#    Go To    ${url}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
#    Click Button    ${LOGGED IN NEW ACCOUNT BUTTON}
#    Validate on Register Page

# NEEDS TO BE REPLACED WITH CHECKING FOR STYLING CHANGE
#14. Should display promo-block, if user goes to registration from native app
#    Go To    ${url}/authorize?client_type=create?from=client
#    Wait Until Element Is Visible    ${JUMBOTRON}
#    Go To    ${url}/authorize?client_type=create?from=mobile
#    Wait Until Element Is Visible    ${JUMBOTRON}
#
#15. Should not display promo-block, if user goes to registration not from native app
#    Go To    ${url}/authorize?client_type=create
#    Wait Until Element Is Visible    ${REGISTER FIRST NAME INPUT}
#    Element Should Not Be Visible    ${JUMBOTRON}
#
#16. Should remove promo-block on registration form successful submitting form when from=client
#    [Tags]
#    ${email}    Get Random Email    ${BASE EMAIL}
#    Register    mark    hamill    ${email}    ${password}    from=client
#    Validate Register Success    ${url}/authorize?client_type=create/success?from=client
#    Element Should Not Be Visible    ${JUMBOTRON}
#
#17. Should remove promo-block on registration form successful submitting form when from=mobile
#    [Tags]
#    ${email}    Get Random Email    ${BASE EMAIL}
#    Register    mark    hamill    ${email}    ${password}    from=mobile
#    Validate Register Success    ${url}/authorize?client_type=create/success?from=mobile
#    Element Should Not Be Visible    ${JUMBOTRON}

#18. Should not allow to access /authorize?client_type=create/success /activate/success by direct input
#    Close Browser
#    Open Browser and go to URL    ${url}/authorize?client_type=create/success
#    Wait Until Element Is Visible    ${JUMBOTRON}
#    Location Should Be    ${url}/
#    Go To    ${url}/activate/success
#    Wait Until Element Is Visible    ${JUMBOTRON}
#    Location Should Be    ${url}/

19. Cannot register email that is already registered
    [tags]    C41563
    ${email}    Get Random Email    ${BASE EMAIL}
    Register Account    mark    hamill    ${email}    ${password}
    Register    mark    hamill    ${email}    ${password}
    Wait Until Element Is Visible    ${REGISTER FORM}//p[contains(@class,"error-label") and text()="${ACCOUNT ALREADY EXISTS}"]

20 Cannot register email that is already activated
    [tags]    C41563
    ${email}    Get Random Email    ${BASE EMAIL}
    Register and activate account    mark    hamill    ${email}    ${password}
    Register    mark    hamill    ${email}    ${password}
    Wait Until Element Is Visible    ${REGISTER FORM}//p[contains(@class,"error-label") and text()="${ACCOUNT ALREADY EXISTS}"]

21. Check registration email links, colors, cloud name, and user name
    [tags]    C24211    C43021    Customizations
    ${email}    Get Random Email    ${BASE EMAIL}    extra=sendemail
    Check Language Anonymous
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${email}    ${password}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${email}    timeout=120    status=UNSEEN
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore

    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    Check Email User Names    ${email text}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}

    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}}    ${TEST FIRST NAME} ${TEST LAST NAME}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    %PRODUCT_NAME%    ${PRODUCT_NAME}
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/activate
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

#22. Check automatic logout when registering new account while logged in
#    [tags]    C63393
#    Log In    ${EMAIL OWNER}     ${BASE PASSWORD}
#    Go To    ${ENV}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
#    ${logged in text and email}=    Replace String    ${YOU ARE ALREADY LOGGED IN TEXT}    {{user}}    ${EMAIL OWNER}
#    Element Text Should Be    ${MODAL DIALOG}//h1/span[contains(text(),'${EMAIL OWNER}')]     ${logged in text and email}
#    Click Button     ${MODAL DIALOG}//button[@class="close ng-star-inserted"]
#    Location Should Be    ${ENV}/systems
#    Wait Until Element Contains     ${ACCOUNT DROPDOWN}     ${EMAIL OWNER}
#    Go To    ${ENV}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
#    Element Text Should Be    ${MODAL DIALOG}//h1/span[contains(text(),'${EMAIL OWNER}')]    ${logged in text and email}
#    Click Button     ${LOGGED IN STAY LOGGED IN BUTTON}
#    Location Should Be    ${ENV}/systems
#    Wait Until Element Contains     ${ACCOUNT DROPDOWN}     ${EMAIL OWNER}
#    Go To    ${ENV}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
#    Element Text Should Be    ${MODAL DIALOG}//h1/span[contains(text(),'${EMAIL OWNER}')]    ${logged in text and email}
#    Click Button     ${LOGGED IN NEW ACCOUNT BUTTON}
#    Validate Log Out
#    Wait Until Location Is    ${ENV}/authorize?client_type=create
#    Wait Until Elements Are Visible    ${REGISTER FORM}
