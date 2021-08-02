*** Settings ***
Resource          resource.robot
Suite Setup       Open Browser and go to URL    ${url}
# Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Run Keywords    Close All Browsers
Force Tags        system

*** Variables ***
${email}       noptixautoqa
${domain}      @gmail.com
${alias}       notifications
${password}    ${BASE PASSWORD}
@{auth}        ${EMAIL OWNER}    ${password}
${url}         ${TEST4}

*** Keywords ***

*** Test Cases ***
# Single
     # Activate Account    noptixautoqa+notifications0@gmail.com    ${password}
Make 1000 users
    FOR    ${index}    IN RANGE    1    1000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 2
    FOR    ${index}    IN RANGE    1000    2000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 3
    FOR    ${index}    IN RANGE    2000    3000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 4
    FOR    ${index}    IN RANGE    3000    4000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END
    
Make 1000 users 5
    FOR    ${index}    IN RANGE    4000    5000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 6
    FOR    ${index}    IN RANGE    5000    6000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 7
    FOR    ${index}    IN RANGE   6000    7000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 8
    FOR    ${index}    IN RANGE    7000    8000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END
    
Make 1000 users 9
    FOR    ${index}    IN RANGE    8000    9000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END

Make 1000 users 10
    FOR    ${index}    IN RANGE    9000    10000
        Run Keyword and Continue on Failure    Register Account    mark    hamil    ${email}+${alias}${index}${domain}    ${password}
        Run Keyword and Continue on Failure    Activate Account    ${email}+${alias}${index}${domain}    ${password}
    END
