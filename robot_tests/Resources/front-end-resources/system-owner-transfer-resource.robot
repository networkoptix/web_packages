*** Settings ***
Resource          ../../resource.robot
Resource          system-user-resource.robot
Resource          system-admin-resource.robot
Resource    system-owner-transfer-resource.robot

*** Keywords ***
Owner Transfer Suite Setup
    Open Browser and go to URL    ${url}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    Set Suite Variable    ${server 1}    ${servers}[0]
    Set Suite Variable    ${server 2}    ${servers}[1]

    IF    '''${mode}'''=='''cloud'''
        system-user-resource.Cloud Suite Setup
    ELSE
        system-user-resource.Web Admin Suite Setup
    END

Web Admin Suite Setup
    Open Browser and go to URL    https://${QA BURBANK IP}:${server 1}[port][0]

Cloud Suite Setup
    Go To    ${url}
    Log in to user and system    ${server 1['cloudOwner']}    ${server 1['id']}
    Wait Until Element is Visible    ${SERVERS LINK}     65
    Sleep    1
    Click    Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Log Out

Owner Transfer Teardown
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
#    Delete Base System    ${server 1}
#    Delete Base System    ${server 2}
    Close All Browsers

Validate Ownership Transfer Modal
    [Arguments]    ${server}
    Wait Until Elements Are Visible    ${OWNERSHIP TRANSFER FORM}   ${OWNERSHIP TRANSFER INPUT}   ${OWNERSHIP TRANSFER DROPDOWN}
    ...     ${OWNERSHIP TRANSFER WARNING}    ${OWNERSHIP TRANSFER SEND REQUEST}    ${OWNERSHIP TRANSFER CANCEL}   ${OWNERSHIP TRANSFER CLOSE}
    Element Should Be Disabled    ${OWNERSHIP TRANSFER SEND REQUEST}
    Click Button    ${OWNERSHIP TRANSFER DROPDOWN}
    ${users} =   Get Cloud System Users    ${server}[cloudAuth]    ${server}[id]
    FOR  ${user}  IN   @{users}
        Run Keyword Unless    '${user}[accountEmail]' == '${server}[cloudOwner]'
        ...     Wait Until Element is Visible   ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${user}[accountEmail]")]    timeout=2
        Element Should Not Be Visible   ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${server}[cloudOwner]")]
    END
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Skip If Cascading
    Skip If   '${cascade}' == 'FAIL'   msg=Cascading fail detected.

OT Test Setup
    Log in to user and system    ${server 1['cloudOwner']}    ${server 1['id']}
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server 1}

OT Test Teardown
    Run Keyword and Ignore Error    Click Button    ${OWNERSHIP TRANSFER CANCEL}
    Log Out

Initiate Ownership Transfer
    [Arguments]    ${server}    ${new owner access level}
    Wait Until Element Is Visible   ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${server}[cloudUsers][${new owner access level}]")]    timeout=1
    Click Element    ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${server}[cloudUsers][${new owner access level}]")]
    Wait Until Element Is Enabled   ${OWNERSHIP TRANSFER SEND REQUEST}
    Click Button    ${OWNERSHIP TRANSFER SEND REQUEST}
    Wait Until Elements Are Visible    ${OWNERSHIP TRANSFER SENT}   ${OWNERSHIP TRANSFER OK}
    Click Button    ${OWNERSHIP TRANSFER OK}
    Wait Until Element Is Not Visible    ${OWNERSHIP TRANSFER FORM}
    Wait Until Elements Are Visible
    ...     ${OWNERSHIP TRANSFER IN PROGRESS}/strong[contains(text(), "${server}[cloudUsers][${new owner access level}]")]
    ...     ${OWNERSHIP TRANSFER IN PROGRESS CANCEL}
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Receive Ownership Transfer Request
    [Arguments]    ${server}    ${new owner access level}
    Log in to user and system    ${server}[cloudUsers][${new owner access level}]    ${server}[id]
    Wait Until Elements Are Visible
    ...     ${OWNERSHIP TRANSFER WANTS TO}
    ...     //strong[contains(text(), "(${server}[cloudOwner])")]
    ...     ${OWNERSHIP TRANSFER ACCEPT}
    ...     ${OWNERSHIP TRANSFER REJECT}
    ${accessLevel} =    Get Text    ${ACCESS LEVEL}
    Should Be Equal     ${accessLevel}   ${ACCESS LEVELS}[${new owner access level}]
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Reject Ownership Transfer Request
    [Arguments]    ${server}
    Click Button    ${OWNERSHIP TRANSFER REJECT}
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${server}[cloudOwner]")]
    Log Out
    Log in to user and system    ${server}[cloudOwner]    ${server}[id]
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server}
    Check OT Email    ${server}[cloudOwner]        Ownership transfer for ${server}[name] - rejected
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Accept Ownership Transfer Request
    [Arguments]     ${server}    ${new owner access level}   ${checkEmail}=${True}
    Click Button    ${OWNERSHIP TRANSFER ACCEPT}
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${YOU TEXT}")]
    Sleep   5
    Log Out
    Log in to user and system    ${server}[cloudOwner]    ${server}[id]
    Go To   ${url}/systems
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Run Keyword If   ${checkEmail}   Check OT Email    ${server}[cloudOwner]        Ownership transfer for ${server}[name] - accepted
    Set To Dictionary    ${server 1}    cloudOwner   ${server}[cloudUsers][${new owner access level}]
    @{new cloud auth} =     Create List     ${server}[cloudUsers][${new owner access level}]    ${BASE PASSWORD}
    Set To Dictionary    ${server 1}    cloudAuth   ${new cloud auth}
    Log Out
    Log in to user and system    ${server}[cloudOwner]    ${server}[id]
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server}
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Cancel Ownership Transfer Request
    [Arguments]     ${server}    ${new owner access level}
    Click Link  ${OWNERSHIP TRANSFER IN PROGRESS CANCEL}
    Wait Until Elements Are Not Visible
    ...     ${OWNERSHIP TRANSFER IN PROGRESS}/strong[contains(text(), "${server}[cloudUsers][${new owner access level}]")]
    ...     ${OWNERSHIP TRANSFER IN PROGRESS CANCEL}
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server}
    Click Button    ${OWNERSHIP TRANSFER CANCEL}
    Log Out
    Log in to user and system    ${server}[cloudUsers][${new owner access level}]    ${server}[id]
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${server}[cloudOwner]")]
    Elements Should Not Be Visible
    ...     ${OWNERSHIP TRANSFER WANTS TO}
    ...     //strong[contains(text(), "(${server}[cloudOwner])")]
    ...     ${OWNERSHIP TRANSFER ACCEPT}
    ...     ${OWNERSHIP TRANSFER REJECT}
    [Teardown]   Set Suite Variable   ${cascade}    ${KEYWORD STATUS}

Enable User OT
    Enable Cloud User via API   ${True}   liveViewer    ${server 1}

Disable User OT
    Enable Cloud User via API   ${False}   liveViewer    ${server 1}
    
Take Server Offline
    Stop Container   ${server 1}[container]

Bring Server Online
    Start container    ${server 1}[container]

Check OT Email
    [Arguments]    ${recipient}   ${subject}
     Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${email}    Wait For Email    recipient=${recipient}    timeout=120    status=UNSEEN
    Check Email Subject
    ...    ${email}
    ...    ${subject}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${email}
    Close Mailbox