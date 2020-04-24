import {
    Component, Input,
    OnDestroy, OnInit
}                                    from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxPageService }             from '../../../services/page.service';
import { NxDialogsService }          from '../../../dialogs/dialogs.service';
import { NxSettingsService }         from './settings.service';
import { NxMenuService }             from '../../../components/menu/menu.service';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxSystemsService }          from '../../../services/systems.service';
import { NxAccountService }          from '../../../services/account.service';
import { NxProcessService }          from '../../../services/process.service';
import { NxUtilsService }            from '../../../services/utils.service';
import { NxUriService }              from '../../../services/uri.service';
import { NxRibbonService }           from '../../../components/ribbon/ribbon.service';
import { NxToastService }            from '../../../dialogs/toast.service';
import { Subscription }              from 'rxjs';
import { filter }                    from 'rxjs/operators';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { NxScrollMechanicsService }  from '../../../services/scroll-mechanics.service';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-system-settings-component',
    templateUrl : 'settings.component.html',
    styleUrls   : ['settings.component.scss']
})

export class NxSystemSettingsComponent implements OnInit, OnDestroy {
    @Input() uriParamSystemId;
    @Input() callShare;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin: any;
    content: any = {};

    account: any;
    system: NxSystem;
    gettingSystem: any;
    systems: any;
    deletingSystem: any;

    menuVisible: boolean;
    systemId: any;
    systemNoAccess: boolean;
    canMerge: boolean;
    debugMode: boolean;
    betaMode: boolean;
    userDisconnectSystem: boolean;
    mergeTargetSystem: any;
    gettingSystemUsers: any;
    selectedUser: any;

    headerHeight: number;
    secondaryMerge = false;

    private connectionSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSubSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;
    private resizeSubscription: Subscription;
    private routerParamsSubscription: Subscription;
    private systemSubscription: Subscription;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
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

