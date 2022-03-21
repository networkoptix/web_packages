*** Variables ***
${new system name}         Name Changed
${3.2 system url}          http://10.1.5.113:7001
${visible}                 /ancestor::nx-checkbox
${ADMIN LINK}              //a[@id="admin"]
${GENERAL LINK}            //a[@id="general"]
${USERS LINK}              //a[@id="users"]
${SYSTEM SETTINGS FORM}    //form[@name="systemSettingsForm"]
${SECURITY FORM}           //form[@name="systemAndSecuritySettingsForm"]
${password}    ${BASE PASSWORD}

${ENABLE AUTO DISCOVERY CHECKBOX}     //*[@id="autoDiscoveryEnabled"]
${SEND ANONYMOUS USAGE CHECKBOX}      //*[@id="statisticsAllowed"]
${ALLOW SYSTEM OPTIMIZE CHECKBOX}     //*[@id="cameraSettingsOptimization"]

@{checkboxes}
...    ${ENABLE AUTO DISCOVERY CHECKBOX}
...    ${SEND ANONYMOUS USAGE CHECKBOX}
...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}
...    ${ENABLE AUDIT TRAIL CHECKBOX}
...    ${ALLOW ONLY SECURE CHECKBOX}
...    ${LIMIT SESSION DURATION CHECKBOX}

&{default settings}
...    autoDiscoveryEnabled=true
...    statisticsAllowed=true
...    cameraSettingsOptimization=true
...    auditTrailEnabled=true
...    trafficEncryptionForced=false
...    videoTrafficEncryptionForced=false
...    sessionLimitMinutes=0

&{default settings5}
...    autoDiscoveryEnabled=${true}
...    statisticsAllowed=${true}
...    cameraSettingsOptimization=${true}
...    auditTrailEnabled=${true}
...    trafficEncryptionForced=${false}
...    videoTrafficEncryptionForced=${false}
...    sessionLimitMinutes=${0}

&{default advanced settings}
...    autoDiscoveryEnabled=true
...    statisticsAllowed=true
...    cameraSettingsOptimization=true
...    auditTrailEnabled=true
...    trafficEncryptionForced=false
...    videoTrafficEncryptionForced=false
...    sessionLimitMinutes=0
...    additionalLocalFsTypes=${EMPTY}
...    arecontRtspEnabled=false
...    auditTrailPeriodDays=183
...    autoDiscoveryResponseEnabled=true
...    autoUpdateThumbnails=true
...    cloudConnectRelayingEnabled=true
...    cloudConnectUdpHolePunchingEnabled=true
...    crossdomainEnabled=false
...    defaultExportVideoCodec=mpeg4
...    defaultVideoCodec=h263p
...    disabledVendors=${EMPTY}
...    downloaderPeers={}
...    ec2AliveUpdateIntervalSec=60
...    enableEdgeRecording=true
...    eventLogPeriodDays=30
...    forceLiveCacheForPrimaryStream=auto
...    keepHanwhaIoPortStateIntactOnInitialization=false
...    lastMergeMasterId=${EMPTY}
...    lastMergeSlaveId=${EMPTY}
...    ldapAdminDn=${EMPTY}
...    ldapSearchBase=${EMPTY}
...    ldapSearchFilter=${EMPTY}
...    ldapSearchTimeoutS=30
...    ldapUri=${EMPTY}
...    licenseServer=https://licensing.vmsproxy.com
...    lowQualityScreenVideoCodec=mpeg2video
...    maxDifferenceBetweenSynchronizedAndInternetTime=2000
...    maxDifferenceBetweenSynchronizedAndLocalTimeMs=5000
...    maxEventLogRecords=100000
...    maxP2pAllClientsSizeBytes=1073741824
...    maxP2pQueueSizeBytes=52428800
...    maxRecordQueueSizeBytes=25165824
...    maxRecordQueueSizeElements=1000
...    maxRemoteArchiveSynchronizationThreads=-1
...    maxRtpRetryCount=6
...    maxRtspConnectDurationSeconds=0
...    maxSceneItems=0
...    maxVirtualCameraArchiveSynchronizationThreads=-1
...    maxHttpTranscodingSessions=2
...    maxWearableArchiveSynchronizationThreads=-1
...    rtspBufferSizeKb=64
...    metadataStorageChangePolicy=keep
...    osTimeChangeCheckPeriodMs=1000
...    proxyConnectTimeoutSec=5
...    pushNotificationsLanguage=${EMPTY}
...    resourceFileUri=http://resources.vmsproxy.com/resource_data.json
...    rtpTimeoutMs=10000
...    sequentialFlirOnvifSearcherEnabled=false
...    serverDiscoveryPingTimeoutSec=60
...    smtpConnectionType=Unsecure
...    smtpHost=${EMPTY}
...    smtpPort=0
...    smtpSimple=true
...    smtpTimeout=300
...    smtpUser=${EMPTY}
...    specificFeatures=${SPECIFIC FEATURES DEFAULT}
...    statisticsReportLastTime=2021-01-21T20:07:05Z
...    statisticsReportLastVersion=4.1.0.32212-7259e0f382b5-default-patch
...    statisticsReportServerApi=${EMPTY}
...    statisticsReportTimeCycle=${EMPTY}
...    statisticsReportUpdateDelay=${EMPTY}
...    syncTimeEpsilon=200
...    syncTimeExchangePeriod=600000
...    takeCameraOwnershipWithoutLock=true
...    timeSynchronizationEnabled=true
...    updateNotificationsEnabled=true
...    upnpPortMappingEnabled=true
...    useTextEmailFormat=false
...    useWindowsEmailLineFeed=false
...    webSocketEnabled=true

${ENABLE AUDIT TRAIL CHECKBOX}        //*[@id='auditTrailEnabled']
${ALLOW ONLY SECURE CHECKBOX}         //*[@id='trafficEncryptionForced']
${ENCRYPT VIDEO TRAFFIC CHECKBOX}     //*[@id='videoTrafficEncryptionForced']
${LIMIT SESSION DURATION CHECKBOX}    //*[@id='sessionLimitMinutesToggle']
${TIME NUMBER INPUT}                       //*[@type='number']
${TIME DURATION INTERVAL BUTTON}           //*[@id="genericSelect"]
${TIME DURATION INTERVAL TEXT}            ${TIME DURATION INTERVAL BUTTON}/span
${TIME DURATION NEW SELECTION}            //*[@aria-labelledby='genericSelect']//a[contains(@class,"dropdown-item inset")]
${TIME DURATION SELECTION HOURS}           //*[@aria-labelledby='genericSelect']//a/span[text()="${HOURS TEXT}"]
${TIME DURATION SELECTION MINUTES}         //*[@aria-labelledby='genericSelect']//a/span[text()="${MINUTES TEXT}"]

