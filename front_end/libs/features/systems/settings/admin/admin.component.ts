import {
    AfterViewInit,
    Component,
    computed,
    Inject,
    Input,
    OnDestroy,
    OnInit,
    Signal,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { icons, clientMode, menus, redirect } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { MergeInfo } from '@services/system-api.types';
import * as t from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';

interface Settings {
    disconnectDisabled: boolean;
    renameDisabled: boolean;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls: ['admin.component.scss'],
})
export class NxSystemAdminComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() system: NxSystem;
    CONFIG: IConfig;
    readonly environment = environment;
    LANG = staticLang;

    ownershipTransferEnabled: boolean = false;

    user: Account;
    mergeTargetSystems: NxSystemInfo[];

    emptyName = false;

    advanced$: Observable<boolean>;
    userDisconnectSystem;
    currentlyMerging = false;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    settingsServiceSubscription: Subscription;
    systemsSubscription: Subscription;
    systemSubscription: Subscription;
    currentMergeInfo: MergeInfo;
    merging: boolean;
    editMode = false;
    enableEdit = false;
    checkCloudProcess: Process;
    connectToCloudProcess: Process;
    disconnectProcess: Process;

    settingsForSystem$: Observable<t.Settings>;
    systemName: string;
    systemNameFormWatcher: FormWatcher;
    systemNameProcess: Process;
    icons = icons;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('systemNameForm', { read: NgForm }) systemNameForm;

    transferInfo: SystemTransferInfo;

    userRole: Signal<string> = computed(() => {
        const accessRole = this.system.permissionManager.currentUser()?.accessRole;
        if (Object.keys(this.LANG.accessRoles).includes(accessRole)) {
            return this.LANG.accessRoles[accessRole].label;
        }
        return accessRole;
    });

    /** Owner (current user) can send a new ownership transfer request */
    get canSendTransferRequest(): boolean {
        return (
            this.ownershipTransferEnabled &&
            this.system.permissionManager.isOwner() &&
            this.system.useRest &&
            !this.transferInfo
        );
    }

    /** System ownership is offered to the current user */
    get systemOffered(): boolean {
        return (
            !environment.isLocal &&
            !!this.transferInfo &&
            this.transferInfo.toAccount === this.system.permissionManager.currentUser().email
        );
    }

    get newOwnerName(): string {
        return (
            this.system.userManager.users.find(u => u.email === this.transferInfo.toAccount)
                ?.fullName || ''
        );
    }

    private setupDefaults(): void {
        this.debugMode = clientMode.debug;
        this.betaMode = clientMode.beta;
        this.menuService.selectedSection.set(menus.systemSettings.admin.id);
        this.menuService.selectedDetailsSection.set(menus.systemSettings.general.id);

        this.advanced$ = this.route.queryParams.pipe(
            map(({ advanced }) => {
                if (advanced !== undefined) {
                    if (this.environment.isLocal) {
                        this.router.navigate(['settings/advanced'], { replaceUrl: true });
                    } else {
                        this.router.navigate(
                            [`systems/${this.route.snapshot.params.systemId}/advanced`],
                            { replaceUrl: true },
                        );
                    }
                }
                return (
                    this.router.url.includes('/advanced') ||
                    this.route.snapshot.routeConfig.path === 'advanced' ||
                    advanced !== undefined
                );
            }),
        );
    }

    private setNameAndTitle(): void {
        const systemName = this.system.info.systemName || this.system.info.name;
        if (!this.systemNameFormWatcher || this.systemName !== systemName) {
            this.systemName = systemName;
            this.systemNameFormWatcher && this.applyService.removeFormWatcher('systemNameForm');

            setTimeout(() => {
                this.systemNameFormWatcher = this.applyService.createFormWatcher(
                    'systemNameForm',
                    this.systemNameForm,
                    this.systemNameProcess,
                );
            });
        }
    }

    private updateSettings(forceMergeState?: boolean): void {
        const isMergeTimeOver24hrs = (time: string): boolean =>
            new Date().getTime() - parseInt(time) > 86400000;
        this.merging =
            (this.system && typeof this.system.mergeInfo !== 'undefined') || forceMergeState;
        this.settings = {
            disconnectDisabled:
                this.merging &&
                this.system?.mergeInfo?.startTime &&
                !isMergeTimeOver24hrs(this.system.mergeInfo.startTime),
            renameDisabled:
                this.merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master',
        };
    }

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        private menuService: NxMenuService,
        private router: Router,
        private route: ActivatedRoute,
        private cloudApiService: NxCloudApiService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private translateService: TranslateService,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef,
        @Inject(WINDOW) private window: Window,
        private applyService: NxApplyService,
    ) {
        this.CONFIG = configService.getConfig();

        this.ownershipTransferEnabled = configService.flagsEnabled('cloudOwnershipTransfer');

        /* Going directly to another system does not trigger lifecyle methods or destroy the
        apply component, so we hide the component when detecting navigation and the other system
        restores the component when it finishes loading. */
        router.events.pipe(untilDestroyed(this)).subscribe(e => {
            if (e instanceof NavigationStart) {
                applyService.setVisible(false);
            }
        });

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.settingsForSystem$ = this.system
            .updateOrGetSystemSettings()
            .pipe(map(res => res?.reply?.settings));
    }

    ngAfterViewInit(): void {
        this.systemName = this.systemsService.systems?.find(
            s => s.id === this.route.snapshot.params.systemId,
        )?.name;
        this.accountService.get().then((account?: Account) => {
            this.user = account;
        });

        this.settings = {
            disconnectDisabled: false,
            renameDisabled: false,
        };

        // TODO: Need to remove or replace with permission manager ????
        // this.system.userManager.currentUserEmail = this.accountService.email;

        if (this.systemSubscription) {
            this.systemSubscription.unsubscribe();
        }
        this.systemSubscription = this.system.infoSubject
            // .pipe(auditTime(this.CONFIG.system.auditTime))
            .subscribe(system => {
                if (!system) {
                    return;
                }
                if (this.system && !this.system.isAvailable && system && system.isAvailable) {
                    this.system = system as NxSystem;
                }
                this.updateSettings(this.currentlyMerging);
                this.syncMergeAlerts();

                this.enableEdit =
                    this.system.isOnline &&
                    (this.environment.isLocal
                        ? this.system.permissionManager.isAdmin()
                        : this.system.permissionManager.isOwner()) &&
                    !this.settings.renameDisabled;
                // TODO: Restore cloud admin rename permissions
                // See CB-1596

                if (!this.applyService.locked) {
                    this.setNameAndTitle();
                }

                // TODO: In develop add a store for transfers.
                if (this.ownershipTransferEnabled && !environment.isLocal) {
                    this.cloudApiService.getTransfers().subscribe(res => {
                        this.transferInfo = res.find(
                            transfer => transfer.systemId === this.system.id,
                        );
                    });
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
                    ToastType.Success,
                );
                setTimeout(() => this.window.location.reload(), 2000);
            },
            () => {
                this.toastService.notify(
                    this.LANG.toastMessage.system.cloudConnect.failed,
                    ToastType.Danger,
                );
            },
        );

        this.systemNameProcess = this.processService.createProcess(
            () => {
                const trimmedName = this.systemName.trim();
                if (!trimmedName) {
                    return Promise.reject();
                }
                return (
                    this.environment.isLocal ? this.system.mediaserver : this.cloudApiService
                ).renameSystem(this.system.id, trimmedName);
            },
            { ignoreError: true },
            () => {
                this.systemsService.forceUpdateSystems().subscribe();
            },
            () => {
                this.toastService.notify(
                    {
                        value: this.LANG.toastMessage.nameFail,
                        params: { type: this.LANG.common.system },
                    },
                    ToastType.Warning,
                );
            },
        );

        this.checkCloudProcess = this.processService.createProcess(
            () => {
                const startUrl = this.router.url;
                return this.CONFIG.featureFlags.cloudStorage && this.system.cloudStorageCapable
                    ? this.cloudApiService
                          .getCloudStorageUsage(this.system.id)
                          .then(_ => Promise.reject())
                          .catch(_ => Promise.resolve(startUrl))
                    : Promise.resolve(startUrl);
                // If cloud storage usage returns okay then that probably means we are using cloud storage.
                // If the request fails that means storage is probably not used.
            },
            { ignoreError: true },
            url => {
                if (url === this.router.url) {
                    this.disconnectProcess.run();
                }
            },
            () => {
                const {
                    dialogs: {
                        cloudStorage: {
                            systemDisconnectError: { title, message },
                        },
                        buttons: { ok },
                    },
                } = this.LANG;
                this.dialogs.confirm({
                    title,
                    message,
                    safeHTML: true,
                    footer: {
                        actionLabel: ok,
                    },
                });
            },
        );

        this.disconnectProcess = this.processService.createProcess(
            () => this.dialogs.disconnect(this.system),
            { ignoreError: true },
            res => {
                if (!res) {
                    // Dialog was canceled or closed
                    return;
                }
                if (!this.environment.isLocal) {
                    return this.router.navigate([redirect.authorised]).catch(error => {
                        console.error(error);
                    });
                }
                if (this.system.permissionManager.isCloud()) {
                    return this.accountService.logout();
                }
                // give the user chance to read the toaster
                setTimeout(() => this.window.location.reload(), 2000);
            },
        );
    }

    syncMergeAlerts(): void {
        if (this.system?.mergeInfo) {
            this.currentMergeInfo = this.system.mergeInfo;
        } else if (this.currentMergeInfo && this.system?.mergeInfo === undefined) {
            this.currentMergeInfo = undefined;
            if (!this.environment.isLocal) {
                this.systemsService.forceUpdateSystems().toPromise().catch(console.error);
            } else {
                this.systemsService.mergingSystems.add(this.system.id);
                this.systemsService.checkMerge(this.system);
                this.ribbonService.hide();
            }
        }

        if (this.systemsSubscription) {
            this.systemsSubscription.unsubscribe();
        }
        this.systemsSubscription = this.systemsService.systemsSubject.subscribe(() => {
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

    connectLocalToCloud(): Promise<boolean> {
        if (this.window.navigator.onLine) {
            return this.dialogs.connectLocalToCloud(this.system);
        } else {
            this.toastService.show(this.LANG.toastMessage.noInternet, ToastType.Warning);
            return Promise.resolve(true);
        }
    }

    updateAndGoToSystems = (): void => {
        // this.userDisconnectSystem = true;
        this.systemsService.userDisconnectSystem = true;
        this.systemsService.forceUpdateSystems().subscribe(() => {
            setTimeout(() => {
                this.router.navigate([redirect.authorised]).catch(error => {
                    console.error(error);
                });
            });
        });
    };

    delete() {
        if (!this.system.permissionManager.isOwner()) {
            // User is not owner. Deleting means he'll lose access to it
            if (this.environment.isLocal) {
                return this.dialogs.removeSystem(this.system).then(response => {
                    if (response) {
                        setTimeout(() => {
                            this.accountService.logout();
                        }, 6000);
                    }
                });
            }
            const { title, message, action } = this.LANG.dialogs.removeSystem;
            this.dialogs
                .confirm({
                    title,
                    message,
                    footer: {
                        buttonClass: 'btn-danger',
                        actionLabel: action,
                        cancelLabel: this.LANG.dialogs.buttons.cancel,
                    },
                })
                .then(result => {
                    if (result) {
                        return this.system.deleteFromCurrentAccount().subscribe(
                            res => {
                                this.toastService.notify(
                                    {
                                        value: this.LANG.toastMessage.system.deleted.success,
                                        params: {
                                            systemName:
                                                this.system.info.systemName ||
                                                this.system.info.name,
                                        },
                                    },
                                    ToastType.Success,
                                );
                            },
                            err => {
                                console.error(err);
                                this.toastService.show(
                                    this.LANG.errorCodes.cantUnshareWithMeSystemPrefix,
                                    ToastType.Danger,
                                );
                            },
                            this.updateAndGoToSystems,
                        );
                    }
                });
        }
    }

    mergeSystems() {
        this.mergeTargetSystems = this.systemsService.systems.filter(
            system => system.ownerAccountEmail === this.user.email && system.id !== this.system.id,
        );
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        const mergeDialog = this.CONFIG.featureFlags.mergeRefactorEnabled
            ? this.dialogs.mergeRefactored
            : this.dialogs.merge;
        return mergeDialog({
            system: this.system,
            systems: this.mergeTargetSystems,
        })
            .then(mergeInfo => {
                if (!mergeInfo) {
                    return;
                }
                if ('primary' in mergeInfo) {
                    this.system.mergeInfo = mergeInfo;
                    const systemId =
                        mergeInfo.role === 'master' ? this.system.id : mergeInfo.anotherSystemId;
                    this.systemsService.addToMergeList(systemId);
                    this.systemsService.processMerge(mergeInfo);
                    this.system.systemInfo = this.system;
                } else {
                    if (!mergeInfo.primarySystemName && !mergeInfo.secondarySystemName) {
                        return;
                    }
                    const commonErrorMsg = this.translateService.instant(
                        'dialogs.merge.commonText',
                        {
                            primarySystem: mergeInfo.primarySystemName,
                            secondarySystem: mergeInfo.secondarySystemName,
                        },
                    );
                    let downloadHTML = `<span>${this.LANG.dialogs.merge.latestBuild}</span>`;
                    if (this.CONFIG.cloudHost) {
                        downloadHTML = `<a href=\"${
                            this.environment.isLocal ? this.CONFIG.cloudHost : ''
                        }/download" target=\"_blank\">${this.LANG.dialogs.merge.latestBuild}</a>`;
                    }

                    const errorCodeMsg =
                        this.LANG.errorCodes[mergeInfo.errorText] ||
                        this.LANG.errorCodes[mergeInfo.resultCode] ||
                        this.LANG.errorCodes.unknownMergeError;
                    const responseError = errorCodeMsg({
                        failedSystem: mergeInfo.failedSystemName,
                        downloadHTML,
                    });

                    // HTML needed for section formatting
                    const dialogBody = '<p>' + commonErrorMsg + '</p><p>' + responseError + '</p>';

                    this.dialogs.confirm({
                        title: this.LANG.dialogs.merge.mergeFailedTitle,
                        message: dialogBody,
                        safeHTML: true,
                        footer: {
                            actionLabel: this.LANG.dialogs.buttons.ok,
                        },
                    });
                }
            })
            .finally(() => {
                this.currentlyMerging = false;
                this.updateSettings(this.currentlyMerging);
                this.syncMergeAlerts();
            });
    }

    hideAdvancedSettings(): void {
        if (this.router.url.includes('/advanced')) {
            (this.environment.isLocal && this.router.navigate(['settings'])) ||
                this.router.navigate([`systems/${this.system.id}`]);
        }
    }

    acceptOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'accepted').subscribe(_ => {
            this.transferInfo = undefined;
            this.window.location.reload();
        });
    }

    rejectOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'rejected').subscribe(_ => {
            this.transferInfo = undefined;
        });
    }

    cancelOwnershipTransfer(): void {
        this.cloudApiService.cancelTransfer(this.system.id).subscribe(_ => {
            this.transferInfo = undefined;
        });
    }
}
