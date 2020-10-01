*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{cloud auth}    ${EMAIL OWNER}    ${BASE PASSWORD}
${url}         ${ENV}
@{checkboxes}
...    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
...    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
...    ${ENABLE AUDIT TRAIL CHECKBOX REAL}
...    ${ALLOW ONLY SECURE CHECKBOX REAL}
...    ${LIMIT SESSION DURATION CHECKBOX REAL}

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
    FOR    ${user email}   ${user role}    IN ZIP   ${AUTO TESTS USERS.keys()}     ${AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${cloud system id}    ${user role}    ${user email}
    END
    Open Browser and go to URL    ${url}
    
*** Test Cases ***
Advanced system settings availability
    [Tags]    C76633    advanced settings    threaded
    Log    Step 1
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Log    Step 2
    Log Out
    Log in to Advanced Settings System    ${EMAIL ADMIN}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Log    Step 3
    Log Out
    Log in to Advanced Settings System    ${EMAIL ADV VIEWER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Sleep    2
    Elements Should Not Be Visible    @{ADVANCED SETTINGS ALERT BAR}
    
Advanced system settings for offline system
    [Tags]    C76634    advanced settings    threaded
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Page Should Contain Element    ${SYSTEM NAME OFFLINE}
    Elements Should Not Be Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}
    
Hide Advanced Settings button functionality
    [Tags]    C76635    advanced settings    threaded
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Click Element    ${HIDE ADVANCED SETTINGS BUTTON}
    Wait Until Elements Are Not Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}

Audit trail, backup and statistics section 
    [Tags]    C78244    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    additionalLocalFsTypes    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    arecontRtspEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    auditTrailPeriodDays    183    ${ADVANCED SYS IP}
    Set System Settings via API    autoDiscoveryResponseEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    autoUpdateThumbnails    true    ${ADVANCED SYS IP}
    Set System Settings via API    backupNewCamerasByDefault    false    ${ADVANCED SYS IP}
    Set System Settings via API    backupQualities    ${BACKUP QUALITIES DEFAULT TEXT}    ${ADVANCED SYS IP}
    Set System Settings via API    clientStatisticsSettingsUrl    ${EMPTY}    ${ADVANCED SYS IP}        
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK ONE}
    
    Log    Step 1
    Input on page matches server    ${ADDITIONAL LOCAL FS TYPES INPUT}    additionalLocalFsTypes        
    Change Input for Advanced Setting    ${ADDITIONAL LOCAL FS TYPES INPUT}    test
    Input on page matches server    ${ADDITIONAL LOCAL FS TYPES INPUT}    additionalLocalFsTypes  
    
    Log    Step 2   
    Setting on page matches server    ${ARECONT RTSP ENABLED CHECKBOX VISIBLE}     arecontRtspEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${ARECONT RTSP ENABLED CHECKBOX REAL}     arecontRtspEnabled    ${ADVANCED SYS IP}
    
    Log    Step 4
    Input on page matches server    ${AUDIT TRAIL PERIOD DAYS INPUT}    auditTrailPeriodDays  
    Change Input for Advanced Setting    ${AUDIT TRAIL PERIOD DAYS INPUT}    150
    Input on page matches server    ${AUDIT TRAIL PERIOD DAYS INPUT}    auditTrailPeriodDays   
    
    Log    Step 6    
    Setting on page matches server    ${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX VISIBLE}     autoDiscoveryResponseEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${AUTO DISCOVERY RESPONSE ENABLED CHECKBOX REAL}     autoDiscoveryResponseEnabled    ${ADVANCED SYS IP}
    
    Log    Step 7    
    Setting on page matches server    ${AUTO UPDATE THUMBNAILS CHECKBOX VISIBLE}     autoUpdateThumbnails    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${AUTO UPDATE THUMBNAILS CHECKBOX REAL}     autoUpdateThumbnails    ${ADVANCED SYS IP}
    
    Log    Step 8    
    Setting on page matches server    ${BACKUP NEW CAMERAS BY DEFAULT CHECKBOX VISIBLE}     backupNewCamerasByDefault    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${BACKUP NEW CAMERAS BY DEFAULT CHECKBOX REAL}     backupNewCamerasByDefault    ${ADVANCED SYS IP}
    
    Log    Step 9
    Input on page matches server    ${BACKUP QUALITIES INPUT}   backupQualities
    Change Input for Advanced Setting    ${BACKUP QUALITIES INPUT}    CameraBackupHighQuality}
    Input on page matches server    ${BACKUP QUALITIES INPUT}    backupQualities
    
    Log    Step 11
    Input on page matches server    ${CLIENT STATISTICS RELATIVE URL INPUT}   clientStatisticsSettingsUrl
    Change Input for Advanced Setting    ${CLIENT STATISTICS RELATIVE URL INPUT}    https://www.google.com
    Input on page matches server    ${CLIENT STATISTICS RELATIVE URL INPUT}    clientStatisticsSettingsUrl
    
    Log    Step 12 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    additionalLocalFsTypes    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    arecontRtspEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    auditTrailPeriodDays    183    ${ADVANCED SYS IP}
    Set System Settings via API    autoDiscoveryResponseEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    autoUpdateThumbnails    true    ${ADVANCED SYS IP}
    Set System Settings via API    backupNewCamerasByDefault    false    ${ADVANCED SYS IP}
    Set System Settings via API    backupQualities    ${BACKUP QUALITIES DEFAULT TEXT}    ${ADVANCED SYS IP}
    Set System Settings via API    clientStatisticsSettingsUrl    ${EMPTY}    ${ADVANCED SYS IP}
    