${AVAILABLE SYSTEMS LIST}             //a[@href='/systems']

${SYSTEM ADMINISTRATION LINK}         //a[@id='admin']
${SYSTEM GENERAL LINK}                //a[@id="general"]
${SYSTEM STORAGE LINK}                //a[@id='cloudStorage']
${MENU LEVEL 3 LINK}                  //a[contains(@class, "menu-level-3")]

${USER EMAIL}                         ${SYSTEM USER DETAILS}//header//h2
${USER NAME}                          ${SYSTEM USER DETAILS}//header//span[contains(@class,'user-name')]
${OWNER LABEL}                        ${SYSTEM USER DETAILS}//header//span[contains(@class,'system-owner')]/span[contains(text(),'${OWNER TEXT}')]
${OWNER NAME}                         ${OWNER LABEL}//following-sibling::span//span[contains(text(),'%OWNER_NAME%')]
${OWNER EMAIL}                        ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${EMAIL OWNER}")]

${SAVE BUTTON}                        //nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
${CANCEL BUTTON}                      //nx-cancel-button//button[contains(text(), "${CANCEL BUTTON TEXT}")]

${ENCRYPTING VIDEO WARNING}           //div[text()="${ENCRYPTING VIDEO WARNING TEXT}"]

#Disconnect from cloud portal
${DISCONNECT FORM}                      //form[@name='disconnectForm']
${DISCONNECT FORM HEADER}               ${DISCONNECT FORM}//h1["${DISCONNECT FORM HEADER TEXT}"]
${DISCONNECT FORM CLOSE BUTTON}         ${DISCONNECT FORM}//button[contains(@class, "close")]
${DISCONNECT FORM ALL USERS WILL BE DELETED}    ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM ALL USERS WILL BE DELETED TEXT}")]
${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE}    ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE TEXT}")]
${DISCONNECT FORM ENTER PASSWORD TO CONTINUE}   ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM ENTER PASSWORD TO CONTINUE TEXT}")]
${DISCONNECT PASSWORD INPUT}             ${DISCONNECT FORM}//input[@id="password"]
${DISCONNECT FORM DISCONNECT BUTTON}     ${DISCONNECT FORM}//nx-process-button/div[contains(@class, "process-button")]//button[contains(text(),"${CONTINUE BUTTON TEXT}")]/..
${DISCONNECT FORM CANCEL BUTTON}         ${DISCONNECT FORM}//button[text()='${CANCEL BUTTON TEXT}']
${DISCONNECT FORM WRONG PASSWORD}        ${DISCONNECT FORM}//div[contains(@class, "error") and contains(text(), "${WRONG PASSWORD}")]
${DISCONNECT FORM PASSWORD IS REQUIRED}  ${DISCONNECT FORM}//div[contains(@class, "error") and contains(text(), "${PASSWORD IS REQUIRED TEXT}")]
${SYSTEM IS SUCCESSFULLY DISCONNECTED}   ${SUCCESSFULLY DISCONNECTED}

# ADVANCED SETTINGS
${ADVANCED SETTINGS}                    ?advanced
${HIDE ADVANCED SETTINGS BUTTON}        //button/span[text()='${HIDE ADVANCED SETTINGS TEXT}']
${HIDE ADVANCED SETTINGS ICON}          //*[name()="svg-icon" and @data-src="/static/images/icons/standard/eye_closed.svg"]
${ADVANCED SETTINGS ALERT ICON}         //*[name()="svg-icon" and @data-src="/static/images/icons/error.svg"]
${ADVANCED SETTINGS ALERT}              //span[text()='${ADVANCED SETTINGS ALERT TEXT}']
${ADVANCED SETTINGS WARNING}            //span[text()='${ADVANCED SETTINGS WARNING TEXT}']
@{ADVANCED SETTINGS ALERT BAR}
...    ${HIDE ADVANCED SETTINGS BUTTON}
...    ${HIDE ADVANCED SETTINGS ICON}
...    ${ADVANCED SETTINGS ALERT ICON}
...    ${ADVANCED SETTINGS ALERT}
...    ${ADVANCED SETTINGS WARNING}

${SUCCESS DIALOG}                           //nx-modal-generic-content
${SUCCESS DIALOG TEXT}                      ${SUCCESS DIALOG}//p[contains(text(), "${SETTINGS SAVED TEXT}")]
${SUCCESS DIALOG HEADER}                    ${SUCCESS DIALOG}//h1/span[contains(text(), "${SUCCESS TEXT}")]
${SUCCESS DIALOG X BUTTON}                  ${SUCCESS DIALOG}//button[@data-dismiss="modal" and contains(@class, "close")]
${SUCCESS DIALOG CLOSE BUTTON}              ${SUCCESS DIALOG}//button[text()="${CLOSE TEXT}"]

${ADDITIONAL LOCAL FS TYPES INPUT}          //input[@id='additionalLocalFsTypes']
${ADDITIONAL LOCAL FS TYPES LABEL}          //div[text()='${ADDITIONAL LOCAL FS TYPES TEXT}']
${AUDIT TRAIL PERIOD DAYS INPUT}            //input[@id='auditTrailPeriodDays']
${AUDIT TRAIL PERIOD DAYS LABEL}            //div[text()="${AUDIT TRAIL PERIOD DAYS TEXT}"]
${BACKUP SETTINGS INPUT}                    //input[@id='backupSettings']
${BACKUP QUALITIES LABEL}                   //div[text()='${BACKUP QUALITIES TEXT}']
${BACKUP QUALITIES INPUT}                   //input[@id='backupQualities']
${BACKUP SETTINGS DEFAULT TEXT}             {"backupNewCameras":true,"id":"{00000000-1111-0000-0000-000000000000}","quality":"CameraBackupBoth"}
${CLIENT STATISTICS RELATIVE URL INPUT}     //input[@id='clientStatisticsSettingsUrl']
${CLIENT STATISTICS RELATIVE URL LABEL}     //div[text()='${CLIENT STATISTICS RELATIVE URL TEXT}']

