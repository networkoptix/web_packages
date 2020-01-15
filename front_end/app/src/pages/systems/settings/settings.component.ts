import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NxConfigService }                             from '../../../services/nx-config';
import { NxLanguageProviderService }                   from '../../../services/nx-language-provider';

import { NxPageService }     from '../../../services/page.service';
import { NxDialogsService }  from '../../../dialogs/dialogs.service';
import { NxSettingsService } from './settings.service';
import { NxMenuService }     from '../../../components/menu/menu.service';
import { NxSystemService }         from '../../../services/system.service';
import { NxSystemsService }        from '../../../services/systems.service';
import { NxAccountService }        from '../../../services/account.service';
import { NxProcessService }        from '../../../services/process.service';
import { NxUtilsService }          from '../../../services/utils.service';
import { NxRibbonService }         from '../../../components/ribbon/ribbon.service';
import { NxToastService }          from '../../../dialogs/toast.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { NxScrollMechanicsService } from '../../../services/scroll-mechanics.service';

@AutoUnsubscribe()
@Component({
    selector: 'nx-system-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss']
})

export class NxSystemSettingsComponent implements OnInit, OnDestroy {
    @Input() uriParamSystemId;
    @Input() callShare;

    CONFIG: any = {};
    LANG: any = {};
    plugin: any;
    content: any = {};

    account: any;
    system: any;
    gettingSystem: any;
    systems: any;
    deletingSystem: any;

    menuVisible: boolean;
    footerVisible: boolean;
    systemId: any;
    systemNoAccess: boolean;
    canMerge: boolean;
    currentlyMerging: boolean;
    debugMode: boolean;
    betaMode: boolean;
    configCanMerge: boolean;
    isMaster: boolean;
    userDisconnectSystem: boolean;
    mergeTargetSystem: any;
    gettingSystemUsers: any;
    selectedUser: any;

    headerHeight: number;

