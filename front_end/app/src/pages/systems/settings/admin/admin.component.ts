import {
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { auditTime, distinctUntilChanged } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { FormWatcher, NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo, CloudResponse } from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem, NxSystemUser } from '@services/system.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { NxMenuService } from '@src/menu';

import { NxSettingsService } from '../settings.service';

interface Settings {
    disconnectDisabled: boolean;
    renameDisabled: boolean;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls: ['admin.component.scss']
})
export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    ownershipTransferEnabled: boolean = false;

    user: NxSystemUser;
    system: NxSystem;
    systems;

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
    enableEdit = false;
    connectToCloudProcess: Process

    settingsForSystem;
    systemName: string;
    systemNameFormWatcher: FormWatcher;
    systemNameProcess: Process;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('systemNameForm', { read: NgForm }) systemNameForm;

    transfers: SystemTransferInfo[] = [];
    systemTransferInProcess: boolean = false;
    // newSystemOwner: string = '';
    // TODO: Get these from system

    private setupDefaults() {
        this.advanced = (this.router.url.includes('/advanced') ||
            this.route.snapshot.routeConfig.path === 'advanced');
        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
        this.menuService.detail = this.CONFIG.menus.systemSettings.general.id;

        this.connectToCloudProcess = this.processService.createProcess(
            () => this.connectLocalToCloud(),
            { ignoreError: true },
            (skip) => {
                if (skip === true) {
                    return;
                }
                this.toastService.notify(
                    this.LANG.toastMessage.system.cloudConnect.success(),
                    'success'
                );
                setTimeout(() => this.window.location.reload(), 2000);
            },
            (skip) => {
                if (skip === true) {
                    return;
                }
                this.toastService.notify(
                    this.LANG.toastMessage.system.cloudConnect.failed(),
                    'danger'
                );
            }
        );

        this.route.queryParams.subscribe((params) => {
            this.advanced = (this.router.url.includes('/advanced') ||
                this.route.snapshot.routeConfig.path === 'advanced' ||
                params.advanced !== undefined);

            if (params.advanced !== undefined) {
                if (this.environment.isLocal) {
                    this.router.navigate(
                        ['settings/advanced'],
                        { replaceUrl: true }
                    );
                } else {
                    this.router.navigate(
                        [`systems/${this.route.snapshot.params.systemId}/advanced`],
                        { replaceUrl: true }
                    );
                }
            }
        });
    }

    private setNameAndTitle() {
        this.systemName = this.system.info.systemName || this.system.info.name;
        this.pageService.pageTitle = this.systemName;

        setTimeout(() => {
            this.systemNameFormWatcher = this.applyService.createFormWatcher(
                'systemNameForm',
                this.systemNameForm,
                this.systemNameProcess);
        });
    }

    private updateSettings(forceMergeState?: boolean) {
        this.merging = this.system && typeof this.system.mergeInfo !== 'undefined' ||
            forceMergeState;
        this.settings = {
            disconnectDisabled: this.merging,
            renameDisabled: this.merging &&
                this.system.mergeInfo &&
                this.system.mergeInfo.role !== 'master'
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

        this.ownershipTransferEnabled = configService.flagsEnabled(
            'cloudOwnershipTransfer'
        );

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
            disconnectDisabled: false,
            renameDisabled: false
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

                if (this.systemSubscription) {
                    this.systemSubscription.unsubscribe();
                }
                this.systemSubscription = system.infoSubject
                    .pipe(auditTime(this.CONFIG.system.auditTime))
                    .subscribe(system => {
                        if (!system) return;
                        if (
                            this.system && !this.system.isAvailable &&
                            system && system.isAvailable
                        ) {
                            this.system = system;
                        }
                        this.settingsService.footerSubject.next(true);
                        this.updateSettings(this.currentlyMerging);
                        this.syncMergeAlerts();

                        this.enableEdit = this.system.isOnline &&
                            this.system.userManager.permissions.isAdmin &&
                            !this.settings.renameDisabled;

                        if (this.settingsSubscription) {
                            this.settingsSubscription.unsubscribe();
                        }
                        if (!this.applyService.locked) {
                            this.setNameAndTitle();
                        }

                        if (
                            !this.environment.isLocal ||
                            (
                                this.environment.isLocal &&
                                this.system.userManager.permissions.isAdmin
                            )
                        ) {
                            this.settingsSubscription = this.system
                                .updateOrGetSystemSettings()
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

                if (this.ownershipTransferEnabled && !environment.isLocal) {
                    this.cloudApiService.getTransfers()
                        .subscribe((res: SystemTransferInfo[]) => {
                            this.transfers = res;
                            this.systemTransferInProcess = res.some(info =>
                                info.toAccount === system.userManager.currentUserEmail
                            );
                        });
                }
            });

        this.initProcesses();
        this.applyService.initPageFormsWatcher(this.pageApply);
    }

    initProcesses() {
        this.systemNameProcess = this.processService.createProcess(() => {
            if (/^\s+$/.test(this.systemName)) {
                return Promise.resolve();
            }
            return (this.environment.isLocal ? this.system.mediaserver : this.cloudApiService)
                .renameSystem(this.system.id, this.systemName.trim())
                .then(() => {
                    return this.system.update();
                }).catch(() => {
                    const options = {
                        classname: this.CONFIG.toast.warning,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };
                    this.toastService.show(
                        this.LANG.toastMessage.nameFail().replace(
                            '{type}',
                            this.LANG.common.system?.()
                        ),
                        options
                    );
                });
        });
    }

    syncMergeAlerts() {
        if (this.system?.mergeInfo) {
            this.currentMergeInfo = this.system.mergeInfo;
        } else if (
            this.currentMergeInfo &&
            this.system?.mergeInfo === undefined
        ) {
            this.currentMergeInfo = undefined;
            if (!this.environment.isLocal) {
                this.systemsService.forceUpdateSystems().toPromise()
                    .catch(console.error);
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

    transferOwnership() {
        this.dialogs.transferOwnership(this.system, this.transfers);
    }

    connectLocalToCloud() {
        if (this.window.navigator.onLine) {
            return this.dialogs.connectLocalToCloud(
                this.accountService,
                this.system
            );
        } else {
            this.dialogs.notify(
                this.LANG.toastMessage.noInternet(),
                'warning',
                true
            );
            return Promise.resolve(true);
        }
    }

    async disconnectFromCloud() {
        if (!this.system) {
            return setTimeout(() => this.disconnectFromCloud(), 500);
        }
        const handleDisconnect = () => this.dialogs
            .disconnect(this.accountService, this.system)
            .then((result) => {
                if (result) {
                    if (this.environment.isLocal) {
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
                const {
                    dialogs: {
                        cloudStorage: { systemDisconnectError: { title, message } },
                        buttons: { ok }
                    }
                } = this.LANG;
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
            if (this.environment.isLocal) {
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
                            this.LANG.toastMessage.system.deleted.success({
                                systemName: this.system.info.systemName ||
                                this.system.info.name
                            }),
                            {
                                classname: this.CONFIG.toast.success,
                                autohide: true,
                                delay: this.CONFIG.alertTimeout
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
        this.systems = this.systemsService.getMySystems(
            // this.accountService.email, // doesn't work as it was never set; looks like it's out of sync conceptually
            this.accountService.account.email,
            this.system.id
        );
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        this.settingsService.system = this.system;
        return this.dialogs
            .merge(this.accountService, this.system, this.systems)
            .then((mergeInfo: any) => {
                if (mergeInfo) {
                    this.system.mergeInfo = mergeInfo;
                    const systemId = mergeInfo.role === 'master'
                        ? this.system.id
                        : mergeInfo.anotherSystemId;
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
                    {
                        primarySystem: error.primarySystemName,
                        secondarySystem: error.secondarySystemName
                    }
                );

                let downloadHTML = `<span>${this.LANG.dialogs.merge.latestBuild?.()}</span>`;
                if (this.CONFIG.cloudHost) {
                    downloadHTML = `<a href=\"${this.environment.isLocal ? this.CONFIG.cloudHost : ''}/download" target=\"_blank\">${this.LANG.dialogs.merge.latestBuild?.()}</a>`;
                }
                const responseError = NxLanguageProviderService.translate(
                    this.LANG.errorCodes[error.errorText] ||
                        this.LANG.errorCodes[error.resultCode] ||
                        this.LANG.errorCodes.unknownMergeError,
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
        if (this.router.url.includes('/advanced')) {
            this.environment.isLocal && this.router.navigate(['settings']) ||
                this.router.navigate([`systems/${this.system.id}`]);
        }
    }

    acceptOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'accepted')
            .subscribe((_res: CloudResponse) => {
                this.systemTransferInProcess = false;
                this.window.location.reload();
            });
    }

    rejectOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'rejected')
            .subscribe((_res: CloudResponse) => {
                this.systemTransferInProcess = false;
            });
    }
}