${ARECONT RTSP ENABLED CHECKBOX}               	//*[@id='arecontRtspEnabled']
${ARECONT RTSP ENABLED LABEL}                   //div[text()='${ARECONT RTSP ENABLED TEXT}']
${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX}     //*[@id='autoDiscoveryResponseEnabled']
${AUTO DISCOVERY RESPONSE ENABLED LABEL}        //div[text()='${AUTO DISCOVERY RESPONSE TEXT}']
${AUTO UPDATE THUMBNAILS CHECKBOX}              //*[@id='autoUpdateThumbnails']
${AUTO UPDATE THUMBNAILS LABEL}                 //div[text()='${AUTO UPDATE THUMNAILS TEXT}']
${BACKUP NEW CAMERAS BY DEFAULT CHECKBOX}       //*[@id='backupNewCamerasByDefault']
${BACKUP NEW CAMERAS BY DEFAULT LABEL}          //div[text()='${BACKUP NEW CAMERAS BY DEFAULT TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK ONE 5.0_test}
...    ${ADDITIONAL LOCAL FS TYPES INPUT}
...    ${ADDITIONAL LOCAL FS TYPES LABEL}
...    ${AUDIT TRAIL PERIOD DAYS INPUT}
...    ${AUDIT TRAIL PERIOD DAYS LABEL}
...    ${BACKUP SETTINGS INPUT}
...    ${CLIENT STATISTICS RELATIVE URL INPUT}
...    ${CLIENT STATISTICS RELATIVE URL LABEL}
...    ${ARECONT RTSP ENABLED CHECKBOX}${visible}
...    ${ARECONT RTSP ENABLED LABEL}
...    ${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX}${visible}
...    ${AUTO DISCOVERY RESPONSE ENABLED LABEL}
...    ${AUTO UPDATE THUMBNAILS CHECKBOX}${visible}
...    ${AUTO UPDATE THUMBNAILS LABEL}

@{ADVANCED SETTING ELEMENT BLOCK ONE}
...    ${ADDITIONAL LOCAL FS TYPES INPUT}
...    ${ADDITIONAL LOCAL FS TYPES LABEL}
...    ${AUDIT TRAIL PERIOD DAYS INPUT}
...    ${AUDIT TRAIL PERIOD DAYS LABEL}
...    ${CLIENT STATISTICS RELATIVE URL INPUT}
...    ${CLIENT STATISTICS RELATIVE URL LABEL}
...    ${ARECONT RTSP ENABLED CHECKBOX}${visible}
...    ${ARECONT RTSP ENABLED LABEL}
...    ${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX}${visible}
...    ${AUTO DISCOVERY RESPONSE ENABLED LABEL}
...    ${AUTO UPDATE THUMBNAILS CHECKBOX}${visible}
...    ${AUTO UPDATE THUMBNAILS LABEL}
...    ${BACKUP NEW CAMERAS BY DEFAULT CHECKBOX}${visible}
...    ${BACKUP NEW CAMERAS BY DEFAULT LABEL}


${CLOUD CONNECT RELAYING ENABLED CHECKBOX}                //*[@id='cloudConnectRelayingEnabled']
${CLOUD CONNECT RELAYING ENABLED LABEL}                        //div[text()="${CLOUD CONNECT RELAYING TEXT}"]
${CLOUD CONNECT UDP HOLE PUNCHING ENABLED CHECKBOX}       //*[@id='cloudConnectUdpHolePunchingEnabled']
${CLOUD CONNECT UDP HOLE PUNCHING ENABLED LABEL}               //div[text()='${CLOUD CONNECT UDP HOLE PUNCHING TEXT}']
${CROSS DOMAIN ENABLED CHECKBOX}                          //*[@id='crossdomainEnabled']
${CROSS DOMAIN ENABLED LABEL}                                  //div[text()='${CROSS DOMAIN TEXT}']

${CLOUD HOST LABEL}                    //div[text()='${CLOUD HOST TEXT}']
${CLOUD HOST}                          ${CLOUD HOST LABEL}/parent::div/following-sibling::div/p
${CLOUD SYSTEM ID LABEL}               //div[text()='${CLOUD SYSTEM ID TEXT}']
${CLOUD SYSTEM ID}                     ${CLOUD SYSTEM ID LABEL}/parent::div/following-sibling::div/p

${DEFAULT EXPORT VIDEO CODEC INPUT}    //input[@id='defaultExportVideoCodec']
${DEFAULT EXPORT VIDEO CODEC LABEL}    //div[text()="${DEFAULT EXPORT VIDEO CODEC TEXT}"]
${DEFAULT VIDEO CODEC INPUT}           //input[@id='defaultVideoCodec']
${DEFAULT VIDEO CODEC LABEL}           //div[text()='${DEFAULT VIDEO CODEC TEXT}']
${DISABLED VENDORS INPUT}              //input[@id='disabledVendors']
${DISABLED VENDORS LABEL}              //div[text()='${DISABLED VENDORS TEXT}']
${DOWNLOADER PEERS INPUT}              //input[@id='downloaderPeers']
${DOWNLOADER PEERS LABEL}              //div[text()='${DOWNLOADER PEERS TEXT}']
${SYSTEM ALIVE INTERVAL INPUT}         //input[@id='ec2AliveUpdateIntervalSec']
${SYSTEM ALIVE INTERVAL LABEL}         //div[text()='${SYSTEM ALIVE UPDATE INTERVAL TEXT}']
${SYSTEM ALIVE WARNING}                //div[text()='${SYSTEM ALIVE UPDATE WARNING TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK TWO}
...    ${CLOUD CONNECT RELAYING ENABLED CHECKBOX}${visible}
...    ${CLOUD CONNECT RELAYING ENABLED LABEL}
...    ${CLOUD CONNECT UDP HOLE PUNCHING ENABLED CHECKBOX}${visible}
...    ${CLOUD CONNECT UDP HOLE PUNCHING ENABLED LABEL}
...    ${CROSS DOMAIN ENABLED CHECKBOX}${visible}
...    ${CROSS DOMAIN ENABLED LABEL}
...    ${CLOUD HOST LABEL}
...    ${CLOUD HOST}
...    ${CLOUD SYSTEM ID LABEL}
...    ${CLOUD SYSTEM ID}
...    ${DEFAULT EXPORT VIDEO CODEC INPUT}
...    ${DEFAULT EXPORT VIDEO CODEC LABEL}
...    ${DEFAULT VIDEO CODEC INPUT}
...    ${DEFAULT VIDEO CODEC LABEL}
...    ${DISABLED VENDORS INPUT}
...    ${DISABLED VENDORS LABEL}
...    ${DOWNLOADER PEERS INPUT}
...    ${DOWNLOADER PEERS LABEL}
...    ${SYSTEM ALIVE INTERVAL INPUT}
...    ${SYSTEM ALIVE INTERVAL LABEL}
...    ${SYSTEM ALIVE WARNING}


