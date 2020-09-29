import {
    Component, Inject, OnDestroy, OnInit, ViewContainerRef
} from '@angular/core';
import {
    Params, Router, ActivatedRoute
}                                    from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription }              from 'rxjs';
import { auditTime }                 from 'rxjs/operators';

import { NxRibbonService }           from '../../../../components/ribbon';
import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../services/process.service';
import { NxSystem, NxSystemUser }    from '../../../../services/system.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxMenuService }             from '../../../../menu';
import { NxPageService }             from '../../../../services/page.service';
import { NxSystemsService }          from '../../../../services/systems.service';
import { NxAccountService }          from '../../../../services/account.service';
import { NxCloudApiService }         from '../../../../services/nx-cloud-api';
import { NxUriService }              from '../../../../services/uri.service';
import { NxToastService }            from '../../../../dialogs/toast.service';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { NxApplyService } from '../../../../services/apply.service';

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
    params: Params;

    systemName: string;
    editMode = false;
    emptyName = false;

    advanced: boolean;
    userDisconnectSystem;
    deletingSystem: Process;
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

    settingsForSystem;

    private setupDefaults() {
        this.params = this.route.snapshot.queryParams;
        this.advanced = (this.params.advanced !== undefined);

        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.section = 'admin';
        this.menuService.detail = this.CONFIG.menus.systemSettings.admin.id;
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
        @Inject(ViewContainerRef) public viewContainerRef,
        private applyService: NxApplyService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();
        this.applyService.initPageWatcher(this.viewContainerRef);
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
            .subscribe((system) => {
                if (!system) {
                    this.system = undefined;
                    return;
                }
                this.system = system;
                this.systemName = this.system.info.name || this.system.info.systemName;
                this.pageService.pageTitle = this.system.info.systemName;
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
                        this.settingsSubscription = this.system.updateOrGetSystemSettings()
                            .subscribe((response: any) => {
                                if (response.reply) {
                                    this.settingsForSystem = response.reply.settings;
                                }
                            }, (err) => {
                                this.settingsForSystem = false;
                                console.error(err);
                            });
                    });
                this.deletingSystem = this.processService.createProcess(
                    () => this.system.deleteFromCurrentAccount(),
                    {
                        successMessage : this.LANG.toastMessage.system.deleted.success({ systemName: this.system.info.systemName }),
                        errorPrefix    : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix()
                    }
                ).then(
                    () => { this.updateAndGoToSystems(); },
                    error => error
                );
            });
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

    handleBlur() {
        const originalName = this.system.info.name || this.system.info.systemName;
        this.editMode = false;

        if (!this.systemName || this.emptyName) {
            this.systemName = originalName;
        } else if (this.systemName !== originalName) {
            this.cloudApiService.renameSystem(this.system.id, this.systemName)
                .catch(() => {
                    this.systemName = originalName;
                    const options = {
                        classname : this.CONFIG.toast.warning,
                        autohide  : true,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.toastMessage.nameFail().replace('{type}', this.LANG.common.system), options);
                });
        }
    }

    handleFocus() {
        this.editMode = true;
    }

    handleNameChange(newName) {
        this.emptyName = /^\s+$/.test(newName);
    }

    connectLocalToCloud() {
        this.dialogs
            .connectLocalToCloud(this.accountService, this.system)
            .then((result) => {
                if (result) {
                    // give the user chance to read the toaster
                    setTimeout(() => window.location.reload(), 2000);
                }
            });
    }

    disconnectFromCloud() {
        const handleDisconnect = () => this.dialogs.disconnect(this.accountService, this.system)
            .then((result) => {
                if (result) {
                    this.updateAndGoToSystems();
                }
            });

        if (this.system.isMine) {
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
                            if (NxConfigService.isLocal && this.system.currentUser.isCloud) {
                                this.accountService.logout();
                            } else {
                                if (NxConfigService.isLocal) {
                                    // give the user chance to read the toaster
                                    setTimeout(() => window.location.reload(), 2000);
                                } else {
                                    this.updateAndGoToSystems();
                                }
                            }
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

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            this.dialogs.confirm(
                this.LANG.dialogs.removeSystem.message(),
                this.LANG.dialogs.removeSystem.title(),
                this.LANG.dialogs.removeSystem.action(),
                'btn-danger',
                this.LANG.dialogs.buttons.cancel()
            ).then((result) => {
                if (result === true) {
                    return this.deletingSystem.run();
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
                const commonErrorMsg = this.LANG.dialogs.merge.commonText()
                    .replace('{{primarySystem}}', error.primarySystemName)
                    .replace('{{secondarySystem}}', error.secondarySystemName);
                let responseError = this.LANG.errorCodes[error.errorText]() || this.LANG.errorCodes[error.resultCode]();
                if (!responseError) {
                    responseError = this.LANG.errorCodes.unknownMergeError();
                } else {
                    responseError = responseError.replace('{{failedSystem}}', error.failedSystemName);
                }

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
