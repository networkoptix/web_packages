*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    advanced_settings    cloud    webadmin

*** Test Cases ***
1. Advanced system settings availability
    [Tags]    C76633    advanced settings
    Log    Step 1, 2 - advanced block is available for admins
    FOR    ${user}    IN    ${system}[owner]    ${system}[cloud users][cloudAdmin]
        Log in to system    ${system}    ${user}
        Show Advanced Settings
        Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}    timeout=60
        Log Out
    END

    Log    Step 3 - advanced block is not available for other users
    FOR    ${user}    IN    ${system}[cloud users][viewer]    ${system}[cloud users][advancedViewer]    ${system}[cloud users][liveViewer]    ${system}[cloud users][custom]
        Log in to system    ${system}    ${user}
        Show Advanced Settings
        Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    timeout=50
        Elements Should Not Be Visible    @{ADVANCED SETTINGS ALERT BAR}    timeout=50
        Log Out
    END

2. Advanced system settings for offline system
    [Tags]    C76634
    Remove Tags    webadmin
    Skip If Irrelevant
    Stop Docker Server    ${system}[id]
    Log in to user and system    ${system}[owner]    ${system}[cloud id]${ADVANCED SETTINGS}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    IF    '${IMAGE}'=='5.0'
        Elements Should Not Be Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE ${IMAGE}}
    ELSE
        Elements Should Not Be Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}
    END

    Log    Get System back online and check advanced settings
    Start Docker Server    ${system}[id]
    Sleep    4
    Reload Page
    Wait Until Advanced Settings Are Visible    ONE    timeout=180

3. Hide Advanced Settings button functionality
    [Tags]    C76635    
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    ONE
    Click Element    ${HIDE ADVANCED SETTINGS BUTTON}
    IF    '${IMAGE}'=='5.0'
        Wait Until Elements Are Not Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE ${IMAGE}}
    ELSE
        Wait Until Elements Are Not Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}
    END
    IF    '${mode}' == 'cloud'
        Go To    ${ENV}/systems/${system}[cloud id]${ADVANCED SETTINGS}
    ELSE
        ${location}=   Get Location
        Go to    ${location}${ADVANCED SETTINGS}
    END
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    ONE

4. Audit trail, backup and statistics section
    [Tags]    C78244
    Log    Preconditions
    ${settings}=   Create Dictionary
        ...    additionalLocalFsTypes=${EMPTY}
        ...    arecontRtspEnabled=false
        ...    auditTrailPeriodDays=183
        ...    autoDiscoveryResponseEnabled=${true}
        ...    autoUpdateThumbnails=${true}
        ...    backupSettings=${BACKUP SETTINGS DEFAULT TEXT}
        ...    clientStatisticsSettingsUrl=${EMPTY}
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    ONE    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${ADDITIONAL LOCAL FS TYPES INPUT}    additionalLocalFsTypes    test Settings changed

    Log    Step 2
    Changing setting changes it on server    ${ARECONT RTSP ENABLED CHECKBOX}     arecontRtspEnabled    advanced=${True}

    Log    Step 3
    Changing input setting changes it on server    ${AUDIT TRAIL PERIOD DAYS INPUT}    auditTrailPeriodDays    150
    
    Log    Step 4
    Changing setting changes it on server    ${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX}     autoDiscoveryResponseEnabled    advanced=${True}
    
    Log    Step 5
    Changing setting changes it on server    ${AUTO UPDATE THUMBNAILS CHECKBOX}     autoUpdateThumbnails    advanced=${True}
    
    Log    Step 6

    IF    '${IMAGE}'=='5.0'
        Changing input setting changes it on server    ${BACKUP SETTINGS INPUT}    backupSettings    {"backupNewCameras":true,"id":"{00000000-2222-0000-0000-000000000000}","quality":"CameraBackupBoth"}
    ELSE
        Changing setting changes it on server    ${BACKUP NEW CAMERAS BY DEFAULT CHECKBOX}     backupNewCamerasByDefault    advanced=${True}
        Log    Step 7
        Changing input setting changes it on server    ${BACKUP QUALITIES INPUT}    backupQualities    CameraBackupHighQuality
    END

    Log    Step 8
    Changing input setting changes it on server    ${CLIENT STATISTICS RELATIVE URL INPUT}    clientStatisticsSettingsUrl    https://www.google.com

