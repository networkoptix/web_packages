import {
    Component, Input,
    OnDestroy, OnInit
}                                 from '@angular/core';
import {
    ActivatedRoute, Router, NavigationEnd
}                                 from '@angular/router';
import { UntilDestroy }           from '@ngneat/until-destroy';
import { Subscription }           from 'rxjs';
import { filter, tap }            from 'rxjs/operators';

import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxSettingsService }         from './settings.service';
import { NxMenuService }             from '@src/menu';
import {
    ICamera, NxSystem, NxSystemService
}                                    from '@services/system.service';
import { NxSystemsService }          from '@services/systems.service';
import { Account, NxAccountService } from '@services/account.service';
import { NxUtilsService }            from '@services/utils.service';
import { NxUriService }              from '@services/uri.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxApplyService }            from '@services/apply.service';
import { NxPageService }             from '@services/page.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxAppStateService }         from '@services/nx-app-state.service';

@UntilDestroy({ checkProperties: true })
@Component({
    // eslint-disable-next-line no-multi-spaces
    selector    : 'nx-system-settings-component',
    templateUrl : 'settings.component.html',
    // eslint-disable-next-line no-multi-spaces
    styleUrls   : ['settings.component.scss']
})
export class NxSystemSettingsComponent implements OnInit, OnDestroy {
    @Input() uriParamSystemId;
    @Input() callShare;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin;
    content: any = {};

    account: Account;
    system: NxSystem|any;
    gettingSystem: Process;
    systems;
    deletingSystem;

    searchableResults: boolean;
    menuVisible: boolean;
    systemId;
    systemNoAccess: boolean;
    canMerge: boolean;
    debugMode: boolean;
    betaMode: boolean;
    userDisconnectSystem: boolean;
    mergeTargetSystem;
    gettingSystemUsers: Process;
    selectedUser;

    headerHeight: number;
    secondaryMerge = false;

