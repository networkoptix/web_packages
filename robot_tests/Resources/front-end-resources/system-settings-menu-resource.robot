*** Settings ***
Resource          ../../resource.robot
Resource          system-admin-resource.robot

*** Keywords ***
System Settings Menu Test Setup
    Log Out
    Log in to system    ${system 1}    ${system 1}[owner]
    Wait Until Element is Visible    ${SERVERS LINK}
#    Click Link    ${SERVERS LINK}
#    Verify on Servers Page    timeout=150

System Settings Menu Test Restart
    ${logged in}=   Run keyword and return status    Wait until element is visible    ${ACCOUNT DROPDOWN}
    IF    ${logged in} == ${False}
        Log in to system    ${system 1}    ${system 1}[owner]
    END

System Settings Menu Suite Setup
    ${rand}=   Generate Random String      length=5
    ${owner}=   Register and activate account with random email    SystemsMenu    Owner    ${BASE PASSWORD}

    FOR    ${i}    IN RANGE    1    4
        ${system}=   Create Base System    container name=systems_menu_${rand}_${i}    owner=${owner}
        Set Suite Variable    ${system ${i}}    ${system}
    END

    FOR    ${i}    IN RANGE    2    4
        cdb Merge Cloud Systems    ${system 1}[cloud id]    ${system ${i}}[cloud id]    ${system 1}[cloud auth][0]    ${system 1}[cloud auth][1]
        Sleep    60
    END

    Open Browser and go to URL    ${url}

    Log in to system    ${system 1}    ${system 1}[owner]
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=150

System Settings Menu Suite Teardown
    Delete Base System    ${system 1}
    FOR    ${i}    IN RANGE    2    4
        Delete Docker Server    ${system ${i}}[name]
    END
    Close All Browsers
