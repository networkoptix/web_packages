*** Keywords ***
Reset DB and Open New Browser On Failure 
    Close Browser
    Reset System Names
    Add user to cloud system if not there    ${AUTO_TESTS SYSTEM ID}    ${VIEWER TEXT}    ${EMAIL NOTOWNER}  
    Open Browser and go to URL    ${url}

Remove Temporary Users
    FOR    ${user}    IN     @{TMP USERS}
        ${user id}=   Get Cloud User Id By Email    ${auth}    ${user}    ${AUTO TESTS SYSTEM ID}
        Run Keyword Unless    '${user id}'=='None'    Remove User    ${auth}    ${AUTO SYS IP}    ${user id}
    END
    # Open Browser and go to URL    ${url}
    # Log in to Auto Tests System    ${email}
    # Click Link    ${USERS LIST LINK}     
    # Run Keyword And Continue On Failure     Delete All Local Users    //span[contains(text(),"ocal+")]
    # Close Browser
    
Check Special Hint
    [Arguments]    ${type}
    Wait Until Element is Visible    ${ADD USER PERMISSIONS DROPDOWN}
    Click Button    ${ADD USER PERMISSIONS DROPDOWN}
    Set Suite Variable    ${dropdown type}    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${type}']
    Run Keyword If    "${LANGUAGE}"=="nl_NL"    Set Suite Variable    ${dropdown type}    ${ADD USER MODAL}//nx-permissions-select//li//span[text()="${type}"]
    Wait Until Element is Visible    ${dropdown type}
    Sleep    1
    Click Link    ${dropdown type}/..
    ${type}    Convert To Uppercase    ${type}
    Run Keyword If    "${type}"=="${ADMIN TEXT}"          Wait Until Element Contains
    ...    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT ADMINISTRATOR}
    ...    ELSE IF    "${type}"=="${ADV VIEWER TEXT}"     Wait Until Element Contains
    ...    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT ADVANCED VIEWER}
    ...    ELSE IF    "${type}"=="${VIEWER TEXT}"         Wait Until Element Contains
    ...    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT VIEWER}
    ...    ELSE IF    "${type}"=="${LIVE VIEWER TEXT}"    Wait Until Element Contains
    ...    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT LIVE VIEWER}
    ...    ELSE IF    "${type}"=="${CUSTOM TEXT}"         Wait Until Element Contains
    ...    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT CUSTOM}

Verify Changed Info Via API
    [Arguments]    ${new locals}    ${local user}=ocal+
    @{locals} =    Create List 
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    ${local user}
        Run Keyword If    ${node}[isCloud] == ${False} and ${name state} == ${True}    Append To List    ${locals}    ${node}             
    END
    FOR    ${user}    IN    @{locals}
        Keep in Dictionary    ${user}    name    fullName    permissions    email
    END
    FOR    ${user}    IN    @{locals} 
        Should Contain    ${new locals}    ${user}     
        #${n} =    Evaluate    ${n}+1
    END   

Verify In Local Users UI
    [Arguments]    ${local users}    ${email}
    FOR    ${user}    IN    @{local users}
        Wait Until Elements Are Visible    
        ...    //span[text()="Local+${user}"]
        ...    //span[text()="Local+${user}"]//preceding-sibling::${LOCAL USER ICON}   
        Element Should Contain    //span[text()="Local+${user}"]/following-sibling::span    ${role names}[${user}]
        Element Should Not Be Visible     //span[text()="${email}"]//preceding-sibling::${LOCAL USER ICON}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
	    ...    ${LOCAL USER NAME}
	    ...    ${LOCAL USER EMAIL}
	    Run Keyword Unless    '${email}' == '${EMAIL ADMIN}' and '&{role names}[${user}]' == '${ADMIN TEXT}'     Wait Until Elements Are Visible    
	    ...    ${DISABLE USER SWITCH}
	    ...    ${LOCAL USER DELETE BUTTON}
	    ...    ${LOCAL USER CHANGE PASSWORD BUTTON}
	    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    Local+${user}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    Local User
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_${user}@gmail.com
	    Run Keyword If    '${email}' == '${EMAIL OWNER}'
	    ...    Element Text Should Be    //*[@id="permissionsSelect"]/span    &{role names}[${user}]
	    ...    ELSE IF    '${email}' == '${EMAIL ADMIN}' and '&{role names}[${user}]' != '${ADMIN TEXT}'
	    ...    Element Text Should Be    //*[@id="permissionsSelect"]/span    &{role names}[${user}]   
		...    ELSE    Elements Should Not Be Visible    //*[@id="permissionsSelect"]    ${LOCAL USER CHANGE PASSWORD BUTTON}    ${LOCAL USER DELETE BUTTON}    ${DISABLE USER SWITCH}
    END
    