Cloud connect and video codec
    [Tags]    C78259    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    cloudConnectRelayingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    cloudConnectUdpHolePunchingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    crossdomainEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    defaultExportVideoCodec    mpeg4    ${ADVANCED SYS IP}
    Set System Settings via API    defaultVideoCodec    h263p    ${ADVANCED SYS IP}
    Set System Settings via API    disabledVendors    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    downloaderPeers    {}    ${ADVANCED SYS IP}
    Set System Settings via API    ec2AliveUpdateIntervalSec    60    ${ADVANCED SYS IP}        
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK TWO}
    ${host} =    Get Text    ${CLOUD HOST}
    Should Contain    ${url}    ${host}
    ${sys id} =    Get Text   ${CLOUD SYSTEM ID}
    Should Be Equal As Strings    ${ADVANCED SETTINGS SYSTEM ID}    ${sys id}
    
    Log    Step 1
    Setting on page matches server    ${CLOUD CONNECT RELAYING ENABLED CHECKBOX VISIBLE}     cloudConnectRelayingEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${CLOUD CONNECT RELAYING ENABLED CHECKBOX REAL}    cloudConnectRelayingEnabled    ${ADVANCED SYS IP}
    
    Log    Step 2
    Setting on page matches server    ${CLOUD CONNECT UDP HOLE PUNCHING ENABLED CHECKBOX VISIBLE}     cloudConnectUdpHolePunchingEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${CLOUD CONNECT UDP HOLE PUNCHING ENABLED CHECKBOX REAL}     cloudConnectUdpHolePunchingEnabled    ${ADVANCED SYS IP}    

    Log    Step 3
    Setting on page matches server    ${CROSS DOMAIN ENABLED CHECKBOX VISIBLE}      crossdomainEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${CROSS DOMAIN ENABLED CHECKBOX REAL}    crossdomainEnabled    ${ADVANCED SYS IP}
    
    Log    Step 4
    Input on page matches server    ${DEFAULT EXPORT VIDEO CODEC INPUT}   defaultExportVideoCodec
    Change Input for Advanced Setting    ${DEFAULT EXPORT VIDEO CODEC INPUT}    mpeg2
    Input on page matches server    ${DEFAULT EXPORT VIDEO CODEC INPUT}    defaultExportVideoCodec
    
    Log    Step 5
    Input on page matches server    ${DEFAULT VIDEO CODEC INPUT}   defaultVideoCodec
    Change Input for Advanced Setting    ${DEFAULT VIDEO CODEC INPUT}    h265p
    Input on page matches server    ${DEFAULT VIDEO CODEC INPUT}    defaultVideoCodec
    
    Log    Step 6
    Input on page matches server    ${DISABLED VENDORS INPUT}   disabledVendors
    Change Input for Advanced Setting    ${DISABLED VENDORS INPUT}    Axis
    Input on page matches server    ${DISABLED VENDORS INPUT}    disabledVendors
    
    Log    Step 7
    Input on page matches server    ${DOWNLOADER PEERS INPUT}   downloaderPeers
    Change Input for Advanced Setting    ${DOWNLOADER PEERS INPUT}    1000
    Input on page matches server    ${DOWNLOADER PEERS INPUT}    downloaderPeers
    
    Log    Step 8
    Input on page matches server    ${SYSTEM ALIVE INTERVAL INPUT}   ec2AliveUpdateIntervalSec
    Change Input for Advanced Setting    ${SYSTEM ALIVE INTERVAL INPUT}    75
    Input on page matches server    ${SYSTEM ALIVE INTERVAL INPUT}    ec2AliveUpdateIntervalSec
    
    Log    Step 9 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    cloudConnectRelayingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    cloudConnectUdpHolePunchingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    crossdomainEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    defaultExportVideoCodec    mpeg4    ${ADVANCED SYS IP}
    Set System Settings via API    defaultVideoCodec    h263p    ${ADVANCED SYS IP}
    Set System Settings via API    disabledVendors    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    downloaderPeers    {}    ${ADVANCED SYS IP}
    Set System Settings via API    ec2AliveUpdateIntervalSec    60    ${ADVANCED SYS IP}  
    