5. Cloud connect and video codec
    [Tags]    C78259
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    cloudConnectRelayingEnabled=true
       ...    cloudConnectUdpHolePunchingEnabled=true
       ...    crossdomainEnabled=false
       ...    defaultExportVideoCodec=mpeg4
       ...    defaultVideoCodec=h263p
       ...    disabledVendors=${EMPTY}
       ...    downloaderPeers={}
       ...    ec2AliveUpdateIntervalSec=60
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    TWO    timeout=70

    ${host} =    Get Text    ${CLOUD HOST}
    Should Contain    ${ENV}    ${host}
    ${sys id} =    Get Text   ${CLOUD SYSTEM ID}
    Should Be Equal As Strings    ${system}[cloud id]    ${sys id}
    
    Log    Step 1
    Changing setting changes it on server    ${CLOUD CONNECT RELAYING ENABLED CHECKBOX}    cloudConnectRelayingEnabled    advanced=True
    
    Log    Step 2
    Changing setting changes it on server    ${CLOUD CONNECT UDP HOLE PUNCHING ENABLED CHECKBOX}     cloudConnectUdpHolePunchingEnabled    advanced=True

    Log    Step 3
    Changing setting changes it on server    ${CROSS DOMAIN ENABLED CHECKBOX}    crossdomainEnabled    advanced=True
    
    Log    Step 4
    Changing input setting changes it on server    ${DEFAULT EXPORT VIDEO CODEC INPUT}    defaultExportVideoCodec    mpeg2
    
    Log    Step 5
    Changing input setting changes it on server    ${DEFAULT VIDEO CODEC INPUT}    defaultVideoCodec    h265p
    
    Log    Step 6
    Changing input setting changes it on server    ${DISABLED VENDORS INPUT}    disabledVendors    Axis
    
    Log    Step 7
    Changing input setting changes it on server    ${DOWNLOADER PEERS INPUT}    downloaderPeers    {"abc":["{07a976b5-e61e-4c75-b785-e120d54a3c01}"]}
    
    Log    Step 8
    Changing input setting changes it on server    ${SYSTEM ALIVE INTERVAL INPUT}    ec2AliveUpdateIntervalSec    75
    
6. Connection and email
    [Tags]    C78260
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    cloudConnectRelayingEnabled=true
       ...    cloudConnectUdpHolePunchingEnabled=true
       ...    crossdomainEnabled=false
       ...    defaultExportVideoCodec=mpeg4
       ...    defaultVideoCodec=h263p
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}

    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings

    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    THREE    timeout=60

    Log    Step 1
    IF    '${IMAGE}' != '5.0'
        Changing input setting changes it on server    ${CONNECTION KEEP ALIVE TIMEOUT INPUT}     ec2ConnectionKeepAliveTimeoutSec    7
    END

    Log    Step 2
    IF    '${IMAGE}' != '5.0'
        Changing input setting changes it on server    ${CONNECTION KEEP ALIVE PROBE INPUT}    ec2KeepAliveProbeCount    0
    END
    
    Log    Step 3
    Changing input setting changes it on server    ${EMAIL FROM INPUT}     emailFrom    networkoptixtesting123@gmail.com
    
    Log    Step 4
    Changing input setting changes it on server    ${EMAIL SIGNATURE INPUT}    emailSignature    Testing
    
    Log    Step 5
    Changing input setting changes it on server    ${SUPPORT EMAIL INPUT}    emailSupportEmail    http://support.networkoptix.testing.com

7. Recording and log
    [Tags]    C78262
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    enableEdgeRecording=true
       ...    eventLogPeriodDays=30
       ...    forceLiveCacheForPrimaryStream=auto
       ...    keepHanwhaIoPortStateIntactOnInitialization=false
       ...    lastMergeMasterId=${EMPTY}
       ...    lastMergeSlaveId=${EMPTY}
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    FOUR    timeout=60

    Log    Step 1
    Changing setting changes it on server    ${ENABLE EDGE RECORDING CHECKBOX}    enableEdgeRecording    advanced=True
    
    Log    Step 2
    Changing input setting changes it on server    ${EVENT LOG PERIOD INPUT}    eventLogPeriodDays    25

    Log    Step 3
    Changing input setting changes it on server    ${FORCE LIVE CACHE INPUT}    forceLiveCacheForPrimaryStream    Yes

    Log    Step 4
    IF    '${IMAGE}' == '5.0'
        Changing setting changes it on server    ${KEEP PORT STATE CHECKBOX}    keepIoPortStateIntactOnInitialization    advanced=True
    ELSE
        Changing setting changes it on server    ${KEEP HANWHA PORT STATE CHECKBOX}    keepHanwhaIoPortStateIntactOnInitialization    advanced=True
    END

    Log    Step 5
    Changing input setting changes it on server    ${LAST MERGE MASTERID INPUT}    lastMergeMasterId    masterId

    Log    Step 6
    Changing input setting changes it on server    ${LAST MERGE SLAVEID INPUT}    lastMergeSlaveId    slaveId

