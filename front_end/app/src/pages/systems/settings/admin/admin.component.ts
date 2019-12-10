import {
    Component, OnDestroy, OnInit, Inject, ViewChildren,
    QueryList, ElementRef, ViewContainerRef,
}                                    from '@angular/core';
import { Location }                  from '@angular/common';
import { ActivatedRoute }            from '@angular/router';
import { NxConfigService }           from '../../../../services/nx-config';
import { NxPageService }             from '../../../../services/page.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxSystemsService }          from '../../../../services/systems.service';
import { NxAccountService }          from '../../../../services/account.service';
import { NxProcessService }          from '../../../../services/process.service';
import { NxSystem }                  from '../../../../services/system.service';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { NxApplyService, Watcher }   from '../../../../services/apply.service';

interface Settings {
    disconnectDisabled: boolean;
    mergeDisabled: boolean;
    renameDisabled: boolean;
    showMerge: boolean;
}

@AutoUnsubscribe()
@Component({
    selector   : 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls  : ['admin.component.scss']
})

export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    system: NxSystem;
    systems: any;
    location: any;

    userDisconnectSystem: any;
    deletingSystem: any;
    currentlyMerging: boolean;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    systemSubscription: Subscription;
    viewContainerRef: ViewContainerRef;
    limitSessionTimeUnits: any;
    selectedTimeUnit: any;
    timeUnitCount: number;
    currentMaxTimeUnit: number;
    previousInputValue: string;

    saveSettings: any;
    resetVideoEncryptionIfDisabled: any;
    setWarningMessageThroughApplyService: any;

    settingsWatchers: any = {
        autoDiscoveryEnabled: new Watcher<boolean>(),
        statisticsAllowed: new Watcher<boolean>(),
        cameraSettingsOptimization: new Watcher<boolean>(),
        auditTrailEnabled: new Watcher<boolean>(),
        trafficEncryptionForced: new Watcher<boolean>(),
        videoTrafficEncryptionForced: new Watcher<boolean>(),
        sessionLimitToggle: new Watcher<boolean>(),
        sessionLimitMinutes: new Watcher<number>(),
        sessionLimitUnit: new Watcher<string>(),
    };

    readonly minutes: string = 'Minute(s)';
    readonly hours: string = 'Hour(s)';

    @ViewChildren('timeUnitTracker') timeUnitTracker: QueryList<ElementRef>;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.debugMode = this.CONFIG.allowDebugMode;
        this.betaMode = this.CONFIG.allowBetaMode;
        this.menuService.setSection('admin');
    }

    private updateSettings(forceMergeState?: boolean) {
        const merging = typeof(this.system.mergeInfo) !== 'undefined' || forceMergeState;
        const available = !this.system.isOnline || !this.system.isAvailable;
        this.settings = {
            disconnectDisabled: merging,
            mergeDisabled: (merging || available) && !(this.debugMode || this.betaMode),
            renameDisabled: merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master',
            showMerge: this.system.isMine && this.systemsService.systems.length > 1
        };
    }

    constructor(@Inject(ViewContainerRef) viewContainerRef,
                private accountService: NxAccountService,
                private applyService: NxApplyService,
                private processService: NxProcessService,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemsService: NxSystemsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                location: Location,
    ) {
        this.viewContainerRef = viewContainerRef;
        this.location = location;
        this.setupDefaults();
    }


    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.systems);
        this.currentlyMerging = false;
        this.settings = {
            disconnectDisabled: false,
            mergeDisabled: false,
            renameDisabled: false,
            showMerge: true
        };

        this.limitSessionTimeUnits = [
            { value: this.minutes, name: this.LANG.system.settings.sessionLimitDuration.minutes, id: 1, max: 600 },
            { value: this.hours, name: this.LANG.system.settings.sessionLimitDuration.hours, id: 2, max: 600 },
        ];

        this.initForApplyService();

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            Object.values(this.settingsWatchers));

        this.init();
    }

    initForApplyService(): void {
        this.resetVideoEncryptionIfDisabled = () => {
            const encryptTraffic = this.settingsWatchers.trafficEncryptionForced.value;
            const encryptVideo = this.settingsWatchers.videoTrafficEncryptionForced.value;
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
            // handle toggle for sessionLimit, if saving an empty value
            if (this.timeUnitCount === null) {
                this.settingsWatchers.sessionLimitToggle.originalValue = false;
                this.settingsWatchers.sessionLimitToggle.value = false;
            }
            const changes = {};
            const sw = this.settingsWatchers;
            const settings = Object.keys(sw);
            for (const setting of settings) {
                if (setting === 'sessionLimitToggle' || setting === 'sessionLimitUnit') {
                    continue;
                }

                // handles save for sessionLimitMinutes differently; only one that isn't a boolean
                const obj = sw[setting];
                if (setting !== 'sessionLimitMinutes') {
                    if (obj.value !== obj.originalValue) {
                        changes[setting] = obj.value;
                        obj.originalValue = obj.value;
                    }
                } else if (sw.sessionLimitToggle.value === true) {
                    const minutesMatch = obj.value === obj.originalValue;
                    const unitMatch = sw.sessionLimitUnit.value === sw.sessionLimitUnit.originalValue;
                    if (!minutesMatch || !unitMatch) {
                        const hourMultiplier = sw.sessionLimitUnit.value === 'Hour(s)' ? 60 : 1;
                        changes[setting] = this.timeUnitCount * hourMultiplier;
                        obj.originalValue = obj.value;
                        if (!unitMatch) {
                            sw.sessionLimitUnit.originalValue = sw.sessionLimitUnit.value;
                        }
                    }
                } else if (obj.originalValue !== 0) {
                    changes[setting] = 0;
                    obj.originalValue = 0;
                    obj.value = 0;
                }
            }
            return this.system.updateOrGetSystemSettings(changes)
                .then(() => this.applyService.reset());
        });
    }

    init(): void {
        this.settingsService
            .systemSubject
            .subscribe((system) => {
                if (system) {
                    this.system = system;
                    this.systemSubscription = system.infoSubject.subscribe(() => {
                        this.settingsService.footerSubject.next(true);
                        this.updateSettings(this.currentlyMerging);
                    });
                    if (!this.applyService.locked) {
                        this.system.updateOrGetSystemSettings()
                            .then(res => {
                                const { settings } = res.reply;
                                this.applyService.setVisible(false);
                                this.applyService.hardReset();
                                const sw = this.settingsWatchers;
                                Object.keys(sw).forEach(setting => {
                                    if (setting in settings) {
                                        let curr = settings[setting];
                                        /**
                                         * sets initial values for system & security settings
                                         * limitSessionDuration is the only one that's a number & not a boolean,
                                         * so it needs custom code to handle
                                         */
                                        if (isNaN(curr)) {
                                            sw[setting].value = curr === 'true';
                                        } else {
                                            curr = parseInt(curr);
                                            sw.sessionLimitToggle.value = Boolean(curr);
                                            this.timeUnitCount = curr;
                                            if (curr % 60 === 0) {
                                                this.timeUnitCount /= 60;
                                                sw.sessionLimitUnit.value = 'Hour(s)';
                                            } else {
                                                sw.sessionLimitUnit.value = 'Minute(s)';
                                            }
                                            sw[setting].value = this.timeUnitCount;
                                            this.timeUnitCount = this.timeUnitCount || 24;
                                            this.selectedTimeUnit = this.limitSessionTimeUnits
                                                                        .find(e => e.name === sw.sessionLimitUnit.value);
                                            this.updateTimeUnitInput(this.selectedTimeUnit);
                                        }
                                    }
                                });
                                this.applyService.reset();
                                this.applyService.setVisible(true);
                            });
                    }

                    this.deletingSystem = this.processService.createProcess(() => {
                        return this.system.deleteFromCurrentAccount();
                    }, {
                        successMessage: this.LANG.system.successDeleted.replace('{{systemName}}', this.system.info.name),
                        errorPrefix   : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
                    }).then(() => {
                        this.updateAndGoToSystems();
                    }, (error) => {
                        return error;
                    });
                }
            });

    }

    disconnect() {
        if (this.system.isMine) {
            // User is the owner. Deleting system means unbinding it and disconnecting all accounts
            // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
            this.dialogs.disconnect(this.system.id)
                .then((result) => {
                    if (result) {
                        this.updateAndGoToSystems();
                    }
                });
        }
    }

    updateAndGoToSystems() {
        this.userDisconnectSystem = true;
        this.systemsService
            .forceUpdateSystems(this.accountService.getEmail())
            .subscribe(() => {
                setTimeout(() => {
                    window.location.href = '/systems';
                });
            });
    }

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            this.dialogs.confirm(this.LANG.system.confirmUnshareFromMe, this.LANG.system.confirmUnshareFromMeTitle, this.LANG.system.confirmUnshareFromMeAction, 'btn-danger', 'Cancel')
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
                       this.systemsService.forceUpdateSystems(this.accountService.getEmail());
                   });
    }

    mergeSystems() {
        this.systems = this.systemsService.getMySystems(this.accountService.getEmail(), this.system.id);
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        this.settingsService.system = this.system;

        return this.dialogs
                   .merge(this.system, this.systems, this.accountService)
                   .then((mergeInfo) => {
                       if (mergeInfo) {
                           this.system.mergeInfo = mergeInfo;
                           const systemId = mergeInfo.role === 'master' ? this.system.id : mergeInfo.anotherSystemId;
                           this.systemsService.addToMergeList(systemId);
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
                               this.LANG.dialogs.okButton,
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

    updateTimeUnitInput(timeUnit) {
        this.currentMaxTimeUnit = timeUnit.max;
        const el = this.timeUnitTracker.first;
        if (el) {
            if (el.nativeElement.value > this.currentMaxTimeUnit) {
                el.nativeElement.value = this.currentMaxTimeUnit;
            }
            el.nativeElement.setAttribute('max', this.currentMaxTimeUnit);

            if (this.selectedTimeUnit !== timeUnit.name) {
                this.settingsWatchers.sessionLimitUnit.value = timeUnit.name;
                this.selectedTimeUnit = timeUnit;
            }
        }
    }

    storePreviousValue() {
        this.previousInputValue = this.timeUnitCount + this.settingsWatchers.sessionLimitUnit.value;
    }

    validationCheckForInput(e) {
        if ((e.key === 'Backspace' || e.key === 'Delete') && this.timeUnitCount === null) {
            this.timeUnitCount = undefined;
        // checks if entering a value NaN (+-.), less than min, or greater than max
        } else if (
            !this.timeUnitCount
            || this.timeUnitCount < 1
            || this.timeUnitCount > this.currentMaxTimeUnit
        ) {
            this.timeUnitCount = parseInt(this.previousInputValue);
        }

        this.updateTimeUnitWatcher();
    }

    updateTimeUnitWatcher() {
        const sw = this.settingsWatchers;
        if (sw.sessionLimitUnit.value === 'Minute(s)' && this.timeUnitCount % 60 === 0) {
            sw.sessionLimitUnit.value = 'Hour(s)';
            this.selectedTimeUnit = this.limitSessionTimeUnits
                                        .find(e => e.name === sw.sessionLimitUnit.value);
            this.timeUnitCount /= 60;
        }
        if (this.timeUnitCount === undefined) {
            sw.sessionLimitMinutes.value = 0;
        } else {
            sw.sessionLimitMinutes.value = this.timeUnitCount;
        }
    }

    ngOnDestroy() {
    }
}