    private connectionSubscription: Subscription;
    private footerSubscription: Subscription;
    private menuSectionSubscription: Subscription;
    private menuSubSectionSubscription: Subscription;
    private menuSelectedDetailsSubscription: Subscription;
    private resizeSubscription: Subscription;
    private routerParamsSubscription: Subscription;
    private systemSubscription: Subscription;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.debugMode = this.CONFIG.allowDebugMode;
        this.betaMode = this.CONFIG.allowBetaMode;
        this.currentlyMerging = false;
        this.configCanMerge = this.CONFIG.cloudMerge || false;
        this.systemNoAccess = false;
        this.userDisconnectSystem = false;
        this.selectedUser = {email: ''};
    }

    constructor(private route: ActivatedRoute,
                private accountService: NxAccountService,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemService: NxSystemService,
                private systemsService: NxSystemsService,
                private settingsService: NxSettingsService,
                private processService: NxProcessService,
                private menuService: NxMenuService,
                private ribbonService: NxRibbonService,
                private router: Router,
                private toastService: NxToastService,
                private scrollMechanicsService: NxScrollMechanicsService,
    ) {
        this.setupDefaults();
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
                this.content.base = this.CONFIG.systemMenu.baseUrl + this.systemId;
                this.content = {...this.content}; // trigger onChange
                if (this.system) {
                    this.system.stopPoll();
                }
                this.system = undefined;
                this.ribbonService.hide();
                this.menuVisible = false;
                this.getSystemInfo();
            }
        });

        this.footerSubscription = this.settingsService
            .footerSubject
            .subscribe((value) => {
                this.footerVisible = value;
            });

        this.content = {
            selectedSection: '',         // updated by selectedSectionSubject
            selectedSubSection: '',         // updated by selectedSubSectionSubject
            system: {},         // updated by getSystemInfo
            base: this.CONFIG.systemMenu.baseUrl + this.systemId,
            level1: [
                {
                    id: this.CONFIG.systemMenu.admin.id,
                    icon: this.CONFIG.systemMenu.admin.icon,
                    label: this.LANG.systemAdministration,
                    path: this.CONFIG.systemMenu.admin.path,
                }
            ]
        };

        this.menuSectionSubscription = this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                this.content.selectedSection = selection;
                this.content = {...this.content}; // trigger onChange
            });

        this.menuSubSectionSubscription = this.menuService
            .selectedSubSectionSubject
            .subscribe(selection => {
                this.content.selectedSubSection = selection;
                this.content = {...this.content}; // trigger onChange
            });

        this.menuSelectedDetailsSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = {...this.content}; // trigger onChange
            });

        if (this.CONFIG.accessRoles.options) {
            this.CONFIG.accessRoles.options.forEach((option) => {
                if (option.permissions) {
                    option.permissions = this.normalizePermissionString(option.permissions);
                }
            });
        }

        // TODO: add processes back
        // Retrieve users list
        this.gettingSystemUsers = this.processService.createProcess(() => {
            return this.system
                .getUsers()
                .then(() => {
                    if (this.callShare) {
                        this.settingsService
                            .addUser()
                            .finally(this.cleanUrl);
                    }
                });
        }, {
            errorPrefix: this.LANG.errorCodes.cantGetUsersListPrefix
        });

        // Retrieve system info
        this.gettingSystem = this.processService.createProcess(() => {
            return this.system.getInfo(true); // Force reload system info when opening page
        }, {
            errorCodes: {
                forbidden: (error) => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                },
                notFound: (error) => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                },
            },
            errorPrefix: this.LANG.errorCodes.cantGetSystemInfoPrefix
        }).then(() => {
            this.gettingSystemUsers.run();
        });

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(({width}) => {
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
                    this.gettingSystem.run().catch();

                    this.system
                        .getInfo(true)
                        .then(() => {
                            this.settingsService.system = this.system;
                            this.checkShare();
                        })
                        .catch((response) => {
                            this.system.forbidden = true;
                        });

                    if (this.systemSubscription) {
                        this.systemSubscription.unsubscribe();
                    }
                    this.systemSubscription = this.system.infoSubject
                        .pipe(filter((system: any) => system !== undefined))
                        .subscribe(_ => {
                            this.updateAlert();
                            this.updateMenu();
                            this.menuVisible = true;
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

    checkShare() {
        if (this.settingsService.share) {
            const options = {
                classname: this.CONFIG.toast.danger,
                delay: this.CONFIG.alertTimeout,
                autohide: true,
            };
            if (this.system.isOnline) {
                if (this.system.permissions.editUsers) {
                    this.settingsService.addUser().catch();
                } else {
                    this.toastService.show(this.LANG.system.shareUnauthorized, options);
                }
            } else {
                this.toastService.show(this.LANG.system.shareOffline, options);
            }
            this.settingsService.share = false;
        }
    }

    updateAlert() {
        if (!this.system.isOnline) {
            this.ribbonService.show(this.LANG.system.offlineAlertRibbon, '', '', 'alert');
        } else {
            this.ribbonService.hide();
        }
        setTimeout(() => {
            this.setHeaderHeight();
        });
    }

    updateMenu() {
        this.systemNoAccess = false;
        this.content.system = this.system;

        if (this.system.permissions.editUsers) {
            let usersNode = this.content.level1.filter((node) => node.id === this.CONFIG.systemMenu.users.id)[0];

            if (!usersNode) {
                usersNode = {
                    id: this.CONFIG.systemMenu.users.id,
                    icon: this.CONFIG.systemMenu.users.icon,
                    label: this.LANG.users,
                    path: this.CONFIG.systemMenu.users.path,
                    level2: [
                        {
                            id: this.CONFIG.systemMenu.buttons.id,
                            items: [
                                {
                                    id: 'addUser',
                                    label: this.LANG['Add User'],
                                    disabled: true
                                }
                            ],
                            level3: []
                        }
                    ],
                };
                this.content.level1.push(usersNode);
            }

            // Retain buttons
            if (usersNode.level2.length && usersNode.level2[0].id === 'buttons') {
                // usersNode.level2 = [usersNode.level2[0]];
                usersNode.level2[0].items[0].disabled = !this.system.isAvailable;
            } else {
                usersNode.level2 = [];
            }

            const byParam = NxUtilsService.byParam((user) => {
                return user.email;
            }, NxUtilsService.sortASC);
            this.system.users.sort(byParam);

            usersNode.level3 = [];
            this.system.users.forEach((user) => {
                const id = user.id.replace(/{|}/g, '');
                usersNode.level3.push({
                    id,
                    icon : user.isCloud ? 'glyphicon-cloud' : 'glyphicon-user-settings',
                    label: user.email || user.name,
                    additionalLabel:  this.LANG.accessRoles[user.role.name] && this.LANG.accessRoles[user.role.name].label || user.role.name,
                    path : 'users/' + id,
                    isEnabled: user.isEnabled,
                });
            });
        } else { // remove Users
            this.content.level1 = this.content.level1.filter(node => node.id !== this.CONFIG.systemMenu.users.id);
        }

        if (this.system.permissions.isAdmin) {
            let serversNode = this.content.level1.find((node) => node.id === this.CONFIG.systemMenu.servers.id);
            if (!serversNode) {
                serversNode = {
                    id: this.CONFIG.systemMenu.servers.id,
                    icon: this.CONFIG.systemMenu.servers.icon,
                    label: this.LANG.servers.servers,
                    path: this.CONFIG.systemMenu.servers.path,
                };
                this.content.level1.push(serversNode);
            }

            const byParam = NxUtilsService.byParam((server) => {
                return server.name;
            }, NxUtilsService.sortASC);
            this.system.servers.sort(byParam);

            serversNode.level3 = [];
            this.system.servers.forEach(server => {
                serversNode.level3.push({
                    id: server.id,
                    icon: '',
                    label: server.name,
                    path: `servers/${server.id}`,
                    additionalLabel: server.url.split(':')[1].slice(2),
                });
            });
        } else {
            this.content.level1 = this.content.level1.filter((node: any) => node.id !== this.CONFIG.systemMenu.servers.id);
        }

        this.content = {...this.content};
    }

    cleanUrl() {
        return this.router.navigate(['/systems', this.systemId]);
    }

    connectionLost() {
        this.dialogs.notify(this.LANG.errorCodes.lostConnection.replace('{{systemName}}',
            this.system.info.name || this.LANG.errorCodes.thisSystem), 'warning');
        if (this.system.currentServerNotBusy) {
            setTimeout(() => this.router.navigate(['/systems']), this.CONFIG.alertTimeout);
        }
    }

    normalizePermissionString(permissions) {
        return permissions.split('|').sort().join('|');
    }
}