8. LDAP and license server
    [Tags]    C78263
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    ldapAdminDn=${EMPTY}
       ...    ldapSearchBase=${EMPTY}
       ...    ldapSearchFilter=${EMPTY}
       ...    ldapSearchTimeoutS=30
       ...    ldapUri=${EMPTY}
       ...    licenseServer=https://licensing.vmsproxy.com
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    FIVE    timeout=60

    Log    Step 1
    Changing input setting changes it on server    ${LDAP ADMIN DN INPUT}    ldapAdminDn    admin

    Log    Step 2
    Changing input setting changes it on server    ${LDAP SEARCH BASE INPUT}    ldapSearchBase    search

    Log    Step 3
    Changing input setting changes it on server    ${LDAP SEARCH FILTER INPUT}    ldapSearchFilter    search_filter

    Log    Step 4
    Changing input setting changes it on server    ${LDAP SEARCH TIMEOUT INPUT}    ldapSearchTimeoutS    25

    Log    Step 5
    Changing input setting changes it on server    ${LDAP URI INPUT}    ldapUri    Uri

    Log    Step 6
    Changing input setting changes it on server    ${LICENSE SERVER INPUT}    licenseServer    https://licensing.vmsproxy.testing.com

9. Screen quality, time settings and event log
    [Tags]    C78264
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    lowQualityScreenVideoCodec=mpeg2video
       ...    maxDifferenceBetweenSynchronizedAndInternetTime=2000
       ...    maxDifferenceBetweenSynchronizedAndLocalTimeMs=5000
       ...    maxEventLogRecords=100000
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}

    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    SIX    timeout=60

    Log    Step 1
    Changing input setting changes it on server    ${LOW QUALITY SCREEN VIDEO CODEC INPUT}    lowQualityScreenVideoCodec    mpeg4video

    Log    Step 2
    Changing input setting changes it on server    ${MAX DIF SYNC AND INTERNET TIME INPUT}    maxDifferenceBetweenSynchronizedAndInternetTime    1000

    Log    Step 3
    Changing input setting changes it on server    ${MAX DIF SYNC AND LOCAL TIME INPUT}    maxDifferenceBetweenSynchronizedAndLocalTimeMs    4000

    Log    Step 4
    Changing input setting changes it on server    ${MAX EVENT LOG RECORDS INPUT}    maxEventLogRecords    90000

10. Max P2P, record queue size, and remote archive
    [Tags]    C78265
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    maxP2pAllClientsSizeBytes=1073741824
       ...    maxP2pQueueSizeBytes=52428800
       ...    maxRecordQueueSizeBytes=25165824
       ...    maxRecordQueueSizeElements=1000
       ...    maxRemoteArchiveSynchronizationThreads=-1
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    SEVEN    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${MAX P2P ALL CLIENTS SIZE INPUT}    maxP2pAllClientsSizeBytes    1073741823

    Log    Step 2
    Changing input setting changes it on server    ${MAX P2P QUEUE SIZE INPUT}    maxP2pQueueSizeBytes    62428800

    Log    Step 3
    Changing input setting changes it on server    ${MAX RECORD QUEUE SIZE INPUT}    maxRecordQueueSizeBytes    25165850

    Log    Step 4
    Changing input setting changes it on server    ${MAX RECORD QUEUE ELEMENTS INPUT}    maxRecordQueueSizeElements    1111

    Log    Step 5
    Changing input setting changes it on server    ${MAX REMOTE ARCHIVE SYNC THREADS INPUT}    maxRemoteArchiveSynchronizationThreads    1

