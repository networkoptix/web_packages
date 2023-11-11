import {
    Component,
    computed,
    effect,
    Inject,
    Input,
    LOCALE_ID,
    OnDestroy,
    OnInit,
    Signal,
} from '@angular/core';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { escape } from 'lodash-es';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { debounceTime, filter, takeUntil, tap } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import type { ContentToggle, Content, Level3Item } from '@menu/menu.types';
import { ribbonHeight } from '@pages/static-variables-features';
import { Translatable } from '@pipes/nx-translate.types';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxDbService } from '@services/db.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxUser, UserType } from '@services/system-user.types';
import {
    RecordingStatus,
    type NxSystemCamera,
    CameraStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxSystemsService } from '@services/systems.service';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { alertTimeout, clientMode, menus, redirect } from '@static-variables';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { alphabeticalSort, cleanId } from '@utils/general';

/**
 * TODO: A lot of the observable usage in this component should be cleaned up.
 *
 * The observables are being used in a lot of places almost like a variable we care only
 * about tracking a value and not a value over time we should look into moving those use
 * signals once we upgrade to angular 16.
 *
 * There are also a lot of nested subscriptions, some are three levels deep.
 */
@UntilDestroy()
@Component({
    selector: 'nx-system-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss'],
})
export class NxSystemSettingsComponent implements OnInit, OnDestroy {
    @Input() uriParamSystemId;
    @Input() callShare;
    @Input() system: NxSystem;

    editCameras: Signal<boolean> = computed(
        () => this.system.permissionManager.permissions$$().editCameras,
    );
    editUsers: Signal<boolean> = computed(
        () => this.system.permissionManager.permissions$$().editUsers,
    );

    CONFIG: IConfig;
    LANG = staticLang;
    plugin;
    content: Content = { base: '', selectedSection: '', level1: [] };

    menuSearchable: boolean;

    account: Account;
    gettingSystem: Process;
    systems: NxSystem[];
    deletingSystem;

    _menuSearchMode: boolean;
    systemId: string;
    menuVisible: boolean = false;
    systemNoAccess: boolean;
    debugMode: boolean;
    betaMode: boolean;
    userDisconnectSystem: boolean;
    mergeTargetSystem;
    gettingSystemUsers: Process;
    selectedUser;

    headerHeight: number;
    secondaryMerge = false;
    show2faRequired = false;

    get showPlaceholder(): boolean {
        return (
            this.systemNoAccess ||
            this.show2faRequired ||
            this.secondaryMerge ||
            (this.system && this.system.show404)
        );
    }

    // TODO: We really need a standard way to get the system name
    get systemName(): string {
        return this.system.info.systemName || this.system.info.name;
    }

    private cancelPrevious$ = new Subject();

    private connectionSubscription: Subscription;
    private systemSubscription: Subscription;
    private systemInfoSubscription: Subscription;
    private checkMergeSubscription: Subscription;

    private origSelectedSection: string;
    private origSelectedSubSection: string;
    private origSelectedDetailSection: string;

    archivesPresent = new Set<string>();

    private setupDefaults(): void {
        this.debugMode = clientMode.debug;
        this.betaMode = clientMode.beta;
        this.systemNoAccess = false;
        this.userDisconnectSystem = false;
        this.selectedUser = { email: '' };
    }

    private updateArchivesPresent(): void {
        this.system.mediaserver
            .getCameraHistoryItems()
            .toPromise()
            .then(response => {
                this.archivesPresent.clear();
                response.forEach(server => {
                    server.archivedCameras.forEach(cam => this.archivesPresent.add(cam));
                });
            });
    }

    private async updateContent(skipPermissions = false): Promise<string> {
        /**
         * This isn't ideal since it's pretty dependent on the menu structure implementation
         * but the alternative is to refactor the settings component and menu service
         * to properly use observables which is too many changes during regression.
         */
        this.menuVisible = !!this.content.level1
            .find(({ id }) => id === menus.systemSettings.admin.id)
            ?.level3?.find(({ id }) => id === menus.systemSettings.general.id);
        this.content = { ...this.content };
        // Removing dexie caching until we fix the menu in develop
        return '';
        // if (environment.isLocal || !this.system || !this.menuVisible) {
        //     return;
        // }
        // return this.db.personal.menuContent.put(this.content);
    }

