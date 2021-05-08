import {
    Component, Inject, OnDestroy,
    OnInit, ViewContainerRef
}                                          from '@angular/core';
import {
    Params, Router, ActivatedRoute
}                                          from '@angular/router';
import { UntilDestroy }                    from '@ngneat/until-destroy';
import { Subscription }                    from 'rxjs';
import { auditTime, distinctUntilChanged } from 'rxjs/operators';
import { NxRibbonService }                 from '@components/ribbon';
import { NxConfigService, IConfig }        from '@services/nx-config';
import { NxLanguageProviderService }       from '@services/nx-language-provider';
import { NxProcessService }                from '@services/process.service';
import { NxSystem, NxSystemUser }          from '@services/system.service';
import { NxDialogsService }                from '@dialogs/dialogs.service';
import { NxPageService }                   from '@services/page.service';
import { NxSystemsService }                from '@services/systems.service';
import { NxAccountService }                from '@services/account.service';
import { NxCloudApiService }               from '@services/nx-cloud-api';
import { NxUriService }                    from '@services/uri.service';
import { NxToastService }                  from '@dialogs/toast.service';
import { NxApplyService, Watcher }         from '@services/apply.service';
import { WINDOW }                          from '@services/window-provider';
import { NxMenuService }                   from '@src/menu';
import { LanguageI18NStaticTypes }         from '@app/language_i18n_static_types';
import { NxSettingsService }               from '../settings.service';