Connection and email
    [Tags]    C78260    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    cloudConnectRelayingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    cloudConnectUdpHolePunchingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    crossdomainEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    defaultExportVideoCodec    mpeg4    ${ADVANCED SYS IP}
    Set System Settings via API    defaultVideoCodec    h263p    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK THREE}
    
    Log    Step 1
    Input on page matches server    ${CONNECTION KEEP ALIVE TIMEOUT INPUT}    ec2ConnectionKeepAliveTimeoutSec
    Change Input for Advanced Setting    ${CONNECTION KEEP ALIVE TIMEOUT INPUT}     7
    Input on page matches server    ${CONNECTION KEEP ALIVE TIMEOUT INPUT}    ec2ConnectionKeepAliveTimeoutSec
    
    Log    Step 2
    Input on page matches server    ${CONNECTION KEEP ALIVE PROBE INPUT}     ec2KeepAliveProbeCount
    Change Input for Advanced Setting    ${CONNECTION KEEP ALIVE PROBE INPUT}     0
    Input on page matches server    ${CONNECTION KEEP ALIVE PROBE INPUT}     ec2KeepAliveProbeCount
    
    Log    Step 3
    Input on page matches server    ${EMAIL FROM INPUT}    emailFrom
    Change Input for Advanced Setting    ${EMAIL FROM INPUT}     networkoptixtesting123@gmail.com
    Input on page matches server    ${EMAIL FROM INPUT}    emailFrom
    
    Log    Step 4
    Input on page matches server    ${EMAIL SIGNATURE INPUT}   emailSignature
    Change Input for Advanced Setting    ${EMAIL SIGNATURE INPUT}    Testing
    Input on page matches server    ${EMAIL SIGNATURE INPUT}   emailSignature
    
    Log    Step 5
    Input on page matches server    ${SUPPORT EMAIL INPUT}    emailSupportEmail
    Change Input for Advanced Setting    ${SUPPORT EMAIL INPUT}     http://support.networkoptix.testing.com
    Input on page matches server    ${SUPPORT EMAIL INPUT}    emailSupportEmail
    
    Log    Step 6 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    cloudConnectRelayingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    cloudConnectUdpHolePunchingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    crossdomainEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    defaultExportVideoCodec    mpeg4    ${ADVANCED SYS IP}
    Set System Settings via API    defaultVideoCodec    h263p    ${ADVANCED SYS IP}
    
Recording and log
    [Tags]    C78262    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    enableEdgeRecording    true    ${ADVANCED SYS IP}
    Set System Settings via API    eventLogPeriodDays    30    ${ADVANCED SYS IP}
    Set System Settings via API    forceLiveCacheForPrimaryStream    auto    ${ADVANCED SYS IP}
    Set System Settings via API    keepHanwhaIoPortStateIntactOnInitialization    false    ${ADVANCED SYS IP}
    Set System Settings via API    lastMergeMasterId    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    lastMergeSlaveId    ${EMPTY}    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK FOUR}
    
    Log    Step 1
    Setting on page matches server    ${ENABLE EDGE RECORDING CHECKBOX VISIBLE}     enableEdgeRecording    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${ENABLE EDGE RECORDING CHECKBOX REAL}    enableEdgeRecording    ${ADVANCED SYS IP}
    
    Log    Step 2
    Input on page matches server    ${EVENT LOG PERIOD INPUT}       eventLogPeriodDays
    Change Input for Advanced Setting    ${EVENT LOG PERIOD INPUT}       25
    Input on page matches server    ${EVENT LOG PERIOD INPUT}       eventLogPeriodDays
    
    Log    Step 3
    Input on page matches server    ${FORCE LIVE CACHE INPUT}      forceLiveCacheForPrimaryStream
    Change Input for Advanced Setting    ${FORCE LIVE CACHE INPUT}       Yes
    Input on page matches server    ${FORCE LIVE CACHE INPUT}      forceLiveCacheForPrimaryStream

    Log    Step 4
    Setting on page matches server    $${KEEP HANWHA PORT STATE CHECKBOX VISIBLE}     keepHanwhaIoPortStateIntactOnInitialization    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${KEEP HANWHA PORT STATE CHECKBOX REAL}    keepHanwhaIoPortStateIntactOnInitialization    ${ADVANCED SYS IP}

    Log    Step 5
    Input on page matches server    ${LAST MERGE MASTERID INPUT}     lastMergeMasterId
    Change Input for Advanced Setting    ${LAST MERGE MASTERID INPUT}      masterId
    Input on page matches server    ${LAST MERGE MASTERID INPUT}      lastMergeMasterId
  
    Log    Step 6
    Input on page matches server    ${LAST MERGE SLAVEID INPUT}     lastMergeSlaveId
    Change Input for Advanced Setting    ${LAST MERGE SLAVEID INPUT}      slaveId
    Input on page matches server    ${LAST MERGE SLAVEID INPUT}      lastMergeSlaveId
  
    Log    Step 7 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    enableEdgeRecording    true    ${ADVANCED SYS IP}
    Set System Settings via API    eventLogPeriodDays    30    ${ADVANCED SYS IP}
    Set System Settings via API    forceLiveCacheForPrimaryStream    auto    ${ADVANCED SYS IP}
    Set System Settings via API    keepHanwhaIoPortStateIntactOnInitialization    false    ${ADVANCED SYS IP}
    Set System Settings via API    lastMergeMasterId    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    lastMergeSlaveId    ${EMPTY}    ${ADVANCED SYS IP}
    
