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
    locked: any;

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
        this.system = { info : { name: '' }};
        this.locked = {};

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;

                this.pageService.setPageTitle(this.LANG.pageTitles.system);
                this.pollingSystemUpdate = undefined;

                // Retrieve users list
                this.gettingSystemUsers = this.process.init(() => {
                    return this.system
                               .getUsers()
                               .then((users) => {
                                   if (this.callShare) {
                                       this.share().finally(this.cleanUrl);
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
                }).then(() => {
                    // this.canMerge = this.system.canMerge && this.system.isOnline || this.CONFIG.cloudMerge;
                    // if (this.system.mergeInfo) {
                    //     this.setMergeStatus(this.system.mergeInfo);
                    // }
                    this.systemNoAccess = false;

                    this.loadUsers();

                    if (this.system.permissions.editUsers) {
                        this.gettingSystemUsers.run();
                    } else {
                        this.delayedUpdateSystemInfo();
                    }
                });

                this.unsharing = this.process.init(() => {
                    return this.system.deleteUser(this.selectedUser);
                }, {
                    successMessage: this.LANG.system.permissionsRemoved.replace('{{email}}', this.selectedUser.email),
                    errorPrefix   : this.LANG.errorCodes.cantSharePrefix
                }).then(() => {
                    this.locked[this.selectedUser.email] = false;
                    this.selectedUser = undefined;
                    this.system.getUsers();
                    this.delayedUpdateSystemInfo();
                }, () => {
                    this.locked[this.selectedUser.email] = false;
                    this.selectedUser = undefined;
                    this.system.getUsers();
                    this.delayedUpdateSystemInfo();
                });




            });
    }

    constructor(@Inject('authorizationCheckService') private authorizationService: any,
                @Inject('systemsProvider') private systemsProvider: any,
                @Inject('system') private systemService: any,
                @Inject('process') private process: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private translate: TranslateService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
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

    loadUsers() {
        this.system.getUsers(true);
    }

    cleanUrl() {
        this.location.path('/systems/' + this.systemId, false);
    }



    ngOnInit(): void {
        // this.systemId = this.uriParamSystemId;

        this.route.params.subscribe(params => {
            if (params.systemId) {
                this.systemId = params.systemId;
            }
        });

        this.content = {
            selectedSection: '',        // updated by selectedSectionSubject
            base           : '/systems/' + this.systemId,
            level1         : [
                {
                    id    : 'admin',
                    label : 'admin',
                    path: '',
                } , {
                    id   : 'users',
                    label: 'users',
                    path: 'users',
                }, {
                    id   : 'interfaces',
                    label: 'interfaces',
                    path: 'interfaces',
                }]
        };

        this.authorizationService
            .requireLogin()
            .then((account) => {
                this.account = account;
                this.system = this.systemService(this.systemId, account.email);
                this.systems = this.systemsProvider.systems;

                setTimeout(() => {
                    this.gettingSystem.run().then(() => {
                        this.settingsService.setSystem(this.system);
                    });
                });

                // this.$watch('system.info.name', function (value) {
                //     nxPageService.setPageTitle(value + ' -');
                //     systemsProvider.forceUpdateSystems();
                // });

                // this.$watch('system.mergeInfo', function (mergeInfo) {
                //     if (mergeInfo) {
                //         setMergeStatus(mergeInfo);
                //     } else {
                //         if (this.currentlyMerging) {
                //             dialogs.notify(this.LANG.system.mergeSuccess, 'success', true);
                //         }
                //         this.currentlyMerging = false;
                //     }
                // });
            });


        if (this.CONFIG.accessRoles.options) {
            this.CONFIG.accessRoles.options.forEach((option) => {
                if (option.permissions) {
                    option.permissions = this.normalizePermissionString(option.permissions);
                }
            });
        }

        // var cancelSubscription = this.$on("unauthorized_" + $routeParams.systemId, connectionLost);

    }

    ngOnDestroy() {

    }

    connectionLost() {
        this.dialogs.notify(this.LANG.errorCodes.lostConnection.replace('{{systemName}}',
                this.system.info.name || this.LANG.errorCodes.thisSystem), 'warning');
        this.location.path('/systems');
    }

    normalizePermissionString(permissions) {
        return permissions.split('|').sort().join('|');
    }

    share() {
        // Call share dialog, run process inside
        return this.dialogs
                .share(this.system)
                .then((result) => {
                    if (result) {
                        this.loadUsers();
                    }
                }, (reason) => {
                    // dialog was dismissed ... this handler is required if dialog is dismissible
                    // if we don't handle it will raise a JS error
                    // ERROR Error: Uncaught (in promise): [object Number]
                });
    }

    editShare(user) {
        // Pass user inside

        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;
        return this.dialogs
                .share(this.system, user)
                .then(this.loadUsers)
                .finally(() => {
                    this.locked[user.email] = false;
                });
    }

    unshare(user) {
        if (this.account.email === user.email) {
            // return this.delete();
        }
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        this.dialogs.confirm(this.LANG.system.confirmUnshare,
                this.LANG.system.confirmUnshareTitle,
                this.LANG.system.confirmUnshareAction,
                'btn-danger', this.LANG.dialogs.cancelButton)
            .then((result) => {
                if (result) {
                    // Run a process of sharing
                    // $poll.cancel(pollingSystemUpdate);
                    this.selectedUser = user;
                    this.unsharing.run();
                } else {
                    this.locked[user.email] = false;
                }
            }, () => {
                this.locked[user.email] = false;
            });
    }
}