Modify Local Users via Cloud UI
    [Arguments]    ${local users}    
    @{new locals} =    Create List 
    Verify In Local Users UI    ${local users}    ${email}
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
        ${new login} =    Change Login for Local User    ${user}    Local+${user}_changed
        ${new full name} =    Change Full Name for Local User     ${user}    Changed User
        ${new permission} =    Change Permission Level for Local User     ${user}    ${email}    
        ${new local user email} =     Change Email for Local User    ${user}    ${EMAIL VIEWER}
	   
	    Log    Save All Changes
	    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Wait Until Element is Visible    //span[text()="${new login}"]
	    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    ${new login}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    ${new full name}
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    ${new local user email} 
        Wait Until Element is Visible    //span[text()="${new login}"]/following-sibling::span[text()="${new permission}"]
        
        Log    Change password for ${user}
        Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON} 
        Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}
        Click Button    //form[@name="changePasswordForm"]//button[text()="Save"]
        Wait Until Element is Not Visible    //input[@id="newPassword"]
        
        ${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
        &{new local} =    Create Dictionary    email=${new local user email}    fullName=${new full name}     name=${new login}    permissions=${permissions}[${reverse permission}]    
        
        Append To List    ${new locals}    ${new local}
        #Append To List    @{old locals}    &{old local} 
    END 
    [Return]    ${new locals}
    
Change Login for Local User
    [Arguments]    ${user}    ${new login}
    Input Text    ${LOCAL USER LOGIN}     ${new login}
    #Click Button    //button[text()="Save"]
    ${new login} =    Convert To Lowercase    ${new login}
	[Return]   ${new login} 
	
Change Full Name for Local User    
    [Arguments]    ${user}    ${new full name}
    Input Text    ${LOCAL USER NAME}     ${new full name}
    [Return]    ${new full name}

Change Permission Level for Local User    
    [Arguments]    ${user}    ${email}
    @{permissions set} =    Get Dictionary Values    ${role names}
    ${admin} =    Run Keyword And Return Status    Should Be Equal As Strings    ${email}     ${EMAIL ADMIN}
    Run Keyword If    ${admin} == ${True}    Remove Values From List    ${permissions set}    ${ADMIN TEXT}
    ${n} =    Set Variable If    ${admin} == ${True}    2    3    
    FOR    ${x}    IN RANGE    5
        ${random int} =	    Evaluate	random.randint(0, ${n})	modules=random 
        ${new permission} =     Get From List    ${permissions set}    ${random int}   
        Exit For Loop If  '${new permission}' != '${role names}[${user}]'
    END
    # ${new permission} =    Set Variable If     '${role names}[${user}]' == 'Viewer'    Live Viewer
    # ...     '${role names}[${user}]' != 'Viewer'    Viewer 
    Wait Until Element is Visible     ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Wait Until Element is Visible    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"] 
    Click Element    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"]
    Sleep    .1
    [Return]    ${new permission} 
    
Change Email for Local User
    [Arguments]    ${user}    ${new email}
    Input Text    ${LOCAL USER EMAIL}      ${new email}
    ${new email} =    Convert To Lowercase    ${new email}
    [Return]    ${new email}
    
Modify All Local User Info
    [Arguments]    ${user}    ${email}
    ${new login} =    Change Login for Local User    ${user}    Local+${user}_changed
	${new full name} =    Change Full Name for Local User     ${user}    Changed User
	${new permission} =    Change Permission Level for Local User     ${user}    ${email}    
	${new local user email} =     Change Email for Local User    ${user}    ${EMAIL VIEWER}
	Wait Until Elements Are Visible    ${ACCOUNT SAVE}
	Click Button    ${ACCOUNT SAVE}
	Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
	Wait Until Element is Visible    //span[text()="${new login}"]
	Wait Until Textfield Contains    ${LOCAL USER LOGIN}    ${new login}
	Wait Until Textfield Contains    ${LOCAL USER NAME}    ${new full name}
	Wait Until Textfield Contains    ${LOCAL USER EMAIL}    ${new local user email} 
	Wait Until Element is Visible    //span[text()="${new login}"]/following-sibling::span[text()="${new permission}"]
	${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
	&{new local} =    Create Dictionary    email=${new local user email}    fullName=${new full name}     name=${new login}    permissions=${permissions}[${reverse permission}]
    [Return]    ${new local}
    
Local User Start
    [Arguments]    ${email}
    @{local users} =   Reset Local Users    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Log in to Auto Tests System    ${email} 
    Go To Users List
    [Return]    ${local users}

Reset Local Users
    [Arguments]     ${auth}    ${server}    ${local user}=ocal+
    @{locals} =    Create List 
    @{local users} =    Get Dictionary Keys    ${role names}
    @{users} =    Get Users     ${auth}    ${server}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    ${local user}
        Run Keyword If    ${node}[isCloud] == ${False} and ${name state} == ${True}    Append To List    ${locals}    ${node}             
    END
    ${count} =    Get Length    ${locals}
    ${status} =    Run Keyword And Return Status    Should Be Equal as Numbers    ${count}    4
    Run Keyword If    ${status}==${true}    Reset Local Users API    ${locals}    ${auth}    ${server}
    ...    ELSE    Create New Local Users    ${count}    ${auth}    ${server}    ${local users}    ${locals} 
    [Return]    ${local users}

Create New Local Users
    [Arguments]    ${count}    ${auth}    ${server}    ${local users}    ${locals}
    Run Keyword If    ${count}==0     Create Local Users via API    ${auth}    ${server}    ${local users}
    ...    ELSE    Run Keywords    
    ...    Delete All Local Users via API    ${auth}    ${server}    ${locals}    AND
    ...    Create Local Users via API    ${auth}    ${server}    ${local users}

Delete All Local Users via API
    [Arguments]    ${auth}    ${server}    ${locals}
    FOR    ${user}    IN    @{locals}    
        Remove User    ${auth}    ${server}    ${user}[id]
    END      
    
Reset Local Users API
    [Arguments]    ${locals}    ${auth}    ${server}
    FOR    ${user}    IN    @{locals}
        ${name} =    Remove String    ${user}[name]    _changed
        ${variable} =    Get Substring    ${name}    6
        ${variable} =    Set Variable If    '${variable}' == 'cloudadmin'    cloudAdmin
        ...    '${variable}' == 'liveviewer'    liveViewer
        ...    '${variable}' == 'advancedviewer'    advancedViewer
        ...    ${variable}
        Save User    ${auth}    ${server}    Local+${variable}    ${permissions}[${variable}]    noptixautoqa+local_${variable}@gmail.com    Local User    ${BASE PASSWORD}    user id=${user}[id]    is cloud=${False}    
    END