LDAP and license server
    [Tags]    C78263    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    ldapAdminDn    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchBase    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchFilter    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchTimeoutS    30    ${ADVANCED SYS IP}
    Set System Settings via API    ldapUri    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    licenseServer    https://licensing.vmsproxy.com    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK FIVE}
    
    Log    Step 1
    Input on page matches server    ${LDAP ADMIN DN INPUT}     ldapAdminDn
    Change Input for Advanced Setting    ${LDAP ADMIN DN INPUT}      admin
    Input on page matches server    ${LDAP ADMIN DN INPUT}     ldapAdminDn
    
    Log    Step 2
    Input on page matches server    ${LDAP SEARCH BASE INPUT}     ldapSearchBase
    Change Input for Advanced Setting    ${LDAP SEARCH BASE INPUT}      search
    Input on page matches server   ${LDAP SEARCH BASE INPUT}     ldapSearchBase
    
    Log    Step 3
    Input on page matches server    ${LDAP SEARCH FILTER INPUT}     ldapSearchFilter
    Change Input for Advanced Setting    ${LDAP SEARCH FILTER INPUT}      search_filter
    Input on page matches server    ${LDAP SEARCH FILTER INPUT}     ldapSearchFilter
    
    Log    Step 4
    Input on page matches server    ${LDAP SEARCH TIMEOUT INPUT}   ldapSearchTimeoutS
    Change Input for Advanced Setting    ${LDAP SEARCH TIMEOUT INPUT}    25
    Input on page matches server    ${LDAP SEARCH TIMEOUT INPUT}   ldapSearchTimeoutS
    
    Log    Step 5
    Input on page matches server    ${LDAP URI IMPUT}     ldapUri
    Change Input for Advanced Setting    ${LDAP URI IMPUT}     Uri
    Input on page matches server    ${LDAP URI IMPUT}     ldapUri

    Log    Step 6
    Input on page matches server    ${LICENSE SERVER INPUT}    licenseServer
    Change Input for Advanced Setting    ${LICENSE SERVER INPUT}      https://licensing.vmsproxy.testing.com
    Input on page matches server    ${LICENSE SERVER INPUT}      licenseServer
  
    Log    Step 7 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    ldapAdminDn    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchBase    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchFilter    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    ldapSearchTimeoutS    30    ${ADVANCED SYS IP}
    Set System Settings via API    ldapUri    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    licenseServer    https://licensing.vmsproxy.com    ${ADVANCED SYS IP}
    
Screen quality, time settings and event log
    [Tags]    C78264    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    lowQualityScreenVideoCodec    mpeg2video    ${ADVANCED SYS IP}
    Set System Settings via API    maxDifferenceBetweenSynchronizedAndInternetTime    2000     ${ADVANCED SYS IP}
    Set System Settings via API    maxDifferenceBetweenSynchronizedAndLocalTimeMs    5000     ${ADVANCED SYS IP}
    Set System Settings via API    maxEventLogRecords    100000    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK SIX}
    
    Log    Step 1
    Input on page matches server    ${LOW QUALITY SCREEN VIDEO CODEC INPUT}     lowQualityScreenVideoCodec
    Change Input for Advanced Setting    ${LOW QUALITY SCREEN VIDEO CODEC INPUT}      mpeg4video
    Input on page matches server    ${LOW QUALITY SCREEN VIDEO CODEC INPUT}     lowQualityScreenVideoCodec
    
    Log    Step 2
    Input on page matches server    ${MAX DIF SYNC AND INTERNET TIME INPUT}    maxDifferenceBetweenSynchronizedAndInternetTime
    Change Input for Advanced Setting    ${MAX DIF SYNC AND INTERNET TIME INPUT}      1000
    Input on page matches server    ${MAX DIF SYNC AND INTERNET TIME INPUT}    maxDifferenceBetweenSynchronizedAndInternetTime
    
    Log    Step 3
    Input on page matches server    ${MAX DIF SYNC AND LOCAL TIME INPUT}     maxDifferenceBetweenSynchronizedAndLocalTimeMs
    Change Input for Advanced Setting    ${MAX DIF SYNC AND LOCAL TIME INPUT}      4000
    Input on page matches server    ${MAX DIF SYNC AND LOCAL TIME INPUT}     maxDifferenceBetweenSynchronizedAndLocalTimeMs
    
    Log    Step 4
    Input on page matches server    ${MAX EVENT LOG RECORDS INPUT}    maxEventLogRecords
    Change Input for Advanced Setting    ${MAX EVENT LOG RECORDS INPUT}     90000
    Input on page matches server    ${MAX EVENT LOG RECORDS INPUT}    maxEventLogRecords
    
    Log    Step 5 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    lowQualityScreenVideoCodec    mpeg2video    ${ADVANCED SYS IP}
    Set System Settings via API    maxDifferenceBetweenSynchronizedAndInternetTime    2000     ${ADVANCED SYS IP}
    Set System Settings via API    maxDifferenceBetweenSynchronizedAndLocalTimeMs    5000     ${ADVANCED SYS IP}
    Set System Settings via API    maxEventLogRecords    100000    ${ADVANCED SYS IP}

