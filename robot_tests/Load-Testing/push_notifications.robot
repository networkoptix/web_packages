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
${tokens per browser}      250
${browsers}                36
${devices per user}        1
${testenv}    https://test3.cloud.hdw.mx/
${email}  noptixautoqa+owner@gmail.com
${password}  qweasd 123

*** Keywords ***
Get Tokens
    [Arguments]    ${starting int}    ${ending int}    ${browser count}    ${device count}
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
    ${token count} =    Evaluate     0
    FOR    ${index}    IN RANGE    ${starting int}    ${ending int}
        ${token} =    Get New FCM Token    ${key}    ${auth}    ${body}
        ${response} =    Subscribe Push Notification    https://test3.cloud.hdw.mx    noptixautoqa+notifications${index}@gmail.com    ${BASE PASSWORD}    ${token}
        ${token count} =    Evaluate     ${token count}+1
        Log To Console    ${device count}, ${browser count}, ${token count}, ${response}    
    END        
    
Bind Users to Browsers
    [Arguments]    ${device count}
    ${browser count} =    Evaluate     0
    FOR    ${index}    IN RANGE    ${browsers}
        ${starting int} =    Evaluate   ${tokens per browser} * ${index}
        ${ending int} =     Evaluate    ${tokens per browser} * (${index}+1)
        ${browser count} =    Evaluate     ${browser count}+1
        Get Tokens      ${starting int}      ${ending int}    ${browser count}    ${device count}
    END

*** Test Cases ***
Push Notifications To Browsers
    ${device count} =    Evaluate     0
    ${devices index} =    Evaluate    ${devices per user}+1
    FOR    ${index}    IN RANGE    1    ${devices index}
        ${device count} =    Evaluate     ${device count}+1
        Bind Users to Browsers    ${device count}              
    END
    
    ${total browsers} =     Evaluate    ${browsers}*${devices per user} 
    ${browser index} =    Evaluate    ${total browsers}+1
    ${recieved per browser} =    Evaluate    ${tokens per browser} * 10
    ${sleep} =    Evaluate    3600   #180+(${total browsers}*2)
    ${locust users} =    Evaluate    ${tokens per browser}*${browsers}/200
    ${locust ramp} =    Evaluate    ${tokens per browser}*${browsers}/200      
    ${locust slaves} =    Evaluate    ${locust users}/5
    ${locust time} =    Evaluate    ${locust users}+180
    
    Create Systems Json    ${testenv}    ${email}    ${password}

    Push Notifications Swarm     ${locust slaves}    ${locust users}    ${locust ramp}    ${locust time}  
    Sleep    ${sleep}    
    
   
    FOR    ${index}    IN RANGE    1    ${browser index}
        Switch Browser    ${index}
        Run Keyword and Continue on Failure    Page Should Contain Element    ${recieved msg}    limit=${recieved per browser}         
    END
    
    #Close All Browsers

# Locust
    # ${locust users} =    Evaluate    ${tokens per browser}*${browsers}/200
    # ${locust ramp} =    Evaluate    ${tokens per browser}*${browsers}/200      
    # ${locust slaves} =    Evaluate    1  #${locust users}/5
    # ${locust time} =    Evaluate    ${locust users}+60
    
    # Create Systems Json    ${testenv}    ${email}    ${password}

    # Push Notifications Swarm     ${locust slaves}    ${locust users}    ${locust ramp}    ${locust time}
#    Push Notifications Swarm    1    1    1    1   
    
# Pabot
    # ${max} =    Evaluate    1000
    # Push Notification Pabot Command    ${max}