${CONNECTION KEEP ALIVE TIMEOUT INPUT}        //input[@id='ec2ConnectionKeepAliveTimeoutSec']
${CONNECTION KEEP ALIVE TIMEOUT LABEL}        //div[text()="${CONNECTION KEEP ALIVE TIMEOUT TEXT}"]
${CONNECTION KEEP ALIVE PROBE INPUT}          //input[@id='ec2KeepAliveProbeCount']
${CONNECTION KEEP ALIVE PROBE LABEL}          //div[text()="${CONNECTION KEEP ALIVE PROBES TEXT}"]
${EMAIL FROM INPUT}                           //input[@id='emailFrom']
${EMAIL FROM LABLE}                           //div[text()='${EMAIL FROM TEXT}']
${EMAIL SIGNATURE INPUT}                      //input[@id='emailSignature']
${EMAIL SIGNATURE LABEL}                      //div[text()='${EMAIL SIGNATURE TEXT}']
${SUPPORT EMAIL INPUT}                        //input[@id='emailSupportEmail']
${SUPPORT EMAIL LABEL}                        //div[text()='${SUPPORT EMAIL TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK THREE}
...    ${CONNECTION KEEP ALIVE TIMEOUT INPUT}
...    ${CONNECTION KEEP ALIVE TIMEOUT LABEL}
...    ${CONNECTION KEEP ALIVE PROBE INPUT}
...    ${CONNECTION KEEP ALIVE PROBE LABEL}
...    ${EMAIL FROM INPUT}
...    ${EMAIL FROM LABLE}
...    ${EMAIL SIGNATURE INPUT}
...    ${EMAIL SIGNATURE LABEL}
...    ${SUPPORT EMAIL INPUT}
...    ${SUPPORT EMAIL LABEL}

@{ADVANCED SETTING ELEMENT BLOCK THREE 5.0_test}
...    ${EMAIL FROM INPUT}
...    ${EMAIL FROM LABLE}
...    ${EMAIL SIGNATURE INPUT}
...    ${EMAIL SIGNATURE LABEL}
...    ${SUPPORT EMAIL INPUT}
...    ${SUPPORT EMAIL LABEL}

${ENABLE EDGE RECORDING CHECKBOX}       //*[@id='enableEdgeRecording']
${ENABLE EDGE RECORDING LABEL}               //div[text()="${ENABLE EDGE RECORDING TEXT}"]
${KEEP HANWHA PORT STATE CHECKBOX}      //*[@id='keepHanwhaIoPortStateIntactOnInitialization']
${KEEP PORT STATE CHECKBOX}      //*[@id='keepIoPortStateIntactOnInitialization']

${EVENT LOG PERIOD INPUT}                    //input[@id='eventLogPeriodDays']
${EVENT LOG PERIOD LABEL}                    //div[text()="${EVENT LOG PERIOD TEXT}"]
${FORCE LIVE CACHE INPUT}                    //input[@id='forceLiveCacheForPrimaryStream']
${FORCE LIVE CACHE LABEL}                    //div[text()='${FORCE LIVE CACHE TEXT}']
${LAST MERGE MASTERID INPUT}                 //input[@id='lastMergeMasterId']
${LAST MERGE MASTERID LABEL}                 //div[text()='${LAST MERGE MASTERID TEXT}']
${LAST MERGE SLAVEID INPUT}                  //input[@id='lastMergeSlaveId']
${LAST MERGE SLAVEID LABEL}                  //div[text()='${LAST MERGE SLAVEID TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK FOUR}
...    ${ENABLE EDGE RECORDING CHECKBOX}${visible}
...    ${ENABLE EDGE RECORDING LABEL}
...    ${KEEP HANWHA PORT STATE CHECKBOX}${visible}
...    ${EVENT LOG PERIOD INPUT}
...    ${EVENT LOG PERIOD LABEL}
...    ${FORCE LIVE CACHE INPUT}
...    ${FORCE LIVE CACHE LABEL}
...    ${LAST MERGE MASTERID INPUT}
...    ${LAST MERGE MASTERID LABEL}
...    ${LAST MERGE SLAVEID INPUT}
...    ${LAST MERGE SLAVEID LABEL}

@{ADVANCED SETTING ELEMENT BLOCK FOUR 5.0_test}
...    ${ENABLE EDGE RECORDING CHECKBOX}${visible}
...    ${ENABLE EDGE RECORDING LABEL}
...    ${KEEP PORT STATE CHECKBOX}${visible}
...    ${EVENT LOG PERIOD INPUT}
...    ${EVENT LOG PERIOD LABEL}
...    ${FORCE LIVE CACHE INPUT}
...    ${FORCE LIVE CACHE LABEL}
...    ${LAST MERGE MASTERID INPUT}
...    ${LAST MERGE MASTERID LABEL}
...    ${LAST MERGE SLAVEID INPUT}
...    ${LAST MERGE SLAVEID LABEL}


${LDAP ADMIN DN INPUT}                //input[@id='ldapAdminDn']
${LDAP ADMIN DN LABEL}                //div[text()='${LDAP ADMIN DN TEXT}']
${LDAP SEARCH BASE INPUT}             //input[@id='ldapSearchBase']
${LDAP SEARCH BASE LABEL}             //div[text()='${LDAP SEARCH BASE TEXT}']
${LDAP SEARCH FILTER INPUT}           //input[@id='ldapSearchFilter']
${LDAP SEARCH FILTER LABEL}           //div[text()='${LDAP SEARCH FILTER TEXT}']
${LDAP SEARCH TIMEOUT INPUT}          //input[@id='ldapSearchTimeoutS']
${LDAP SEARCH TIMEOUT LABEL}          //div[text()="${LDAP SEARCH TIMEOUT TEXT}"]
${LDAP URI INPUT}                     //input[@id='ldapUri']
${LDAP URI LABEL}                     //div[text()='${LDAP URI TEXT}']
${LICENSE SERVER INPUT}               //input[@id='licenseServer']
${LICENSE SERVER LABEL}               //div[text()='${LICENSE SERVER TEXT}']
${LOCAL SYSTEM ID}                    ${LOCAL SYSTEM ID LABEL}/parent::div/following-sibling::div/p
${LOCAL SYSTEM ID LABEL}              //div[text()='${LOCAL SYSTEM ID TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK FIVE}
...    ${LDAP ADMIN DN INPUT}
...    ${LDAP ADMIN DN LABEL}
...    ${LDAP SEARCH BASE INPUT}
...    ${LDAP SEARCH BASE LABEL}
...    ${LDAP SEARCH FILTER INPUT}
...    ${LDAP SEARCH FILTER LABEL}
...    ${LDAP SEARCH TIMEOUT INPUT}
...    ${LDAP SEARCH TIMEOUT LABEL}
...    ${LDAP URI INPUT}
...    ${LDAP URI LABEL}
...    ${LICENSE SERVER INPUT}
...    ${LICENSE SERVER LABEL}
...    ${LOCAL SYSTEM ID}
...    ${LOCAL SYSTEM ID LABEL}


