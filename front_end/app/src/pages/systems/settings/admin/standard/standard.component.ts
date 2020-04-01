import {
    Component, OnDestroy, OnInit, Inject,
    ViewChild, ElementRef, ViewContainerRef, Input
}                                         from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { throttleTime }                   from 'rxjs/operators';
import { AutoUnsubscribe }                from 'ngx-auto-unsubscribe';
import { Subscription }                   from 'rxjs';
import { LanguageI18NStaticTypes }        from '../../../../../../language_i18n_static_types';
import { NxConfigService, IConfig }       from '../../../../../services/nx-config';
import { NxPageService }                  from '../../../../../services/page.service';
import { NxDialogsService }               from '../../../../../dialogs/dialogs.service';
import { NxLanguageProviderService }      from '../../../../../services/nx-language-provider';
import { NxMenuService }                  from '../../../../../components/menu/menu.service';
import { NxSystemsService }               from '../../../../../services/systems.service';
import { NxAccountService }               from '../../../../../services/account.service';
import { NxProcessService }               from '../../../../../services/process.service';
import { NxApplyService, Watcher }        from '../../../../../services/apply.service';
import { NxCloudApiService }              from '../../../../../services/nx-cloud-api';
import { NxSettingsService }              from '../../settings.service';
import { NxSystem }                       from '../../../../../services/system.service';

interface Settings {
    advanced : boolean;
    disconnectDisabled: boolean;
    mergeDisabled: boolean;
    renameDisabled: boolean;
    showMerge: boolean;
}

@AutoUnsubscribe()
@Component({
    selector    : 'nx-system-standard-admin-component',
    templateUrl : 'standard.component.html',
    styleUrls   : ['standard.component.scss']
})

export class NxSystemStandardAdminComponent implements OnInit, OnDestroy {
    @Input() system: NxSystem;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    systems: any;
    peerSystems: any[] = [];
    params: Params;

    userDisconnectSystem: any;
    deletingSystem: any;
    currentlyMerging = false;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    settingsSubscription: Subscription;
    settingsServiceSubscription: Subscription;
    systemSubscription: Subscription;
    viewContainerRef: ViewContainerRef;

    selectedTimeUnit: any;
    sessionLimitToggle: boolean;
    timeValue: number;
    currentMaxTimeUnit: number;
    previousInputValue: number;
    limitSessionTimeUnits: any;
    limitSessionTimeItems: any;
    saveSettings: any;
    resetVideoEncryptionIfDisabled: any;
    setWarningMessageThroughApplyService: any;
    timeUnitTracker: any;
    selectElement: any;

    settingsWatchersSet = false;
    settingsWatchers: any = {
        autoDiscoveryEnabled         : new Watcher<boolean>(),
        statisticsAllowed            : new Watcher<boolean>(),
        cameraSettingsOptimization   : new Watcher<boolean>(),
        auditTrailEnabled            : new Watcher<boolean>(),
        trafficEncryptionForced      : new Watcher<boolean>(),
        videoTrafficEncryptionForced : new Watcher<boolean>(),
        sessionLimitMinutes          : new Watcher<number>()
    };

    readonly minutes: string = 'minutes';
    readonly hours: string = 'hours';

    @ViewChild('timeUnitTracker', { static: false }) set el(el: ElementRef) {
        if (el) {
            this.timeUnitTracker = el;
            this.updateTimeUnitInput(this.selectedTimeUnit);
        }
    }

    @ViewChild('selectorTracker') set selectEle(el: ElementRef) {
        if (el) {
            this.selectElement = el;
        }
    }

    private setupDefaults() {
        this.params = this.route.snapshot.queryParams;

        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.setSection('admin');
    }

