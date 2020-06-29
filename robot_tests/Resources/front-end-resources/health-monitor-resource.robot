*** Keywords ***
Validate Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    ...    ${HM CAMERAS PAGE LINK}
    ...    ${HM INTERFACES PAGE LINK}
    ...    ${HM REFRESH REPORT}
    ...    ${HM DOWNLOAD FULL REPORT}

Validate Uploaded Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM DOWNLOAD FULL REPORT}
    ...    ${HM IMPORTED REPORT RIBBON}

Upload Json
    [arguments]    ${json_name}
    Wait Until Page Contains Element    ${HM FILE DROP INPUT}
    Choose File    ${HM FILE DROP INPUT}    ${EXECDIR}${/}${json_name}.json
    Validate Uploaded Alerts Page
    Sleep    0.2