${LOW QUALITY SCREEN VIDEO CODEC INPUT}            //input[@id='lowQualityScreenVideoCodec']
${LOW QUALITY SCREEN VIDEO CODEC LABEL}            //div[text()="${LOW QUALITY SCREEN VIDEO CODEC TEXT}"]
${MAX DIF SYNC AND INTERNET TIME INPUT}            //input[@id='maxDifferenceBetweenSynchronizedAndInternetTime']
${MAX DIF SYNC AND INTERNET TIME LABEL}            //div[text()="${MAX DIF SYNC AND INTERNET TIME TEXT}"]
${MAX DIF SYNC AND LOCAL TIME INPUT}               //input[@id='maxDifferenceBetweenSynchronizedAndLocalTimeMs']
${MAX DIF SYNC AND LOCAL TIME LABEL}               //div[text()="${MAX DIF SYNC AND LOCAL TIME TEXT}"]
${MAX EVENT LOG RECORDS INPUT}                     //input[@id='maxEventLogRecords']
${MAX EVENT LOG RECORDS LABEL}                     //div[text()="${MAX EVENT LOG RECORDS TEXT}"]

@{ADVANCED SETTING ELEMENT BLOCK SIX}
...    ${LOW QUALITY SCREEN VIDEO CODEC INPUT}
...    ${LOW QUALITY SCREEN VIDEO CODEC LABEL}
...    ${MAX DIF SYNC AND INTERNET TIME INPUT}
...    ${MAX DIF SYNC AND INTERNET TIME LABEL}
...    ${MAX DIF SYNC AND LOCAL TIME INPUT}
...    ${MAX DIF SYNC AND LOCAL TIME LABEL}
...    ${MAX EVENT LOG RECORDS INPUT}
...    ${MAX EVENT LOG RECORDS LABEL}


${MAX P2P ALL CLIENTS SIZE INPUT}                //input[@id='maxP2pAllClientsSizeBytes']
${MAX P2P ALL CLIENTS SIZE LABEL}                //div[text()='${MAX P2P ALL CLIENTS SIZE TEXT}']
${MAX P2P QUEUE SIZE INPUT}                      //input[@id='maxP2pQueueSizeBytes']
${MAX P2P QUEUE SIZE LABEL}                      //div[text()="${MAX P2P QUEUE SIZE TEXT}"]
${MAX RECORD QUEUE SIZE INPUT}                   //input[@id='maxRecordQueueSizeBytes']
${MAX RECORD QUEUE SIZE LABEL}                   //div[text()="${MAX RECORD QUEUE SIZE TEXT}"]
${MAX RECORD QUEUE ELEMENTS INPUT}               //input[@id='maxRecordQueueSizeElements']
${MAX RECORD QUEUE ELEMENTS LABEL}               //div[text()="${MAX RECORD QUEUE ELEMENTS TEXT}"]
${MAX REMOTE ARCHIVE SYNC THREADS INPUT}         //input[@id='maxRemoteArchiveSynchronizationThreads']
${MAX REMOTE ARCHIVE SYNC THREADS LABEL}         //div[text()="${MAX REMOTE ARCHIVE SYNC THREADS TEXT}"]

@{ADVANCED SETTING ELEMENT BLOCK SEVEN}
...    ${MAX P2P ALL CLIENTS SIZE INPUT}
...    ${MAX P2P ALL CLIENTS SIZE LABEL}
...    ${MAX P2P QUEUE SIZE INPUT}
...    ${MAX P2P QUEUE SIZE LABEL}
...    ${MAX RECORD QUEUE SIZE INPUT}
...    ${MAX RECORD QUEUE SIZE LABEL}
...    ${MAX RECORD QUEUE ELEMENTS INPUT}
...    ${MAX RECORD QUEUE ELEMENTS LABEL}
...    ${MAX REMOTE ARCHIVE SYNC THREADS INPUT}
...    ${MAX REMOTE ARCHIVE SYNC THREADS LABEL}

${MAX RTP RETRY COUNT INPUT}                    //input[@id='maxRtpRetryCount']
${MAX RTP RETRY COUNT LABEL}                    //div[text()='${MAX RTP RETRY COUNT TEXT}']
${MAX RTSP CONNECT DURATION INPUT}              //input[@id='maxRtspConnectDurationSeconds']
${MAX RTSP CONNECT DURATION LABEL}              //div[text()='${MAX RTSP CONNECT DURATION TEXT}']
${MAX SCENE ITEMS INPUT}                        //input[@id='maxSceneItems']
${MAX SCENE ITEMS LABEL}                        //div[text()='${MAX SCENE ITEMS TEXT}']
${MAX VIRTUAL CAM ARCHIVE SYNC THREADS INPUT}  //input[@id='maxVirtualCameraArchiveSynchronizationThreads']
${MAX VIRTUAL CAM ARCHIVE SYNC THREADS LABEL}  //div[text()='${MAX VIRTUAL CAM ARCHIVE SYNC THREADS TEXT}']
${MAX HTTP TRANSCODERS INPUT}                   //input[@id='maxHttpTranscodingSessions']
${MAX HTTP TRANSCODERS LABEL}                   //div[text()='${MAX HTTP TRANSCODERS TEXT}']
${MAX WEBM TRANSFER}                            //input[@id='maxWebMTranscoders']
${MAX WEARABLE ARCHIVE SYNC INPUT}              //input[@id='maxWearableArchiveSynchronizationThreads']
${MAX WEARABLE ARCHIVE SYNC LABEL}              //div[text()='maxWearableArchiveSynchronizationThreads']

@{ADVANCED SETTING ELEMENT BLOCK EIGHT}
...    ${MAX RTP RETRY COUNT INPUT}
...    ${MAX RTP RETRY COUNT LABEL}
...    ${MAX RTSP CONNECT DURATION INPUT}
...    ${MAX RTSP CONNECT DURATION LABEL}
...    ${MAX SCENE ITEMS INPUT}
...    ${MAX SCENE ITEMS LABEL}
#...    ${MAX VIRTUAL CAM ARCHIVE SYNC THREADS INPUT}
#...    ${MAX VIRTUAL CAM ARCHIVE SYNC THREADS LABEL}
#...    ${MAX HTTP TRANSCODERS INPUT}
#...    ${MAX HTTP TRANSCODERS LABEL}