    private updateSettings(forceMergeState?: boolean) {
        const merging = this.system && typeof this.system.mergeInfo !== 'undefined' || forceMergeState;
        const available = this.system && (!this.system.isOnline || !this.system.isAvailable);

        this.settings = {
            advanced           : true, // this.params.advanced,
            disconnectDisabled : merging,
            mergeDisabled      : (merging || available) && !(this.debugMode || this.betaMode),
            renameDisabled     : merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master',
            showMerge          : this.system && this.system.isMine && this.systemsService.systems.length > 1
        };
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private accountService: NxAccountService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private router: Router,
        private cloudApiService: NxCloudApiService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.settings = {
            advanced           : true,
            disconnectDisabled : false,
            mergeDisabled      : true,
            renameDisabled     : false,
            showMerge          : true
        };

        this.limitSessionTimeUnits = {
            hours   : { value: this.hours, name: this.LANG.system.settings.sessionLimitDuration.hours, id: 1, max: 600, default: 24 },
            minutes : { value: this.minutes, name: this.LANG.system.settings.sessionLimitDuration.minutes, id: 2, max: 600 }
        };
        this.limitSessionTimeItems = [this.limitSessionTimeUnits.hours, this.limitSessionTimeUnits.minutes];

        this.applyService.setVisible(false);
        this.pageService.setPageTitle(this.LANG.pageTitles.systemName.replace('{{systemName}}', this.system.info.name));
        if (this.system.isAvailable) {
            this.system.updateOrGetSystemSettings().subscribe((res: any) => {
                this.updatePeerSystems();
                this.cleanUpWatchers(res.reply.settings);
                this.initApplyService();

                if (this.systemSubscription) {
                    this.systemSubscription.unsubscribe();
                }
                this.systemSubscription = this.system.infoSubject
                    .pipe(throttleTime(this.CONFIG.system.throttleTime))
                    .subscribe(() => {
                        this.settingsService.footerSubject.next(true);
                        this.updateSettings(this.currentlyMerging);
                        if (!this.applyService.locked && this.system.permissions && this.system.permissions.isAdmin) {
                            if (this.settingsSubscription) {
                                this.settingsSubscription.unsubscribe();
                            }
                            this.settingsSubscription = this.system.updateOrGetSystemSettings()
                                .subscribe((res: any) => {
                                    this.updatePeerSystems();
                                    this.setWatcherValues(res.reply.settings);
                                });
                        }
                    });
            });
        }

        this.deletingSystem = this.processService.createProcess(() => {
            return this.system.deleteFromCurrentAccount();
        }, {
            successMessage : this.LANG.toastMessage.system.deleted.success.replace('{{systemName}}', this.system.info.name),
            errorPrefix    : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
        }).then(() => {
            this.updateAndGoToSystems();
        }, (error) => {
            return error;
        });
    }

    // removes watcher(s) if setting does not exist
    cleanUpWatchers(settings) {
        Object.keys(this.settingsWatchers).forEach(sw => {
            if (!(sw in settings)) {
                delete this.settingsWatchers[sw];
            }
        });
    }

    setWatcherValues(settings) {
        this.applyService.setVisible(false);
        this.applyService.hardReset();
        const sw = this.settingsWatchers;
        Object.keys(sw).forEach(setting => {
            if (setting in settings) {
                let curr = settings[setting];
                /**
                 * sets initial values for system & security settings
                 * sessionLimitMinutes is the only one that's a number & not a boolean,
                 * so it needs custom code to handle
                 */
                if (isNaN(curr)) {
                    sw[setting].value = curr === 'true';
                } else {
                    curr = parseInt(curr);
                    this.sessionLimitToggle = Boolean(curr);
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;

                    sw[setting].value = curr;
                    this.timeValue = curr;
                    if (this.timeValue % 60 === 0) {
                        this.timeValue /= 60;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
                    }
                }
            }
        });
        this.settingsWatchersSet = true;
        this.applyService.reset();
        this.applyService.setVisible(true);
    }

