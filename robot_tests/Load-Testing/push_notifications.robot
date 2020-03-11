*** Settings ***
Resource          ../resource.robot
# Suite Setup       Open Browser and go to URL    ${url}
# Test Setup        Restart
# Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
# Suite Teardown    Close All Browsers

*** Variables ***
${url}             http://localhost:8085/
${first token}     //div[@id="token_div"]//*[@id="token"]
${google api key}  //*[@id="googApiKey"]  
${FIS}             //*[@id="googFirebaseInstallationAuth"]
${post body}       //*[@id="postBody"]
${recieved msg}    //*[@id="messages"]/h5

*** Keywords ***
Get Tokens
    [Arguments]    ${starting int}    ${ending int}
    ${options} =    Chrome Options For Push Notifications
    Create Webdriver    Chrome    chrome_options=${options}
    Go To    ${url}
    Wait Until Element is Visible    ${first token}    timeout=30
    ${token} =    Get Text    ${first token}
    ${response} =    Subscribe Push Notification    https://test3.cloud.hdw.mx    noptixautoqa+notifications${starting int}@gmail.com    ${BASE PASSWORD}    ${token}
    Log To Console    ${response}
    ${key} =    Get Text    ${google api key}
    ${auth} =    Get Text    ${FIS}
    ${body} =    Get Text    ${post body}
    ${starting int} =    Evaluate   ${starting int}+1 
    FOR    ${index}    IN RANGE    ${starting int}    ${ending int}
        ${token} =    Get New FCM Token    ${key}    ${auth}    ${body}
        ${response} =    Subscribe Push Notification    https://test3.cloud.hdw.mx    noptixautoqa+notifications${index}@gmail.com    ${BASE PASSWORD}    ${token}
    Log To Console    ${response}
    END        

*** Test Cases ***
Push Notifications to Browsers
    FOR    ${index}    IN RANGE    2
        ${starting int} =    Evaluate   5 * ${index}
        ${ending int} =     Evaluate    5 * (${index}+1)
        Get Tokens      ${starting int}      ${ending int}
    END
    
    Push Notifications Swarm    10    10    1    1
    Sleep    120    

    FOR    ${index}    IN RANGE    1    3
        Switch Browser    ${index}
        Run Keyword and Continue on Failure    Page Should Contain Element    ${recieved msg}    limit=50         
    END
    
    Close All Browsers
    