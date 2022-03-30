*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Footer Suite Setup
    ${url}=   Set Variable If
    ...    '''${mode}'''=='''cloud'''    ${ENV}
    ...    '''${mode}'''=='''webadmin'''    https://${QA BURBANK SYSTEM IP}:7001
    Set Suite Variable    ${url}

Footer Test Setup
    Skip If Irrelevant
    Open Browser and go to URL    ${url}
    Run Keyword If   '''${mode}''' == '''webadmin'''    Log In If Needed    ${AUTO SYS AUTH}[0]    ${AUTO SYS AUTH}[1]

Footer Test Teardown
    Skip If Irrelevant
    Delete All Cookies
    Close Browser