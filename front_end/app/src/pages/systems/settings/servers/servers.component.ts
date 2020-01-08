import {
    Component, OnInit, Inject, ViewContainerRef
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
    mediaserverConnections: any;
    checking: boolean;

    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    saveSettings: any;
    ipPortWatcher: any = new Watcher<number>();
    previousInputValue: number;

    renameDisabled: boolean;
    restartDisabled: boolean;
    portChangeDisabled: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        // this.debugMode = this.CONFIG.allowDebugMode;
        // this.betaMode = this.CONFIG.allowBetaMode;
        this.menuService.setSection('servers');
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

    init(): void {}

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.renameDisabled = true;
        this.restartDisabled = true;
        this.portChangeDisabled = true;
        this.checking = false;
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
                    if (this.system.currentServerNotBusy && !this.checking) {
                        this.checking = false;
                        if (this.system && this.system.servers && this.system.servers.length) {
                            this.system.initSystemMediaServers()
                                .then(res => {
                                    this.mediaserverConnections = res;
                                });
                        }
                        // this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;
                        if (!this.applyService.locked) {
                            if (this.selectedServer) {
                                this.selectedServer.internalStatus = this.LANG.servers.status.checking;
                            }
                            this.setServer();
                        }
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
            console.log('serverIdfromParams', this.serverIdFromParams);
            server = this.system.servers.find((server: any) => {
                return server.id === this.serverIdFromParams;
            });
        }
        if (typeof(server) === 'undefined') {
            server = this.system.servers[0];
            // this.uriService.updateURI(`systems/${this.system.id}/servers/${server.id}`);
        }

        if (server) {
            this.applyService.hardReset();
            const { url } = server;
            const [ip, port] = url.slice(url.indexOf('//') + 2).split(':');
            server.ip = ip;
            server.osName = JSON.parse(server.osInfo).platform;
            this.selectedServer = server;
            if (!this.selectedServer.internalStatus) {
                this.selectedServer.internalStatus = this.LANG.servers.status.checking;
            }
            this.checkIfOnline(server.id);
            this.ipPortWatcher.value = port;
            console.log('selectedServer post set', this.selectedServer);

            this.renameDisabled = !this.system.permissions.editAdmins;
            this.restartDisabled = !this.system.permissions.isAdmin;
            this.portChangeDisabled = !this.system.permissions.editAdmins;
            this.applyService.reset();
            this.applyService.setVisible(true);
        }

        // this.menuService.setDetailsSection(this.selectedUser.id.replace(/{|}/g, ''));
        // this.setPermission(this.selectedUser.role);

        // this.settingsService.footerSubject.next(true);
    }

    initForApplyService(): void {
        this.saveSettings = this.processService.createProcess(() => {
            const port = this.ipPortWatcher;
            const serverId = this.selectedServer.id;
            if (!port.value) {
                port.value = port.originalValue;
                this.applyService.reset();
            } else if (port.value !== port.originalValue) {
                return this.system.changeServerPort(port.value, serverId)
                    .then(() => {
                        port.originalValue = port.value;
                        this.applyService.reset();
                    });
            }
        });
    }

    checkIfOnline(serverId) {
        if (!this.checking) {
            this.checking = true;
            setTimeout(() => this.checking = false, 5000);
            return this.system.getModuleInfo(serverId).toPromise()
                .then(() => this.selectedServer.internalStatus = this.LANG.servers.status.online)
                .catch(() => this.selectedServer.internalStatus = this.LANG.servers.status.offline);
        }
    }

    renameServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .renameServer(this.system, id, name);
    }

    restartServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .restartServer(this.system, id, name)
                .then(() => this.selectedServer.internalStatus = this.LANG.servers.status.restarting);
    }

    detachServer() {
        return this.dialogs
            .detachServer(this.selectedServer.name)
            .then(detach => {
                console.log('returned in detach', detach);
                // server should probably get removed from the menu?
            });
    }

    resetServer() {
        return this.dialogs
            .resetServer(this.selectedServer.name)
            .then(reset => {
                console.log('returned in reset', reset);
                // will take some time to reset and then restart the server
            });
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
            (this.ipPortWatcher.value < this.CONFIG.servers.port.min && this.ipPortWatcher.value !== null)
            || this.ipPortWatcher.value > this.CONFIG.servers.port.max
        ) {
            this.ipPortWatcher.value = this.previousInputValue;
        }
        this.onPortChange();
    }

    onPortChange() {
        if (this.ipPortWatcher.value < this.CONFIG.servers.port.restrictedMax && this.ipPortWatcher.value !== null) {
            this.applyService.setWarn(this.LANG.servers.portWarning);
        } else {
            this.applyService.setWarn('');
        }
    }
}
