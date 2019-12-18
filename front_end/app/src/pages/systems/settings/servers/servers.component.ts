import {
    Component, OnInit, Inject, ViewChildren,
    QueryList, ElementRef, ViewContainerRef,
}                                    from '@angular/core';
import { Location }                  from '@angular/common';
import { ActivatedRoute }            from '@angular/router';
import { NxConfigService }           from '../../../../services/nx-config';
import { NxPageService }             from '../../../../services/page.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxSystemsService }          from '../../../../services/systems.service';
import { NxAccountService }          from '../../../../services/account.service';
import { NxProcessService }          from '../../../../services/process.service';
import { NxSystem }                  from '../../../../services/system.service';
import { NxApplyService, Watcher }   from '../../../../services/apply.service';
import { NxUriService }              from '../../../../services/uri.service';
import { Subscription }              from 'rxjs';
import { filter }                    from 'rxjs/operators';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

interface Settings {
    // disconnectDisabled: boolean;
    // mergeDisabled: boolean;
    // renameDisabled: boolean;
    // showMerge: boolean;
}

@Component({
    selector   : 'nx-server-component',
    templateUrl: 'servers.component.html',
    styleUrls  : ['servers.component.scss']
})

export class NxSystemServersComponent implements OnInit {
    CONFIG: any = {};
    LANG: any = {};
    system: NxSystem;
    viewContainerRef: ViewContainerRef;
    serverIdFromParams: any;
    selectedServer: any;
    
    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    saveSettings: any;
    ipPortWatcher: any = new Watcher<number>();
    previousInputValue: number;

    private setupDefaults() {
        // this.CONFIG = this.configService.getConfig();

        // this.debugMode = this.CONFIG.allowDebugMode;
        // this.betaMode = this.CONFIG.allowBetaMode;
        this.menuService.setSection('servers');
    }

    private updateSettings(forceMergeState?: boolean) {
        // const merging = typeof(this.system.mergeInfo) !== 'undefined' || forceMergeState;
        // const available = !this.system.isOnline || !this.system.isAvailable;
        // this.settings = {
        //     disconnectDisabled: merging,
        //     mergeDisabled: (merging || available) && !(this.debugMode || this.betaMode),
        //     renameDisabled: merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master',
        //     showMerge: this.system.isMine && this.systemsService.systems.length > 1
        // };
    }

