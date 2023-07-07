*** Settings ***
Resource          ../Resources/front-end-resources/downloads-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Run Keywords    QA Video Recording Start      downloads-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded


*** Test Cases ***
1. Download link is in the footer
    Wait Until Element Is Visible    ${DOWNLOAD LINK}

2. Download link takes you to the /downloads page
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    Click Link    ${DOWNLOAD LINK}
    ${os}=   Get OS
    ${os}    Convert To Lowercase    ${os}
    Wait Until Location Is    ${url}/download/${os}
    # Run keyword and continue on failure    Title Should Be    ${DOWNLOAD TITLE TEXT} - ${PRODUCT_NAME}
#    Wait Until Element Is Visible    ${LOG IN MODAL}

3. Going to the downloads page anonymous asks for login and closing takes you back to home
    [tags]    C42069
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    Click Link    ${DOWNLOAD LINK}
    # Run keyword and continue on failure    Title Should Be    ${DOWNLOAD TITLE TEXT} - ${PRODUCT_NAME}
    ${status} =    Run Keyword and Return Status    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Run Keyword If    ${status}    Run Keywords    
    ...    Click Button    ${LOG IN CLOSE BUTTON}    AND
    ...    Wait Until Location Is    ${url}/

4. Going to the downloads page anonymous asks for login and login shows downloads page
    [tags]    C42069
    Go to download page

5. Going to the downloads page should show you the tab according to your OS
    [tags]    C41550
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    Click Link    ${DOWNLOAD LINK}
    Log In If Needed   ${email}    ${password}  
    Wait Until Elements Are Visible    ${DOWNLOADS HEADER}    ${WINDOWS TAB}
    #we convert to lowercase because the ids are lowercase but the os call gives uppercase
    ${os}    Get OS
    ${os}    Convert To Lowercase    ${os}
    Wait Until Element Is Visible    //a[@aria-selected="true" and @id="${os}"]

6. Make sure each tab changes the text to show the corresponding OS and url
    Go to download page
    Wait Until Elements Are Visible    ${DOWNLOAD WINDOWS VMS LINK}    ${WINDOWS TAB}
    Click Link    ${WINDOWS TAB}
    Wait Until Element Is Visible    ${LINUX TAB}
    Click Link    ${LINUX TAB}
    Wait Until Location Is    ${url}/download/linux
    Wait Until Elements Are Visible    ${DOWNLOAD LINUX VMS LINK}    ${MAC OS TAB}
    Click Link    ${MAC OS TAB}
    Wait Until Location Is    ${url}/download/macos
    Wait Until Elements Are Visible    ${DOWNLOAD MAC OS VMS LINK}    ${MAC OS TAB}

7. Validate the windows download links
    [tags]    C41552    C30821
    Go to download page
    Check for file by OS    WINDOWS
    Check other packages

8. Validate the ubuntu download links
    [tags]    C41552    C30821
    Go to download page
    Check for file by OS    LINUX
    Check other packages

9. Validate the mac download links
    [tags]    C41552    C30821
    Go to download page
    Check for file by OS    MAC OS
    Check other packages

10. Check Play Store Link
    [tags]    C41554    C30821
    Go to download page
    ${url}    Get Element Attribute    ${PLAY STORE DOWNLOAD BUTTON}    href
    Should Be Equal    ${url}    ${PLAY STORE LINK}
    Check File Exists    ${url}

11. Check iTunes Store Link
    [tags]    C41554    C30821
    Go to download page
    ${url}    Get Element Attribute    ${ITUNES STORE DOWNLOAD BUTTON}    href
    Should Be Equal    ${url}    ${ITUNES STORE LINK}
