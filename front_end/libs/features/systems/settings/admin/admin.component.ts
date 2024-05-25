import {
    AfterViewInit,
    booleanAttribute,
    Component,
    computed,
    inject,
    Inject,
    input,
    Input,
    OnDestroy,
    OnInit,
    signal,
    Signal,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';
import { Router, NavigationStart } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable, Subscription, timer } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgPermissions } from '@pages/home/store/permissions/permissions.types';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { MergeInfo, Settings } from '@services/system-api.types/system.types';
import { UserGroup } from '@services/system-user.types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { icons, menus, redirect, updateInterval } from '@static-variables';
import { alphabeticalSort } from '@utils/general';
import { isSystemMerging, isUserSystem } from '@utils/nx';
import { pipeSignal } from '@utils/signals';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls: ['admin.component.scss'],
})
export class NxSystemAdminComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input({ transform: booleanAttribute }) advanced: boolean;
    @Input() system: NxSystem;
    systemId$$ = input.required<string>({ alias: 'systemId' });
    CONFIG = nxConfig;
    readonly environment = environment;
    LANG = staticLang;

    user: Account;
    mergeTargetSystems: NxSystemInfo[];

    currentlyMerging = false;
    settings: {
        disconnectDisabled: boolean;
        renameDisabled: boolean;
    };
    systemsSubscription: Subscription;
    systemSubscription: Subscription;
    currentMergeInfo: MergeInfo;
    merging: boolean;
    editMode = false;
    enableEdit = false;
    checkCloudProcess: Process;
    connectToCloudProcess: Process;
    disconnectProcess: Process;
    showNewText: boolean;
    orgName$$ = signal('');

    settingsForSystem$: Observable<Settings>;
    systemName: string;
    systemNameFormWatcher: FormWatcher;
    systemNameProcess: Process;
    icons = icons;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('systemNameForm', { read: NgForm }) systemNameForm;

    userRole$$: Signal<string> = computed(() => {
        let { accessRole = '', groupIds = [] } =
            this.system.permissionManager.currentUser$$() || {};
        if (groupIds.length > 1) {
            const groups = (this.system.userManager as UserWithGroupsManager).userGroups;
            const builtInGroup: UserGroup[] = [];
            const customGroup: UserGroup[] = [];
            const ldapGroup: UserGroup[] = [];
            Object.values(groups).forEach(group => {
                if (group.attributes && group.attributes === 'readonly') {
                    builtInGroup.push(group);
                } else if (group.type && group.type === 'ldap') {
                    ldapGroup.push(group);
                } else {
                    customGroup.push(group);
                }
            });

            if (customGroup.length > 0) {
                customGroup.sort(alphabeticalSort(group => group.name));
            }
            if (ldapGroup.length > 0) {
                ldapGroup.sort(alphabeticalSort(group => group.name));
            }

            const sortedGroups = builtInGroup
                .concat(customGroup, ldapGroup)
                .filter(group => groupIds.includes(group.id))
                .map(group => group.name);

            const lastGroup = sortedGroups.pop();
            accessRole = this.translateService.instant(this.LANG.listString, {
                listItems: sortedGroups.join(', '),
                singleItem: lastGroup,
            });
        }
        if (Object.keys(this.LANG.accessRoles).includes(accessRole)) {
            return this.LANG.accessRoles[accessRole].label;
        }

        return accessRole;
    });

    // This should be a conversion of router resolved input system in future,
    // but don't want to potentially destabilize 23.3.1 release any more
    system$$ = inject(NxSystemService).currentSystem$$;

    cloudSystemInfo$$ = computed<NxSystemInfo | undefined>(() => {
        const [systemId, systemInfos] = [this.systemId$$(), this.systemsService.systems$$()];
        return !environment.isLocal ? systemInfos.find(info => info.id === systemId)! : undefined;
    });
    cloudSystemType$$ = computed<'user' | 'org' | undefined>(() => {
        const systemInfo = this.cloudSystemInfo$$();
        if (!systemInfo) {
            return undefined;
        } else {
            return isUserSystem(systemInfo) ? 'user' : 'org';
        }
    });
    cloudSystemOwnerUser$$ = computed<
        { ownerFullName: string; ownerAccountEmail: string } | undefined
    >(() => {
        const systemInfo = this.cloudSystemInfo$$();
        if (!systemInfo) {
            return undefined;
        } else if ('ownerFullName' in systemInfo) {
            return systemInfo;
        } else {
            return undefined;
        }
    });

    // Object = Found in response
    // undefined = Not found in reponse
    // null = Not checked yet
    transferInfo$$ = signal<SystemTransferInfo | undefined | null>(null);

    canTransferSystem$$ = computed<boolean>(() => {
        const [system, systemType, transferInfo] = [
            this.system$$(),
            this.cloudSystemType$$(),
            this.transferInfo$$(),
        ];
        return (
            nxConfig.featureFlags.cloudOwnershipTransfer &&
            systemType === 'user' &&
            system.permissionManager.isOwner$$() &&
            system.useRest &&
            transferInfo === undefined
        );
    });

    systemOfferedByUser$$ = computed<boolean>(() => {
        const [transferInfo, currentUser] = [
            this.transferInfo$$(),
            this.system.permissionManager.currentUser$$(),
        ];
        return !!transferInfo && transferInfo.fromAccount === currentUser.email;
    });

    systemOfferSentFrom$$ = computed<{ name: string; email: string } | null>(() => {
        const [cloudSystemInfo, transferInfo] = [this.cloudSystemInfo$$(), this.transferInfo$$()];
        if (transferInfo && cloudSystemInfo && 'ownerFullName' in cloudSystemInfo) {
            const { fromAccount } = transferInfo;
            return {
                email: fromAccount,
                name: cloudSystemInfo.ownerFullName,
            };
        } else {
            return null;
        }
    });

    channelPartnersService = inject(NxChannelPartnersService);

    manageOrgSystems$$ = pipeSignal(
        this.system$$,
        systems$ =>
            systems$.pipe(
                filter((system): system is NxSystem => system !== undefined),
                switchMap(({ id }) => {
                    const systemInfo = this.systemsService.systemInfoMap$$().get(id)!;
                    const orgId = 'organizationId' in systemInfo ? systemInfo.organizationId : null;

                    if (!orgId) {
                        return Promise.resolve(false);
                    }

                    return this.channelPartnersService
                        .getOrganization(orgId)
                        .pipe(
                            map(org => org.ownPermissions.includes(OrgPermissions.manage_systems)),
                        );
                }),
            ),
        false,
    );

    canManageSystem$$ = computed(
        () =>
            this.system.permissionManager.isOwner$$() &&
            (this.cloudSystemType$$() !== 'org' || this.manageOrgSystems$$()),
    );

    systemOfferedToUser$$ = computed<boolean>(() => {
        const [transferInfo, currentUser] = [
            this.transferInfo$$(),
            this.system.permissionManager.currentUser$$(),
        ];
        return !!transferInfo && transferInfo.toAccount === currentUser.email;
    });

    systemOfferSentTo$$ = computed<{ name: string; email: string } | null>(() => {
        const [system, transferInfo] = [this.system$$(), this.transferInfo$$()];
        if (transferInfo) {
            const { toAccount } = transferInfo;
            return {
                email: toAccount,
                name: system.userManager.users.find(u => u.email === toAccount)!.fullName,
            };
        } else {
            return null;
        }
    });

    get permissionGroupsCount(): number {
        return this.system.permissionManager.currentUser$$()?.groupIds?.length;
    }

    private setupDefaults(): void {
        this.menuService.selectedSection$$.set(menus.systemSettings.admin.id);
        this.menuService.selectedDetailsSection$$.set(menus.systemSettings.general.id);
    }

    private setNameAndTitle(): void {
        const systemName = this.system.info.systemName || this.system.info.name;
        if (!this.systemNameFormWatcher || this.systemName !== systemName) {
            this.systemName = systemName;
            if (this.systemNameFormWatcher) {
                this.applyService.removeFormWatcher('systemNameForm');
            }

            setTimeout(() => {
                this.systemNameFormWatcher = this.applyService.createFormWatcher(
                    'systemNameForm',
                    this.systemNameForm,
                    this.systemNameProcess,
                );
            });
        }
    }

    private updateSettings(forceMergeState = false): void {
        const isMergeTimeOver24hrs = (time: string): boolean =>
            new Date().getTime() - parseInt(time) > 86400000;
        const { role, startTime } = this.system?.mergeInfo || {};
        this.merging = isSystemMerging(this.system) || forceMergeState;
        this.settings = {
            disconnectDisabled: !!(this.merging && startTime && !isMergeTimeOver24hrs(startTime)),
            renameDisabled: this.merging && this.system.mergeInfo && role !== 'master',
        };
    }

    constructor(
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        private menuService: NxMenuService,
        private router: Router,
        private cloudApiService: NxCloudApiService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private translateService: TranslateService,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef,
        private applyService: NxApplyService,
    ) {
        /* Going directly to another system does not trigger lifecyle methods or destroy the
        apply component, so we hide the component when detecting navigation and the other system
        restores the component when it finishes loading. */
        router.events.pipe(untilDestroyed(this)).subscribe(e => {
            if (e instanceof NavigationStart) {
                applyService.setVisible(false);
            }
        });

        this.setupDefaults();

        // TODO: In develop add a store for transfers.
        if (nxConfig.featureFlags.cloudOwnershipTransfer && !environment.isLocal) {
            timer(0, updateInterval)
                .pipe(
                    takeUntilDestroyed(),
                    switchMap(() => this.cloudApiService.getTransfers()),
                )
                .subscribe(res => {
                    this.transferInfo$$.set(
                        res.find(transfer => transfer.systemId === this.system.id),
                    );
                });
        }
    }

    ngOnInit(): void {
        this.settingsForSystem$ = this.system
            .updateOrGetSystemSettings()
            .pipe(map(res => res?.reply?.settings));

        this.showNewText = this.system.version > 5.1;

        // Only works on cloud, have to wait for system.info on local
        const currentSystemInfo = this.cloudSystemInfo$$();
        if (currentSystemInfo) {
            this.systemName = currentSystemInfo.name;
        }
        if (this.cloudSystemType$$() === 'org') {
            this.cloudApiService.cloudChannelPartnersApi.getSystem(this.systemId$$()).subscribe({
                next: system => this.orgName$$.set(system.organizationName),
                error: _ => {}, // If the user is not a member of the org, the request will 403
            });
        }
    }

    ngAfterViewInit(): void {
        this.accountService.get().then(account => {
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
                    this.system.permissionManager.isAdmin$$() &&
                    !this.settings.renameDisabled;

                if (!this.applyService.locked) {
                    this.setNameAndTitle();
                }
            });

        this.initProcesses();
        this.applyService.initPageFormsWatcher(this.pageApply);
        if (!this.systemName) {
            this.setNameAndTitle();
        }
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }

    groupsStore = inject(GroupsStore);

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
                setTimeout(() => window.location.reload(), 2000);
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
                return nxConfig.featureFlags.cloudStorage && this.system.cloudStorageCapable
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
                    this.groupsStore.deleteSystem(this.system.id);
                    return this.router.navigate([redirect.authorised]).catch(error => {
                        console.error(error);
                    });
                }
                if (this.system.permissionManager.isCloud$$()) {
                    return this.accountService.logout();
                }
                // give the user chance to read the toaster
                setTimeout(() => window.location.reload(), 2000);
            },
        );
    }

    syncMergeAlerts(): void {
        if (isSystemMerging(this.system)) {
            this.currentMergeInfo = this.system.mergeInfo;
        } else if (this.currentMergeInfo) {
            this.currentMergeInfo = undefined;
            if (!this.environment.isLocal) {
                firstValueFrom(this.systemsService.forceUpdateSystems()).catch(console.error);
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
            if (this.currentMergeInfo?.role === 'slave') {
                this.router.navigate(['systems', this.currentMergeInfo.primary.id]);
            } else if (this.systemsService.finishedMerged) {
                this.systemsService.finishedMerged = false;
                this.system.getInfo(true, false);
            }
        });
    }

    transferOwnership(): void {
        this.dialogs.transferOwnership(this.system).then(info => {
            if (info) {
                if ('toAccount' in info) {
                    this.transferInfo$$.set(info); // Transfer to user
                } else {
                    location.reload(); // Transfer to org, no action required from org admins
                }
            }
        });
    }

    connectLocalToCloud(): Promise<boolean> {
        if (navigator.onLine) {
            return this.dialogs.connectLocalToCloud(this.system);
        } else {
            this.toastService.show(this.LANG.toastMessage.noInternet, ToastType.Warning);
            return Promise.resolve(true);
        }
    }

    updateAndGoToSystems = (): void => {
        this.systemsService.userDisconnectSystem = true;
        this.groupsStore.deleteSystem(this.system.id);
        setTimeout(() => {
            this.router.navigate([redirect.authorised]).catch(error => {
                console.error(error);
            });
        });
    };

    delete() {
        if (!this.system.permissionManager.isOwner$$()) {
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
            system =>
                isUserSystem(system) &&
                system.ownerAccountEmail === this.user.email &&
                system.id !== this.system.id,
        );
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        const mergeDialog = nxConfig.featureFlags.mergeRefactorEnabled
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

    async hideAdvancedSettings(): Promise<void> {
        if (!this.advanced) {
            return;
        }

        const commands: string[] = [];
        if (this.router.url.includes('/advanced')) {
            commands.push(this.router.url.replace('/advanced', ''));
        }

        await this.router.navigate(commands, {
            queryParamsHandling: 'merge',
            queryParams: { advanced: undefined },
        });
    }

    acceptOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'accepted').subscribe(_ => {
            this.transferInfo$$.set(undefined);
            window.location.reload();
        });
    }

    rejectOwnershipTransfer(): void {
        this.cloudApiService.respondToTransfer(this.system.id, 'rejected').subscribe(_ => {
            this.transferInfo$$.set(undefined);
        });
    }

    cancelOwnershipTransfer(): void {
        this.cloudApiService.cancelTransfer(this.system.id).subscribe(_ => {
            this.transferInfo$$.set(undefined);
        });
    }
}