    constructor(configService: NxConfigService,
                private route: ActivatedRoute,
                private accountService: NxAccountService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemService: NxSystemService,
                private systemsService: NxSystemsService,
                private settingsService: NxSettingsService,
                private processService: NxProcessService,
                private uriService: NxUriService,
                private menuService: NxMenuService,
                private ribbonService: NxRibbonService,
                private router: Router,
                private toastService: NxToastService,
                private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        this.pageService.setDesktopLayout();
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.system);
        this.init();
    }

    init(): void {
        // this.systemId = this.uriParamSystemId;
        this.routerParamsSubscription = this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
                this.content.base = this.CONFIG.menus.systemSettings.baseUrl + this.systemId;
                this.content = { ...this.content }; // trigger onChange
                if (this.system) {
                    this.system.stopPoll();
                    this.system = undefined;
                    this.settingsService.system = undefined;
                }
                this.ribbonService.hide();
                this.systemNoAccess = false;
                this.menuVisible = false;
                this.getSystemInfo();
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
                    label  : this.LANG.menu.titles.systemAdministration,
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
            errorPrefix: this.LANG.errorCodes.cantGetUsersListPrefix
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
            errorPrefix: this.LANG.errorCodes.cantGetSystemInfoPrefix
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
        this.headerHeight = document.getElementsByClassName('headerContainer')[0].scrollHeight;
    }

    ngOnDestroy() {
        this.system.stopPoll();
        this.ribbonService.hide();
        this.pageService.setDefaultLayout();
    }

    getSystemInfo() {
        this.settingsService.system = undefined;
        this.accountService
            .get()
            .then((account) => {
                if (account) {
                    // Starts the systems poll if starting on a system.
                    if (!this.systemsService.systemsPoll.destination.observers.length) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.account = account;
                    this.system = this.systemService.createSystem(this.account.email, this.systemId);
                    this.gettingSystem.run().catch(() => {
                        this.systemNoAccess = true;
                    });

                    if (this.systemSubscription) {
                        this.systemSubscription.unsubscribe();
                    }
                    this.systemSubscription = this.system.infoSubject
                        .pipe(filter((system: any) => system !== undefined))
                        .subscribe(() => {
                            // if system is removed while on page, redirects to systems page
                            if (
                                this.system && this.systemsService.systems &&
                                !this.systemsService.systems.some(system => system.id === this.system.id)
                            ) {
                                this.uriService.updateURI('/systems');
                            }
                            if (this.system.isAvailable) {
                                this.updateAlert();
                            }
                            if (this.system.users) {
                                this.updateMenu();
                            }
                            if (!this.system.isOnline) {
                                this.ribbonService.hide();
                                this.ribbonService.show(this.LANG.ribbon.systemOffline, '', '', 'alert');
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
                }
            });
    }

    updateAlert() {
        this.system.checkMergeStatus()
            .subscribe(res => {
                const { mergeInProgress } = res.reply;
                const { primary, secondary } = this.systemsService.systemsMerging || {};
                if (!this.system.isOnline) {
                    this.ribbonService.hide();
                    this.ribbonService.show(this.LANG.ribbon.systemOffline, '', '', 'alert');
                } else if (primary && primary.id === this.system.id) {
                    this.secondaryMerge = false;
                    const secondarySystem = this.systemsService.systems.find(system => secondary.id === system.id);
                    let secondaryName = secondarySystem && secondarySystem.name ||
                        secondary && secondary.name || this.LANG.system.mergeUnknownName;
                    if (secondaryName.indexOf('server at ') === 0) {
                        secondaryName = secondaryName[0].toUpperCase() + secondaryName.slice(1);
                    }
                    const template =
                        `<div class="my-1">
                            <div class="larger"><strong>${secondaryName}</strong> ${this.LANG.ribbon.beingMerged.to}</div>
                            <div class="mt-2">${this.LANG.ribbon.beingMerged.mayTake}</div>
                        </div>`;
                    this.ribbonService.hide();
                    this.ribbonService.show(template, '', '', 'alert');
                } else if (secondary && secondary.id === this.system.id) {
                    this.mergeTargetSystem = this.systemsService.systems
                        .find((system) => primary.id === system.id) || { name: this.LANG.system.mergeUnknownName };
                    this.secondaryMerge = true;
                } else if (mergeInProgress) {
                    this.ribbonService.hide();
                    this.ribbonService.show(this.LANG.ribbon.systemsMerging, '', '', 'alert');
                } else {
                    this.secondaryMerge = false;
                    this.ribbonService.hide();
                }
                setTimeout(() => {
                    this.setHeaderHeight();
                });
            });
    }

    updateMenu() {
        this.systemNoAccess = false;
        this.content.system = this.system;

        const adminNode = this.content.level1.filter((node) => node.id === this.CONFIG.menus.systemSettings.admin.id)[0];

        adminNode.level3 = [{
            id    : this.CONFIG.menus.systemSettings.general.id,
            svg   : this.CONFIG.menus.systemSettings.general.icon,
            label : this.LANG.menu.titles.general,
            path  : this.CONFIG.menus.systemSettings.general.path
        }];

        if (this.system.isAdmin || this.system.isOwner) {
            adminNode.level3.push({
                id    : this.CONFIG.menus.systemSettings.licenses.id,
                svg   : this.CONFIG.menus.systemSettings.licenses.icon,
                label : this.LANG.menu.titles.licenses,
                path  : this.CONFIG.menus.systemSettings.licenses.path
            });
        }

        if (this.system.permissions.isAdmin) {
            let camerasNode = this.content.level1.find((node) => node.id === this.CONFIG.menus.systemSettings.cameras.id);
            if (!camerasNode) {
                camerasNode = {
                    id     : this.CONFIG.menus.systemSettings.cameras.id,
                    svg    : this.CONFIG.menus.systemSettings.cameras.icon,
                    label  : 'Cameras',
                    path   : this.CONFIG.menus.systemSettings.cameras.path,
                    level3 : []
                };
                this.content.level1.push(camerasNode);
            }
            if (this.system.cameras) {
                const byParam = NxUtilsService.byParam((camera) => {
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
                    label  : this.LANG.menu.titles.users,
                    path   : this.CONFIG.menus.systemSettings.users.path,
                    level2 : [
                        {
                            id    : this.CONFIG.menus.systemSettings.buttons.id,
                            items : [
                                {
                                    id       : 'addUser',
                                    label    : this.LANG['Add User'],
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
            if (this.system && this.system.users.length > 0) {
                const { cloudUsers, localUsers } = this.system.users.reduce((result, user) => {
                    const id = NxUtilsService.cleanId(user.id);
                    const node: any = {
                        additionalLabel : (this.LANG.accessRoles[user.role.name] && this.LANG.accessRoles[user.role.name].label) || user.role.name,
                        id,
                        isEnabled       : user.isEnabled,
                        label           : user.name || user.email,
                        path            : 'users/' + id,
                        svgIcon         : 'user'
                    };
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
                    label : this.LANG.servers.servers,
                    path  : this.CONFIG.menus.systemSettings.servers.path
                };
                this.content.level1.push(serversNode);
            }

            if (this.system.servers) {
                const byParam = NxUtilsService.byParam((server) => {
                    return server.name;
                }, NxUtilsService.sortASC);
                this.system.servers.sort(byParam);

                serversNode.level3 = [];
                this.system.servers.forEach(systemServer => {
                    const server = NxUtilsService.formatURL(systemServer);

                    serversNode.level3.push({
                        id              : server.id,
                        icon            : '',
                        label           : server.name,
                        path            : `servers/${server.id}`,
                        additionalLabel : server.ip
                    });
                });
            }
        } else {
            this.content.level1 = this.content.level1.filter((node: any) => node.id !== this.CONFIG.menus.systemSettings.servers.id);
        }
        // Need to replace hard coded 'true' once services for cloud storage are setup, should be checking system for cloud storage capability
        // eslint-disable-next-line no-constant-condition
        if (!this.content.level1.find(({ id }) => id === this.CONFIG.menus.systemSettings.admin.id).level2.find(({ id }) => id === this.CONFIG.menus.systemSettings.cloudStorage.id)) {
            const adminNode = this.content.level1.find(({ id }) => id === this.CONFIG.menus.systemSettings.admin.id);
            const generalNode = {
                id    : this.CONFIG.menus.systemSettings.admin.id,
                label : this.LANG.common.general,
                path  : this.CONFIG.menus.systemSettings.admin.path
            };
            const cloudStorageNode = {
                id    : this.CONFIG.menus.systemSettings.cloudStorage.id,
                label : this.LANG.dialogs.cloudStorage.title,
                path  : this.CONFIG.menus.systemSettings.cloudStorage.path
            };
            adminNode.level3 = this.system.canUserViewCloudStorage() ? [generalNode, cloudStorageNode] : [];
        }

        this.content = { ...this.content };
    }

    getCameraStatusIcon({ status }) {
        return this.CONFIG.menus.systemSettings.cameras.statusIcons[status.toLowerCase()];
    }

    /**
     * Return IPv4 address or IPv6 address if none
     */
    formatURL(server) {
        function ipReducer(result: any, currentValue: any) {
            if (currentValue[0] === '[') {
                result.ipv6.push(currentValue);
            } else {
                result.ipv4.push(currentValue);
            }
            return result;
        }

        const addr = server.networkAddresses.split(';');
        const addresses = addr.reduce(ipReducer, { ipv4: [], ipv6: [] });

        if (addresses.ipv4.length > 0) {
            const [ip, port] = addresses.ipv4[0].split(':');
            server.ip = ip;
            server.port = port || '';
        } else if (addresses.ipv6.length > 0) {
            if (addresses.ipv6[0].indexOf('[') === 0) {
                const [ip, port] = addresses.ipv6[0].split(']:');
                server.ip = ip.substring(1);
                server.port = port || '';
            } else {
                server.ip = addresses.ipv6[0];
                server.port = '';
            }
        } else {
            server.ip = 'N/A';
            server.port = '';
        }

        return server;
    };

    cleanUrl() {
        return this.router
            .navigate([this.CONFIG.redirect.authorised, this.systemId])
            .catch(error => {
                console.error(error);
            });
    }

    connectionLost() {
        this.dialogs.notify(this.LANG.errorCodes.lostConnection.replace('{{systemName}}',
            this.system.info.name || this.LANG.errorCodes.thisSystem), 'warning');

        const route = `${this.CONFIG.redirect.authorised}/${this.mergeTargetSystem.id || ''}`;
        setTimeout(() => this.router.navigate([route]), this.CONFIG.alertTimeout);
    }
}
