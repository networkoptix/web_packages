import { DOCUMENT } from '@angular/common';
import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    Inject,
} from '@angular/core';
import {
    ActivatedRoute,
    Router,
    NavigationEnd,
    NavigationStart
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, takeUntil, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { Account, NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { OauthService } from '@services/oauth.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import type {
    ICamera
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';
import { NxMenuService } from '@src/menu/menu.service';
import type { Content, Level3Item } from '@src/menu/menu.types';
import { cleanId, htmlToEntity, paramSortFunc } from '@utils/general';
import { setServerIpAndPort } from '@utils/nx';

import { NxSettingsService } from './settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-system-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss']
})
export class NxSystemSettingsComponent implements OnInit, OnDestroy {
    @Input() uriParamSystemId;
    @Input() callShare;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin;
    content: Partial<Content> = {};
    menuSearchable: boolean;

    account: Account;
    system: NxSystem | any;
    gettingSystem: Process;
    systems;
    deletingSystem;

    _menuSearchMode: boolean;
    menuVisible: boolean;
    systemId;
    systemNoAccess: boolean;
    debugMode: boolean;
    betaMode: boolean;
    userDisconnectSystem: boolean;
    mergeTargetSystem;
    gettingSystemUsers: Process;
    selectedUser;

    headerHeight: number;
    secondaryMerge = false;
    systemName: string;
    show2faRequired = false;

    private cancelPrevious$ = new Subject();
    private connection$ = new Subject();

    private resizeSubscription: Subscription;
    private routerParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private systemInfoSubscription: Subscription;
    private checkMergeSubscription: Subscription;

    private origSelectedSection: string;
    private origSelectedSubSection: string;
    private origSelectedDetailSection: string;

    private setupDefaults() {
        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.systemNoAccess = false;
        this.userDisconnectSystem = false;
        this.selectedUser = { email: '' };
    }

    private systemReady() {
        this.settingsService.system = this.system;
        this.menuVisible = true;
    }

    private canNavMenu(origTargetValue, contentTarget, selection) {
        if (this.applyService.locked) {
            origTargetValue = selection;

            this.cancelPrevious$.next('cancel');
            this.applyService.applyOnNavSubject.pipe(
                takeUntil(this.cancelPrevious$)
            ).subscribe(status => {
                if (!['', 'canceled'].includes(status)) {
                    this.content[contentTarget] = origTargetValue;
                    this.content = { ...this.content }; // trigger onChange
                }
            });
        } else {
            this.content[contentTarget] = selection;
            this.content = { ...this.content }; // trigger onChange
        }
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private settingsService: NxSettingsService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        private router: Router,
        private scrollMechanicsService: NxScrollMechanicsService,
        private applyService: NxApplyService,
        private appStateService: NxAppStateService,
        private ribbonService: NxRibbonService,
        private oauthService: OauthService,
        @Inject(DOCUMENT) private document: Document,
        private cookieService: CookieService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.system?.();
        this.init();
    }

