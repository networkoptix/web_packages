*** Settings ***
Resource          ../../resource.robot
Resource          system-admin-resource.robot

*** Keywords ***
Settings Menu Test Teardown
    Run Keyword If Test Failed    System Settings Menu Test Restart

System Settings Menu Test Setup
    Run Keyword and Ignore Error    Dismiss New Feature Modal
    Log Out
    Log in to system new   ${system 1}    ${system 1}[cloudOwner]
    Wait Until Element is Visible    ${SERVERS LINK}
#    Click Link    ${SERVERS LINK}
#    Verify on Servers Page    timeout=150

System Settings Menu Test Restart
    ${logged in}=   Run keyword and return status    Wait until element is visible    ${ACCOUNT DROPDOWN}
    IF    ${logged in} == ${False}
        Log in to system new   ${system 1}    ${system 1}[cloudOwner]
    END

System Settings Menu Suite Setup
    Open Browser and go to URL    ${url}
    ${random}=   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers}=    Create Systems
    Set Suite Variable    ${servers}    ${servers}
    FOR    ${i}    IN RANGE    1    4
        ${n} =    Evaluate   ${i}-1
        Set Suite Variable    ${system ${i}}    ${servers}[${n}]
    END
    FOR    ${i}    IN RANGE    2    4
        cdb Merge Cloud Systems    ${system 1}[id]    ${system ${i}}[id]    ${system 1}[cloudAuth][0]    ${system 1}[cloudAuth][1]
        Sleep    60
    END
    Go to   ${url}
    Log in to system new   ${system 1}    ${system 1}[cloudOwner]
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=150

System Settings Menu Suite Teardown
    Teardown Servers    ${system 1}
    FOR    ${i}    IN RANGE    2    4
        Delete container    ${system ${i}}[container]
    END
    Close All Browsers
