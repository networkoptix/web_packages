*** Settings ***
Resource          ../../resource.robot
Resource          restore-pass-resource.robot

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    Set Language Anonymous
    
Reset DB and Open New Browser On Failure
    Set Account Name    ${no perm}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Set Account Name    ${server 1}[cloud users][viewer]    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    ${server auth}=   Create List    admin    ${BASE PASSWORD}
#    @{auth}=    Create List    ${delete}    ${BASE PASSWORD}
    Disconnect Server via API    ${server auth}   ${server 3}[cloud id]    ${BASE PASSWORD}    ${EMAIL DELETE USER}
    Disconnect Server via API    ${server auth}    ${server 4}[cloud id]    ${BASE PASSWORD}    ${EMAIL DELETE USER}

Verify Delete User Dialog
    Wait Until Elements are Visible
    ...    ${DELETE ACCOUNT MODAL BUTTON}
    ...    ${DELETE ACCOUNT CANCEL BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD INPUT}
    ...    ${DELETE ACCOUNT CLOSE BUTTON}
    ...    ${DELETE ACCOUNT PASSWORD LABEL}
    ...    ${DELETE ACCOUNT INFO}
    ...    ${DELETE ACCOUNT HEADER}

Account Suite Setup
    ${owner}=   Register and activate account with random email    mark    hamill    ${password}
    ${no perm}=   Register and activate account with random email    mark    hamill    ${password}
    Set Suite Variable    ${no perm}    ${no perm}
    ${delete}=   Register and activate account with random email    mark    hamill    ${password}
    Set Suite Variable    ${delete}    ${delete}
    
    ${random}=   Generate Random String      length=5

    ${server 1}=   Create Base System    account1-${random}    owner=${owner}
    ${server 2}=   Create Base System    account2-${random}    owner=${owner}
    ${server 3}=   Create Base System    account3-${random}    owner=${owner}
    ${server 4}=   Create Base System    account4-${random}    owner=${delete}
    ${server 5}=   Create Base System    account5-${random}    owner=${delete}

    FOR    ${i}    IN RANGE    1    6
        Set Suite Variable    ${server ${i}}
    END
    
    ${owner email} =    Set Variable    ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${owner}")]

    Open Browser and go to URL    ${url}
    
Account Suite Tear Down
    FOR    ${i}    IN RANGE    1    4
        Delete Base System    ${server ${i}}
    END
    Execute Command Remotely    docker rm -f ${server 4}[id] ${server 5}[id]
    Delete Account    ${delete}    ${base password}
    Close All Browsers
