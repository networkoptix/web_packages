*** Settings ***
Resource          ../resource.robot
Library           runKeywordAsync
Library           OperatingSystem
# Suite Setup       Open Browser and go to URL    ${url}
# Test Setup        Restart
# Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Teardown

*** Variables ***
${url}             http://localhost:8085/
${first token}     //div[@id="token_div"]//*[@id="token"]
${google api key}  //*[@id="googApiKey"]  
${FIS}             //*[@id="googFirebaseInstallationAuth"]
${post body}       //*[@id="postBody"]
${recieved msg}    //*[@id="messages"]/h5
${tokens per browser}      1
${browsers}                5
${devices per user}        2
${testenv}    https://test4.cloud.hdw.mx
${email}  noptixautoqa+owner@gmail.com
${password}  qweasd 123

*** Keywords ***
Teardown
    Remove Directory    async
    
Async Check
    [Arguments]    ${count}
    ${files} =    Count Files In Directory    async
    Should Be Equal As integers    ${count}    ${files}
    Log to Console    Files in async: ${count}
        
Get Tokens
    [Arguments]    ${starting int}    ${ending int}    ${browser count}    ${device count}    ${locust time}    ${sleep}
    ${options} =    Chrome Options For Push Notifications
    #${alias} =    Evaluate       ${browser count}*${device count}
    ${time} =    Get Time    epoch
    ${browser name} =    Set Variable    ${device count}_${browser count}_${time}
    ${response list} =    Create List
    Create Webdriver    Chrome    chrome_options=${options}
    Go To    ${url}
    Wait Until Element is Visible    ${first token}    timeout=30
    ${token} =    Get Text    ${first token}
    ${token count} =    Evaluate     1
    Sleep    1
    ${response} =    Subscribe Push Notification    ${testenv}    noptixautoqa+notifications${starting int}@gmail.com    ${BASE PASSWORD}    ${token}    ${browser name}
    ${status} =    Run Keyword And Return Status    Should Contain    ${response}    deviceInfo
    Run Keyword If    '${status}' == 'True'    Append To List    ${response list}    ${browser name}, ${token count}
    Log To Console    ${browser name}, ${token count}, ${response}
    ${key} =    Get Text    ${google api key}
    ${auth} =    Get Text    ${FIS}
    ${body} =    Get Text    ${post body}
    ${starting int} =    Evaluate   ${starting int}+1 
    
    FOR    ${index}    IN RANGE    ${starting int}    ${ending int}
        Sleep    1
        ${token} =    Get New FCM Token    ${key}    ${auth}    ${body}
        ${token count} =    Evaluate     ${token count}+1
        ${response} =    Subscribe Push Notification    ${testenv}    noptixautoqa+notifications${index}@gmail.com    ${BASE PASSWORD}    ${token}    ${browser name}
        ${status} =    Run Keyword And Return Status    Should Contain    ${response}    deviceInfo
        Run Keyword If    '${status}' == 'True'    Append To List    ${response list}    ${browser name}, ${token count}
        Log To Console    ${browser name}, ${token count}, ${response}    
    END
    ${registrations} =    Get Length    ${response list}
    Create File    async/${device count}_${browser count}.txt    Done with token registration ${registrations}
    FOR     ${i}    IN RANGE    20
        Sleep    1
        ${status} =    Run Keyword And Return Status    OperatingSystem.File Should Exist    async/${device count}_${browser count}.txt
        Run Keyword If    '${status}' == 'False'    Log To Console    ${device count}_${browser count} Failed to create file
        Sleep    1
        IF    ${status} == ${False}
            Create File    async/${device count}_${browser count}.txt    Done with token registration
        END
    END   
    
    Log To Console    ${device count}, ${browser count}, Done with token registration ${registrations}
    Receive Notifications    ${browser count}    ${device count}    ${locust time}    ${sleep}