    initApplyService(): void {
        this.resetVideoEncryptionIfDisabled = () => {
            const encryptTraffic = this.settingsWatchers.trafficEncryptionForced.value;
            const encryptVideo = this.settingsWatchers.videoTrafficEncryptionForced.value;
            if (encryptVideo === true) {
                this.applyService.setWarn('');
            }
            if (!encryptTraffic && encryptVideo) {
                this.settingsWatchers.videoTrafficEncryptionForced.value = false;
            }
        };

        this.setWarningMessageThroughApplyService = () => {
            if (this.settingsWatchers.videoTrafficEncryptionForced.value === true) {
                this.applyService.setWarn(this.LANG.system.settings.warningMessages.videoEncryption);
            } else {
                this.applyService.setWarn('');
            }
        };

        this.saveSettings = this.processService.createProcess(() => {
            const sw = this.settingsWatchers;
            // handle sessionLimitMinutes when saving an empty value
            if (this.timeValue === null || this.timeValue === 0) {
                this.sessionLimitToggle = false;
                sw.sessionLimitMinutes.value = 0;
            }
            const changes = {};
            const settings = Object.keys(sw);
            for (const setting of settings) {
                const obj = sw[setting];
                if (obj.value !== obj.originalValue) {
                    changes[setting] = obj.value;
                    obj.originalValue = obj.value;
                }
            }
            return this.system.updateOrGetSystemSettings(changes).toPromise()
                .then(() => this.applyService.reset());
        });

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            // handles the cancel button
            () => {
                this.applyService.reset();
                const { sessionLimitMinutes } = this.settingsWatchers;
                if (sessionLimitMinutes && sessionLimitMinutes.originalValue) {
                    this.sessionLimitToggle = true;
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                    this.timeValue = sessionLimitMinutes.originalValue;
                    if (this.timeValue % 60 === 0) {
                        this.timeValue /= 60;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
                    }
                } else if (sessionLimitMinutes && sessionLimitMinutes.originalValue === 0) {
                    this.sessionLimitToggle = false;
                }
            },
            Object.values(this.settingsWatchers));

