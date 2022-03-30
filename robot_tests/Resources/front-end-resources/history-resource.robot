*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Restart
    Go To    ${url}
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Log in to downloads/history
    Go To    ${url}/downloads/releases
    Log In If Needed    ${email}    ${password}   

loop expanders
    #get the first release number for targeting purposes
    Wait Until Element Is Visible    ${RELEASE NUMBER}
    ${first number}    Get Text    ${RELEASE NUMBER}
    #create an element to reference that will always refer to elements in the first section of each tab
    ${first section}    Set Variable If    ${FULL}==False    //div//h1[contains(text(),'${first number}')]
    #get all or just first section
    IF    ${FULL}==True
        ${expandables}=    Get WebElements    //nx-release//div/a
    ELSE
        ${expandables}=    Get WebElements    ${first section}/../..//div/a
    END
    Run Keyword Unless    ${expandables}    Fail    Expandables was empty
    #open the expanders
    FOR    ${platform}    IN    @{expandables}
        Click Link    ${platform}
        IF    ${FULL}==True
            ${downloads}=    Get WebElements    //div[contains(@class,"active")]//div/a/../ul/li/a
        ELSE
            ${downloads}=    Get WebElements    ${first section}/../..//div/ul/li/a
        END
        loop links    ${downloads}
    END

#check each link in each expander for validity
loop links
    [arguments]    ${downloads}
    FOR    ${download}    IN    @{downloads}
        ${link}    Get Element Attribute    ${download}    href
        ${matches}    Get Regexp Matches    ${link}    ${DOWNLOADS DOMAIN}
        IF    ${matches}
            Check File Exists    ${link}
        ELSE
            Fail    URL did not begin with ${DOWNLOADS DOMAIN}
        END
    END
    