Max P2P, record queue size, and remote archive
    [Tags]    C78265    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    maxP2pAllClientsSizeBytes    1073741824    ${ADVANCED SYS IP}
    Set System Settings via API    maxP2pQueueSizeBytes    52428800     ${ADVANCED SYS IP}
    Set System Settings via API    maxRecordQueueSizeBytes    25165824     ${ADVANCED SYS IP}
    Set System Settings via API    maxRecordQueueSizeElements    1000    ${ADVANCED SYS IP}
    Set System Settings via API    maxRemoteArchiveSynchronizationThreads    -1    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK SEVEN}    
    
    Log    Step 1
    Input on page matches server    ${MAX P2P ALL CLIENTS SIZE INPUT}     maxP2pAllClientsSizeBytes
    Change Input for Advanced Setting    ${MAX P2P ALL CLIENTS SIZE INPUT}      1073741823
    Input on page matches server    ${MAX P2P ALL CLIENTS SIZE INPUT}     maxP2pAllClientsSizeBytes
    
    Log    Step 2
    Input on page matches server    ${MAX P2P QUEUE SIZE INPUT}     maxP2pQueueSizeBytes
    Change Input for Advanced Setting    ${MAX P2P QUEUE SIZE INPUT}       62428800
    Input on page matches server    ${MAX P2P QUEUE SIZE INPUT}     maxP2pQueueSizeBytes
    
    Log    Step 3
    Input on page matches server    ${MAX RECORD QUEUE SIZE INPUT}     maxRecordQueueSizeBytes
    Change Input for Advanced Setting    ${MAX RECORD QUEUE SIZE INPUT}      25165850
    Input on page matches server    ${MAX RECORD QUEUE SIZE INPUT}     maxRecordQueueSizeBytes
    
    Log    Step 4
    Input on page matches server    ${MAX RECORD QUEUE ELEMENTS INPUT}    maxRecordQueueSizeElements
    Change Input for Advanced Setting    ${MAX RECORD QUEUE ELEMENTS INPUT}     1111
    Input on page matches server    ${MAX RECORD QUEUE ELEMENTS INPUT}    maxRecordQueueSizeElements
    
    Log    Step 5
    Input on page matches server    ${MAX REMOTE ARCHIVE SYNC THREADS INPUT}    maxRemoteArchiveSynchronizationThreads
    Change Input for Advanced Setting    ${MAX REMOTE ARCHIVE SYNC THREADS INPUT}     1
    Input on page matches server    ${MAX REMOTE ARCHIVE SYNC THREADS INPUT}    maxRemoteArchiveSynchronizationThreads
    
    Log    Step 6 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    maxP2pAllClientsSizeBytes    1073741824    ${ADVANCED SYS IP}
    Set System Settings via API    maxP2pQueueSizeBytes    52428800     ${ADVANCED SYS IP}
    Set System Settings via API    maxRecordQueueSizeBytes    25165824     ${ADVANCED SYS IP}
    Set System Settings via API    maxRecordQueueSizeElements    1000    ${ADVANCED SYS IP}
    Set System Settings via API    maxRemoteArchiveSynchronizationThreads    -1    ${ADVANCED SYS IP}
    
RTP, Rtsp, scene items, archive sync, WEBM
    [Tags]    C78379    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    maxRtpRetryCount    6    ${ADVANCED SYS IP}
    Set System Settings via API    maxRtspConnectDurationSeconds    0     ${ADVANCED SYS IP}
    Set System Settings via API    maxSceneItems    0     ${ADVANCED SYS IP}
    Set System Settings via API    maxWearableArchiveSynchronizationThreads    -1    ${ADVANCED SYS IP}
    Set System Settings via API    maxWebMTranscoders    2    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK EIGHT}    
    
    Log    Step 1
    Input on page matches server    ${MAX RTP RETRY COUNT INPUT}     maxRtpRetryCount
    Change Input for Advanced Setting    ${MAX RTP RETRY COUNT INPUT}      5
    Input on page matches server    ${MAX RTP RETRY COUNT INPUT}     maxRtpRetryCount
    
    Log    Step 2
    Input on page matches server    ${MAX RTSP CONNECT DURATION INPUT}     maxRtspConnectDurationSeconds
    Change Input for Advanced Setting    ${MAX RTSP CONNECT DURATION INPUT}       1
    Input on page matches server    ${MAX RTSP CONNECT DURATION INPUT}     maxRtspConnectDurationSeconds
    
    Log    Step 3
    Input on page matches server    ${MAX SCENE ITEMS INPUT}     maxSceneItems
    Change Input for Advanced Setting    ${MAX SCENE ITEMS INPUT}      1
    Input on page matches server    ${MAX SCENE ITEMS INPUT}     maxSceneItems
    
    Log    Step 4
    Input on page matches server    ${MAX WEARABLE CAM ARCHIVE SYNC THREADS INPUT}    maxWearableArchiveSynchronizationThreads
    Change Input for Advanced Setting   ${MAX WEARABLE CAM ARCHIVE SYNC THREADS INPUT}     1
    Input on page matches server    ${MAX WEARABLE CAM ARCHIVE SYNC THREADS INPUT}    maxWearableArchiveSynchronizationThreads
    
    Log    Step 5
    Input on page matches server    ${MAX WEBM TRANSCODERS INPUT}     maxWebMTranscoders
    Change Input for Advanced Setting    ${MAX WEBM TRANSCODERS INPUT}     1
    Input on page matches server    ${MAX WEBM TRANSCODERS INPUT}     maxWebMTranscoders
    
    Log    Step 6 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    maxRtpRetryCount    6    ${ADVANCED SYS IP}
    Set System Settings via API    maxRtspConnectDurationSeconds    0     ${ADVANCED SYS IP}
    Set System Settings via API    maxSceneItems    0     ${ADVANCED SYS IP}
    Set System Settings via API    maxWearableArchiveSynchronizationThreads    -1    ${ADVANCED SYS IP}
    Set System Settings via API    maxWebMTranscoders    2    ${ADVANCED SYS IP}