interface Settings {
    disconnectDisabled: boolean;
    renameDisabled: boolean;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-system-admin-component',
    templateUrl : 'admin.component.html',
    styleUrls   : ['admin.component.scss']
})
export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    user: NxSystemUser;
    system: NxSystem;
    systems;

    systemNameWatcher = new Watcher('');
    emptyName = false;

    advanced: boolean;
    userDisconnectSystem;
    currentlyMerging = false;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    settingsSubscription: Subscription;
    settingsServiceSubscription: Subscription;
    systemsSubscription: Subscription;
    systemSubscription: Subscription;
    currentMergeInfo: any = undefined;
    merging: boolean;
    editMode = false;

    settingsForSystem;

    get systemName() {
        return this.systemNameWatcher.value;
    }

    set systemName(value) {
        this.systemNameWatcher.value = value;
    }

    private setupDefaults() {
        this.advanced = (this.route.snapshot.routeConfig.path === 'advanced');
        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
        this.menuService.detail = this.CONFIG.menus.systemSettings.general.id;

        this.route.queryParams.subscribe((params) => {
            this.advanced = (this.route.snapshot.routeConfig.path === 'advanced' || params.advanced !== undefined);
            if (this.CONFIG.isLocal && params.advanced !== undefined) {
                this.router.navigate(['settings/advanced']);
            }
        });
    }

    private setNameAndTitle() {
        this.systemNameWatcher.originalValue = this.system.info.systemName || this.system.info.name;
        this.systemNameWatcher.value = this.systemNameWatcher.originalValue;
        this.pageService.pageTitle = this.systemNameWatcher.originalValue;
    }

    private updateSettings(forceMergeState?: boolean) {
        this.merging = this.system && typeof this.system.mergeInfo !== 'undefined' || forceMergeState;
        this.settings = {
            disconnectDisabled : this.merging,
            renameDisabled     : this.merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master'
        };
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private router: Router,
        private route: ActivatedRoute,
        private cloudApiService: NxCloudApiService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef,
        @Inject(WINDOW) private window: Window,
        private applyService: NxApplyService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.accountService.get()
            .then((account) => {
                // @ts-ignore
                this.user = account;
            });

        this.settings = {
            disconnectDisabled : false,
            renameDisabled     : false
        };

        if (this.settingsServiceSubscription) {
            this.settingsServiceSubscription.unsubscribe();
        }
        this.settingsServiceSubscription = this.settingsService
            .systemSubject
            .pipe(distinctUntilChanged())
            .subscribe((system) => {
                if (!system) {
                    this.system = undefined;
                    return;
                }
                this.system = system;
                this.setNameAndTitle();
                this.applyService.reset();

                if (this.systemSubscription) {
                    this.systemSubscription.unsubscribe();
                }
                this.systemSubscription = system.infoSubject
                    .pipe(auditTime(this.CONFIG.system.auditTime))
                    .subscribe(system => {
                        if (!system) return;
                        if (this.system && !this.system.isAvailable && system && system.isAvailable) {
                            this.system = system;
                        }
                        this.settingsService.footerSubject.next(true);
                        this.updateSettings(this.currentlyMerging);
                        this.syncMergeAlerts();

                        if (this.settingsSubscription) {
                            this.settingsSubscription.unsubscribe();
                        }
                        if (!this.applyService.locked) {
                            this.setNameAndTitle();
                        }

                        if (!this.CONFIG.isLocal || (this.CONFIG.isLocal && this.system.userManager.permissions.isAdmin)) {
                            this.settingsSubscription = this.system.updateOrGetSystemSettings()
                                .subscribe((response: any) => {
                                    if (response.reply) {
                                        this.settingsForSystem = response.reply.settings;
                                    }
                                }, (err) => {
                                    this.settingsForSystem = false;
                                    console.error(err);
                                });
                        }
                    });
            });

        this.initWatchers();
    }

    initWatchers() {
        this.applyService.initPageWatcher(this.applyContainerRef);
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.systemNameWatcher],
            this.processService.createProcess(() => {
                if (this.systemNameWatcher.changed) {
                    if (/^\s+$/.test(this.systemName) || this.systemName.trim() === this.systemNameWatcher.originalValue) {
                        this.systemNameWatcher.reset();
                        return Promise.resolve();
                    }
                    return (this.CONFIG.isLocal ? this.system.mediaserver : this.cloudApiService).renameSystem(this.system.id, this.systemName.trim())
                        .then(() => {
                            this.systemNameWatcher.originalValue = this.systemNameWatcher.value;
                            this.systemNameWatcher.value = this.systemNameWatcher.originalValue;
                            return this.system.update();
                        }).catch(() => {
                            this.systemNameWatcher.reset();
                            const options = {
                                classname : this.CONFIG.toast.warning,
                                autohide  : true,
                                delay     : this.CONFIG.alertTimeout
                            };
                            this.toastService.show(this.LANG.toastMessage.nameFail().replace('{type}', this.LANG.common.system?.()), options);
                        });
                } else {
                    return Promise.resolve();
                }
            }),
            this.systemNameWatcher.reset
        );
    }

    syncMergeAlerts() {
        if (this.system?.mergeInfo) {
            this.currentMergeInfo = this.system.mergeInfo;
        } else if (this.currentMergeInfo && this.system?.mergeInfo === undefined) {
            this.currentMergeInfo = undefined;
            if (!this.CONFIG.isLocal) {
                this.systemsService.forceUpdateSystems().toPromise().catch(console.error);
            } else {
                this.ribbonService.hide();
            }
        }

        if (this.systemsSubscription) {
            this.systemsSubscription.unsubscribe();
        }
        this.systemsSubscription = this.systemsService.systemsSubject
            .subscribe(() => {
                if (this.systemsService.finishedMerged) {
                    this.systemsService.finishedMerged = false;
                    this.system.getInfo(true, false);
                }
            });
    }

    connectLocalToCloud() {
        this.dialogs
            .connectLocalToCloud(this.accountService, this.system)
            .then((result) => {
                if (result) {
                    // give the user chance to read the toaster
                    setTimeout(() => this.window.location.reload(), 2000);
                }
            });
    }

    disconnectFromCloud() {
        const handleDisconnect = () => this.dialogs.disconnect(this.accountService, this.system)
            .then((result) => {
                if (result) {
                    if (this.CONFIG.isLocal) {
                        // give the user chance to read the toaster
                        setTimeout(() => this.window.location.reload(), 2000);
                    } else {
                        this.updateAndGoToSystems();
                    }
                }
            });

        if (this.system.userManager.isMine) {
            if (!this.system.cloudStorageCapable) {
                return handleDisconnect();
            }
            this.cloudApiService.getCloudStorageUsage(this.system.id).then(() => {
                // Display systemDisconnectError when attempting to disconnect system with cloud storage enabled
                const { dialogs: { cloudStorage:{ systemDisconnectError: { title, message } }, buttons: { ok } } } = this.LANG;
                this.dialogs.confirm(message, title, ok);
            }).catch(() => {
                // User is the owner. Deleting system means unbinding it and disconnecting all accounts
                // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
                this.dialogs
                    .disconnect(this.accountService, this.system)
                    .then((result) => {
                        if (result) {
                            if (NxConfigService.isLocal && this.system.currentUser?.isCloud) {
                                this.accountService.logout();
                            } else {
                                if (NxConfigService.isLocal) {
                                    // give the user chance to read the toaster
                                    setTimeout(() => this.window.location.reload(), 2000);
                                } else {
                                    this.updateAndGoToSystems();
                                }
                            }
                        }
                    });
            });
        }
    }

    updateAndGoToSystems = () => {
        // this.userDisconnectSystem = true;
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

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            if (this.CONFIG.isLocal) {
                return this.dialogs.removeSystem(this.system)
                    .then((response) => {
                        if (response) {
                            setTimeout(() => {
                                this.accountService.logout();
                            }, 6000);
                        }
                    });
            }
            this.dialogs.confirm(
                this.LANG.dialogs.removeSystem.message(),
                this.LANG.dialogs.removeSystem.title(),
                this.LANG.dialogs.removeSystem.action(),
                'btn-danger',
                this.LANG.dialogs.buttons.cancel()
            ).then((result) => {
                if (result === true) {
                    return this.system.deleteFromCurrentAccount().subscribe(res => {
                        this.toastService.show(
                            this.LANG.toastMessage.system.deleted.success({ systemName: this.system.info.systemName || this.system.info.name }),
                            {
                                classname : this.CONFIG.toast.success,
                                autohide  : true,
                                delay     : this.CONFIG.alertTimeout
                            });
                    }, err => {
                        console.error(err);
                        this.toastService.show(
                            this.LANG.errorCodes.cantUnshareWithMeSystemPrefix(),
                            { classname: this.CONFIG.toast.danger }
                        );
                    },
                    this.updateAndGoToSystems
                    );
                }
            });
        }
    }

    mergeSystems() {
        this.systems = this.systemsService.getMySystems(this.accountService.email, this.system.id);
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        this.settingsService.system = this.system;
        return this.dialogs
            .merge(this.accountService, this.system, this.systems)
            .then((mergeInfo: any) => {
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
                const commonErrorMsg = NxLanguageProviderService.translate(
                    this.LANG.dialogs.merge.commonText,
                    { primarySystem: error.primarySystemName, secondarySystem: error.secondarySystemName }
                );

                let downloadHTML = `<span>${this.LANG.dialogs.merge.latestBuild?.()}</span>`;
                if (this.CONFIG.cloudHost) {
                    downloadHTML = `<a href=\"${this.CONFIG.isLocal ? this.CONFIG.cloudHost : ''}/download" target=\"_blank\">${this.LANG.dialogs.merge.latestBuild?.()}</a>`;
                }
                const responseError = NxLanguageProviderService.translate(
                    this.LANG.errorCodes[error.errorText] || this.LANG.errorCodes[error.resultCode] || this.LANG.errorCodes.unknownMergeError,
                    {
                        failedSystem: error.failedSystemName,
                        downloadHTML
                    }
                );

                // HTML needed for section formatting
                const dialogBody = '<p>' + commonErrorMsg + '</p><p>' + responseError + '</p>';

                // Handling promise to satisfy the linter.
                this.dialogs.confirm(
                    dialogBody,
                    this.LANG.dialogs.merge.mergeFailedTitle(),
                    this.LANG.dialogs.buttons.ok(),
                    'btn-primary',
                    undefined).then(() => {});
            }).finally(() => {
                this.currentlyMerging = false;
                this.updateSettings(this.currentlyMerging);
                this.syncMergeAlerts();
                this.settingsService.system = this.system;
            });
    }

    updateUserRole() {
        let userRole = this.system.accessRole;
        if (this.system.accessRole in this.LANG.accessRoles) {
            userRole = this.LANG.accessRoles[this.system.accessRole].label();
        }
        return userRole;
    }

    hideAdvancedSettings() {
        const queryParams: Params = {};
        queryParams.advanced = undefined;

        this.uriService
            .updateURI(this.uriService.getURL(), queryParams, true)
            .then(() => {
                this.advanced = false;
            });
    }
}
