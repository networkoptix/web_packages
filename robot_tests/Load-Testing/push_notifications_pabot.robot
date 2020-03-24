*** Settings ***
Resource          ../resource.robot
# Suite Setup       Open Browser and go to URL    ${url}
# Test Setup        Restart
# Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
# Suite Teardown    Close All Browsers

*** Variables ***
${min}    0
${max}    1000      
${env}    https://test3.cloud.hdw.mx/
${email}  noptixautoqa+owner@gmail.com
${password}  qweasd 123      

*** Keywords ***
Push Notifications Pabot
    [Arguments]    ${proc}
    # ${group} =    Evaluate    ${proc}/10    
    # ${slice} =    Evaluate    ${max}/4
    # ${group} =    Set Variable If   0 < ${group} < 1    1
    # ...    ${group} == 1    1
    # ...    1 < ${group} < 2    2
    # ...    ${group} == 2    2
    # ...    2 < ${group} < 3    3
    # ...    ${group} == 3    3
    # ...    3 < ${group} < 4    4
    # ...    ${group} == 4    4
    # ${start} =    Evaluate    ${group}-1 
    # ${max} =    Evaluate    ${group}*${slice}
    # ${min} =    Evaluate    ${start}*${slice}    
        
    Push Notifications Requests    ${env}    ${email}    ${password}    ${proc}    ${min}    ${max}

*** Test Cases ***
Push Notifications Pabot Proc 1
    Push Notifications Pabot    1
    
Push Notifications Pabot Proc 2
    Push Notifications Pabot    2
    
Push Notifications Pabot Proc 3
    Push Notifications Pabot    3
    
Push Notifications Pabot Proc 4
    Push Notifications Pabot    4
    
Push Notifications Pabot Proc 5
    Push Notifications Pabot    5
    
Push Notifications Pabot Proc 6
    Push Notifications Pabot    6
    
Push Notifications Pabot Proc 7
    Push Notifications Pabot    7
    
Push Notifications Pabot Proc 8
    Push Notifications Pabot    8
    
Push Notifications Pabot Proc 9
    Push Notifications Pabot    9
    
Push Notifications Pabot Proc 10
    Push Notifications Pabot    10
    
# Push Notifications Pabot Proc 11
    # Push Notifications Pabot    11
    
# Push Notifications Pabot Proc 12
    # Push Notifications Pabot    12
    
# Push Notifications Pabot Proc 13
    # Push Notifications Pabot    13
    
# Push Notifications Pabot Proc 14
    # Push Notifications Pabot    14
    
# Push Notifications Pabot Proc 15
    # Push Notifications Pabot    15
    
# Push Notifications Pabot Proc 16
    # Push Notifications Pabot    16
    
# Push Notifications Pabot Proc 17
    # Push Notifications Pabot    17
    
# Push Notifications Pabot Proc 18
    # Push Notifications Pabot    18
    
# Push Notifications Pabot Proc 19
    # Push Notifications Pabot    19
    
# Push Notifications Pabot Proc 20
    # Push Notifications Pabot    20
    
    
# Push Notifications Pabot Proc 21
    # Push Notifications Pabot    21
    
# Push Notifications Pabot Proc 22
    # Push Notifications Pabot    22
    
# Push Notifications Pabot Proc 23
    # Push Notifications Pabot    23
    
# Push Notifications Pabot Proc 24
    # Push Notifications Pabot    24
    
# Push Notifications Pabot Proc 25
    # Push Notifications Pabot    25
    
# Push Notifications Pabot Proc 26
    # Push Notifications Pabot    26
    
# Push Notifications Pabot Proc 27
    # Push Notifications Pabot    27
    
# Push Notifications Pabot Proc 28
    # Push Notifications Pabot    28
    
# Push Notifications Pabot Proc 29
    # Push Notifications Pabot    29
    
# Push Notifications Pabot Proc 30
    # Push Notifications Pabot    30
    
# Push Notifications Pabot Proc 31
    # Push Notifications Pabot    31
    
# Push Notifications Pabot Proc 32
    # Push Notifications Pabot    32
    
# Push Notifications Pabot Proc 33
    # Push Notifications Pabot    33
    
# Push Notifications Pabot Proc 34
    # Push Notifications Pabot    34
    
# Push Notifications Pabot Proc 35
    # Push Notifications Pabot    35
    
# Push Notifications Pabot Proc 36
    # Push Notifications Pabot    36
    
# Push Notifications Pabot Proc 37
    # Push Notifications Pabot    37
    
# Push Notifications Pabot Proc 38
    # Push Notifications Pabot    38
    
# Push Notifications Pabot Proc 39
    # Push Notifications Pabot    39
    
# Push Notifications Pabot Proc 40
    # Push Notifications Pabot    40
   
    