11. RTP, Rtsp, scene items, archive sync, HTTP
    [Tags]    C78379
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    maxRtpRetryCount=6
       ...    maxRtspConnectDurationSeconds=0
       ...    maxSceneItems=0
       ...    maxVirtualCameraArchiveSynchronizationThreads=-1
       ...    maxHttpTranscodingSessions=2
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    EIGHT    timeout=60

    Log    Step 1
    Changing input setting changes it on server    ${MAX RTP RETRY COUNT INPUT}    maxRtpRetryCount    5

    Log    Step 2
    Changing input setting changes it on server    ${MAX RTSP CONNECT DURATION INPUT}    maxRtspConnectDurationSeconds    1

    Log    Step 3
    Changing input setting changes it on server    ${MAX SCENE ITEMS INPUT}    maxSceneItems    1

    Log    Step 4
    IF    '${IMAGE}'=='5.0'
        Changing input setting changes it on server    ${MAX VIRTUAL CAM ARCHIVE SYNC THREADS INPUT}    maxVirtualCameraArchiveSynchronizationThreads    1
        Log    Step 5
        Changing input setting changes it on server    ${MAX HTTP TRANSCODERS INPUT}    maxHttpTranscodingSessions    1
    ELSE
        Changing input setting changes it on server    ${MAX WEARABLE ARCHIVE SYNC INPUT}    maxWearableArchiveSynchronizationThreads    1
        Log    Step 5
        Changing input setting changes it on server    ${MAX WEBM TRANSFER}    maxWebMTranscoders    1
    END

12. Meta data storage, OS time change, proxy connection timeout, push notification language
    [Tags]    C78380
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    rtspBufferSizeKb=64
       ...    metadataStorageChangePolicy=keep
       ...    osTimeChangeCheckPeriodMs=1000
       ...    proxyConnectTimeoutSec=5
       ...    pushNotificationsLanguage=${EMPTY}
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    NINE    timeout=60

#    Parameter is hidden on cloud due to VMS-18838
#    Log    Step added
#    Changing input setting changes it on server    ${RTSP BUFFER SIZE INPUT}    rtspBufferSizeKb    128

    Log    Step 1
    Changing input setting changes it on server    ${META DATA STORAGE CHANGE POLICY INPUT}    metadataStorageChangePolicy    move

    Log    Step 2
    Changing input setting changes it on server    ${OS TIME CHANGE CHECK PERIOD INPUT}    osTimeChangeCheckPeriodMs    1998

    Log    Step 3
    Changing input setting changes it on server    ${PROXY CONNECTION TIMEOUT INPUT}    proxyConnectTimeoutSec    6

    Log    Step 4
    Changing input setting changes it on server    ${PUSH NOTIFICATION LANGUAGE INPUT}    pushNotificationsLanguage    Russian

13. File URI, RTP timeout, rtsp buffer, Flir Onvif
    [Tags]    C78385
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    resourceFileUri=http://resources.vmsproxy.com/resource_data.json
       ...    rtpTimeoutMs=10000
       ...    sequentialFlirOnvifSearcherEnabled=false
       ...    serverDiscoveryPingTimeoutSec=60
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings

    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    TEN    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${RESOURCE FILE URI INPUT}    resourceFileUri    http://resources.vmsproxy.com/resource_data_TESTING.json

    Log    Step 2
    Changing input setting changes it on server    ${RTP TIMEOUT INPUT}     rtpTimeoutMs    20000

    Log    Step 3
    Changing setting changes it on server    ${USE SEQUENCIAL FLIR CHECKBOX}    sequentialFlirOnvifSearcherEnabled    advanced=True

14. Server discovery timeout
    [Tags]    C78386
    # Skipped in 5.0 as it's not an option
    Skip If    '${IMAGE}'=='5.0'
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    serverDiscoveryPingTimeoutSec=60
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings

    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    TEN    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${SERVER DISCOVERY TIMEOUT INPUT}    serverDiscoveryPingTimeoutSec    50

15. SMTP settings
    [Tags]    C78387
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    smtpConnectionType=Unsecure
       ...    smtpHost=${EMPTY}
       ...    smtpPort=0
       ...    smtpSimple=true
       ...    smtpTimeout=300
       ...    smtpUser=${EMPTY}
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    ELEVEN    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${SMTP CONNECTION TYPE INPUT}    smtpConnectionType    Ssl

    Log    Step 2
    Changing input setting changes it on server    ${SMTP HOST INPUT}    smtpHost    smtp.gmail.com

    Log    Step 3
    Changing input setting changes it on server    ${SMTP PORT INPUT}    smtpPort    465

    Log    Step 4
    Changing setting changes it on server    ${SMTP SIMPLE CHECKBOX}     smtpSimple    advanced=True

    Log    Step 5
    Changing input setting changes it on server    ${SMTP TIMEOUT INPUT}    smtpTimeout    200

    Log    Step 6
    Changing input setting changes it on server    ${SMTP USER INPUT}    smtpUser    networkoptixtesting123

