import {
    Component, OnInit, ViewChild, Inject,
    ElementRef, ViewContainerRef
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
import { NxApplyService, Watcher }   from '../../../../services/apply.service';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

interface Settings {
    disconnectDisabled: boolean;
    mergeDisabled: boolean;
    renameDisabled: boolean;
    showMerge: boolean;
}


@Component({
    selector   : 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls  : ['admin.component.scss']
})

export class NxSystemAdminComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};
    system: NxSystem;
    systems: any;
    location: any;

    userDisconnectSystem: any;
    deletingSystem: any;
    userRole: string;
    currentlyMerging: boolean;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    originalStatuses: any = {};
    changedStatuses: any = {};
    checkboxStatuses: any = {};
    limitSessionTimeUnits: any;
    selectedTimeUnit: string;
    selectedTimeUnitObject: any;
    timeUnitCount: number;
    viewContainerRef: ViewContainerRef;
    saveSettings: any;
    resetVideoEncryptionIfDisabled: any;

    settingsWatchers: any = {
        autoDiscoveryEnabled: new Watcher<boolean>(),
        statisticsAllowed: new Watcher<boolean>(),
        cameraSettingsOptimization: new Watcher<boolean>(),
        auditTrailEnabled: new Watcher<boolean>(),
        trafficEncryptionForced: new Watcher<boolean>(),
        videoTrafficEncryptionForced: new Watcher<boolean>(),
        sessionLimitMinutes: new Watcher<number>(),
    };

    @ViewChild('timeUnitTracker', {static: false})
    timeUnitTracker: ElementRef;

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
            { value: 'Minute(s)', name: 'Minute(s)', id: 1, max: 60 },
            { value: 'Hour(s)', name: 'Hour(s)', id: 2, max: 24 },
        ];
        this.selectedTimeUnit = 'Hour(s)';
        this.selectedTimeUnitObject = this.limitSessionTimeUnits
                                         .find(e => e.name === this.selectedTimeUnit);
        this.timeUnitCount = 1;

        this.resetVideoEncryptionIfDisabled = () => {
            const encryptTraffic = this.settingsWatchers['trafficEncryptionForced'].value;
            const encryptVideo = this.settingsWatchers['videoTrafficEncryptionForced'].value;
            if (!encryptTraffic && encryptVideo) {
                this.settingsWatchers['videoTrafficEncryptionForced'].value = false;
            }
        }

        this.initProcesses();

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            Object.values(this.settingsWatchers));

        this.init();
    }

    init(): void {
        this.settingsService
            .systemSubject
            .subscribe((system) => {
                this.system = system;
                if (system) {
                    this.system.systemSubject.subscribe(() => {
                        this.settingsService.footerSubject.next(true);
                        this.userRole = system.accessRole;
                        if (system.accessRole in this.LANG.accessRoles) {
                            this.userRole = this.LANG.accessRoles[system.accessRole].label;
                        }
                        this.updateSettings(this.currentlyMerging);
                    });

                    this.system.updateOrGetSystemSettings()
                        .then(res => {
                            const { settings } = res.reply;

                            Object.keys(this.settingsWatchers).forEach(setting => {
                                if (setting in settings) {
                                    const curr = settings[setting];
                                    this.settingsWatchers[setting].value = parseInt(curr) || curr === 'true';
                                }
                            });
                            this.applyService.setVisible(true);
                        });

                    this.deletingSystem = this.processService.createProcess(() => {
                        return this.system.deleteFromCurrentAccount();
                    }, {
                        successMessage: this.LANG.system.successDeleted.replace('{{systemName}}', this.system.info.name),
                        errorPrefix   : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
                    })
                        .then(() => {
                            this.updateAndGoToSystems();
                        }, (error) => {
                            return error;
                        });
                }
            });

    }

    initProcesses(): void {
        this.saveSettings = this.processService.createProcess(() => {
            const changes = {};
            Object.keys(this.settingsWatchers).forEach(setting => {
                const obj = this.settingsWatchers[setting];
                if (obj.value !== obj.originalValue) {
                    changes[setting] = obj.value;
                }
            })
            // if changes is empty, it will return system settings
            return this.system.updateOrGetSystemSettings(changes)
                .then(success => console.log('SUCCESS!', success));


            // return this.system.saveUser(selectedUser, selectedUser.role).then(() => {
            //     return this.system.getUsers(true);
            // })
            // .then(() => {
            // setTimeout(() => {
            //     this.applyService.hardReset();
            //     this.setUser();
            //     this.applyService.reset();
            // });
        });
    }

    ngAfterViewInit() {
        this.updateTimeUnitInput(this.selectedTimeUnitObject);
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

    updateTimeUnitInput(timeUnit) {
        const { max } = timeUnit;
        const el = this.timeUnitTracker;
        if (el) {
            if (el.nativeElement.value > max) {
                el.nativeElement.value = max;
            }
            el.nativeElement.setAttribute('max', max);

            if (this.selectedTimeUnit !== timeUnit.name) {
                this.selectedTimeUnit = timeUnit.name;
                this.selectedTimeUnitObject = timeUnit;
            }
        }
    }
}
