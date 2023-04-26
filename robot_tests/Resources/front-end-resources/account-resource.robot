*** Settings ***
Resource          ../../resource.robot
Resource          restore-pass-resource.robot

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    Set Language Anonymous

Account Test Teardown
    Run Keyword If Test Failed    account-resource.Reset DB and Open New Browser On Failure

Account Server Test Teardown
    Run Keyword If Test Failed    account-resource.Server Reset DB and Open New Browser On Failure


Reset DB and Open New Browser On Failure
    Set Account Name    ${no perm}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}

Server Reset DB and Open New Browser On Failure
    Set Account Name    ${no perm}    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    Set Account Name    ${server 1}[cloudUsers][viewer]    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}
    ${server auth}=   Create List    admin    ${BASE PASSWORD}
#    @{auth}=    Create List    ${delete}    ${BASE PASSWORD}
    Disconnect Server via API    ${server auth}   ${server 3}[id]    ${BASE PASSWORD}    ${EMAIL DELETE USER}
    Disconnect Server via API    ${server auth}   ${server 4}[id]    ${BASE PASSWORD}    ${EMAIL DELETE USER}

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
    Open Browser and go to URL    ${url}
    ${owner}=   Register and activate account with random email    mark    hamill    ${password}
    ${no perm}=   Register and activate account with random email    mark    hamill    ${password}
    Set Suite Variable    ${no perm}    ${no perm}
    Go to    ${url}

Account Server Suite Setup
    Open Browser and go to URL    ${url}
    ${no perm}=   Register and activate account with random email    mark    hamill    ${password}
    Set Suite Variable    ${no perm}    ${no perm}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    FOR    ${i}    IN RANGE    1    6
        ${n} =      Evaluate    ${i}-1
        Set Suite Variable    ${server ${i}}    ${servers}[${n}]
    END
    Set Suite Variable    ${delete}    ${server 4}[cloudOwner]
    ${owner email} =    Set Variable    ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${server 1}[cloudOwner]")]
    Go to    ${url}
    
Account Server Suite Tear Down
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
    Close All Browsers

Account Suite Tear Down
    Close All Browsers