    constructor(@Inject(ViewContainerRef) viewContainerRef,
                private accountService: NxAccountService,
                private applyService: NxApplyService,
                private processService: NxProcessService,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemsService: NxSystemsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                private uriService: NxUriService,
                location: Location,
    ) {
        this.viewContainerRef = viewContainerRef;
        this.setupDefaults();
    }


    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        // this.pageService.setPageTitle(this.LANG.pageTitles.systems);
        // this.settings = {
        //     disconnectDisabled: false,
        //     mergeDisabled: false,
        //     renameDisabled: false,
        //     showMerge: true
        // };


        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                console.log('params returned', params);
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                    console.log('serverId returned', this.serverIdFromParams);
                    // this.paramUser = params.userId;
                    // this.setUser();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.settingsService.footerSubject.next(true);
                console.log('system subscription', system);
                this.system = system;
                // Route guard did not worked :( ... so doing it the old way
                if (!this.system.permissions || !this.system.permissions.editUsers) {
                    this.uriService.updateURI('systems/' + this.system.id, {});
                    return;
                }
                if (this.serverSubscription) {
                    this.serverSubscription.unsubscribe();
                }
                this.serverSubscription = this.system.infoSubject.subscribe(() => {
                    console.log('serverSubscription called');
                    // this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;
                    if (!this.applyService.locked) {
                        this.setServer();
                    }
                });
            });

        this.initForApplyService();

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            [this.ipPortWatcher]);

        this.init();
    }

    setServer(): void {
        let server;
        if (this.serverIdFromParams) {
            server = this.system.servers.find((server: any) => {
                return server.id === this.serverIdFromParams;
            });
        }
        if (typeof(server) === 'undefined') {
            console.log('this.system pre-set', this.system);
            server = this.system.servers[0];
            // server = this.system.servers[0];
            // console.log('server in setServer', server);
            // this.uriService.updateURI(`systems/${this.system.id}/servers/${server.id}`);
        }

        if (server) {
            const { url } = server;
            const [ip, port] = url.slice(url.indexOf('//') + 2).split(':');
            server.ip = ip;
            server.osName = JSON.parse(server.osInfo).platform;
            this.ipPortWatcher.value = port;
            this.selectedServer = server;
            console.log('selectedServer', this.selectedServer);
            console.log('ipWatcher on set', this.ipPortWatcher);
            this.applyService.setVisible(true);
        }

        // // If there's no users skip setting section and permissions
        // if (typeof(user) === 'undefined') {
        //     return;
        // }
        // this.applyService.hardReset();
        // this.selectedUser = {... user};
        // this.menuService.setDetailsSection(this.selectedUser.id.replace(/{|}/g, ''));
        // this.setPermission(this.selectedUser.role);
        // this.userEnabled.value = this.selectedUser.isEnabled;
        // this.applyService.reset();

        // this.settingsService.footerSubject.next(true);
        // setTimeout(() => this.applyService.setVisible(this.selectedUser.canBeEdited));
    }

    initForApplyService(): void {
        this.saveSettings = this.processService.createProcess(() => {
            const port = this.ipPortWatcher;
            if (port.value !== port.originalValue) {
                this.system.changeServerPort(port.value)
                    .then(() => {
                        port.originalValue = port.value;
                        this.applyService.reset();
                    });
            }
        });
    }

    init(): void {
        this.settingsService
            .systemSubject
            .subscribe((system) => {
                this.system = system;
                if (system) {
                    console.log('this.system', this.system);
                    // this.system.systemSubject.subscribe(() => {
                    //     this.settingsService.footerSubject.next(true);
                    //     // this.userRole = system.accessRole;
                    //     // if (system.accessRole in this.LANG.accessRoles) {
                    //     //     this.userRole = this.LANG.accessRoles[system.accessRole].label;
                    //     // }
                    //     // this.updateSettings(this.currentlyMerging);
                    // });
                    // if (!this.applyService.locked) {
                    //     this.system.updateOrGetSystemSettings()
                    //         .then(res => {
                    //             const { settings } = res.reply;
                    //             this.applyService.setVisible(false);
                    //             this.applyService.hardReset();
                    //             this.ipPortWatcher.value = settings.port === 'true';
                    //             this.applyService.reset();
                    //             this.applyService.setVisible(true);
                    //         });
                    // }

                    // this.deletingSystem = this.processService.createProcess(() => {
                    //     return this.system.deleteFromCurrentAccount();
                    // }, {
                    //     successMessage: this.LANG.system.successDeleted.replace('{{systemName}}', this.system.info.name),
                    //     errorPrefix   : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
                    // })
                    //     .then(() => {
                    //         this.updateAndGoToSystems();
                    //     }, (error) => {
                    //         return error;
                    //     });
                }
            });

    }

    renameServer() {
        const serverId = this.selectedServer.id.slice(1, -1);
        const serverName = this.selectedServer.name;
        return this.dialogs
            .renameServer(serverId, serverName)
            .then(name => this.selectedServer.name = name);
    }

    restartServer() {
        return this.dialogs
            .restartServer()
            .then(server => {
                console.log('returned server', server);
                // selectedServer.status = 'offline';
            });
    }

    detachServer() {
        return this.dialogs
            .detachServer()
            .then(detach => {
                console.log('returned in detach', detach);
                // server should probably get removed from the menu?
            });
    }

    resetServer() {
        return this.dialogs
            .resetServer()
            .then(reset => {
                console.log('returned in reset', reset);
                // will take some time to reset and then restart the server
            });
    }

    disconnect() {
        // if (this.system.isMine) {
        //     // User is the owner. Deleting system means unbinding it and disconnecting all accounts
        //     // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
        //     this.dialogs.disconnect(this.system.id)
        //         .then((result) => {
        //             if (result) {
        //                 this.updateAndGoToSystems();
        //             }
        //         });
        // }
    }

    updateAndGoToSystems() {
        // // this.userDisconnectSystem = true;
        // this.systemsService
        //     .forceUpdateSystems(this.accountService.getEmail())
        //     .subscribe(() => {
        //         setTimeout(() => {
        //             window.location.href = '/systems';
        //         });
        //     });
    }

    delete() {
        // if (!this.system.isMine) {
        //     // User is not owner. Deleting means he'll lose access to it
        //     this.dialogs.confirm(this.LANG.system.confirmUnshareFromMe, this.LANG.system.confirmUnshareFromMeTitle, this.LANG.system.confirmUnshareFromMeAction, 'btn-danger', 'Cancel')
        //         .then((result) => {
        //             if (result === true) {
        //                 return this.deletingSystem.run();
        //             }
        //         });
        // }
    }

    // this.pageService.setPageTitle(this.system.info.name + ' -');

    storePreviousValue(e) {
        // prevents [.+-e] from being inputed
        if (e.key === '.' || e.key === '+' || e.key === '-' || e.key === 'e') {
            e.preventDefault();
        }
        this.previousInputValue = this.ipPortWatcher.value;
    }

    validationCheckForInput() {
        // checks if entering a value less than min or greater than max
        // null exception for less than since it gets cast to 0
        if (
            (this.ipPortWatcher.value < 1 && this.ipPortWatcher.value !== null)
            || this.ipPortWatcher.value > 65535
        ) {
            this.ipPortWatcher.value = this.previousInputValue;
        }
        this.onPortChange();
    }

    onPortChange() {
        if (this.ipPortWatcher.value < 1024 && this.ipPortWatcher.value !== null) {
            this.applyService.setWarn(this.LANG.servers.portWarning);
        } else {
            this.applyService.setWarn('');
        }
    }
}