@{ADVANCED SETTING ELEMENT BLOCK EIGHT 5.0_test}
...    ${MAX RTP RETRY COUNT INPUT}
...    ${MAX RTP RETRY COUNT LABEL}
...    ${MAX RTSP CONNECT DURATION INPUT}
...    ${MAX RTSP CONNECT DURATION LABEL}
...    ${MAX SCENE ITEMS INPUT}
...    ${MAX SCENE ITEMS LABEL}
...    ${MAX VIRTUAL CAM ARCHIVE SYNC THREADS INPUT}
...    ${MAX VIRTUAL CAM ARCHIVE SYNC THREADS LABEL}
...    ${MAX HTTP TRANSCODERS INPUT}
...    ${MAX HTTP TRANSCODERS LABEL}


${RTSP BUFFER SIZE INPUT}                       //input[@id='rtspBufferSizeKb']
${META DATA STORAGE CHANGE POLICY INPUT}        //input[@id='metadataStorageChangePolicy']
${META DATA STORAGE CHANGE POLICY LABEL}        //div[text()='${META DATA STORAGE CHANGE TEXT}']
${OS TIME CHANGE CHECK PERIOD INPUT}            //input[@id='osTimeChangeCheckPeriodMs']
${OS TIME CHANGE CHECK PERIOD LABEL}            //div[text()="${OS TIME CHANGE CHECK PERIOD TEXT}"]
${PRIMARY TIME SYNC SERVER}                     ${PRIMARY TIME SYNC SERVER LABEL}/parent::div/following-sibling::div/p
${PRIMARY TIME SYNC SERVER LABEL}               //div[text()="${PRIMARY TIME SYNC SERVER TEXT}"]
${PROXY CONNECTION TIMEOUT INPUT}               //input[@id='proxyConnectTimeoutSec']
${PROXY CONNECTION TIMEOUT LABEL}               //div[text()='${PROXY CONNECTION TIMEOUT TEXT}']
${PUSH NOTIFICATION LANGUAGE INPUT}             //input[@id='pushNotificationsLanguage']
${PUSH NOTIFICATION LANGUAGE LABEL}             //div[text()='${PUSH NOTIFICATION LANGUAGE TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK NINE}
#       Parameter is hidden on cloud due to VMS-18838
#...    ${RTSP BUFFER SIZE INPUT}
...    ${META DATA STORAGE CHANGE POLICY INPUT}
...    ${META DATA STORAGE CHANGE POLICY LABEL}
...    ${OS TIME CHANGE CHECK PERIOD INPUT}
...    ${OS TIME CHANGE CHECK PERIOD LABEL}
...    ${PRIMARY TIME SYNC SERVER}
...    ${PRIMARY TIME SYNC SERVER LABEL}
...    ${PROXY CONNECTION TIMEOUT INPUT}
...    ${PROXY CONNECTION TIMEOUT LABEL}
...    ${PUSH NOTIFICATION LANGUAGE INPUT}
...    ${PUSH NOTIFICATION LANGUAGE LABEL}


${RESOURCE FILE URI INPUT}                      //input[@id='resourceFileUri']
${RESOURCE FILE URI LABEL}                      //div[text()='${RESOURCE FILE URI TEXT}']
${RTP TIMEOUT INPUT}                            //input[@id='rtpTimeoutMs']
${RTP TIMEOUT LABEL}                            //div[text()='${RTP TIMEOUT TEXT}']
${USE SEQUENCIAL FLIR CHECKBOX}                //*[@id='sequentialFlirOnvifSearcherEnabled']
${USE SEQUENCIAL FLIR LABEL}                    //div[text()='${USE SEQUENCIAL FLIR TEXT}']
${SERVER DISCOVERY TIMEOUT INPUT}               //input[@id='serverDiscoveryPingTimeoutSec']
${SERVER DISCOVERY TIMEOUT LABEL}               //div[text()='${SERVER DISCOVERY TIMEOUT TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK TEN}
...    ${RESOURCE FILE URI INPUT}
...    ${RESOURCE FILE URI LABEL}
...    ${RTP TIMEOUT INPUT}
...    ${RTP TIMEOUT LABEL}
...    ${USE SEQUENCIAL FLIR CHECKBOX}${visible}
...    ${USE SEQUENCIAL FLIR LABEL}
#...    ${SERVER DISCOVERY TIMEOUT INPUT}
#...    ${SERVER DISCOVERY TIMEOUT LABEL}


${SMTP CONNECTION TYPE INPUT}                   //input[@id='smtpConnectionType']
${SMTP CONNECTION TYPE LABEL}                   //div[text()='${SMTP CONNECTION TYPE TEXT}']
${SMTP HOST INPUT}                              //input[@id='smtpHost']
${SMTP HOST LABEL}                              //div[text()='${SMTP HOST TEXT}']
${SMTP PORT INPUT}                              //input[@id='smtpPort']
${SMTP PORT LABEL}                              //div[text()='${SMTP PORT TEXT}']
${SMTP SIMPLE CHECKBOX}                        //*[@id='smtpSimple']
${SMTP SIMPLE LABEL}                            //div[text()='${SMTP SIMPLE TEXT}']
${SMTP TIMEOUT INPUT}                           //input[@id='smtpTimeout']
${SMTP TIMEOUT LABEL}                           //div[text()='${SMTP TIMEOUT TEXT}']
${SMTP USER INPUT}                              //input[@id='smtpUser']
${SMTP USER LABEL}                              //div[text()='${SMTP USER TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK ELEVEN}
...    ${SMTP CONNECTION TYPE INPUT}
...    ${SMTP CONNECTION TYPE LABEL}
...    ${SMTP HOST INPUT}
...    ${SMTP HOST LABEL}
...    ${SMTP PORT INPUT}
...    ${SMTP PORT LABEL}
...    ${SMTP SIMPLE CHECKBOX}${visible}
...    ${SMTP SIMPLE LABEL}
...    ${SMTP TIMEOUT INPUT}
...    ${SMTP TIMEOUT LABEL}
...    ${SMTP USER INPUT}
...    ${SMTP USER LABEL}


