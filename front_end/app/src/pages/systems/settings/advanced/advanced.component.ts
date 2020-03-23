import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy
}                                     from '@angular/core';
import {
    filter, map, delay,
    retryWhen, take
} from 'rxjs/operators';
import { Subscription, Observable }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { NxConfigService, IConfig }   from '../../../../services/nx-config';
import { NxDialogsService }           from '../../../../dialogs/dialogs.service';
import { NxSettingsService }          from '../settings.service';
import { NxLanguageProviderService }  from '../../../../services/nx-language-provider';
import { NxMenuService }              from '../../../../components/menu/menu.service';
import { NxProcessService }           from '../../../../services/process.service';
import { NxSystem }                   from '../../../../services/system.service';
import { NxApplyService, Watcher }    from '../../../../services/apply.service';
import { NxUriService }               from '../../../../services/uri.service';
import { AutoUnsubscribe }            from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }    from '../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-component',
    templateUrl : 'advanced.component.html',
    styleUrls   : ['advanced.component.scss']
})

export class NxSystemServerAdvancedComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    serverForLoggers: NxSystem;
    viewContainerRef: ViewContainerRef;
    serverIdFromParams: any;
    selectedServer: any;
    system$: Observable<NxSystem>

    systemSettings: any = {
        additionalLocalFsTypes                          : new Watcher<any>(),
        arecontRtspEnabled                              : new Watcher<boolean>(),
        auditTrailEnabled                               : new Watcher<boolean>(),
        auditTrailPeriodDays                            : new Watcher<number>(),
        autoDiscoveryEnabled                            : new Watcher<boolean>(),
        autoDiscoveryResponseEnabled                    : new Watcher<boolean>(),
        autoUpdateThumbnails                            : new Watcher<boolean>(),
        backupNewCamerasByDefault                       : new Watcher<boolean>(),
        backupQualities                                 : new Watcher<string>(),
        cameraSettingsOptimization                      : new Watcher<boolean>(),
        clientStatisticsSettingsUrl                     : new Watcher<any>(),
        cloudAccountName                                : new Watcher<string>(),
        cloudConnectRelayingEnabled                     : new Watcher<boolean>(),
        cloudConnectUdpHolePunchingEnabled              : new Watcher<boolean>(),
        cloudHost                                       : new Watcher<string>(),
        cloudSystemID                                   : new Watcher<string>(),
        crossdomainEnabled                              : new Watcher<boolean>(),
        defaultExportVideoCodec                         : new Watcher<string>(),
        defaultVideoCodec                               : new Watcher<string>(),
        disabledVendors                                 : new Watcher<any>(),
        downloaderPeers                                 : new Watcher<any>(),
        ec2AliveUpdateIntervalSec                       : new Watcher<number>(),
        ec2ConnectionKeepAliveTimeoutSec                : new Watcher<number>(),
        ec2KeepAliveProbeCount                          : new Watcher<number>(),
        emailFrom                                       : new Watcher<any>(),
        emailSignature                                  : new Watcher<any>(),
        emailSupportEmail                               : new Watcher<string>(),
        enableEdgeRecording                             : new Watcher<boolean>(),
        eventLogPeriodDays                              : new Watcher<number>(),
        forceLiveCacheForPrimaryStream                  : new Watcher<string>(),
        lastMergeMasterId                               : new Watcher<string>(),
        lastMergeSlaveId                                : new Watcher<string>(),
        ldapAdminDn                                     : new Watcher<any>(),
        ldapSearchBase                                  : new Watcher<any>(),
        ldapSearchFilter                                : new Watcher<any>(),
        ldapSearchTimeoutS                              : new Watcher<number>(),
        ldapUri                                         : new Watcher<any>(),
        licenseServer                                   : new Watcher<string>(),
        localSystemId                                   : new Watcher<string>(),
        lowQualityScreenVideoCodec                      : new Watcher<string>(),
        maxDifferenceBetweenSynchronizedAndInternetTime : new Watcher<number>(),
        maxDifferenceBetweenSynchronizedAndLocalTimeMs  : new Watcher<number>(),
        maxEventLogRecords                              : new Watcher<number>(),
        maxP2pAllClientsSizeBytes                       : new Watcher<number>(),
        maxP2pQueueSizeBytes                            : new Watcher<number>(),
        maxRecordQueueSizeBytes                         : new Watcher<number>(),
        maxRecordQueueSizeElements                      : new Watcher<number>(),
        maxRemoteArchiveSynchronizationThreads          : new Watcher<number>(),
        maxRtpRetryCount                                : new Watcher<number>(),
        maxRtspConnectDurationSeconds                   : new Watcher<number>(),
        maxSceneItems                                   : new Watcher<number>(),
        maxWearableArchiveSynchronizationThreads        : new Watcher<number>(),
        maxWebMTranscoders                              : new Watcher<number>(),
        metadataStorageChangePolicy                     : new Watcher<string>(),
        osTimeChangeCheckPeriodMs                       : new Watcher<number>(),
        primaryTimeServer                               : new Watcher<string>(),
        proxyConnectTimeoutSec                          : new Watcher<number>(),
        pushNotificationsLanguage                       : new Watcher<any>(),
        resourceFileUri                                 : new Watcher<string>(),
        rtpTimeoutMs                                    : new Watcher<number>(),
        sequentialFlirOnvifSearcherEnabled              : new Watcher<boolean>(),
        serverDiscoveryPingTimeoutSec                   : new Watcher<number>(),
        sessionLimitMinutes                             : new Watcher<number>(),
        smtpConnectionType                              : new Watcher<string>(),
        smtpHost                                        : new Watcher<any>(),
        smtpPort                                        : new Watcher<number>(),
        smtpSimple                                      : new Watcher<boolean>(),
        smtpTimeout                                     : new Watcher<number>(),
        smtpUser                                        : new Watcher<any>(),
        specificFeatures                                : new Watcher<string>(),
        statisticsAllowed                               : new Watcher<boolean>(),
        statisticsReportLastNumber                      : new Watcher<number>(),
        statisticsReportLastTime                        : new Watcher<string>(),
        statisticsReportLastVersion                     : new Watcher<string>(),
        statisticsReportServerApi                       : new Watcher<any>(),
        statisticsReportTimeCycle                       : new Watcher<string>(),
        statisticsReportUpdateDelay                     : new Watcher<any>(),
        syncTimeEpsilon                                 : new Watcher<number>(),
        syncTimeExchangePeriod                          : new Watcher<number>(),
        systemName                                      : new Watcher<string>(),
        takeCameraOwnershipWithoutLock                  : new Watcher<boolean>(),
        timeSynchronizationEnabled                      : new Watcher<boolean>(),
        trafficEncryptionForced                         : new Watcher<boolean>(),
        updateNotificationsEnabled                      : new Watcher<boolean>(),
        upnpPortMappingEnabled                          : new Watcher<boolean>(),
        useTextEmailFormat                              : new Watcher<boolean>(),
        useWindowsEmailLineFeed                         : new Watcher<boolean>(),
        videoTrafficEncryptionForced                    : new Watcher<boolean>(),
        watermarkSettings                               : new Watcher<string>(),
        webSocketEnabled                                : new Watcher<boolean>()
    };

    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    saveSettings: any;
    previousInputValue: number;
    checking: boolean;

    renameDisabled: boolean;
    serverOffline: boolean;
    canSeeInfo: boolean;
    parsedServerId: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private dialogsService: NxDialogsService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnInit(): void {
        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                    this.parsedServerId = params.serverId.replace(/\s|\{|\}/g, '');
                    this.setServer();
                }
            });

        this.system$ = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined));
        this.systemSubscription = this.system$.subscribe((system) => {
            this.settingsService.footerSubject.next(true);
            this.system = system;
            this.applyService.setVisible(false);
            this.initApplyService();

            if (this.serverSubscription) {
                this.serverSubscription.unsubscribe();
            }
            this.serverSubscription = this.system.infoSubject
                .pipe(
                    map(system => {
                        if (!system.servers || system.servers.length === 0) {
                            throw system;
                        }
                    }),
                    retryWhen(err => err.pipe(delay(1000)))
                )
                .pipe(take(1))
                .subscribe(() => {
                    this.settingsService.footerSubject.next(true);
                    if (this.system.currentServerNotBusy) {
                        if (this.system && this.system.servers && this.system.servers.length) {
                            this.getAdvancedSettings();
                        }
                        if (!this.applyService.locked) {
                            this.setServer();
                        }
                    }
                });
        });
    }

    ngOnDestroy(): void {
    }

    setServer(): void {
        if (this.system && this.system.servers && this.system.servers.length > 0) {
            let server;
            if (this.serverIdFromParams) {
                server = this.system.servers.find((server: any) => {
                    return server.id === this.serverIdFromParams;
                });
            }
            if (typeof server === 'undefined') {
                if (this.system.servers.length > 0) {
                    server = this.system.servers[0];

                    this.uriService
                        .updateURI(`systems/${this.system.id}/servers/${server.id}`)
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    return;
                }
            }

            server.osName = server.osInfo !== '' ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
            this.selectedServer = server;
            debugger;
            this.serverForLoggers = this.selectedServer.id.replace(/[\{\}]/g, '');
            this.menuService.setDetailsSection(this.selectedServer.id);
        }
    }

    getAdvancedSettings() {
        this.system.updateOrGetSystemSettings({ ignore: 'installedUpdateInformation,targetUpdateInformation' })
            .toPromise()
            .then(response => {
                this.applyService.setVisible(false);
                this.applyService.hardReset();
                this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                this.applyService.reset();
                this.applyService.setVisible(true);
            });
    }

    settingsToBeDisplayedOrUpdated(settings) {
        Object.keys(settings).forEach((key) => {
            const value = settings[key];
            if (!this.CONFIG.settingsConfig[key]) {
                let type = 'text';
                if (value === true || value === false ||
                    value === 'true' || value === 'false') {
                    type = 'checkbox';
                }
                this.CONFIG.settingsConfig[key] = { label: key, type: type };
            }

            if (this.CONFIG.settingsConfig[key].type === 'number') {
                this.systemSettings[key].value = this.systemSettings[key].originalValue = (value !== '') ? parseInt(value) : '';
            } else if (this.CONFIG.settingsConfig[key].type === 'checkbox') {
                this.systemSettings[key].value = this.systemSettings[key].originalValue = (value === 'true');
            } else {
                this.systemSettings[key].value = this.systemSettings[key].originalValue = value;
            }

            this.CONFIG.settingsConfig[key].oldValue = value;
        });
    }

    settingsToBeSaved() {
        const serverSettings = {};

        Object.keys(this.systemSettings).forEach((key) => {
            if (this.systemSettings[key].value !== this.systemSettings[key].originalValue) {
                serverSettings[key] = this.systemSettings[key].value;
            }
        });

        return serverSettings;
    }

    initApplyService(): void {
        this.saveSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemSettings(this.settingsToBeSaved())
                .toPromise()
                .then(response => {
                    this.applyService.reset();
                    this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                    if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error)
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.settingsSaved, this.LANG.dialogs.titles.success)
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.settingsNotSaved, this.LANG.dialogs.titles.error)
                        .catch(error => {
                            console.error(error);
                        });
                });
        });

        this.applyService
            .initPageWatcher(this.viewContainerRef, this.saveSettings, () => {
                this.applyService.reset();
            },
            // @ts-ignore
            [...Object.values(this.systemSettings)/* Find a way to get watchers from strorage to here */]);

        this.applyService.setVisible(false);
    }
}
