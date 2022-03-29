*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Restart
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Go to download page
    Wait Until Elements Are Visible    ${DOWNLOAD LINK}    //h2[@class\="text-center"]
    Click Link    ${DOWNLOAD LINK}
    Log In If Needed   ${email}    ${password}   
    Wait Until Elements Are Visible    ${DOWNLOADS HEADER}    ${WINDOWS TAB}
    Click Link    ${WINDOWS TAB}

Check for file by OS
    [arguments]    ${os}
    Wait Until Element Is Visible    ${DOWNLOADS HEADER}
    Wait Until Element Is Visible    ${${os} TAB}
    Click Link    ${${os} TAB}
    Wait Until Element Is Visible    ${DOWNLOAD ${os} VMS LINK}
    ${url}    Get Element Attribute    ${DOWNLOAD ${os} VMS LINK}    href
    Check File Exists    ${url}

Check other packages
    ${packages}    Get WebElements    ${other packages}
    FOR  ${element}  IN  @{packages}
        ${url}    Get Element Attribute    ${element}    href
        Check File Exists    ${url}
    END