${SPECIFIC FEATURES INPUT}                         //input[@id='specificFeatures']
${SPECIFIC FEATURES LABEL}                         //div[text()='${SPECIFIC FEATURES TEXT}']
${SPECIFIC FEATURES DEFAULT}                       {"advanced_lens_control":1,"camera_auth_server_side_encryption":1,"get_camera_param_manifest":1,"get_time_of_servers_version":2,"layoutApiVersion":1,"mediaserver_metrics":1,"merge_history":1,"merge_systems":1,"primaryTimeServerDefinesInternetTimeSync":1,"restartMethodVersion":2,"set_camera_param_post":1,"vms_metrics":1}
${STATISTICS REPORT LAST NUMBER}                   ${STATISTICS REPORT LAST NUMBER LABEL}/parent::div/following-sibling::div/p
${STATISTICS REPORT LAST NUMBER LABEL}             //div[text()='${STATISTICS REPORT LAST NUMBER TEXT}']
${STATISTICS REPORT LAST TIME LABEL}               //div[text()='${STATISTICS REPORT LAST TIME TEXT}']
${STATISTICS REPORT LAST TIME}                     ${STATISTICS REPORT LAST TIME LABEL}/parent::div/following-sibling::div/p
${STATISTICS REPORT LAST VERSION}                  ${STATISTICS REPORT LAST VERSION LABEL}/parent::div/following-sibling::div/p
${STATISTICS REPORT LAST VERSION LABEL}            //div[text()='${STATISTICS REPORT LAST VERSION TEXT}']
${STATISTICS SERVER API INPUT}                     //input[@id='statisticsReportServerApi']
${STATISTICS SERVER API LABEL}                     //div[text()='${STATISTICS SERVER API TEXT}']
${STATISTICS REPORT INTERVAL INPUT}                //input[@id='statisticsReportTimeCycle']
${STATISTICS REPORT INTERVAL LABEL}                //div[text()='${STATISTICS REPORT INTERVAL TEXT}']
${STATISTICS REPORT UPDATE DELAY INPUT}            //input[@id='statisticsReportUpdateDelay']
${STATISTICS REPORT UPDATE DELAY LABEL}            //div[text()='${STATISTICS REPORT UPDATE DELAY TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK TWELVE}
...     ${SPECIFIC FEATURES INPUT}
...     ${SPECIFIC FEATURES LABEL}
...     ${STATISTICS REPORT LAST NUMBER}
...     ${STATISTICS REPORT LAST NUMBER LABEL}
...     ${STATISTICS REPORT LAST TIME LABEL}
...     ${STATISTICS REPORT LAST TIME}
...     ${STATISTICS REPORT LAST VERSION}
...     ${STATISTICS REPORT LAST VERSION LABEL}
...     ${STATISTICS SERVER API INPUT}
...     ${STATISTICS SERVER API LABEL}
...     ${STATISTICS REPORT INTERVAL INPUT}
...     ${STATISTICS REPORT INTERVAL LABEL}
...     ${STATISTICS REPORT UPDATE DELAY INPUT}
...     ${STATISTICS REPORT UPDATE DELAY LABEL}


${SYNC TIME EPSILON INPUT}                               //input[@id='syncTimeEpsilon']
${SYNC TIME EPSILON LABEL}                               //div[text()="${SYNC TIME EPSILON TEXT}"]
${SYNC TIME INTERVAL NETWORK INPUT}                      //input[@id='syncTimeExchangePeriod']
${SYNC TIME INTERVAL NETWORK LABEL}                      //div[text()="${SYNC TIME INTERVAL NETWORK TEXT}"]
${SYSTEM NAME INPUT}                                     //input[@id='systemName']
${SYSTEM NAME LABEL}                                     //div[text()='${SYSTEM NAME TEXT}']
${TAKE CAMERA OWNERSHIP WITHOUT LOCK CHECKBOX}           //*[@id='takeCameraOwnershipWithoutLock']
${TAKE CAMERA OWNERSHIP WITHOUT LOCK LABEL}              //div[text()='${TAKE CAMERA OWNERSHIP WITHOUT LOCK TEXT}']
${TIME SYNC ENABLED CHECKBOX}                            //*[@id='timeSynchronizationEnabled']
${TIME SYNC ENABLED LABEL}                               //div[text()="${TIME SYNC ENABLED TEXT}"]
${UPDATE NOTIFICATIONS ENABLED CHECKBOX}                 //*[@id='updateNotificationsEnabled']
${UPDATE NOTIFICATIONS ENABLED LABEL}                    //div[text()='${UPDATE NOTIFICATIONS ENABLED TEXT}']
${UPNP PORT MAPPING ENABLED CHECKBOX}                    //*[@id='upnpPortMappingEnabled']
${UPNP PORT MAPPING ENABLED LABEL}                       //div[text()='${UPNP PORT MAPPING ENABLED TEXT}']
${USE TEXT EMAIL FORMAT CHECKBOX}                        //*[@id='useTextEmailFormat']
${USE TEXT EMAIL FORMAT LABEL}                           //div[text()='${USE TEXT EMAIL FORMAT TEXT}']
${USE WINDOWS EMAIL LINE FEED CHECKBOX}                  //*[@id='useWindowsEmailLineFeed']
${USE WINDOWS EMAIL LINE FEED LABEL}                     //div[text()="${USE WINDOWS EMAIL LINE FEED}"]
${USE WINDOWS EMAIL LINE FEED LABEL HEBREW}              //div[text()='${USE WINDOWS EMAIL LINE FEED}']
${WATERMARK SETTINGS}                                    ${WATERMARK SETTINGS LABEL}/parent::div/following-sibling::div/p
${WATERMARK SETTINGS LABEL}                              //div[text()='${WATERMARK SETTINGS TEXT}']
${WEB SOCKET ENABLED CHECKBOX}                           //*[@id='webSocketEnabled']
${WEB SOCKET ENABLED LABEL}                              //div[text()='${WEB SOCKET ENABLED TEXT}']

@{ADVANCED SETTING ELEMENT BLOCK THIRTEEN}
...    ${SYNC TIME EPSILON INPUT}
...    ${SYNC TIME EPSILON LABEL}
...    ${SYNC TIME INTERVAL NETWORK INPUT}
...    ${SYNC TIME INTERVAL NETWORK LABEL}
...    ${SYSTEM NAME INPUT}
...    ${SYSTEM NAME LABEL}

@{ADVANCED SETTING ELEMENT BLOCK FOURTEEN}
...    ${TAKE CAMERA OWNERSHIP WITHOUT LOCK CHECKBOX}${visible}
...    ${TAKE CAMERA OWNERSHIP WITHOUT LOCK LABEL}

@{ADVANCED SETTING ELEMENT BLOCK FIFTEEN}
...    ${TIME SYNC ENABLED CHECKBOX}${visible}
...    ${TIME SYNC ENABLED LABEL}
...    ${UPDATE NOTIFICATIONS ENABLED CHECKBOX}${visible}
...    ${UPDATE NOTIFICATIONS ENABLED LABEL}

@{ADVANCED SETTING ELEMENT BLOCK SIXTEEN}
...    ${UPNP PORT MAPPING ENABLED CHECKBOX}${visible}
...    ${UPNP PORT MAPPING ENABLED LABEL}
...    ${USE TEXT EMAIL FORMAT CHECKBOX}${visible}
...    ${USE TEXT EMAIL FORMAT LABEL}
...    ${USE WINDOWS EMAIL LINE FEED CHECKBOX}${visible}
...    ${USE WINDOWS EMAIL LINE FEED LABEL}