Meta data storage, OS time change, proxy connection timeout, push notification language
    [Tags]    C78380    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    rtspBufferSizeKb    64    ${ADVANCED SYS IP}
    Set System Settings via API    metadataStorageChangePolicy    keep    ${ADVANCED SYS IP}
    Set System Settings via API    osTimeChangeCheckPeriodMs    1000     ${ADVANCED SYS IP}
    Set System Settings via API    proxyConnectTimeoutSec    5     ${ADVANCED SYS IP}
    Set System Settings via API    pushNotificationsLanguage    ${EMPTY}    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK NINE}    
    
    Log    Step added
    Input on page matches server    ${RTSP BUFFER SIZE INPUT}       rtspBufferSizeKb
    Change Input for Advanced Setting    ${RTSP BUFFER SIZE INPUT}        128
    Input on page matches server    ${RTSP BUFFER SIZE INPUT}       rtspBufferSizeKb

    Log    Step 1
    Input on page matches server    ${META DATA STORAGE CHANGE POLICY INPUT}     metadataStorageChangePolicy
    Change Input for Advanced Setting    ${META DATA STORAGE CHANGE POLICY INPUT}      do not keep
    Input on page matches server    ${META DATA STORAGE CHANGE POLICY INPUT}     metadataStorageChangePolicy
    
    Log    Step 2
    Input on page matches server    ${OS TIME CHANGE CHECK PERIOD INPUT}     osTimeChangeCheckPeriodMs
    Change Input for Advanced Setting    ${OS TIME CHANGE CHECK PERIOD INPUT}       1998
    Input on page matches server    ${OS TIME CHANGE CHECK PERIOD INPUT}     osTimeChangeCheckPeriodMs
    
    Log    Step 3
    Input on page matches server    ${PROXY CONNECTION TIMEOUT INPUT}    proxyConnectTimeoutSec
    Change Input for Advanced Setting    ${PROXY CONNECTION TIMEOUT INPUT}      6
    Input on page matches server    ${PROXY CONNECTION TIMEOUT INPUT}    proxyConnectTimeoutSec
    
    Log    Step 4
    Input on page matches server    ${PUSH NOTIFICATION LANGUAGE INPUT}     pushNotificationsLanguage
    Change Input for Advanced Setting    ${PUSH NOTIFICATION LANGUAGE INPUT}      Russian
    Input on page matches server    ${PUSH NOTIFICATION LANGUAGE INPUT}     pushNotificationsLanguage
    
    Log    Step 5 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    rtspBufferSizeKb    64    ${ADVANCED SYS IP}
    Set System Settings via API    metadataStorageChangePolicy    keep    ${ADVANCED SYS IP}
    Set System Settings via API    osTimeChangeCheckPeriodMs    1000     ${ADVANCED SYS IP}
    Set System Settings via API    proxyConnectTimeoutSec    5     ${ADVANCED SYS IP}
    Set System Settings via API    pushNotificationsLanguage    ${EMPTY}    ${ADVANCED SYS IP}
    
File URI, RTP timeout, rtsp buffer, Flir Onvif
    [Tags]    C78385    C78386    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    resourceFileUri    http://resources.vmsproxy.com/resource_data.json     ${ADVANCED SYS IP}
    Set System Settings via API    rtpTimeoutMs    10000     ${ADVANCED SYS IP}
    Set System Settings via API    sequentialFlirOnvifSearcherEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    serverDiscoveryPingTimeoutSec    60    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK TEN}    
    
    Log    Step 1
    Input on page matches server    ${RESOURCE FILE URI INPUT}       resourceFileUri
    Change Input for Advanced Setting    ${RESOURCE FILE URI INPUT}        http://resources.vmsproxy.com/resource_data_TESTING.json 
    Input on page matches server    ${RESOURCE FILE URI INPUT}       resourceFileUri

    Log    Step 2
    Input on page matches server    ${RTP TIMEOUT INPUT}     rtpTimeoutMs
    Change Input for Advanced Setting    ${RTP TIMEOUT INPUT}      20000
    Input on page matches server    ${RTP TIMEOUT INPUT}     rtpTimeoutMs
    
    Log    Step 3
    Setting on page matches server    ${USE SEQUENCIAL FLIR CHECKBOX VISIBLE}     sequentialFlirOnvifSearcherEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${USE SEQUENCIAL FLIR CHECKBOX REAL}    sequentialFlirOnvifSearcherEnabled    ${ADVANCED SYS IP}

    Log    Step added
    Input on page matches server    ${SERVER DISCOVERY TIMEOUT INPUT}     serverDiscoveryPingTimeoutSec
    Change Input for Advanced Setting    ${SERVER DISCOVERY TIMEOUT INPUT}      50
    Input on page matches server    ${SERVER DISCOVERY TIMEOUT INPUT}     serverDiscoveryPingTimeoutSec
    
    Log    Step 4 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    resourceFileUri    http://resources.vmsproxy.com/resource_data.json     ${ADVANCED SYS IP}
    Set System Settings via API    rtpTimeoutMs    10000     ${ADVANCED SYS IP}
    Set System Settings via API    sequentialFlirOnvifSearcherEnabled    false    ${ADVANCED SYS IP}
    Set System Settings via API    serverDiscoveryPingTimeoutSec    60    ${ADVANCED SYS IP}
    
