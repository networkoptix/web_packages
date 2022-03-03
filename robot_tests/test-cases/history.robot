*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        history-resource.Restart
#Test Teardown     Run Keyword If Test Failed    history-resource.Reset DB and Open New Browser On Failure
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***
# COMMENTED OUT TEST CASES DUE TO ACCESS RESTRICTIONS NOT BEING CONSISTENTLY THE SAME. TEST CASES CAN BE TURNED BACK ON IN THE FUTURE

# History link is not in the downloads page for user without access
    # [tags]    Passing_19.2
    # Log In If Needed    ${EMAIL VIEWER}    ${password}
    # Wait Until Element Is Visible    ${DOWNLOAD LINK}
    # Click Link    ${DOWNLOAD LINK}
    # Register Keyword To Run On Failure    NONE
    # Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${RELEASE HISTORY BUTTON}
    # Register Keyword To Run On Failure    Failure Tasks

1. History link is in the downloads page for user with access and takes you to /downloads/releases
    [tags]    Passing_19.2
    Log In If Needed    ${email}    ${password}
    Wait Until Element Is Visible    ${DOWNLOAD LINK}
    Click Link    ${DOWNLOAD LINK}
    Wait Until Elements Are Visible    ${DOWNLOADS HEADER}    ${WINDOWS TAB}
    Click Link    ${WINDOWS TAB}
    Wait Until Elements Are Visible    ${DOWNLOAD WINDOWS VMS LINK}    ${RELEASE HISTORY BUTTON}
    Click Link    ${RELEASE HISTORY BUTTON}
    Wait Until Location is    ${url}/downloads/releases
    # Run keyword and continue on failure    Title Should Be    ${RELEASE HISTORY TITLE TEXT} - ${PRODUCT_NAME}

# Going to the history page anonymous asks for login and closing takes you to 404
    # Go To    ${url}/downloads/releases
    # Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    # Click Button    ${LOG IN CLOSE BUTTON}
    # Sleep    1
    # Wait Until Location is    ${url}/404

# Going to the history page anonymous asks for login and login shows history page
    # Go To    ${url}/downloads/releases
    # Log In If Needed    ${email}   ${password} 
    # Wait Until Element Is Visible    ${RELEASES TAB}
    # Wait Until Location is    ${url}/downloads/releases

# Going to the history page anonymous and logging in with someone who doesn't have access takes you to 404
    # Go To    ${url}/downloads/releases
    # Log In If Needed    ${EMAIL VIEWER}   ${password}  
    # Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}    ${404 ICON}
    # Sleep    1
    # Wait Until Location is    ${url}/404

# Going to the history page while logged in as someone who doesn't have access takes you to 404
    # [tags]    Passing_19.2
    # Log In If Needed    ${EMAIL VIEWER}    ${password}
    # Go To    ${url}/downloads/releases
    # Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}    ${404 ICON}
    # Wait Until Location is    ${url}/404

#Make sure each tab changes to a unique release number
2. Make sure expandable sections show options
    Log in to downloads/history
    
    Wait Until Element Is Visible    ${PATCHES TAB}
    loop expanders
    Click Link    ${PATCHES TAB}
    Wait Until Element Is Visible    ${PATCHES TAB}
    loop expanders
    Click Link    ${BETAS TAB}
    Wait Until Element Is Visible    ${PATCHES TAB}
    loop expanders

# should open downloads releases page in anonymous state
    # [tags]    anonymous
    # Open page anonymously    ${url}/downloads/releases    ${RELEASES TAB TEXT} - ${PRODUCT_NAME}
    # Wait Until Element Is Visible    ${LOG IN MODAL}
    # Check Log In    button=None
