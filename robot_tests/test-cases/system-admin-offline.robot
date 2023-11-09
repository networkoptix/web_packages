*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Offline Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Offline Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    System Offline Suite Teardown
Force Tags        system    system_offline


*** Test Cases ***
2. Should confirm, if owner deletes system
    [Tags]        
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL BUTTON}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}

3. Offline system should confirm, if not owner deletes system
    [Tags]        
    Log Out
    Log in to user and system    ${system}[cloudUsers][viewer]    ${system}[id]
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible
        ...    ${DISCONNECT MODAL WARNING}
        ...    ${DISCONNECT MODAL DISCONNECT BUTTON}
        ...    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${MODAL DIALOG}

4. Share and Merge buttons should be disabled
    [Tags]    C41881        
    Wait Until Element Is Visible    ${MERGE BUTTON SYSTEM}${DISABLED}
    Click Link    ${USERS LIST LINK}
    Wait Until Elements Are Visible    ${ADD USER BUTTON SYSTEMS}${DISABLED}

#Open in nx button should be disabled
#    [Tags]    C41881        
#    Log in to Autotests 2 System    ${EMAIL OWNER}
#    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
#    Click Element    ${SYSTEMS DROPDOWN}
#    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}
#    Log Out
#    Log in to Autotests 2 System    ${EMAIL VIEWER}
#    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
#    Click Element    ${SYSTEMS DROPDOWN}
#    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}

5. Should show offline next to system name
    [Tags]    C41881        
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

6. Should not be able to delete/edit users
    [Tags]            CLOUD-6615
    Click Link    ${USERS LIST LINK}
    ${viewer}=   Set Variable    ${USERS LIST}//span[text()='${system}[cloudUsers][viewer]']
    Wait Until Element Is Visible    ${viewer}
    Click Element    ${viewer}
    Wait Until Elements Are Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}
    Element Should Be Disabled    ${ACCESS LEVEL DROPDOWN}
    Element Should Be Disabled    ${REMOVE USER BUTTON}

7. Offline system should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]        
    Log Out
    Go To    ${ENV}/systems/${system}[id]
    #Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    #Click Button    ${LOG IN CLOSE BUTTON}
    Go To    ${ENV}
    Wait Until Element Is Visible    ${JUMBOTRON}
    Wait Until Location Contains    ${ENV}

8. Offline system should open System page by link to not authorized user and show it, after owner logs in
    [Tags]        
    Log Out
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${system}[cloudOwner]   ${base password}    button=None
    Wait until element is visible    //nx-text-editable[contains(text(), "${system}[name]")]

9. Offline system should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    C41572        
    ${random email}=   Register and activate account with random email    mark    hamill   ${BASE PASSWORD}
    Log Out
    Log In    ${random email}    ${base password}
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${TAKE ME HOME}
    Slow   Click Link    ${TAKE ME HOME}
    Wait Until Location Is    ${ENV}/systems

10. Offline system should open System page by link to not authorized user, and show alert if logs in and has no permission
    [Tags]        
    ${random email}=   Register and activate account with random email    mark    hamill   ${BASE PASSWORD}
    Log Out
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${random email}    ${base password}    button=None
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${TAKE ME HOME}

#See CLOUD-6592: offline system cannot be renamed
#Owner is able to rename offline system via Cloud
#    [Tags]    C41899    
#    ${new name}=   Get random system name
#    Change System Name    ${new name}
#    Log Out
#
#    # Make sure new name is saved
#    Log in to user and system    ${system}[cloudOwner]   ${system}[id]
#    ${current name}=   Get Text    //h2[@id="editable-title"]
#    ${system info}=   Get Cloud System Settings    ${cloud auth}    ${system}[clud id]
#    Should be equal as strings    ${system}[name]     ${new name}
#    Should be equal as strings    ${current name}     ${new name}
#
#    # Return to initial name
#    Rename System    ${auth}    ${system}[id]    ${system}[name]
#
#    # Make sure old name is saved
#    ${system info}=   Get Cloud System Settings    ${auth}    ${system}[id]
#    Should be equal as strings    ${system info}[name]     ${system}[name]

11. Does not show Share button to viewer, advanced viewer, live viewer
    [Tags]        
    Log Out
    FOR    ${user}    IN    ${system}[cloudUsers][viewer]    ${system}[cloudUsers][advancedViewer]    ${system}[cloudUsers][liveViewer]
        Log in to user and system    ${user}    ${system}[id]
        Wait Until Element is Visible    //nx-text-editable[contains(text(), "${system}[name]")]
        Elements Should Not Be Visible    ${USERS LIST LINK}    ${ADD USER BUTTON SYSTEMS}
        Log Out
    END

12. Your permissions is shown for non-owners
    [Tags]        C41881    
    Log Out
    ${users text}=    Create List    ${ADMIN TEXT}   ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${ADV VIEWER TEXT}    ${CUSTOM TEXT}
    ${users emails}=   Create List    ${system}[cloudUsers][cloudAdmin]    ${system}[cloudUsers][viewer]    ${system}[cloudUsers][liveViewer]    ${system}[cloudUsers][advancedViewer]    ${system}[cloudUsers][custom]
    ${current owner name}=    Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    FOR    ${user}  ${text}  IN ZIP  ${users emails}  ${users text}
        Log in to user and system    ${user}    ${system}[id]
        Wait Until Elements Are Visible
           ...    ${current owner name}
           ...    //span[contains(text(), "${system}[owner]")]
           ...    ${YOUR ACCESS LEVEL}
           ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),"${text}")]
        Log Out
    END

13. Should show (you) for owner and (owner's name & email) for non-owners
    [Tags]    C41881        
    ${current owner name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}
    Log Out

    Log in to user and system    ${system}[cloudUsers][viewer]    ${system}[id]
    ${current owner name}=    Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    Wait Until Elements Are Visible    ${current owner name}    //span[contains(text(), "${system}[owner]")]

14. System changes state to offline if all its Servers goes offline
    [Tags]    C41894    C30826
    Log Out

    Log    Step 1
    Log in to user and system    ${extra system}[cloudOwner]   ${extra system}[id]
    ${current owner name}=    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}

    Log    Step 2
    Stop container    ${extra system}[container]
    Reload Page
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

    Log    Step 3
    Start container   ${extra system}[container]
    Reload Page
    Wait Until Element Is Not Visible    ${SYSTEM NAME OFFLINE}