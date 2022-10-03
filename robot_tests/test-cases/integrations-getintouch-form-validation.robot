*** Settings ***
Resource          ../Resources/front-end-resources/integrations-getintouch-form-validation-resource.robot
Suite Setup       Form Validation
Test Template     Test Get In Touch Invalid
Test Teardown     Run Keyword if Test Failed    integrations-getintouch-form-validation-resource.Restart
Suite Teardown    Run Keyword and Ignore Error    Close Browser
Force Tags        form    Threaded    integrations


*** Test Cases ***                    EXPECTED    NAME             EMAIL                     SUBJECT             BUTTON                                      MESSAGE
1. Getintouch Invalid Email 1 noptixqagmail.com     failure     ${valid name}    noptixqagmail.com    ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
2. Getintouch Valid sales inquiry valid email       success     ${valid name}    ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
3. Getintouch Valid technical inquiry valid email   success     ${valid name}    ${valid email}       ${technical inquiry}    ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
4. Getintouch Valid Feedback valid email            success     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
# Using ${SPACE} below for now due to selenium shortcomings. but really want to be testing for ${EMPTY}
5. Getintouch Empty name                            failure     ${SPACE}         ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
6. Getintouch Invalid Email 2 noptixq@gmail         failure     ${valid name}    noptixqa@gmail       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     Sample message
    [tags]    C54681
7. Getintouch Close button no submit                failure     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH CLOSE BUTTON}    Sample message
    [tags]    C54681
8. Getintouch Empty message                         failure     ${valid name}    ${valid email}       ${sales inquiry}        ${INTEGRATION GET IN TOUCH SEND BUTTON}     ${EMPTY}
    [tags]    C54681
9. Getintouch Cancel button no submit               failure     ${valid name}    ${valid email}       ${feedback}             ${INTEGRATION GET IN TOUCH CANCEL BUTTON}   Sample message
    [tags]    C54681
