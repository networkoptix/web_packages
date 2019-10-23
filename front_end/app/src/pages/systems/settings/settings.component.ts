import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Location }                                    from '@angular/common';
import { ActivatedRoute }                              from '@angular/router';
import { NxConfigService }                             from '../../../services/nx-config';
import { NxLanguageProviderService }                   from '../../../services/nx-language-provider';
import { Meta }                                        from '@angular/platform-browser';

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
import { fromEvent } from 'rxjs/observable/fromEvent';
import { debounceTime } from 'rxjs/operators';
import { NxToastService }          from '../../../dialogs/toast.service';

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
    location: any;

    account: any;
    system: any;
    gettingSystem: any;
    systems: any;
    unsharing: any;
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
                location: Location,
                private ribbonService: NxRibbonService,
                private toastService: NxToastService,
                private meta: Meta
    ) {
        this.location = location;
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
        this.route.params.subscribe(params => {
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

        this.settingsService
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

        this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                this.content.selectedSection = selection;
                this.content = {...this.content}; // trigger onChange
            });

        this.menuService
            .selectedSubSectionSubject
            .subscribe(selection => {
                this.content.selectedSubSection = selection;
                this.content = {...this.content}; // trigger onChange
            });

        this.menuService
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
        fromEvent(window, 'resize').pipe(debounceTime(500)).subscribe((event: any) => {
            if (event.target.innerWidth >= 768) {
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
                    this.account = account;
                    this.system = this.systemService.createSystem(this.systemId, this.account.email);
                    this.gettingSystem.run();

                    this.system
                        .getInfo(true)
                        .then(() => {
                            this.settingsService.system = this.system;
                        })
                        .catch((response) => {
                            this.system.forbidden = true;
                        });


                    this.system.systemSubject.subscribe((system) => {
                        if (system !== undefined) {
                            this.settingsService.system = system;
                            this.updateAlert();
                            this.updateMenu();
                            this.checkShare();
                            this.menuVisible = true;
                        }
                    });
                }
            });
    }

    checkShare() {
        if (this.settingsService.share) {
            if (this.system.isAvailable) {
                this.settingsService.addUser();
            } else {
                this.toastService.show(this.LANG.system.shareOffline, {classname: 'danger', delay: this.CONFIG.alertTimeout, autohide: true});
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

        if (this.system.permissions.editUsers) {
            this.content.system = this.system;
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

            usersNode.level3 = [];

            const byParam = NxUtilsService.byParam((user) => {
                return user.email;
            }, NxUtilsService.sortASC);

            this.system.users.sort(byParam);

            this.system.users.forEach((user) => {
                const id = user.id.replace(/{|}/g, '');
                usersNode.level3.push({
                    id,
                    icon : user.isCloud ? 'glyphicon-cloud' : '',
                    label: user.email,
                    additionalLabel: user.role.name,
                    path: 'users/' + id,
                    isEnabled: user.isEnabled,
                });
            });
        } else {
            // remove Users
            const index = this.content.level1.findIndex(x => x.id === this.CONFIG.systemMenu.users.id);
            if (index !== -1) {
                this.content.level1.splice(index, 1);
            }
        }

        this.content = {...this.content};
    }

    cleanUrl() {
        this.location.path('/systems/' + this.systemId, false);
    }

    connectionLost() {
        this.dialogs.notify(this.LANG.errorCodes.lostConnection.replace('{{systemName}}',
            this.system.info.name || this.LANG.errorCodes.thisSystem), 'warning');
        this.location.path('/systems');
    }

    normalizePermissionString(permissions) {
        return permissions.split('|').sort().join('|');
    }


}