    init(): void {
        // this.systemId = this.uriParamSystemId;
        this.routerParamsSubscription = this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
                this.content.base =
                    this.CONFIG.menus.systemSettings.baseUrl + this.systemId;
                this.content = { ...this.content }; // trigger onChange
                if (!environment.isLocal && this.system) {
                    this.system.stopPoll();
                    this.system = undefined;
                    this.settingsService.system = undefined;
                }
                this.systemNoAccess = false;
                this.menuVisible = false;
            } else {
                this.systemId = '';
            }
            this.getSystemInfo();
        });

        this.router.events.subscribe(route => {
            if (
                route instanceof NavigationStart &&
                route.url.includes('health')
            ) {
                // remove unnecessary system update
                // (ex. health monitor will trigger system update)
                // and orphan metrics request in systemInfoSubscription
                this.systemInfoSubscription?.unsubscribe();
                this.systemSubscription?.unsubscribe();
            }
            if (route instanceof NavigationEnd) {
                const isSystemRoute = route.url.includes('/systems');
                const isCameraRoute = route.url.includes('/cameras');
                if (isSystemRoute && !isCameraRoute && this.system) {
                    this.system.show404 = false;
                }
            }
        });

        this.menuSearchable = false;
        this.content = {
            selectedSection: '', // updated by selectedSectionSubject
            selectedSubSection: '', // updated by selectedSubSectionSubject
            base: this.CONFIG.menus.systemSettings.baseUrl + this.systemId,
            level1: [
                {
                    id: this.CONFIG.menus.systemSettings.admin.id,
                    svg: this.CONFIG.menus.systemSettings.admin.icon,
                    label: this.LANG.menu.titles.systemAdministration(),
                    path: this.CONFIG.menus.systemSettings.admin.path,
                    level2: []
                }
            ]
        };

        this.menuService
            .selectedSectionSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedSection,
                    'selectedSection',
                    selection
                );
            });

        this.menuService
            .selectedSubSectionSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedSubSection,
                    'selectedSubSection',
                    selection
                );
            });

        this.menuService
            .selectedDetailsSection
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe(selection => {
                this.canNavMenu(
                    this.origSelectedDetailSection,
                    'selectedDetailsSection',
                    selection
                );
            });

        // TODO: add processes back
        // Retrieve users list
        this.gettingSystemUsers = this.processService.createProcess(() => {
            return this.system.getUsers(true);
        }, {
            errorPrefix: this.LANG.errorCodes.cantGetUsersListPrefix()
        }).then(() => {
            this.systemReady();
        });

        // Retrieve system info
        this.gettingSystem = this.processService.createProcess(() => {
            return this.system.getInfo(true);
            // Force reload system info when opening page
        }, {
            errorCodes: {
                forbidden: () => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                },
                notFound: () => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                }
            },
            errorPrefix: this.LANG.errorCodes.cantGetSystemInfoPrefix()
        }).then(() => {
            if (this.system.userManager.permissions.editUsers) {
                this.gettingSystemUsers.run();
            } else {
                this.systemReady();
            }
        });

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject
            .subscribe(({ width }) => {
                if (width >= 768) {
                    this.setHeaderHeight();
                }
            });
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility
            ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight
            : this.CONFIG.headerHeight;
    }

    ngOnDestroy(): void {
        if (this.system) {
            this.system.stopPoll();
            this.system.ribbonService.hide();
        }
        this.pageService.setDefaultLayout();
    }

    getSystemInfo() {
        this.settingsService.system = undefined;
        this.accountService
            .get(true)
            .then(account => {
                if (account) {
                    this.account = account;
                    if (!environment.isLocal) {
                        // Starts the systems poll if starting on a system.
                        if (!this.systemsService.isPolling) {
                            this.systemsService.getSystems(account.email);
                        }

                        if (this.systemSubscription) {
                            this.systemInfoSubscription?.unsubscribe();
                            this.systemSubscription.unsubscribe();
                        }
                        this.systemSubscription = this.systemsService.systemsSubject
                            .subscribe(systems => {
                                const system = systems.find(system =>
                                    system.id === this.systemId
                                );
                                if (system === undefined) {
                                    this.systemNoAccess = true;
                                    return;
                                }
                                if (this.systemId === this.system?.id) {
                                    return;
                                }
                                this.system = this.systemService.createSystem(
                                    this.account.email,
                                    this.systemId,
                                    undefined,
                                    true
                                );

                                if (
                                    system?.system2faEnabled &&
                                    !this.account?.sessionVerified
                                ) {
                                    this.system.mediaserver
                                        .getMediaServers(false)
                                        .toPromise()
                                        .then(
                                            () => {},
                                            () => {
                                                return this.oauthService.redirectOauth(
                                                    'system2faAuth',
                                                    account.email,
                                                    undefined,
                                                    this.system.mediaserver.accessToken
                                                );
                                            }
                                        );
                                }

                                this.system.show404 = false;
                                this.gettingSystem.run().catch(() => {
                                    this.systemNoAccess = true;
                                });

                                if (this.systemInfoSubscription) {
                                    this.systemInfoSubscription.unsubscribe();
                                }

                                this.systemInfoSubscription = this.system.infoSubject
                                    .pipe(
                                        filter((system: any) => system !== undefined),
                                        tap(({ isOnline }) => {
                                            this.applyService.isOnline$.next(!!isOnline);
                                            if (isOnline) {
                                                this.system.ribbonService.hide();
                                            } else {
                                                this.system.ribbonService.show(
                                                    this.LANG.ribbon.systemOffline?.(),
                                                    [],
                                                    'alert',
                                                    undefined,
                                                    true
                                                );
                                            }
                                        }),
                                    )
                                    .subscribe(() => {
                                        // if system is removed while on page, redirects to systems page
                                        if (
                                            this.system &&
                                            this.systemsService.systems &&
                                            !this.systemsService.systems.some(system =>
                                                system.id === this.system.id
                                            ) &&
                                            !environment.isLocal
                                        ) {
                                            this.uriService.updateURI(
                                                (this.CONFIG.featureFlags.dashboardRedirect || this.cookieService.get('devServer') || 'beta' in this.route.snapshot.queryParams)
                                                    ? '/dashboard'
                                                    : '/systems'
                                            );
                                        }
                                        if (this.system.isAvailable) {
                                            this.updateAlert();
                                        }
                                        if (this.system.canViewInfo()) {
                                            // Makes request to get health, this is used to cache request.
                                            this.system.mediaserver
                                                .getAggregateHealthReport()
                                                .subscribe();
                                        }

                                        this.updateMenu();
                                    });

                                this.connection$.next(true);
                                this.system.connectionSubject
                                    .pipe(
                                        takeUntil(this.connection$),
                                        filter((connectionLost: boolean) => connectionLost))
                                    .subscribe(_ => {
                                        this.connectionLost();
                                    });
                            });
                    } else {
                        this.system = this.systemService.createLocalSystem(
                            this.accountService.mediaServerApi,
                            account.id,
                            account.email
                        );
                        this.system.update().then(() => {
                            this.systems = [this.system];
                            this.system.isAvailable = true;
                            this.system.isOnline = true;
                            setTimeout(() => {
                                this.pageService.pageTitle =
                                    this.system.info.systemName || this.system.info.name;
                            });

                            if (this.systemInfoSubscription) {
                                this.systemInfoSubscription.unsubscribe();
                            }
                            this.systemInfoSubscription =
                                this.system.infoSubject
                                    .pipe(distinctUntilChanged())
                                    .subscribe(() => {
                                        this.systemReady();
                                        this.updateAlert();
                                        this.updateMenu();
                                    });
                        });
                    }
                }
            });
    }

    updateAlert() {
        if (this.checkMergeSubscription) {
            this.checkMergeSubscription.unsubscribe();
        }
        this.checkMergeSubscription = this.system.checkMergeStatus(true)
            .subscribe(res => {
                const { mergeInProgress } = res?.reply || res;
                if (environment.isLocal) {
                    if (!mergeInProgress && this.system.isOnline && !this.systemsService.checkMerge(this.system)) {
                        this.ribbonService.hide();
                    }
                } else {
                    this.secondaryMerge = false;
                    this.system.ribbonService.hide();
                    let ribbonText: string;
                    let systemOnly = false;
                    const { primary, secondary } =
                        this.systemsService.systemsMerging || {};
                    if (!this.system.isOnline) {
                        ribbonText = this.LANG.ribbon.systemOffline?.();
                        systemOnly = true;
                    } else if (primary?.id === this.system.id) {
                        const secondarySystem = this.systemsService.systems
                            .find(system => secondary.id === system.id);
                        let secondaryName = secondarySystem?.name ||
                            secondary?.name ||
                            this.LANG.system.mergeUnknownName?.();
                        if (secondaryName.startsWith('server at ')) {
                            secondaryName = secondaryName[0].toUpperCase() +
                                secondaryName.slice(1);
                        }
                        ribbonText = `<div class="my-1">
                                            <div class="larger"><strong>${secondaryName}</strong> ${this.LANG.ribbon.beingMerged.to?.()}</div>
                                            <div class="mt-2">${this.LANG.ribbon.beingMerged.mayTake?.()}</div>
                                        </div>`;
                    } else if (secondary?.id === this.system.id) {
                        this.mergeTargetSystem = this.systemsService.systems
                            .find(system => primary.id === system.id) ||
                                { name: this.LANG.system.mergeUnknownName?.() };
                        this.secondaryMerge = true;
                    } else if (mergeInProgress) {
                        ribbonText = this.LANG.ribbon.systemsMerging;
                    }

                    if (ribbonText) {
                        this.system.ribbonService.show(
                            ribbonText,
                            [],
                            'alert',
                            undefined,
                            systemOnly
                        );
                    }

                    setTimeout(() => {
                        this.setHeaderHeight();
                    });
                }
            });
    }

    contentToggle(event) {
        this.content.level1.find(node => {
            if (node.id === event.nodeId) {
                node.toggle = event.state;
                return true;
            } else {
                return false;
            }
        });
    }

    menuMode(event) {
        setTimeout(() => {
            this._menuSearchMode = event;
        });
    }

    async updateMenu() {
        this.systemNoAccess = false;

        if (this.system.userManager.permissions.editCameras) {
            let camerasNode = this.content.level1.find(node =>
                node.id === this.CONFIG.menus.systemSettings.cameras.id
            );
            if (!camerasNode) {
                camerasNode = {
                    id: this.CONFIG.menus.systemSettings.cameras.id,
                    svg: this.CONFIG.menus.systemSettings.cameras.icon,
                    label: this.LANG.menu.titles.cameras(),
                    path: this.CONFIG.menus.systemSettings.cameras.path,
                    level3: []
                };
                this.content.level1.push(camerasNode);
            }
            if (this.system.cameras) {
                const byParam = paramSortFunc<ICamera>(camera => camera.name);
                this.system.cameras.sort(byParam);
                camerasNode.level3 = this.system.cameras.map(
                    (camera): Level3Item => ({
                        id: camera.id.replace(/\s|\{|\}/g, ''),
                        svgIcon: this.getCameraStatusIcon(camera),
                        disabled: camera.status === 'Offline' ||
                        camera.status === 'Unauthorized',
                        label: camera.name,
                        indent: true,
                        path: `cameras/${camera.id.replace(/\s|\{|\}/g, '')}`,
                        additionalLabel: camera.url.match(
                            /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
                        )
                    })
                );
            } else {
                camerasNode.level3 = [];
            }
        } else {
            this.content.level1 = this.content.level1.filter(node =>
                node.id !== this.CONFIG.menus.systemSettings.cameras.id
            );
        }

        if (this.system.userManager.permissions.editUsers) {
            let usersNode = this.content.level1.find(node =>
                node.id === this.CONFIG.menus.systemSettings.users.id
            );

            if (!usersNode) {
                usersNode = {
                    id: this.CONFIG.menus.systemSettings.users.id,
                    svg: this.CONFIG.menus.systemSettings.users.icon,
                    label: this.LANG.menu.titles.users(),
                    path: this.CONFIG.menus.systemSettings.users.path,
                    level2: [
                        {
                            id: this.CONFIG.menus.systemSettings.buttons.id,
                            items: [
                                {
                                    id: 'addUser',
                                    label: this.LANG['Add User']?.(),
                                    disabled: true
                                }
                            ],
                            level3: []
                        }
                    ]
                };
                this.content.level1.push(usersNode);
            }

            // Retain buttons
            if (usersNode.level2.length && usersNode.level2[0].id === 'buttons') {
                usersNode.level2[0].items[0].disabled = !this.system.isAvailable;
            } else {
                usersNode.level2 = [];
            }
            if (this.system && this.system.users?.length > 0) {
                const {
                    cloudUsers,
                    localUsers
                }: {
                    cloudUsers: Level3Item[];
                    localUsers: Level3Item[];
                } = this.system.users.reduce((result, user) => {
                    const id = cleanId(user.id);
                    const node: Level3Item = {
                        additionalLabel: this.LANG.accessRoles[user.role.name]?.label?.() ||
                            user.role.name,
                        id,
                        disabled: !user.isEnabled,
                        label: user.name || user.email,
                        path: 'users/' + id,
                        svgIcon: 'user'
                    };
                    if (!user.isCloud && user.name === 'admin') {
                        node.additionalLabel = 'Owner';
                    }
                    if (user.isCloud) {
                        node.svgIcon = 'user_cloud';
                        node.icon = '';
                        node.label = user.email;
                        result.cloudUsers.push(node);
                    } else {
                        result.localUsers.push(node);
                    }
                    return result;
                }, { cloudUsers: [], localUsers: [] });

                usersNode.level3 = [];
                if (localUsers.length) {
                    usersNode.level3.push(...localUsers);
                    if (cloudUsers.length) {
                        usersNode.level3.push(
                            { horizontal: true } as Level3Item
                        );
                    }
                    // Hack to get a horizontal divider
                    // between local and cloud users
                    // (See menu.component.html)
                }
                if (cloudUsers.length) {
                    usersNode.level3.push(...cloudUsers);
                }
            }
        } else { // remove Users
            this.content.level1 = this.content.level1.filter(node =>
                node.id !== this.CONFIG.menus.systemSettings.users.id
            );
        }

        if (this.system.userManager.permissions.isAdmin) {
            let serversNode = this.content.level1.find(node =>
                node.id === this.CONFIG.menus.systemSettings.servers.id
            );
            if (!serversNode) {
                serversNode = {
                    id: this.CONFIG.menus.systemSettings.servers.id,
                    svg: this.CONFIG.menus.systemSettings.servers.icon,
                    label: this.LANG.servers.servers(),
                    path: this.CONFIG.menus.systemSettings.servers.path
                };
                this.content.level1.push(serversNode);
            }

            if (this.system.servers) {
                const byParam = paramSortFunc((server: any) => {
                    return server.name.toLowerCase();
                });
                this.system.servers.sort(byParam);

                serversNode.level3 = [];
                this.system.servers.forEach(systemServer => {
                    const server = setServerIpAndPort(systemServer);
                    const id = cleanId(server.id);

                    serversNode.level3.push({
                        id: server.id,
                        svgIcon: this.getServerStatusIcon(server),
                        label: server.name,
                        path: `servers/${id}`,
                        additionalLabel: server.ip,
                        indent: true,
                        disabled: server.status.toLowerCase() === 'offline'
                    });
                });
                serversNode.path = `${this.CONFIG.menus.systemSettings.servers.path}/${cleanId(serversNode.level3[0]?.id || '')}`;
            }
        } else {
            this.content.level1 = this.content.level1.filter(node =>
                node.id !== this.CONFIG.menus.systemSettings.servers.id
            );
        }

        const adminNode = this.content.level1.find(node =>
            node.id === this.CONFIG.menus.systemSettings.admin.id
        );

        adminNode.level3 = [{
            id: this.CONFIG.menus.systemSettings.general.id,
            svg: this.CONFIG.menus.systemSettings.general.icon,
            label: this.LANG.menu.titles.general(),
            path: this.CONFIG.menus.systemSettings.general.path
        }];

        if (this.system.isAdmin || this.system.isOwner) {
            adminNode.level3.push({
                id: this.CONFIG.menus.systemSettings.licenses.id,
                svg: this.CONFIG.menus.systemSettings.licenses.icon,
                label: this.LANG.menu.titles.licenses(),
                path: this.CONFIG.menus.systemSettings.licenses.path
            });
        }

        if (this.system.canUserViewCloudStorage()) {
            adminNode.level3.push({
                id: this.CONFIG.menus.systemSettings.cloudStorage.id,
                icon: '',
                label: this.LANG.dialogs.cloudStorage.title(),
                path: this.CONFIG.menus.systemSettings.cloudStorage.path
            });
        }

        // hide search if no permissions for potentially long list ... cameras, servers and users
        this.menuSearchable = (
            this.system.userManager.permissions.editCameras &&
            this.system.userManager.permissions.isAdmin &&
            this.system.userManager.permissions.editUsers
        );
        this.content = { ...this.content };
    }

    getCameraStatusIcon({ status, scheduleEnabled }) {
        if (scheduleEnabled && !(status === 'Recording')) {
            return this.CONFIG.menus.systemSettings.cameras.statusIcons.scheduled;
        }
        return this.CONFIG.menus.systemSettings.cameras.statusIcons[
            status.toLowerCase()
        ];
    }

    getServerStatusIcon({ status }) {
        return this.CONFIG.menus.systemSettings.servers.statusIcons[
            status.toLowerCase()
        ];
    }

    cleanUrl() {
        return this.router
            .navigate([this.CONFIG.redirect.authorised, this.systemId])
            .catch(error => {
                console.error(error);
            });
    }

    connectionLost() {
        const sysName = htmlToEntity(
            this.system.info.name || this.LANG.errorCodes.thisSystem()
        );
        this.dialogs.notify(
            this.LANG.errorCodes.lostConnection({ systemName: sysName }),
            'warning'
        );

        const route = `${this.CONFIG.redirect.authorised}/${this.mergeTargetSystem && this.mergeTargetSystem.id || ''}`;
        this.mergeTargetSystem = undefined;
        this.systemsService.getSystem(this.systemId, false)
            .subscribe((system: NxSystem) => {
                this.systemNoAccess = system === undefined;
                if (this.systemNoAccess) {
                    this.system.stopPoll();
                }
            });
        setTimeout(
            () => this.router.navigate([route]),
            this.CONFIG.alertTimeout
        );
    }
}