@{ADVANCED SETTING ELEMENT BLOCK SIXTEEN HEBREW}
...    ${UPNP PORT MAPPING ENABLED CHECKBOX}${visible}
...    ${UPNP PORT MAPPING ENABLED LABEL}
...    ${USE TEXT EMAIL FORMAT CHECKBOX}${visible}
...    ${USE TEXT EMAIL FORMAT LABEL}
...    ${USE WINDOWS EMAIL LINE FEED CHECKBOX}${visible}
...    ${USE WINDOWS EMAIL LINE FEED LABEL HEBREW}

@{ADVANCED SETTING ELEMENT BLOCK SEVENTEEN}
...    ${WATERMARK SETTINGS}
...    ${WATERMARK SETTINGS LABEL}
...    ${WEB SOCKET ENABLED CHECKBOX}${visible}
...    ${WEB SOCKET ENABLED LABEL}

# Search
${NX SEARCH}               //nx-menu/nx-search[@layout="search"]
${SEARCH INPUT}            ${NX SEARCH}/div[contains(@class, "search")]//input[@placeholder="${SEARCH PLACEHOLDER TEXT}"]
${SEARCH ICON}             ${SEARCH INPUT}/following-sibling::span[contains(@class, "web-icon-search")]
${SEARCH CLOSE BUTTON}     ${SEARCH INPUT}/following-sibling::button[contains(@class, "search-clear")]
${SEARCH NOTHING FOUND}    ${NX SEARCH}/following-sibling::div/div[contains(@class, "nx-menu-placeholder") and contains(text(), "${NOTHING FOUND TEXT}")]
${MENU SECTION}            //nx-menu//div[contains(@class, "nx-menu-section")]
${SEARCHABLE MENU}         ${NX SEARCH}/following-sibling::div[contains(@class, "searchable")]
${SEARCH RESULT ARROW}     ${SEARCHABLE MENU}//div[contains(@class, "search-results")]

${VIEW SEARCH BOX}                //div[contains(@class, "search-box")]
${VIEW SEARCH INPUT}              ${VIEW SEARCH BOX}//input[@placeholder="Search"]
${VIEW SEARCH DETAILS TOGGLER}    //div[contains(@class, "search-box")]//div[contains(@class, "details-toggler")]
${VIEW SEARCH SERVER IP INFO}     //div[contains(@class, "server-name")]/span[contains(text(), "%SERVER NAME%")]/following-sibling::span[contains(@class, "ip-info")]
${USERS EXPAND BUTTON}            ${USERS LINK}//div[contains(@class,'search-results ng-star-inserted')]
${USERS RESULTS SUMMARY}          ${USERS LINK}//span[contains(text(),'result')]
${USERS EXPAND RESULTS}           //*[@id="level3users"]

${CAMERA NAME}    VirtualCamera
${CAMERA IP}      172.17.0.1

# Webadmin
${CLOUD BLOCK}           //nx-system-admin-component//nx-block[contains(@header-style, "extended")]//div[contains(@class, "extended-header")]//header
${CLOUD NAME}            ${CLOUD BLOCK}//div//h2[contains(text(), "${PRODUCT NAME}")]
${CONNECTION STATUS}     ${CLOUD BLOCK}//nx-tag/a[contains(@class, "badge")]
${CLOUD LINK}            ${CLOUD BLOCK}//a[@href="${ENV}"]
${CONNECT TO CLOUD BUTTON}    //button/span[contains(text(), "${CONNECT TO CLOUD TEXT}")]/..

# Webadmin - connect to cloud form
${CONNECT TO CLOUD MODAL}             //cloud-connect-modal-content
${CONNECT TO CLOUD FORM}              ${CONNECT TO CLOUD MODAL}/form[@name="connectForm"]
${CONNECT TO CLOUD MODAL HEADER}      ${CONNECT TO CLOUD FORM}/div[contains(@class, "modal-header")]
${CONNECT TO CLOUD HEADER}            ${CONNECT TO CLOUD MODAL HEADER}/h1[contains(text(), "${CONNECT SYSTEM TO CLOUD TEXT}")]
${CONNECT TO CLOUD X BUTTON}          ${CONNECT TO CLOUD MODAL HEADER}//button/div[contains(@class, "close-content")]/span[contains(@class, "close-icon")]/../..
${CONNECT TO CLOUD MODAL BODY}        ${CONNECT TO CLOUD FORM}/div[contains(@class, "modal-body")]
${CONNECT TO CLOUD MESSAGE}           ${CONNECT TO CLOUD MODAL BODY}/p
${CONNECT TO CLOUD EMAIL INPUT}       ${CONNECT TO CLOUD MODAL BODY}//label[@for="login_email" and text()="Email"]/following-sibling::input[@id="login_email" and @name="login_email"]
${CONNECT TO CLOUD EMAIL ERROR}       ${CONNECT TO CLOUD EMAIL INPUT}/..//div[contains(@class, "input-error") and contains(text(), "%ERROR TEXT%")]
${CONNECT TO CLOUD PASSWORD INPUT}    ${CONNECT TO CLOUD MODAL BODY}//label[@for="login_password" and text()="Password"]/following-sibling::input[@id="login_password" and @name="login_password"]
${CONNECT TO CLOUD PASSWORD ERROR}    ${CONNECT TO CLOUD PASSWORD INPUT}/following-sibling::div[contains(@class, "input-error") and contains(text(), "%ERROR TEXT%") ]
${CONNECT TO CLOUD FORGOT PASSWORD LINK}    ${CONNECT TO CLOUD FORM}//a[contains(@href, "${ENV}/restore_password")]
${CONNECT TO CLOUD CREATE ACCOUNT LINK}     ${CONNECT TO CLOUD FORM}//a[contains(@href, "${ENV}/register")]
${CONNECT TO CLOUD MODAL FOOTER}      ${CONNECT TO CLOUD FORM}/div[contains(@class, "modal-footer")]
${CONNECT TO CLOUD OK BUTTON}         ${CONNECT TO CLOUD MODAL FOOTER}//nx-process-button//button[contains(text(), "${OK TEXT}")]
${CONNECT TO CLOUD CANCEL BUTTON}     ${CONNECT TO CLOUD MODAL FOOTER}//nx-cancel-button//button[contains(text(), "${CANCEL BUTTON TEXT}")]
${COMMON CLOSE BUTTON}                //div[contains(@class, "close-content")]/span[contains(@class, "close-icon")]/../..