    private canNavMenu(
        origTargetValue: string,
        contentTarget: 'selectedSection' | 'selectedSubSection' | 'selectedDetailsSection',
        selection: string,
    ): void {
        if (this.applyService.locked) {
            origTargetValue = selection;

            this.cancelPrevious$.next('cancel');
            this.applyService.applyOnNavSubject
                .pipe(takeUntil(this.cancelPrevious$))
                .subscribe(status => {
                    if (!['', 'canceled'].includes(status)) {
                        this.content[contentTarget] = origTargetValue;
                        this.updateContent(true);
                    }
                });
        } else if (selection) {
            this.content[contentTarget] = selection;
            this.updateContent(true);
        }
    }

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
        private pageService: NxPageService,

        private toasts: NxToastService,
        private systemsService: NxSystemsService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        private router: Router,
        private scrollMechanicsService: NxScrollMechanicsService,
        private applyService: NxApplyService,
        private appStateService: NxAppStateService,
        private ribbonService: NxRibbonService,
        @Inject(LOCALE_ID) private locale: string,
        private db: NxDbService,
    ) {
        this.CONFIG = configService.getConfig();

        this.setupDefaults();

        effect(() => {
            this.system.permissionManager.permissions$$();
            this.updateMenu();
        });

        effect(() => {
            this.canNavMenu(
                this.origSelectedSection,
                'selectedSection',
                this.menuService.selectedSection(),
            );
        });

        effect(() => {
            this.canNavMenu(
                this.origSelectedSubSection,
                'selectedSubSection',
                this.menuService.selectedSubSection(),
            );
        });

        effect(() => {
            this.canNavMenu(
                this.origSelectedDetailSection,
                'selectedDetailsSection',
                this.menuService.selectedDetailsSection(),
            );
        });
    }

    ngOnInit(): void {
        // if (!this.CONFIG.isLocal) {
        //     this.pageService.pageTitle = this.LANG.pageTitles.system?.();
        // }
        this.init();
    }

    init(): void {
        // this.systemId = this.uriParamSystemId;
        this.route.params.pipe(untilDestroyed(this)).subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
                this.content.base = menus.systemSettings.baseUrl + this.systemId;
                if (!environment.isLocal && this.system) {
                    this.system.stopPoll();
                }
                this.systemNoAccess = false;
                this.menuVisible = false;
            } else {
                this.systemId = '';
            }
            this.getSystemInfo();
        });

        this.router.events.pipe(untilDestroyed(this)).subscribe(route => {
            if (route instanceof NavigationStart && route.url.includes('health')) {
                // remove unnecessary system update
                // (ex. health monitor will trigger system update)
                // and orphan metrics request in systemInfoSubscription
                this.systemInfoSubscription?.unsubscribe();
                this.systemSubscription?.unsubscribe();
            }

            if (route instanceof NavigationStart) {
                // NavigationEnd will not fire --TT
                const isSystemRoute = route.url.includes('/systems');
                const isCameraRoute = route.url.includes('/cameras');
                if (isSystemRoute && !isCameraRoute && this.system) {
                    this.system.show404 = false;
                }
                if (route.url === '/systems') {
                    this.db.personal.menuContent.delete(this.content.base);
                }
            }
        });

        this.menuSearchable = false;
        this.content = {
            selectedSection: '', // updated by selectedSectionSubject
            selectedSubSection: '', // updated by selectedSubSectionSubject
            base: menus.systemSettings.baseUrl + this.systemId,
            level1: [
                {
                    id: menus.systemSettings.admin.id,
                    svg: menus.systemSettings.admin.icon,
                    label: this.LANG.menu.titles.systemAdministration,
                    path: menus.systemSettings.admin.path,
                    level2: [],
                },
            ],
        };

        // TODO: add processes back
        // Retrieve users list
        this.gettingSystemUsers = this.processService
            .createProcess(
                () => {
                    return this.system.getUsers(true);
                },
                {
                    errorPrefix: this.LANG.errorCodes.cantGetUsersListPrefix,
                },
            )
            .then(() => {
                this.updateArchivesPresent();
            });

        // Retrieve system info
        this.gettingSystem = this.processService
            .createProcess(
                () => {
                    return this.system.getInfo(true, false, true);
                    // Force reload system info when opening page
                },
                {
                    errorCodes: {
                        forbidden: () => {
                            // Special handling for not having access to the system
                            this.systemNoAccess = true;
                            return false;
                        },
                        notFound: () => {
                            // Special handling for not having access to the system
                            this.systemNoAccess = true;
                            return false;
                        },
                    },
                    errorPrefix: this.LANG.errorCodes.cantGetSystemInfoPrefix,
                    ignoreError: true,
                },
            )
            .then(
                () => {
                    if (this.editUsers()) {
                        this.gettingSystemUsers.run();
                    } else {
                        this.updateArchivesPresent();
                    }
                },
                e => {
                    this.system.getInfoAndPermissions().then(() => {
                        this.system.stopPoll();
                    });
                },
            );

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                if (width >= GridBreakpoints.MD) {
                    this.setHeaderHeight();
                }
            });
    }

    setHeaderHeight(): void {
        this.headerHeight = this.appStateService.ribbonVisibility
            ? this.CONFIG.headerHeight + ribbonHeight
            : this.CONFIG.headerHeight;
    }

    ngOnDestroy(): void {
        if (this.system) {
            this.system.stopPoll();
        }
        this.ribbonService.hide();
        this.pageService.setDefaultLayout();
    }

    private getCloudSystemInfo(): void {
        if (this.systemSubscription) {
            this.systemInfoSubscription?.unsubscribe();
            this.systemSubscription.unsubscribe();
        }
        this.systemSubscription = this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe(async systems => {
                if (this.systemsService.userDisconnectSystem) {
                    // don't trigger this.systemNoAccess
                    this.systemsService.userDisconnectSystem = false;
                    return;
                }
                const system = systems.find(system => system.id === this.systemId);
                if (system === undefined) {
                    this.systemNoAccess = true;
                    return;
                }
                if (system.system2faEnabled && !this.account.sessionVerified) {
                    this.account = await this.accountService.get(true);
                    if (!this.account.sessionVerified) {
                        this.show2faRequired = true;
                        return;
                    }
                }
                if (this.systemId === this.system?.id) {
                    return;
                }
                this.system.show404 = false;
                this.gettingSystem.run();

                if (this.systemInfoSubscription) {
                    this.systemInfoSubscription.unsubscribe();
                }
                this.systemInfoSubscription = this.system.infoSubject
                    .pipe(
                        untilDestroyed(this),
                        filter(system => system?.id === this.route.snapshot.params.systemId),
                        tap(({ isOnline }) => {
                            this.applyService.isOnline$.next(!!isOnline);
                            if (isOnline) {
                                this.ribbonService.hide();
                            } else {
                                firstValueFrom(this.system.mediaserver.ping()).catch(() => {
                                    this.ribbonService.show(
                                        this.LANG.ribbon.systemOffline,
                                        [],
                                        'alert',
                                        undefined,
                                        true,
                                    );
                                });
                            }
                        }),
                    )
                    .subscribe(() => {
                        // if system is removed while on page, redirects to systems page
                        if (
                            this.system &&
                            this.systemsService.systems &&
                            !this.systemsService.systems.some(
                                system => system.id === this.system.id,
                            ) &&
                            !environment.isLocal
                        ) {
                            this.uriService.updateURI(
                                this.CONFIG.featureFlags.dashboardRedirect ||
                                    'beta' in this.route.snapshot.queryParams
                                    ? '/dashboard'
                                    : '/systems',
                            );
                        }
                        if (this.system.isAvailable) {
                            this.updateAlert();
                        }
                        if (this.system.permissionManager.isAdmin$$()) {
                            // Makes request to get health, this is used to cache request.
                            this.system.mediaserver
                                .getAggregateHealthReport()
                                .pipe(untilDestroyed(this))
                                .subscribe();
                        }

                        this.updateMenu();
                    });
                if (this.connectionSubscription) {
                    this.connectionSubscription.unsubscribe();
                }
                this.connectionSubscription = this.system.connectionSubject
                    .pipe(
                        filter((connectionLost: boolean) => connectionLost),
                        untilDestroyed(this),
                    )
                    .subscribe(_ => {
                        this.connectionLost();
                    });
            });
    }

    getSystemInfo(): void {
        this.accountService.get().then(account => {
            if (account) {
                this.account = account;
                if (!environment.isLocal) {
                    this.getCloudSystemInfo();
                } else {
                    this.system.update().then(() => {
                        this.systems = [this.system];
                        this.system.isAvailable = true;
                        this.system.isOnline = true;
                        setTimeout(() => {
                            this.pageService.pageTitle(this.systemName);
                        });
                    });
                }

                this.system.infoSubject
                    // Not ideal to add a debounce here but we're currently updating infoSubject in several places.
                    // This triggers the subscribe callback multiple times. It works without the debounce so
                    // it's not crucial that debounce duration is correct for all cases.
                    .pipe(debounceTime(100), untilDestroyed(this))
                    .subscribe(() => {
                        this.updateArchivesPresent();
                        this.updateAlert();
                        this.updateMenu();
                    });
                this.system.update();
            }
        });
    }

    updateAlert(): void {
        if (this.checkMergeSubscription) {
            this.checkMergeSubscription.unsubscribe();
        }
        this.checkMergeSubscription = this.system.mediaserver
            .checkMergeStatus(true)
            .pipe(untilDestroyed(this))
            .subscribe({
                next: res => {
                    const mergeInProgress = res?.reply?.mergeInProgress;
                    if (environment.isLocal) {
                        if (
                            !mergeInProgress &&
                            this.system.isOnline &&
                            !this.systemsService.checkMerge(this.system)
                        ) {
                            this.ribbonService.hide();
                        }
                    } else {
                        this.secondaryMerge = false;
                        this.ribbonService.hide();
                        let ribbonText: string;
                        const { primary, secondary } = this.systemsService.systemsMerging || {};

                        if (!this.system.isOnline) {
                            firstValueFrom(this.system.mediaserver.ping()).catch(() => {
                                this.ribbonService.show(
                                    this.LANG.ribbon.systemOffline,
                                    [],
                                    'alert',
                                    undefined,
                                    true,
                                );
                            });
                        } else if (primary?.id === this.system.id) {
                            const secondarySystem = this.systemsService.systems.find(
                                system => secondary.id === system.id,
                            );
                            let secondaryName =
                                secondarySystem?.name ||
                                secondary?.name ||
                                this.LANG.system.mergeUnknownName;
                            if (secondaryName.startsWith('server at ')) {
                                secondaryName =
                                    secondaryName[0].toUpperCase() + secondaryName.slice(1);
                            }
                            ribbonText = `<div class="my-1">
                                                <div class="larger"><strong>${secondaryName}</strong> ${this.LANG.ribbon.beingMerged.to}</div>
                                                <div class="mt-2">${this.LANG.ribbon.beingMerged.mayTake}</div>
                                            </div>`;
                        } else if (secondary?.id === this.system.id) {
                            this.mergeTargetSystem = this.systemsService.systems.find(
                                system => primary.id === system.id,
                            ) || { name: this.LANG.system.mergeUnknownName };
                            this.secondaryMerge = true;
                        } else if (mergeInProgress) {
                            ribbonText = this.LANG.ribbon.systemsMerging;
                        }

                        if (ribbonText) {
                            this.ribbonService.show(ribbonText, [], 'alert');
                        }

                        setTimeout(() => {
                            this.setHeaderHeight();
                        });
                    }
                },
                error: err => {
                    console.error('err from checkMerge', err);
                    if (err.status === 502 && this.system?.mergeInfo?.role === 'slave') {
                        this.currentSystemBeingMergedIntoAnotherSystem();
                    }
                },
            });
    }

    currentSystemBeingMergedIntoAnotherSystem() {
        const { primary } = this.systemsService.systemsMerging || {};
        this.mergeTargetSystem = this.systemsService.systems.find(
            system => primary.id === system.id,
        ) || { name: this.LANG.system.mergeUnknownName };
        this.secondaryMerge = true;
    }

    contentToggle(event: ContentToggle): void {
        this.content.level1.find(node => {
            if (node.id === event.nodeId) {
                node.toggle = event.state;
                return true;
            } else {
                return false;
            }
        });
    }

    menuMode(event: boolean): void {
        setTimeout(() => {
            this._menuSearchMode = event;
        });
    }

    async updateMenu(): Promise<void> {
        // Removing dexie caching until we fix the menu in develop
        // const previousContent = await this.db.personal.menuContent.get(this.content.base);
        //
        // if (previousContent) {
        //     this.content = previousContent;
        //     this.menuVisible = true;
        // }

        this.systemNoAccess = false;
        if (!(this.system.mediaserver instanceof NxSystemRestAPI3)) {
            await Promise.allSettled([
                this.system.serverManager.getServers().toPromise(),
                this.system.cameraManager.getCameras(),
            ]);
        }

        if (this.editCameras()) {
            let camerasNode = this.content.level1.find(
                node => node.id === menus.systemSettings.cameras.id,
            );
            if (!camerasNode) {
                camerasNode = {
                    id: menus.systemSettings.cameras.id,
                    svg: menus.systemSettings.cameras.icon,
                    label: this.LANG.menu.titles.cameras,
                    path: menus.systemSettings.cameras.path,
                    level3: [],
                };
                this.content.level1.push(camerasNode);
            }
            if (this.system.cameraManager.cameras) {
                this.system.cameraManager.cameras.sort(
                    alphabeticalSort(this.locale, camera => camera.name),
                );
                const camerasInMenu = this.system.cameraManager.cameras.filter(
                    camera => camera.canEdit,
                );
                const getCameraIP = cameraUrl =>
                    cameraUrl.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)?.[0];
                camerasNode.level3 = camerasInMenu.map<Level3Item>(camera => ({
                    id: camera.id.replace(/\s|\{|\}/g, ''),
                    svgIcon: this.getCameraStatusIcon(camera),
                    disabled:
                        camera.status === CameraStatus.Offline ||
                        camera.status === CameraStatus.Unauthorized,
                    label: camera.name,
                    indent: true,
                    path: `cameras/${camera.id.replace(/\s|\{|\}/g, '')}`,
                    additionalLabel: getCameraIP(camera.url),
                }));
            } else {
                camerasNode.level3 = [];
            }
        } else {
            this.content.level1 = this.content.level1.filter(
                node => node.id !== menus.systemSettings.cameras.id,
            );
        }

        if (this.editUsers()) {
            let usersNode = this.content.level1.find(
                node => node.id === menus.systemSettings.users.id,
            );

            if (!usersNode) {
                usersNode = {
                    id: menus.systemSettings.users.id,
                    svg: menus.systemSettings.users.icon,
                    label: this.LANG.menu.titles.users,
                    path: menus.systemSettings.users.path,
                    level2: [
                        {
                            id: menus.systemSettings.buttons.id,
                            items: [
                                {
                                    id: 'addUser',
                                    label: this.LANG['Add User'] || 'Add User',
                                    disabled: true,
                                },
                            ],
                            level3: [],
                        },
                    ],
                };
                this.content.level1.push(usersNode);
            }

            // Retain buttons
            if (usersNode.level2.length && usersNode.level2[0].id === 'buttons') {
                usersNode.level2[0].items[0].disabled = !this.system.isAvailable;
            } else {
                usersNode.level2 = [];
            }
            if (this.system && this.system.userManager.users?.length > 0) {
                const localUsers: Level3Item[] = [];
                const tempUsers: Level3Item[] = [];
                const organizationUsers: Level3Item[] = [];
                const cloudUsers: Level3Item[] = [];
                const ldapUsers: Level3Item[] = [];
                // TODO: Reconcile UserManager types
                this.system.userManager.users.forEach((user: NxUser) => {
                    const id = cleanId(user.id);
                    const additionalLabel = this.getUserMenuAdditionalLabel(user);
                    const svgIcon = this.getUserMenuSvgIcon(user);
                    const label =
                        user.type === UserType.cloud ? user.email : user.name || user.email;
                    const node: Level3Item = {
                        id,
                        additionalLabel,
                        disabled: !user.isEnabled,
                        label,
                        path: 'users/' + id,
                        svgIcon,
                    };
                    if (user.type === UserType.local) {
                        localUsers.push(node);
                    } else if (user.type === UserType.temporaryLocal) {
                        tempUsers.push(node);
                    } else if (user.type === UserType.cloud) {
                        cloudUsers.push(node);
                    } else if (user.type === UserType.ldap) {
                        ldapUsers.push(node);
                    } else {
                        // Defaulting to localUsers since that is what it always was
                        // Would be a good place to put an error logger to see why it's missed
                        localUsers.push(node);
                    }
                });

                const sortByEmailLabel = alphabeticalSort<Level3Item>(
                    this.locale,
                    ({ label }) => label,
                );

                const allUsers: Level3Item[] = [];
                allUsers.push(...localUsers.sort(sortByEmailLabel));
                if (tempUsers.length > 0) {
                    allUsers.push({ horizontal: true } as Level3Item);
                }
                allUsers.push(...tempUsers.sort(sortByEmailLabel));
                if (organizationUsers.length > 0) {
                    allUsers.push({ horizontal: true } as Level3Item);
                }
                allUsers.push(...organizationUsers.sort(sortByEmailLabel));
                if (cloudUsers.length > 0) {
                    allUsers.push({ horizontal: true } as Level3Item);
                }
                allUsers.push(...cloudUsers.sort(sortByEmailLabel));
                if (ldapUsers.length > 0) {
                    allUsers.push({ horizontal: true } as Level3Item);
                }
                allUsers.push(...ldapUsers.sort(sortByEmailLabel));

                usersNode.level3 = allUsers;
            }
        } else {
            // remove Users
            this.content.level1 = this.content.level1.filter(
                node => node.id !== menus.systemSettings.users.id,
            );
        }

        if (this.system.permissionManager.isAdmin$$()) {
            let serversNode = this.content.level1.find(
                node => node.id === menus.systemSettings.servers.id,
            );
            if (!serversNode) {
                serversNode = {
                    id: menus.systemSettings.servers.id,
                    svg: menus.systemSettings.servers.icon,
                    label: this.LANG.menu.titles.servers,
                    path: menus.systemSettings.servers.path,
                };
                this.content.level1.push(serversNode);
            }

            if (this.system.serverManager.servers) {
                this.system.serverManager.servers.sort(
                    alphabeticalSort(this.locale, server => server.name),
                );

                serversNode.level3 = [];
                this.system.serverManager.servers.forEach(server => {
                    const id = cleanId(server.id);

                    serversNode.level3.push({
                        id: server.id,
                        svgIcon: this.getServerStatusIcon(server),
                        label: server.name,
                        path: `servers/${id}`,
                        additionalLabel: server.ip,
                        indent: true,
                        disabled: server.status.toLowerCase() === 'offline',
                    });
                });
                serversNode.path = `${menus.systemSettings.servers.path}/${cleanId(
                    serversNode.level3[0]?.id || '',
                )}`;
            }
        } else {
            this.content.level1 = this.content.level1.filter(
                node => node.id !== menus.systemSettings.servers.id,
            );
        }

        const adminNode = this.content.level1.find(
            node => node.id === menus.systemSettings.admin.id,
        );

        adminNode.level3 = [
            {
                id: menus.systemSettings.general.id,
                svg: menus.systemSettings.general.icon,
                label: this.LANG.menu.titles.general,
                path: menus.systemSettings.general.path,
            },
        ];

        if (
            this.system.permissionManager.isAdmin$$() ||
            this.system.permissionManager.isOwner$$()
        ) {
            adminNode.level3.push({
                id: menus.systemSettings.licenses.id,
                svg: menus.systemSettings.licenses.icon,
                label: this.LANG.menu.titles.licenses,
                path: menus.systemSettings.licenses.path,
            });
        }

        if (this.system.canUserViewCloudStorage()) {
            adminNode.level3.push({
                id: menus.systemSettings.cloudStorage.id,
                svg: '',
                label: this.LANG.dialogs.cloudStorage.title,
                path: menus.systemSettings.cloudStorage.path,
            });
        }

        // hide search if no permissions for potentially long list ... cameras, servers and users
        this.menuSearchable =
            this.editCameras() && this.system.permissionManager.isAdmin$$() && this.editUsers();
        this.updateContent();
    }

    getUserMenuAdditionalLabel(user: NxUser): Translatable {
        let additionalLabel: Translatable = this.LANG.accessRoles.Custom.label;
        if (this.system.version > 5.1 && this.CONFIG.featureFlags.usersWithGroups) {
            if (user.groupIds.length === 0 && user.attributes === 'readonly') {
                additionalLabel = this.LANG.accessRoles.Owner.label || 'Owner';
            } else if (user.groupIds.length === 1) {
                // @ts-expect-error TODO: Reconcile UserManager types
                const { name } = this.system.userManager.userGroups[user.groupIds[0]];
                additionalLabel = this.LANG.accessRoles[name]?.label || name;
            } else if (user.groupIds.length >= 2) {
                additionalLabel = {
                    value: this.LANG.userGroups.multiple,
                    params: { number: user.groupIds.length.toString() },
                };
            }
        } else {
            additionalLabel =
                user.type !== UserType.cloud && user.name === 'admin'
                    ? this.LANG.accessRoles.Owner.label || 'Owner'
                    : this.LANG.accessRoles[user.role.name]?.label || user.role.name;
        }
        return additionalLabel;
    }
    getUserMenuSvgIcon(user: NxUser): string {
        switch (user.type) {
            case UserType.cloud:
                return 'user_cloud';
            case UserType.temporaryLocal:
                return 'user_temp';
            case UserType.ldap:
                return 'user_ldap';
            case UserType.local:
                return 'user';
            default:
                return 'user';
        }
    }

    getCameraStatusIcon({
        id,
        status,
        recordingStatus,
        scheduleEnabled,
        parentId,
    }: NxSystemCamera): string {
        const parentServer = this.system.serverManager.servers.find(s => s.id === parentId);
        if (parentServer?.status === 'offline') {
            return menus.systemSettings.cameras.statusIcons.offline;
        }
        if (scheduleEnabled && recordingStatus !== RecordingStatus.Recording) {
            return menus.systemSettings.cameras.statusIcons.scheduled;
        }
        if (this.archivesPresent.has(id) && recordingStatus !== RecordingStatus.Recording) {
            return menus.systemSettings.cameras.statusIcons.archive;
        }
        return menus.systemSettings.cameras.statusIcons[status.toLowerCase()];
    }

    getServerStatusIcon({ status }: NxSystemServer): string {
        return menus.systemSettings.servers.statusIcons[status.toLowerCase()];
    }

    cleanUrl() {
        return this.router.navigate([redirect.authorised, this.systemId]).catch(error => {
            console.error(error);
        });
    }

    connectionLost(): void {
        if (this.systemsService.systems?.length === 1) {
            return;
        }

        const systemName = this.system.info.name
            ? escape(this.system.info.name)
            : this.LANG.errorCodes.thisSystem;
        this.toasts.notify(
            { value: this.LANG.errorCodes.lostConnection, params: { systemName } },
            ToastType.Warning,
        );

        const route = `${redirect.authorised}/${
            (this.mergeTargetSystem && this.mergeTargetSystem.id) || ''
        }`;
        this.mergeTargetSystem = undefined;
        this.systemsService
            .getSystem(this.systemId, false)
            .pipe(untilDestroyed(this))
            .subscribe(system => {
                this.systemNoAccess = system === undefined;
                if (this.systemNoAccess) {
                    this.system.stopPoll();
                }
            });
        setTimeout(() => this.router.navigate([route]), alertTimeout);
    }
}
