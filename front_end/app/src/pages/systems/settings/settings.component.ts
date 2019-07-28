import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Location }                                    from '@angular/common';
import { ActivatedRoute }                              from '@angular/router';
import { DomSanitizer }                                from '@angular/platform-browser';
import { NxConfigService }                             from '../../../services/nx-config';
import { NxLanguageProviderService }                   from '../../../services/nx-language-provider';
import { TranslateService }                            from '@ngx-translate/core';

import { map }               from 'rxjs/operators';
import { combineLatest }     from 'rxjs';
import { NxPageService }     from '../../../services/page.service';
import { NxDialogsService }  from '../../../dialogs/dialogs.service';
import { NxSettingsService } from './settings.service';
import { NxMenuService }     from '../../../components/menu/menu.service';

@Component({
    selector   : 'nx-system-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls  : ['settings.component.scss']
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
    pollingSystemUpdate: any;
    selectedUser: any;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.debugMode = this.CONFIG.allowDebugMode;
        this.betaMode = this.CONFIG.allowBetaMode;
        this.currentlyMerging = false;
        this.configCanMerge = this.CONFIG.cloudMerge || false;
        this.systemNoAccess = false;
        this.userDisconnectSystem = false;
        this.selectedUser = { email: '' };
        this.system = { info: { name: '' } };
    }

    constructor(@Inject('authorizationCheckService') private authorizationService: any,
                @Inject('systemsProvider') private systemsProvider: any,
                @Inject('system') private systemService: any,
                @Inject('process') private process: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pollingSystemUpdate = undefined;

        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.system);
        this.init();
    }

    init(): void {
        // this.systemId = this.uriParamSystemId;

        this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
                this.content.base = '/systems/' + this.systemId;
                this.content = { ...this.content }; // trigger onChange

                this.getSystemInfo();
            }
        });

        this.content = {
            selectedSection: '',        // updated by selectedSectionSubject
            base           : '/systems/' + this.systemId,
            level1         : [
                {
                    id   : 'admin',
                    icon : 'glyphicon-home',
                    label: this.LANG.systemAdministration,
                    path : '',
                }, {
                    id   : 'users',
                    icon : 'glyphicon-user',
                    label: this.LANG.users,
                    path : 'users',
                }]
        };

        this.menuService
            .selectedSectionSubject
            .subscribe(selection => {
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });

        this.getSystemInfo();

        if (this.CONFIG.accessRoles.options) {
            this.CONFIG.accessRoles.options.forEach((option) => {
                if (option.permissions) {
                    option.permissions = this.normalizePermissionString(option.permissions);
                }
            });
        }

        // Retrieve users list
        this.gettingSystemUsers = this.process.init(() => {
            return this.system
                       .getUsers()
                       .then((users) => {
                           if (this.callShare) {
                               this.settingsService
                                   .addUser()
                                   .finally(this.cleanUrl);
                           }
                       }).finally(this.delayedUpdateSystemInfo);
        }, {
            errorPrefix: this.LANG.errorCodes.cantGetUsersListPrefix
        });

        // Retrieve system info
        this.gettingSystem = this.process.init(() => {
            return this.system.getInfo(true); // Force reload system info when opening page
        }, {
            errorCodes : {
                forbidden: (error) => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                },
                notFound : (error) => {
                    // Special handling for not having an access to the system
                    this.systemNoAccess = true;
                    return false;
                },
            },
            errorPrefix: this.LANG.errorCodes.cantGetSystemInfoPrefix
        });

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

    }

    ngOnDestroy() {

    }

    getSystemInfo() {
        this.authorizationService
            .requireLogin()
            .then((account) => {
                this.account = account;
                this.system = this.systemService(this.systemId, account.email);
                this.systems = this.systemsProvider.systems;

                setTimeout(() => {
                    this.gettingSystem.run().then(() => {
                        this.systemNoAccess = false;

                        this.settingsService
                            .loadUsersFor(this.system)
                            .then(() => {
                                if (this.system.permissions.editUsers) {
                                    this.gettingSystemUsers
                                        .run()
                                        .then(() => {
                                            this.settingsService.setSystem(this.system);
                                        });
                                } else {
                                    // this.delayedUpdateSystemInfo();
                                    this.settingsService.setSystem(this.system);
                                }
                            });
                    });
                });
            });

    }

    delayedUpdateSystemInfo() {
        // An extra measure to prevent more intervals from being created.
        // if (pollingSystemUpdate) {
        //     $poll.cancel(pollingSystemUpdate);
        // }
        // pollingSystemUpdate = $poll(function () {
        //     return this.system
        //                  .update()
        //                  .catch(function (error) {
        //                      if (error.data.resultCode === 'forbidden' || error.data.resultCode === 'notFound') {
        //                          connectionLost();
        //                      }
        //                  });
        // }, Config.updateInterval);
        //
        // this.$on('$destroy', function (event) {
        //     $poll.cancel(pollingSystemUpdate);
        // });
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

