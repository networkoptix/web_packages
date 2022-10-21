*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    webadmin


*** Test Cases ***
# WEBADMIN
1. Cloud block is visible for owner
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

2. Cloud block is not visible for not owner
    Log in to system    ${local system}    ${local system}[local users][viewer]
    Wait until element is not visible    ${CLOUD BLOCK}

3. Connect To Cloud Form - email validation
    ${broken emails}=   Create List    qa    qa@    qa@test    qa@test.    qa@test.com@
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

    FOR    ${email}    IN    @{broken emails}
        Click Button    ${CONNECT TO CLOUD BUTTON}
        Validate Connect To Cloud Form
        Fill in login and password    ${email}    ${password}
        Click Button    ${CONNECT TO CLOUD OK BUTTON}
        Validate Email Input Error    Please enter a valid Email
        Close Connect to Cloud modal
    END

4. Connect To Cloud Form - negative scenarios
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form

    Log    Step 1 - empty login and password
    Click Button    ${CONNECT TO CLOUD OK BUTTON}
    Validate Email Input Error    Please enter a valid Email
    Validate Password Input Error    Password is required

    Connect To Cloud    ${EMPTY}    ${EMPTY}    success=False
    Validate Email Input Error    Please enter a valid Email
    Validate Password Input Error    Password is required

    Log    Step 2 - empty password
    Connect To Cloud    ${BASE EMAIL}    ${EMPTY}    success=False
    Validate Password Input Error    Password is required

    Log    Step 3 - empty login
    Connect To Cloud    ${SPACE}    system-admin-variables.${password}    success=False
    Validate Email Input Error    Email is required

    Log    Step 4 - wrong password
    Connect To Cloud    ${BASE EMAIL}    dsv34    success=False
    Validate Password Input Error    Wrong password

    Log    Step 5 - not existing account
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Connect To Cloud    ${email}    system-admin-variables.${password}    success=False
    Validate Email Input Error    Account not found

    Log    Step 6 - not activated account
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register Account    Not    Activated    ${email}    ${password}
    Connect To Cloud    ${email}    system-admin-variables.${password}    success=False
    Wait until element is visible    ${CONNECT TO CLOUD EMAIL INPUT}/following-sibling::div/div[contains(@class, "input-error")]
    ${error text}=   Get Text    ${CONNECT TO CLOUD EMAIL INPUT}/following-sibling::div/div[contains(@class, "input-error")]
    Run Keyword and continue on failure    Should be equal as strings   ${error text}    Account isn't activated. Please log in to Nx Cloud and follow provided instructions.

5. Connect To Cloud Form - cancel buttons works correctly
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form
    Fill in login and password    ${system}[owner]    ${password}
    Wait until elements are not visible    ${CONNECT TO CLOUD EMAIL ERROR}    ${CONNECT TO CLOUD PASSWORD ERROR}
    Click Button    ${CONNECT TO CLOUD CANCEL BUTTON}
    Wait until elements are not visible    ${CONNECT TO CLOUD MODAL}    ${DISCONNECT FROM NX}
    Validate Cloud Block    False

    Log   Check that Cancel button doesn't trigger connection
    ${cloud id}=   Get Cloud System Id    https://${QABURBANK IP}:${local system}[port]    ${system}[local auth]
    Should be equal as strings    ${cloud id}    Cannot find cloudSystemID key

6. Local owner can connect system to cloud
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Connect To Cloud    ${system}[owner]    system-admin-variables.${password}    success=True
    Validate Cloud Block    True

7. Check UI for local not owner when connected to cloud
    Connect system to cloud if not    ${local auth}    https://${QABURBANK IP}:${local system}[port]     ${local system}[name]    ${system}[owner]    ${password}

    Log in to system    ${local system}    ${local system}[local users][viewer]
    Wait until elements are visible
       ...    ${CLOUD NAME}
       ...    ${CLOUD LINK}
       ...    ${CONNECTION STATUS}\[contains(text(), "CONNECTED")]
    Wait until element is not visible    ${DISCONNECT FROM NX}

8. Local owner can disconnect system from cloud
    Connect system to cloud if not    ${local auth}    https://${QABURBANK IP}:${local system}[port]     ${local system}[name]    ${system}[owner]    ${password}

    Log    Step 1
    Log in to system    ${local system}    admin
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${local system}[name]    systems=False
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    Slow    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}    timeout=0.1
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Validate Cloud Block    connected=False

#    TODO
#    Check UI for local not owner
#    Check cloud - system is not there