    private connectionSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSubSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;
    private resizeSubscription: Subscription;
    private routerParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private checkMergeSubscription: Subscription;

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
        private appStateService: NxAppStateService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.setDesktopLayout();
        this.pageService.pageTitle = this.LANG.pageTitles.system?.();
        this.init();
    }

    init(): void {
        // this.systemId = this.uriParamSystemId;
        this.routerParamsSubscription = this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
                this.content.base = this.CONFIG.menus.systemSettings.baseUrl + this.systemId;
                this.content = { ...this.content }; // trigger onChange
                if (!this.CONFIG.isLocal && this.system) {
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
            if (route instanceof NavigationEnd) {
                const isSystemRoute = route.url.includes('/systems');
                const isCameraRoute = route.url.includes('/cameras');
                if (isSystemRoute && !isCameraRoute && this.system) {
                    this.system.show404 = false;
                }
            }
        });

        this.content = {
            selectedSection    : '', // updated by selectedSectionSubject
            selectedSubSection : '', // updated by selectedSubSectionSubject
            system             : {}, // updated by getSystemInfo
            base               : this.CONFIG.menus.systemSettings.baseUrl + this.systemId,
            level1             : [
                {
                    id     : this.CONFIG.menus.systemSettings.admin.id,
                    svg    : this.CONFIG.menus.systemSettings.admin.icon,
                    label  : this.LANG.menu.titles.systemAdministration(),
                    path   : this.CONFIG.menus.systemSettings.admin.path,
                    level2 : []
                }
            ]
        };

        this.menuSectionSubscription = this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.menuSubSectionSubscription = this.menuService
            .selectedSubSectionSubject
            .subscribe(selection => {
                this.content.selectedSubSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
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
            return this.system.getInfo(true); // Force reload system info when opening page
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
            if (this.system.permissions.editUsers) {
                this.gettingSystemUsers.run();
            } else {
                this.systemReady();
            }
        });

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(({ width }) => {
            if (width >= 768) {
                this.setHeaderHeight();
            }
        });
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }

    ngOnDestroy() {
        if (this.system) {
            this.system.stopPoll();
        }
        this.system.ribbonService.hide();
        this.pageService.setDefaultLayout();
    }

    getSystemInfo() {
        this.settingsService.system = undefined;
        this.accountService
            .get()
            .then((account) => {
                if (account && !this.CONFIG.isLocal) {
                    // Starts the systems poll if starting on a system.
                    if (!this.CONFIG.isLocal && !this.systemsService.systemsPoll.destination?.observers?.length) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.account = account;
                    this.system = this.systemService.createSystem(this.account.email, this.systemId);
                    this.system.show404 = false;
                    this.gettingSystem.run().catch(() => {
                        this.systemNoAccess = true;
                    });

                    if (this.systemSubscription) {
                        this.systemSubscription.unsubscribe();
                    }
                    this.systemSubscription = this.system.infoSubject
                        .pipe(
                            filter((system: any) => system !== undefined),
                            tap(({ isOnline }) => {
                                this.applyService.isOnline$.next(!!isOnline);
                                if (isOnline) {
                                    this.system.ribbonService.hide();
                                } else {
                                    this.system.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert');
                                }
                            })
                        )
                        .subscribe(() => {
                            // if system is removed while on page, redirects to systems page
                            if (
                                this.system && this.systemsService.systems &&
                                !this.systemsService.systems.some(system => system.id === this.system.id) &&
                                !this.CONFIG.isLocal) {
                                this.uriService.updateURI('/systems');
                            }
                            if (this.system.isAvailable) {
                                this.updateAlert();
                            }
                            if (this.system.users) {
                                this.updateMenu();
                            }
                            if (this.system.canViewInfo()) {
                                // Makes request to get health, this is used to cache request.
                                this.system.mediaserver.getAggregateHealthReport().subscribe();
                            }
                        });

                    if (this.connectionSubscription) {
                        this.connectionSubscription.unsubscribe();
                    }
                    this.connectionSubscription = this.system.connectionSubject
                        .pipe(filter((connectionLost: boolean) => connectionLost))
                        .subscribe(_ => {
                            this.connectionLost();
                        });
                } else if (this.CONFIG.isLocal && account) {
                    // this.systemsService.stopPoll();
                    if (!this.settingsService.system) {
                        this.settingsService.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                    }
                    this.system = this.settingsService.system;
                    this.system.update();
                    this.system.getInfoAndPermissions();
                    this.systems = [this.system];
                    this.system.isAvailable = true;
                    this.system.isOnline = true;
                    this.settingsService.system = this.system;
                    this.systemSubscription = this.system.infoSubject.subscribe(() => {
                        this.systemReady();
                        this.updateMenu();
                    });
                }
            });
    }

    updateAlert() {
        if (this.checkMergeSubscription) {
            this.checkMergeSubscription.unsubscribe();
        }
        this.checkMergeSubscription = this.system.checkMergeStatus(false)
            .subscribe(res => {
                this.secondaryMerge = false;
                this.system.ribbonService.hide();
                let ribbonText: string;
                const { mergeInProgress } = res.reply;
                const { primary, secondary } = this.systemsService.systemsMerging || {};
                if (!this.system.isOnline) {
                    ribbonText = this.LANG.ribbon.systemOffline?.();
                } else if (primary?.id === this.system.id) {
                    const secondarySystem = this.systemsService.systems.find(system => secondary.id === system.id);
                    let secondaryName = secondarySystem?.name || secondary?.name || this.LANG.system.mergeUnknownName?.();
                    if (secondaryName.startsWith('server at ')) {
                        secondaryName = secondaryName[0].toUpperCase() + secondaryName.slice(1);
                    }
                    ribbonText = `<div class="my-1">
                                        <div class="larger"><strong>${secondaryName}</strong> ${this.LANG.ribbon.beingMerged.to?.()}</div>
                                        <div class="mt-2">${this.LANG.ribbon.beingMerged.mayTake?.()}</div>
                                    </div>`;
                } else if (secondary?.id === this.system.id) {
                    this.mergeTargetSystem = this.systemsService.systems
                        .find((system) => primary.id === system.id) || { name: this.LANG.system.mergeUnknownName?.() };
                    this.secondaryMerge = true;
                } else if (mergeInProgress) {
                    ribbonText = this.LANG.ribbon.systemsMerging;
                }

                if (ribbonText) {
                    this.system.ribbonService.show(ribbonText, [], 'alert');
                }

                setTimeout(() => {
                    this.setHeaderHeight();
                });
            });
    }

    updateMenu() {
        this.systemNoAccess = false;
        this.content.system = this.system;
        if (this.system.permissions.editCameras) {
            let camerasNode = this.content.level1.find((node) => node.id === this.CONFIG.menus.systemSettings.cameras.id);
            if (!camerasNode) {
                camerasNode = {
                    id     : this.CONFIG.menus.systemSettings.cameras.id,
                    svg    : this.CONFIG.menus.systemSettings.cameras.icon,
                    label  : this.LANG.menu.titles.cameras(),
                    path   : this.CONFIG.menus.systemSettings.cameras.path,
                    level3 : []
                };
                this.content.level1.push(camerasNode);
            }
            if (this.system.cameras) {
                const byParam = NxUtilsService.byParam((camera: ICamera) => {
                    return camera.name;
                }, NxUtilsService.sortASC);
                this.system.cameras.sort(byParam);
                camerasNode.level3 = this.system.cameras.map(camera => ({
                    id              : camera.id.replace(/\s|\{|\}/g, ''),
                    svgIcon         : this.getCameraStatusIcon(camera),
                    isEnabled       : camera.status !== 'Offline' && camera.status !== 'Unauthorized',
                    label           : camera.name,
                    indent          : true,
                    path            : `cameras/${camera.id.replace(/\s|\{|\}/g, '')}`,
                    additionalLabel : camera.url.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)
                }));
            } else {
                camerasNode.level3 = [];
            }
        } else {
            this.content.level1 = this.content.level1.filter(node => node.id !== this.CONFIG.menus.systemSettings.cameras.id);
        }

        if (this.system.permissions.editUsers) {
            let usersNode = this.content.level1.filter((node) => node.id === this.CONFIG.menus.systemSettings.users.id)[0];

            if (!usersNode) {
                usersNode = {
                    id     : this.CONFIG.menus.systemSettings.users.id,
                    svg    : this.CONFIG.menus.systemSettings.users.icon,
                    label  : this.LANG.menu.titles.users(),
                    path   : this.CONFIG.menus.systemSettings.users.path,
                    level2 : [
                        {
                            id    : this.CONFIG.menus.systemSettings.buttons.id,
                            items : [
                                {
                                    id       : 'addUser',
                                    label    : this.LANG['Add User']?.(),
                                    disabled : true
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
                const { cloudUsers, localUsers } = this.system.users.reduce((result, user) => {
                    const id = NxUtilsService.cleanId(user.id);
                    const node: any = {
                        additionalLabel : (this.LANG.accessRoles[user.role.name]?.label?.()) || user.role.name,
                        id,
                        isEnabled       : user.isEnabled,
                        label           : user.name || user.email,
                        path            : 'users/' + id,
                        svgIcon         : 'user'
                    };
                    if (!user.isCloud && user.name === 'admin') {
                        node.additionalLabel = 'Owner';
                    }
                    if (user.isCloud) {
                        node.svgIcon = '';
                        node.icon = 'glyphicon-cloud';
                        node.label = user.email;
                        result.cloudUsers.push(node);
                    } else {
                        result.localUsers.push(node);
                    }
                    return result;
                }, { cloudUsers: [], localUsers: [] });

                usersNode.level3 = [];
                if (localUsers.length > 0) {
                    usersNode.level3 = [...localUsers];
                    usersNode.level3.push({ horizontal: true });
                }
                usersNode.level3.push(...cloudUsers);
            }
        } else { // remove Users
            this.content.level1 = this.content.level1.filter(node => node.id !== this.CONFIG.menus.systemSettings.users.id);
        }

        if (this.system.permissions.isAdmin) {
            let serversNode = this.content.level1.find((node) => node.id === this.CONFIG.menus.systemSettings.servers.id);
            if (!serversNode) {
                serversNode = {
                    id    : this.CONFIG.menus.systemSettings.servers.id,
                    svg   : this.CONFIG.menus.systemSettings.servers.icon,
                    label : this.LANG.servers.servers(),
                    path  : this.CONFIG.menus.systemSettings.servers.path
                };
                this.content.level1.push(serversNode);
            }

            if (this.system.servers) {
                serversNode.level3 = [];
                this.system.servers.forEach(systemServer => {
                    const server = NxUtilsService.formatURL(systemServer);
                    const id = NxUtilsService.cleanId(server.id);

                    serversNode.level3.push({
                        id              : server.id,
                        icon            : '',
                        label           : server.name,
                        path            : `servers/${id}`,
                        additionalLabel : server.ip
                    });
                });
            }
        } else {
            this.content.level1 = this.content.level1.filter((node: any) => node.id !== this.CONFIG.menus.systemSettings.servers.id);
        }

        const adminNode = this.content.level1.filter((node) => node.id === this.CONFIG.menus.systemSettings.admin.id)[0];

        adminNode.level3 = [{
            id    : this.CONFIG.menus.systemSettings.general.id,
            svg   : this.CONFIG.menus.systemSettings.general.icon,
            label : this.LANG.menu.titles.general(),
            path  : this.CONFIG.menus.systemSettings.general.path
        }];

        if (this.system.isAdmin || this.system.isOwner) {
            adminNode.level3.push({
                id    : this.CONFIG.menus.systemSettings.licenses.id,
                svg   : this.CONFIG.menus.systemSettings.licenses.icon,
                label : this.LANG.menu.titles.licenses(),
                path  : this.CONFIG.menus.systemSettings.licenses.path
            });
        }
        // Need to replace hard coded 'true' once services for cloud storage are setup, should be checking system for cloud storage capability
        // eslint-disable-next-line no-constant-condition
        if (this.system.canUserViewCloudStorage()) {
            adminNode.level3.push({
                id    : this.CONFIG.menus.systemSettings.cloudStorage.id,
                icon  : '',
                label : this.LANG.dialogs.cloudStorage.title(),
                path  : this.CONFIG.menus.systemSettings.cloudStorage.path
            });
        }

        // hide search if no permissions for potentially long list ... cameras, servers and users
        this.searchableResults = (this.system.permissions.editCameras && this.system.permissions.isAdmin && this.system.permissions.editUsers);

        this.content = { ...this.content };
    }

    getCameraStatusIcon({ status }) {
        return this.CONFIG.menus.systemSettings.cameras.statusIcons[status.toLowerCase()];
    }

    cleanUrl() {
        return this.router
            .navigate([this.CONFIG.redirect.authorised, this.systemId])
            .catch(error => {
                console.error(error);
            });
    }

    connectionLost() {
        this.dialogs.notify(this.LANG.errorCodes.lostConnection({ systemName: this.system.info.name || this.LANG.errorCodes.thisSystem() }), 'warning');

        const route = `${this.CONFIG.redirect.authorised}/${this.mergeTargetSystem && this.mergeTargetSystem.id || ''}`;
        this.mergeTargetSystem = undefined;
        this.systemsService.getSystem(this.systemId, false)
            .subscribe((system: NxSystem) => {
                this.systemNoAccess = system === undefined;
                if (this.systemNoAccess) {
                    this.system.stopPoll();
                }
            });
        setTimeout(() => this.router.navigate([route]), this.CONFIG.alertTimeout);
    }
}