SMTP settings
    [Tags]    C78387    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    smtpConnectionType    Unsecure     ${ADVANCED SYS IP}
    Set System Settings via API    smtpHost    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    smtpPort    0    ${ADVANCED SYS IP}
    Set System Settings via API    smtpSimple    true    ${ADVANCED SYS IP}
    Set System Settings via API    smtpTimeout    300    ${ADVANCED SYS IP}
    Set System Settings via API    smtpUser    ${EMPTY}    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK ELEVEN}    
    
    Log    Step 1
    Input on page matches server    ${SMTP CONNECTION TYPE INPUT}       smtpConnectionType
    Change Input for Advanced Setting    ${SMTP CONNECTION TYPE INPUT}    secure
    Input on page matches server    ${SMTP CONNECTION TYPE INPUT}       smtpConnectionType

    Log    Step 2
    Input on page matches server    ${SMTP HOST INPUT}     smtpHost
    Change Input for Advanced Setting    ${SMTP HOST INPUT}      smtp.gmail.com
    Input on page matches server    ${SMTP HOST INPUT}     smtpHost
    
    Log    Step 3
    Input on page matches server    ${SMTP PORT INPUT}     smtpPort
    Change Input for Advanced Setting    ${SMTP PORT INPUT}      465
    Input on page matches server    ${SMTP PORT INPUT}     smtpPort
    
    Log    Step 4
    Setting on page matches server    ${SMTP SIMPLE CHECKBOX VISIBLE}     smtpSimple    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${SMTP SIMPLE CHECKBOX REAL}     smtpSimple    ${ADVANCED SYS IP}

    Log    Step 5
    Input on page matches server    ${SMTP TIMEOUT INPUT}     smtpTimeout
    Change Input for Advanced Setting    ${SMTP TIMEOUT INPUT}      200
    Input on page matches server    ${SMTP TIMEOUT INPUT}     smtpTimeout
    
    Log    Step 6
    Input on page matches server    ${SMTP USER INPUT}     smtpUser
    Change Input for Advanced Setting    ${SMTP USER INPUT}      networkoptixtesting123
    Input on page matches server    ${SMTP USER INPUT}     smtpUser
    
    Log    Step 7 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    smtpConnectionType    Unsecure     ${ADVANCED SYS IP}
    Set System Settings via API    smtpHost    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    smtpPort    0    ${ADVANCED SYS IP}
    Set System Settings via API    smtpSimple    true    ${ADVANCED SYS IP}
    Set System Settings via API    smtpTimeout    300    ${ADVANCED SYS IP}
    Set System Settings via API    smtpUser    ${EMPTY}    ${ADVANCED SYS IP}
    
Specific features, statistics report
    [Tags]    C78388    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    specificFeatures    ${SPECIFIC FEATURES DEFAULT}     ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportServerApi    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportTimeCycle    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportUpdateDelay    ${EMPTY}    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK TWELVE}  
    
    Log    Step 1
    Input on page matches server    ${SPECIFIC FEATURES INPUT}       specificFeatures
    Change Input for Advanced Setting    ${SPECIFIC FEATURES INPUT}    ${EMPTY}
    Input on page matches server    ${SPECIFIC FEATURES INPUT}       specificFeatures
    
    Log    Step 2
    Data on page matches server    ${STATISTICS REPORT LAST NUMBER}    statisticsReportLastNumber 
    
    #commented out due UI showing the word 'empty' and the server just having ''
    #Log    Step 3
    #Data on page matches server    ${STATISTICS REPORT LAST TIME}    statisticsReportLastTime 
    
    # Commented out due to bug
    # Log    Step 4
    # Data on page matches server    ${STATISTICS REPORT LAST VERSION}    statisticsReportLastVersion        

    Log    Step 4
    Input on page matches server    ${STATISTICS SERVER API INPUT}     statisticsReportServerApi
    Change Input for Advanced Setting    ${STATISTICS SERVER API INPUT}      http://stats.networkoptix.com
    Input on page matches server   ${STATISTICS SERVER API INPUT}     statisticsReportServerApi
    
    Log    Step 5
    Input on page matches server    ${STATISTICS REPORT INTERVAL INPUT}    statisticsReportTimeCycle
    Change Input for Advanced Setting    ${STATISTICS REPORT INTERVAL INPUT}      86400
    Input on page matches server    ${STATISTICS REPORT INTERVAL INPUT}     statisticsReportTimeCycle  
    
    Log    Step 6
    Input on page matches server    ${STATISTICS REPORT UPDATE DELAY INPUT}     statisticsReportUpdateDelay
    Change Input for Advanced Setting    ${STATISTICS REPORT UPDATE DELAY INPUT}      86400
    Input on page matches server    ${STATISTICS REPORT UPDATE DELAY INPUT}     statisticsReportUpdateDelay 
    
    Log    Step 7 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    specificFeatures    ${SPECIFIC FEATURES DEFAULT}     ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportServerApi    ${EMPTY}     ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportTimeCycle    ${EMPTY}    ${ADVANCED SYS IP}
    Set System Settings via API    statisticsReportUpdateDelay    ${EMPTY}    ${ADVANCED SYS IP}
 