        this.applyService.setVisible(false);
    }

    disconnect() {
        if (this.system.isMine) {
            this.cloudApiService.getCloudStorageUsage(this.system.id).then(() => {
                // Display systemDisconnectError when attempting to disconnect system with cloud storage enabled
                const { dialogs: { cloudStorage:{ systemDisconnectError: { title, message } }, buttons: { ok } } } = this.LANG;
                this.dialogs.confirm(message, title, ok);
            }).catch(() => {
                // User is the owner. Deleting system means unbinding it and disconnecting all accounts
                // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
                this.dialogs.disconnect(this.system.id)
                    .then((result) => {
                        if (result) {
                            this.updateAndGoToSystems();
                        }
                    });
            });
        }
    }

    updateAndGoToSystems() {
        this.userDisconnectSystem = true;
        this.systemsService
            .forceUpdateSystems(this.accountService.email)
            .subscribe(() => {
                setTimeout(() => {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                });
            });
    }

    updatePeerSystems() {
        return this.system.getPeerSystems().toPromise()
            .then(res => {
                this.peerSystems = res.reply
                    .filter(peer => !peer.cloudSystemId)
                    .map(peer => {
                        const isNew = peer.serverFlags.includes(this.CONFIG.system.flags.newSystem);
                        const system: any = {
                            ...peer,
                            id         : peer.id.replace(/[{}]/g, ''),
                            url        : `${peer.remoteAddresses[0]}:${peer.port}`,
                            systemName : isNew ? this.LANG.dialogs.merge.newSystemDisplayName : peer.systemName,
                            ip         : peer.remoteAddresses[0],
                            name       : peer.name,
                            isNew
                        };
                        if (this.system && this.system.moduleInfo && peer.status === 'Incompatible') {
                            system.olderProtocol = peer.protoVersion < this.system.moduleInfo.protoVersion;
                        }
                        return system;
                    });
                this.updateSettings(this.currentlyMerging);
            });
    }

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            this.dialogs.confirm(
                this.LANG.dialogs.removeSystem.message,
                this.LANG.dialogs.removeSystem.title,
                this.LANG.dialogs.removeSystem.action,
                'btn-danger',
                this.LANG.dialogs.buttons.cancel
            )
                .then((result) => {
                    if (result === true) {
                        return this.deletingSystem.run();
                    }
                });
        }
    }

    rename() {
        return this.dialogs
            .rename(this.system.id, this.system.info.name)
            .then((finalName) => {
                if (finalName) {
                    this.system.info.name = finalName;
                }

                this.pageService.setPageTitle(this.system.info.name + ' -');
                this.systemsService.forceUpdateSystems(this.accountService.email);
            });
    }

    mergeSystems() {
        this.systems = this.systemsService.getMySystems(this.accountService.email, this.system.id);
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        this.settingsService.system = this.system;
        return this.dialogs
            .merge(this.system, this.systems, this.peerSystems, this.accountService)
            .then((mergeInfo) => {
                if (mergeInfo) {
                    this.system.mergeInfo = mergeInfo;
                    const systemId = mergeInfo.role === 'master' ? this.system.id : mergeInfo.anotherSystemId;
                    this.systemsService.addToMergeList(systemId);
                    this.systemsService.processMerge(mergeInfo);
                    this.system.systemInfo = this.system;
                }
            }, (error) => {
                if (!error.primarySystemName && !error.secondarySystemName) {
                    return;
                }
                const commonErrorMsg = this.LANG.dialogs.merge.commonText
                    .replace('{{primarySystem}}', error.primarySystemName)
                    .replace('{{secondarySystem}}', error.secondarySystemName);
                let responseError = this.LANG.errorCodes[error.errorText] || this.LANG.errorCodes[error.resultCode];
                if (!responseError) {
                    responseError = this.LANG.errorCodes.unknownMergeError;
                } else {
                    responseError = responseError.replace('{{failedSystem}}', error.failedSystemName);
                }

                // HTML needed for section formatting
                const dialogBody = '<p>' + commonErrorMsg + '</p><p>' + responseError + '</p>';

                // Handling promise to satisfy the linter.
                this.dialogs.confirm(
                    dialogBody,
                    this.LANG.dialogs.merge.mergeFailedTitle,
                    this.LANG.dialogs.buttons.ok,
                    'btn-primary',
                    undefined).then(() => {});
            }).finally(() => {
                this.currentlyMerging = false;
                this.updateSettings(this.currentlyMerging);
                this.settingsService.system = this.system;
            });
    }

    updateUserRole() {
        let userRole = this.system.accessRole;
        if (this.system.accessRole in this.LANG.accessRoles) {
            userRole = this.LANG.accessRoles[this.system.accessRole].label;
        }
        return userRole;
    }

    // sets input max value and updates hour/minutes
    updateTimeUnitInput(timeUnit) {
        this.currentMaxTimeUnit = timeUnit.max;
        const el = this.timeUnitTracker;
        if (el) {
            if (el.nativeElement.value > this.currentMaxTimeUnit) {
                el.nativeElement.value = this.currentMaxTimeUnit;
            }
            el.nativeElement.setAttribute('max', this.currentMaxTimeUnit);

            if (this.selectedTimeUnit.value !== timeUnit.value) {
                this.selectedTimeUnit = timeUnit;
                this.updateLimitSessionValue(this.timeValue);
            }
        }
    }

    storePreviousValue(ev) {
        // prevents [.+-e] from being input
        if (['.', '+', '-', 'e'].includes(ev.key)) {
            ev.preventDefault();
        }
        this.previousInputValue = this.timeValue;
    }

    validationCheckForInput() {
        if (this.timeValue > this.currentMaxTimeUnit) {
            this.timeValue = this.previousInputValue;
            this.updateLimitSessionValue(this.timeValue);
        }
    }

    updateLimitSessionValue(newTimeValue) {
        const sw = this.settingsWatchers;
        if (this.selectedTimeUnit.value === this.hours) {
            sw.sessionLimitMinutes.value = newTimeValue * 60;
        } else if (newTimeValue % 60 === 0) {
            sw.sessionLimitMinutes.value = newTimeValue;
            newTimeValue /= 60;
            // handler for when minutes gets changed to hours in the same change
            // 120 hours --> 120 minutes --> 2 hours
            this.selectElement.change(this.limitSessionTimeUnits.hours);
        } else {
            sw.sessionLimitMinutes.value = newTimeValue;
        }
        this.timeValue = newTimeValue;
    }

    // handles showing default value on open and clearing to 0 on close
    handleSessionLimitToggle() {
        if (this.sessionLimitToggle === true) {
            this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
            this.timeValue = this.selectedTimeUnit.default;
            this.settingsWatchers.sessionLimitMinutes.value = this.selectedTimeUnit.default * 60;
        } else {
            this.timeValue = 0;
            this.settingsWatchers.sessionLimitMinutes.value = 0;
        }
    }

    ngOnDestroy() {}
}
