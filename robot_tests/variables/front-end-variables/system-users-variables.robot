*** Variables ***
${password}                                    ${BASE PASSWORD}
${url}                                         ${ENV}
@{TMP USERS}
@{server auth}                                 admin    qweasd 123
${mode}                                        cloud
${DISCONNECT FORM}                             //form[@name='disconnectForm']
${DISCONNECT FORM DISCONNECT CLOUD BUTTON}     ${DISCONNECT FORM}//nx-process-button/div[contains(@class, "process-button")]//button[contains(text(),"${DISCONNECT BUTTON TEXT}")]/..