16. Specific features, statistics report
    [Tags]    C78388
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    specificFeatures=${SPECIFIC FEATURES DEFAULT}
       ...    statisticsReportLastTime=2021-01-21T20:07:05Z
       ...    statisticsReportLastVersion=4.1.0.32212-7259e0f382b5-default-patch
       ...    statisticsReportServerApi=${EMPTY}
       ...    statisticsReportTimeCycle=${EMPTY}
       ...    statisticsReportUpdateDelay=${EMPTY}

    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings

    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    TWELVE    timeout=70

    Log    Step 1
    Changing input setting changes it on server    ${SPECIFIC FEATURES INPUT}    specificFeatures    {"mediaserver_metrics":2}

    Log    Step 2
    Data on page matches server    ${STATISTICS REPORT LAST NUMBER}    statisticsReportLastNumber 
    
    Log    Step 3
    Data on page matches server    ${STATISTICS REPORT LAST TIME}    statisticsReportLastTime
    
    Log    Step 4
    Data on page matches server    ${STATISTICS REPORT LAST VERSION}    statisticsReportLastVersion

    Log    Step 4
    Changing input setting changes it on server    ${STATISTICS SERVER API INPUT}    statisticsReportServerApi    http://stats.networkoptix.com

    Log    Step 5
    Changing input setting changes it on server    ${STATISTICS REPORT INTERVAL INPUT}    statisticsReportTimeCycle    86400

    Log    Step 6
    Changing input setting changes it on server    ${STATISTICS REPORT UPDATE DELAY INPUT}    statisticsReportUpdateDelay    86400

17. Sync time epsilon, sync time exchange period, system name
    [Tags]    C78393
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    syncTimeEpsilon=200
       ...    syncTimeExchangePeriod=600000
       ...    systemName=Advanced Settings

    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    THIRTEEN    timeout=60

    Log    Step 1
    Changing input setting changes it on server    ${SYNC TIME EPSILON INPUT}    syncTimeEpsilon    100

    Log    Step 2
    Changing input setting changes it on server    ${SYNC TIME INTERVAL NETWORK INPUT}    syncTimeExchangePeriod    500000

    Log    Step 3
    Changing input setting changes it on server    ${SYSTEM NAME INPUT}    systemName    Advanced Settings changed

18. Camera ownership, update information
    [Tags]    C78398
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    takeCameraOwnershipWithoutLock=true

    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    FOURTEEN    timeout=60

    Log    Step 1
    Changing setting changes it on server    ${TAKE CAMERA OWNERSHIP WITHOUT LOCK CHECKBOX}    takeCameraOwnershipWithoutLock    advanced=True

19. Time synchronization, update notifications
    [Tags]    C78399
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    timeSynchronizationEnabled=true
       ...    updateNotificationsEnabled=true
    
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Wait Until Advanced Settings Are Visible    FIFTEEN    timeout=60

    Log    Step 1
    Changing setting changes it on server    ${TIME SYNC ENABLED CHECKBOX}     timeSynchronizationEnabled    advanced=True

    Log    Step 2
    Changing setting changes it on server    ${UPDATE NOTIFICATIONS ENABLED CHECKBOX}      updateNotificationsEnabled    advanced=True

20. UPNP port mapping, plain-text emails, Windows line feed
    [Tags]    C78401
    Log    Preconditions
    ${settings}=   Create Dictionary
       ...    upnpPortMappingEnabled=true
       ...    useTextEmailFormat=false
       ...    useWindowsEmailLineFeed=false
    
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    IF    "${LANGUAGE}"=="he_IL"
        Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    SIXTEEN HEBREW    timeout=60
    ELSE
        Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    SIXTEEN    timeout=60
    END

    Log    Step 1
    Changing setting changes it on server    ${UPNP PORT MAPPING ENABLED CHECKBOX}      upnpPortMappingEnabled    advanced=True

    Log    Step 2
    Changing setting changes it on server    ${USE TEXT EMAIL FORMAT CHECKBOX}      useTextEmailFormat    advanced=True

    Log    Step 3
    Changing setting changes it on server    ${USE WINDOWS EMAIL LINE FEED CHECKBOX}      useWindowsEmailLineFeed    advanced=True

21. Video traffic encryption, watermark settings, web sockets
    [Tags]    C78402
    Log    Preconditions
    ${settings}=   Create Dictionary
        ...    webSocketEnabled=true
    
    Set System Settings    ${system}[local auth]    ${server url}    ${settings}
    Log in to system    ${system}    ${system}[owner]
    Show Advanced Settings
    Run keyword and continue on failure    Wait Until Advanced Settings Are Visible    SEVENTEEN    timeout=60

    Log    Step 1
    Changing setting changes it on server    ${WEB SOCKET ENABLED CHECKBOX}      webSocketEnabled    advanced=True