Sync, Camera Ownership, Time, UPNP, Video Traffic
    [Tags]    C78393    C78398    C78399    C78401    C78402    advanced settings    threaded
    Log    Preconditions
    Set System Settings via API    syncTimeEpsilon    200     ${ADVANCED SYS IP}
    Set System Settings via API    syncTimeExchangePeriod    600000     ${ADVANCED SYS IP}
    Set System Settings via API    systemName    Advanced Settings    ${ADVANCED SYS IP}
    Set System Settings via API    takeCameraOwnershipWithoutLock    true    ${ADVANCED SYS IP}
    Set System Settings via API    timeSynchronizationEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    updateNotificationsEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    upnpPortMappingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    useTextEmailFormat    false    ${ADVANCED SYS IP}
    Set System Settings via API    useWindowsEmailLineFeed    false    ${ADVANCED SYS IP}
    Set System Settings via API    webSocketEnabled    true    ${ADVANCED SYS IP}
    Log in to Advanced Settings System    ${EMAIL OWNER}
    Go To    ${url}/systems/${ADVANCED SETTINGS SYSTEM ID}${ADVANCED SETTINGS}
    Wait Until Elements Are Visible    @{ADVANCED SETTINGS ALERT BAR}
    Wait Until Elements Are Visible    @{ADVANCED SETTING ELEMENT BLOCK THIRTEEN}
    
    Log    Step 1
    Input on page matches server    ${SYNC TIME EPSILON UNPUT}       syncTimeEpsilon
    Change Input for Advanced Setting    ${SYNC TIME EPSILON UNPUT}    100
    Input on page matches server    ${SYNC TIME EPSILON UNPUT}       syncTimeEpsilon
    
    Log    Step 2
    Input on page matches server    ${SYNC TIME INTERVAL NETWORK INPUT}       syncTimeExchangePeriod
    Change Input for Advanced Setting    ${SYNC TIME INTERVAL NETWORK INPUT}    500000
    Input on page matches server    ${SYNC TIME INTERVAL NETWORK INPUT}        syncTimeExchangePeriod
    
    Log    Step 3
    Input on page matches server    ${SYSTEM NAME INPUT}       systemName
    Change Input for Advanced Setting    ${SYSTEM NAME INPUT}    Advanced Settings changed
    Input on page matches server    ${SYSTEM NAME INPUT}      systemName
    
    Log    Step 4
    Setting on page matches server    ${TAKE CAMERA OWNERSHIP WITHOUT LOCK CHECKBOX VISIBLE}    takeCameraOwnershipWithoutLock    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${TAKE CAMERA OWNERSHIP WITHOUT LOCK CHECKBOX REAL}    takeCameraOwnershipWithoutLock    ${ADVANCED SYS IP}

    Log    Step 5
    Setting on page matches server    ${TIME SYNC ENABLED CHECKBOX VISIBLE}    timeSynchronizationEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${TIME SYNC ENABLED CHECKBOX REAL}     timeSynchronizationEnabled    ${ADVANCED SYS IP}

    Log    Step 6
    Setting on page matches server    ${UPDATE NOTIFICATIONS ENABLED CHECKBOX VISIBLE}    updateNotificationsEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${UPDATE NOTIFICATIONS ENABLED CHECKBOX REAL}      updateNotificationsEnabled    ${ADVANCED SYS IP}

    Log    Step 7
    Setting on page matches server    ${UPNP PORT MAPPING ENABLED CHECKBOX VISIBLE}    upnpPortMappingEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${UPNP PORT MAPPING ENABLED CHECKBOX REAL}      upnpPortMappingEnabled    ${ADVANCED SYS IP}
    
    Log    Step 8
    Setting on page matches server    ${USE TEXT EMAIL FORMAT CHECKBOX VISIBLE}    useTextEmailFormat    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${USE TEXT EMAIL FORMAT CHECKBOX REAL}      useTextEmailFormat    ${ADVANCED SYS IP}

    Log    Step 9
    Setting on page matches server    ${USE WINDOWS EMAIL LINE FEED CHECKBOX VISIBLE}     useWindowsEmailLineFeed    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${USE WINDOWS EMAIL LINE FEED CHECKBOX REAL}      useWindowsEmailLineFeed    ${ADVANCED SYS IP}

    Log    Step 10
    Setting on page matches server    ${WEB SOCKET ENABLED CHECKBOX VISIBLE}     webSocketEnabled    ${ADVANCED SYS IP}
    Changing setting changes it on server    ${WEB SOCKET ENABLED CHECKBOX REAL}      webSocketEnabled    ${ADVANCED SYS IP}
    
    Log    Step 11 (not neccessary for automation but performed via API to reset for manual testing)
    Set System Settings via API    syncTimeEpsilon    200     ${ADVANCED SYS IP}
    Set System Settings via API    syncTimeExchangePeriod    600000     ${ADVANCED SYS IP}
    Set System Settings via API    systemName    Advanced Settings    ${ADVANCED SYS IP}
    Set System Settings via API    takeCameraOwnershipWithoutLock    true    ${ADVANCED SYS IP}
    Set System Settings via API    timeSynchronizationEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    updateNotificationsEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    upnpPortMappingEnabled    true    ${ADVANCED SYS IP}
    Set System Settings via API    useTextEmailFormat    false    ${ADVANCED SYS IP}
    Set System Settings via API    useWindowsEmailLineFeed    false    ${ADVANCED SYS IP}
    Set System Settings via API    webSocketEnabled    true    ${ADVANCED SYS IP}
    