Receive Notifications
    [Arguments]    ${browser count}    ${device count}   ${locust time}    ${sleep}
    ${total browsers} =     Evaluate    ${browsers}*${devices per user}
    #${timeout} =    Evaluate    (${tokens per browser}/100)*60
    ${wait} =    Evaluate     ${total browsers}+1   
    ${recieved per browser} =    Evaluate    ${tokens per browser} * 10000
    Log To Console    Waiting for Locust
    Wait Until Keyword Succeeds    20 min    1 min    Async Check    ${wait}
    Log To Console    Waiting to receive all
    ${wait for msg} =   Evaluate    (${recieved per browser}/25000)*600
    Sleep    ${wait for msg}     
    #${status} =    Run Keyword And Return Status    Page Should Contain Element    ${recieved msg}    limit=${recieved per browser}
    Log To Console    Counting...
    ${received FCM} =    Get Element Count    ${recieved msg} 
    @{messages} =    Get WebElements    ${recieved msg}
    ${times} =    Create List
    FOR    ${item}    IN    @{messages}
        Append To List    ${times}    ${item.text}
    END    
    ${first msg} =    Get From List    ${times}    0
    ${last msg} =    Get From List    ${times}     -1
    Create File    async/${device count}_${browser count}_${received FCM}.txt    Done with count
    FOR     ${i}    IN RANGE    20
        Sleep     1
        ${status} =    Run Keyword And Return Status    OperatingSystem.File Should Exist    async/${device count}_${browser count}_${received FCM}.txt
        Run Keyword If    '${status}' == 'False'    Log To Console    ${device count}_${browser count}_${received FCM} Failed to create file
        Sleep     1
        IF    ${status} == ${False}
            Create File    async/${device count}_${browser count}_${received FCM}.txt    Done with count
        END
    END   
    Append To File    received.txt    ${device count}, ${browser count}, ${received FCM}, First: ${first msg}, Last: ${last msg} \n
    Log To Console    ${device count} ${browser count} ${received FCM} First: ${first msg} Last: ${last msg}
    # Log To Console    ${SPACE}, ${SPACE}, ${SPACE}, ${SPACE},
    # Sleep    1
    # Close Browser
    Sleep    1
    ${status2} =    Evaluate    99 < ${received FCM} < 101            
    Run Keyword If    ${status2}==True    Close Browser
    
Bind Users to Browsers
    [Arguments]    ${device count}    ${locust time}    ${sleep} 
    ${browser count} =    Evaluate     0
    ${total browsers} =     Evaluate    ${browsers}*${devices per user} 
    
    FOR    ${index}    IN RANGE    ${browsers}
        ${starting int} =    Evaluate   ${tokens per browser} * ${index}
        ${ending int} =     Evaluate    ${tokens per browser} * (${index}+1)
        ${browser count} =    Evaluate     ${browser count}+1
        Run Keyword Async    Get Tokens      ${starting int}      ${ending int}    ${browser count}    ${device count}      ${locust time}    ${sleep}
        #Get Tokens      ${starting int}      ${ending int}    ${browser count}    ${device count}      ${locust time}    ${sleep}
        Sleep    2
    END
    #Wait Async All     timeout=${timeout}
    
*** Test Cases ***
Push Notifications To Browsers
    ${device count} =    Evaluate     0
    ${devices index} =    Evaluate    ${devices per user}+1
    ${total browsers} =     Evaluate    ${browsers}*${devices per user} 
    #${timeout} =    Evaluate     180
    ${timeout} =    Evaluate    27*${total browsers}*(${tokens per browser}/1000)
    
    ${sleep} =    Evaluate    1200    #(((${tokens per browser}*${browsers})/5)/5)
       
    # ${browser index} =    Evaluate    ${total browsers}+1
    
    ${locust users} =    Evaluate    ${tokens per browser}*${browsers}*10    #/200
    ${locust ramp} =    Evaluate    ${tokens per browser}*${browsers}*10    #/200      
    ${locust slaves} =    Evaluate    ${locust users}/5
    ${locust time} =    Evaluate    ${locust users}+120
    Append To File    received.txt    , , STATS, BELOW \n
    
    FOR    ${index}    IN RANGE    1    ${devices index}
        ${device count} =    Evaluate     ${device count}+1
        Run Keyword Async    Bind Users to Browsers    ${device count}    ${locust time}    ${sleep} 
        #Bind Users to Browsers    ${device count}    ${locust time}    ${sleep}            
        Sleep    2
    END
    ${wait} =    Evaluate    ${total browsers}+0
    #Sleep    ${timeout}   
    Wait Until Keyword Succeeds    2 min    1 sec    Async Check    ${wait}
    #Sleep    120
    Create Systems Json    ${testenv}/    ${email}    ${password}

    Push Notifications Swarm     ${locust slaves}    ${locust users}    ${locust ramp}    ${locust time}      
    Create File    async/locust.txt    Done with pushing
    ${wait} =    Evaluate     (${total browsers}*2)+2
    Wait Until Keyword Succeeds    10 min    10 sec    Async Check    ${wait}
    Sleep    90
    #Sleep    ${sleep}
    #Log    ${result}
    #Log To Console    @{asyncList}
    # FOR    ${index}    IN RANGE    1    ${browser index}
        # Switch Browser    browser${index}
        # Run Keyword and Continue on Failure    Page Should Contain Element    ${recieved msg}    limit=${recieved per browser}         
    # END
    
    #Close All Browsers

# Locust
    # ${locust users} =    Evaluate    ${tokens per browser}*${browsers}/200
    # ${locust ramp} =    Evaluate    ${tokens per browser}*${browsers}/200      
    # ${locust slaves} =    Evaluate      ${locust users}/5
    # ${locust time} =    Evaluate    ${locust users}+90
    
    # Create Systems Json    ${testenv}    ${email}    ${password}

    # Push Notifications Swarm     ${locust slaves}    ${locust users}    ${locust ramp}    ${locust time}
#    Push Notifications Swarm    1    1    1    1   
    
# Pabot
    # ${max} =    Evaluate    1000
    # Push Notification Pabot Command    ${max}