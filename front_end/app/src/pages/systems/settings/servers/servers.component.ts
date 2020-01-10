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
    detachDisabled: boolean;
    portChangeDisabled: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        // this.debugMode = this.CONFIG.allowDebugMode;
        this.menuService.setSection('servers');
    }

    constructor(@Inject(ViewContainerRef) viewContainerRef,
                private applyService: NxApplyService,
                private processService: NxProcessService,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                private uriService: NxUriService,
    ) {
        this.viewContainerRef = viewContainerRef;
        this.setupDefaults();
    }

    init(): void {}

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.renameDisabled = true;
        this.restartDisabled = true;
        this.detachDisabled = true;
        this.portChangeDisabled = true;
        this.checking = false;


        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.settingsService.footerSubject.next(true);
                this.system = system;
                // Route guard did not worked :( ... so doing it the old way ...did was done in users.component, so replicating
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
            server = this.system.servers.find((server: any) => {
                return server.id === this.serverIdFromParams;
            });
        }
        if (typeof(server) === 'undefined') {
            server = this.system.servers[0];
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

            this.renameDisabled = !this.system.permissions.editAdmins;
            this.restartDisabled = !this.system.permissions.isAdmin;
            this.detachDisabled = !this.system.permissions.editAdmins;
            this.portChangeDisabled = !this.system.permissions.editAdmins;
            this.applyService.reset();
            this.applyService.setVisible(true);
        }
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
        const { id, name } = this.selectedServer;
        return this.dialogs
            .detachServer(this.system, id, name)
            .then(detach => {
                this.selectedServer.internalStatus = this.LANG.servers.status.detaching;
                // make sure that server gets removed from the menu
            });
    }

    resetServer() {
        return this.dialogs
            .resetServer(this.selectedServer.name)
            .then(reset => {
                // will take some time to reset and then restart the server
            });
    }

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
