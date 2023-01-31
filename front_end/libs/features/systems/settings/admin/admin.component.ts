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
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { icons, clientMode, menus, redirect, toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo, CloudResponse } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { SystemConfigSettings } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';

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
    LANG = staticLang;

    ownershipTransferEnabled: boolean = false;

    user: Account;
    system: NxSystem;
    systems: NxSystemInfo[];

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
    connectToCloudProcess: Process;
    disconnectProcess: Process;

    settingsForSystem$: Observable<SystemConfigSettings>;
    systemName: string;
    systemNameFormWatcher: FormWatcher;
    systemNameProcess: Process;
    icons = icons;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('systemNameForm', { read: NgForm }) systemNameForm;

    transferInfo: SystemTransferInfo;

    /** Owner (current user) can send a new ownership transfer request */
    get canSendTransferRequest(): boolean {
        return this.ownershipTransferEnabled &&
            this.system.userManager.isMine &&
            this.system.useRest &&
            !this.transferInfo;
    }

    /** System ownership is offered to the current user */
    get systemOffered(): boolean {
        return !environment.isLocal &&
            !!this.transferInfo &&
            this.transferInfo.toAccount === this.system.userManager.currentUserEmail;
    }

    get newOwnerName(): string {
        return this.system.userManager.users
            .find(u => u.email === this.transferInfo.toAccount)
            ?.fullName || '';
    }

    private setupDefaults(): void {
        this.advanced = (this.router.url.includes('/advanced') ||
            this.route.snapshot.routeConfig.path === 'advanced');
        this.debugMode = clientMode.debug;
        this.betaMode = clientMode.beta;
        this.menuService.section = menus.systemSettings.admin.id;
        this.menuService.detail = menus.systemSettings.general.id;

        this.route.queryParams.subscribe(params => {
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

    private setNameAndTitle(): void {
        const systemName = this.system.info.systemName || this.system.info.name;
        if (this.systemName !== systemName) {
            this.systemName = systemName;
            this.systemNameFormWatcher && this.applyService.removeFormWatcher('systemNameForm');

            setTimeout(() => {
                this.systemNameFormWatcher = this.applyService.createFormWatcher(
                    'systemNameForm',
                    this.systemNameForm,
                    this.systemNameProcess);
            });
        }
    }

    private updateSettings(forceMergeState?: boolean): void {
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
        private translateService: TranslateService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        public settingsService: NxSettingsService,
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

        this.ownershipTransferEnabled = configService.flagsEnabled(
            'cloudOwnershipTransfer'
        );

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.accountService.get()
            .then((account?: Account) => {
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
            .systemSubject$
            .pipe(distinctUntilChanged())
            .subscribe(system => {
                if (!system) {
                    this.system = undefined;
                    return;
                }
                this.system = system;

                if (this.systemSubscription) {
                    this.systemSubscription.unsubscribe();
                }
                this.systemSubscription = system.infoSubject
                    // .pipe(auditTime(this.CONFIG.system.auditTime))
                    .subscribe(system => {
                        if (!system) {
                            return;
                        }
                        if (
                            this.system && !this.system.isAvailable &&
                            system && system.isAvailable
                        ) {
                            this.system = system;
                        }
                        this.updateSettings(this.currentlyMerging);
                        this.syncMergeAlerts();

                        this.enableEdit = this.system.isOnline &&
                            (this.environment.isLocal
                                ? this.system.userManager.permissions.isAdmin
                                : this.system.userManager.isMine) &&
                            !this.settings.renameDisabled;
                        // TODO: Restore cloud admin rename permissions
                        // See CB-1596

                        if (this.settingsSubscription) {
                            this.settingsSubscription.unsubscribe();
                        }
                        if (!this.applyService.locked) {
                            this.setNameAndTitle();
                        }

                        // TODO: In develop add a store for transfers.
                        if (this.ownershipTransferEnabled && !environment.isLocal) {
                            this.cloudApiService.getTransfers()
                                .subscribe((res: SystemTransferInfo[]) => {
                                    this.transferInfo = res.find(transfer =>
                                        transfer.systemId === this.system.id
                                    );
                                });
                        }
                    });
                if (
                    !this.environment.isLocal ||
                        (
                            this.environment.isLocal &&
                            this.system.userManager.permissions.isAdmin
                        )
                ) {
                    this.settingsForSystem$ = this.settingsService.getUpdatedSettings().pipe(untilDestroyed(this));
                }
            });

        this.initProcesses();
        this.applyService.initPageFormsWatcher(this.pageApply);
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }

    initProcesses(): void {
        this.connectToCloudProcess = this.processService.createProcess(
            () => this.connectLocalToCloud(),
            { ignoreError: true },
            skip => {
                if (skip === true) {
                    return;
                }
                this.toastService.notify(
                    this.LANG.toastMessage.system.cloudConnect.success,
                    'success'
                );
                setTimeout(() => this.window.location.reload(), 2000);
            },
            () => {
                this.toastService.notify(
                    this.LANG.toastMessage.system.cloudConnect.failed,
                    'danger'
                );
            }
        );

        this.systemNameProcess = this.processService.createProcess(
            () => {
                const trimmedName = this.systemName.trim();
                if (!trimmedName) {
                    return Promise.reject();
                }
                return (this.environment.isLocal ? this.system.mediaserver : this.cloudApiService)
                    .renameSystem(this.system.id, trimmedName);
            },
            { ignoreError: true },
            () => {
                this.systemsService.forceUpdateSystems().subscribe();
            },
            () => {
                this.toastService.notify(
                    { value: this.LANG.toastMessage.nameFail, params: { type: this.LANG.common.system } },
                    toast.warning,
                );
            });

        this.disconnectProcess = this.processService.createProcess(
            async () => this.CONFIG.featureFlags.cloudStorage && this.system.cloudStorageCapable && this.cloudApiService.getCloudStorageUsage(this.system.id)
                .then(_ => Promise.reject()) // If cloud storage usage returns okay then that probably means we are using cloud storage.
                .catch(_ => Promise.resolve()), // If the request fails that means storage is probably not used.
            { ignoreError: true },
            async () => {
                const pageDidntChangePattern = new RegExp(`\/systems\/${this.system.id}$`);
                if (pageDidntChangePattern.test(this.router.url) && await this.dialogs.disconnect(this.system)) {
                    if (this.environment.isLocal && this.system.currentUser?.isCloud) {
                        this.accountService.logout();
                    } else {
                        if (this.environment.isLocal) {
                            // give the user chance to read the toaster
                            setTimeout(() => this.window.location.reload(), 2000);
                        } else {
                            this.router
                                .navigate([redirect.authorised])
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }
                }
            },
            () => {
                const {
                    dialogs: {
                        cloudStorage: { systemDisconnectError: { title, message } },
                        buttons: { ok }
                    }
                } = this.LANG;
                return this.dialogs.confirm({
                    title,
                    message,
                    safeHTML: true,
                    footer: {
                        actionLabel: ok
                    }
                });
            });
    }

    syncMergeAlerts(): void {
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
                this.systemsService.mergingSystems.add(this.system.id);
                this.systemsService.checkMerge(this.system);
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

    transferOwnership(): void {
        this.dialogs.transferOwnership(this.system).then(info => {
            if (info) {
                this.transferInfo = info;
            }
        });
    }

    connectLocalToCloud() {
        if (this.window.navigator.onLine) {
            return this.dialogs.connectLocalToCloud(this.system);
        } else {
            this.dialogs.notify(
                this.LANG.toastMessage.noInternet,
                'warning',
                true
            );
            return Promise.resolve(true);
        }
    }

    updateAndGoToSystems = (): void => {
        // this.userDisconnectSystem = true;
        this.systemsService.userDisconnectSystem = true;
        this.systemsService
            .forceUpdateSystems(this.accountService.email)
            .subscribe(() => {
                setTimeout(() => {
                    this.router
                        .navigate([redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                });
            });
    };

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            if (this.environment.isLocal) {
                return this.dialogs.removeSystem(this.system)
                    .then(response => {
                        if (response) {
                            setTimeout(() => {
                                this.accountService.logout();
                            }, 6000);
                        }
                    });
            }
            const { title, message, action } = this.LANG.dialogs.removeSystem;
            this.dialogs.confirm({
                title,
                message,
                footer: {
                    buttonClass: 'btn-danger',
                    actionLabel: action,
                    cancelLabel: this.LANG.dialogs.buttons.cancel,
                }
            }).then(result => {
                if (result === true) {
                    return this.system.deleteFromCurrentAccount().subscribe(res => {
                        this.toastService.notify(
                            {
                                value: this.LANG.toastMessage.system.deleted.success,
                                params: {
                                    systemName: this.system.info.systemName ||
                                    this.system.info.name
                                }
                            },
                            toast.success,
                        );
                    }, err => {
                        console.error(err);
                        this.toastService.show(
                            this.LANG.errorCodes.cantUnshareWithMeSystemPrefix,
                            toast.danger,
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
            .merge(this.system, this.systems)
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
            }, error => {
                if (!error.primarySystemName && !error.secondarySystemName) {
                    return;
                }
                const commonErrorMsg = this.translateService.instant('dialogs.merge.commonText', {
                    primarySystem: error.primarySystemName,
                    secondarySystem: error.secondarySystemName
                });

                let downloadHTML = `<span>${this.LANG.dialogs.merge.latestBuild}</span>`;
                if (this.CONFIG.cloudHost) {
                    downloadHTML = `<a href=\"${this.environment.isLocal ? this.CONFIG.cloudHost : ''}/download" target=\"_blank\">${this.LANG.dialogs.merge.latestBuild}</a>`;
                }

                const errorCodeMsg = this.LANG.errorCodes[error.errorText] ||
                    this.LANG.errorCodes[error.resultCode] ||
                    this.LANG.errorCodes.unknownMergeError;
                const responseError = errorCodeMsg({
                    failedSystem: error.failedSystemName,
                    downloadHTML
                });

                // HTML needed for section formatting
                const dialogBody = '<p>' + commonErrorMsg + '</p><p>' + responseError + '</p>';

                this.dialogs.confirm({
                    title: this.LANG.dialogs.merge.mergeFailedTitle,
                    message: dialogBody,
                    safeHTML: true,
                    footer: {
                        actionLabel: this.LANG.dialogs.buttons.ok,
                    }
                });
            }).finally(() => {
                this.currentlyMerging = false;
                this.updateSettings(this.currentlyMerging);
                this.syncMergeAlerts();
                this.settingsService.system = this.system;
            });
    }

    updateUserRole() {
        let userRole = this.system.userManager.accessRole;
        if (userRole in this.LANG.accessRoles) {
            userRole = this.LANG.accessRoles[userRole].label;
        }
        return userRole;
    }

    hideAdvancedSettings(): void {
        if (this.router.url.includes('/advanced')) {
            this.environment.isLocal && this.router.navigate(['settings']) ||
                this.router.navigate([`systems/${this.system.id}`]);
        }
    }

    acceptOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'accepted')
            .subscribe((_res: CloudResponse) => {
                this.transferInfo = undefined;
                this.window.location.reload();
            });
    }

    rejectOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'rejected')
            .subscribe((_res: CloudResponse) => {
                this.transferInfo = undefined;
            });
    }

    cancelOwnershipTransfer(): void {
        this.cloudApiService.cancelTransfer(this.system.id)
            .subscribe((_res: CloudResponse) => {
                this.transferInfo = undefined;
            });
    }
}
