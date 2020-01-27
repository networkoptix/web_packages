import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { NxConfigService }           from '../../../../services/nx-config';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxProcessService }          from '../../../../services/process.service';
import { NxSystem }                  from '../../../../services/system.service';
import { NxApplyService, Watcher }   from '../../../../services/apply.service';
import { NxUriService }              from '../../../../services/uri.service';
import { Subscription }              from 'rxjs';
import { filter, throttleTime, map,
    retryWhen, delay }               from 'rxjs/operators';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector   : 'nx-server-component',
    templateUrl: 'servers.component.html',
    styleUrls  : ['servers.component.scss']
})

export class NxSystemServersComponent implements OnInit, OnDestroy {
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

    renameDisabled: boolean;
    restartDisabled: boolean;
    detachDisabled: boolean;
    resetDisabled: boolean;
    portChangeDisabled: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
        this.renameDisabled = true;
        this.restartDisabled = true;
        this.detachDisabled = true;
        this.resetDisabled = true;
        this.portChangeDisabled = true;
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

    ngOnInit(): void {
        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                    this.setServer();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.settingsService.footerSubject.next(true);
                this.system = system;
                // Route guard did not worked :( ... so doing it the old way ...was done in users.component, so replicating
                if (!this.system.permissions || !this.system.permissions.editUsers) {
                    this.uriService.updateURI('systems/' + this.system.id, {});
                    return;
                }
                if (this.serverSubscription) {
                    this.serverSubscription.unsubscribe();
                }
                this.serverSubscription = this.system.infoSubject
                    .pipe(
                        map(system => {
                            if (!system.servers || system.servers.length === 0) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000))),
                        throttleTime(5000)
                    )
                    .subscribe(() => {
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.servers && this.system.servers.length) {
                                this.system.initSystemMediaServers();
                            }
                            if (!this.applyService.locked) {
                                if (this.selectedServer) {
                                    this.setStatus('checking');
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
    }

    ngOnDestroy(): void {}

    setServer(): void {
        if (this.system && this.system.servers && this.system.servers.length > 0) {
            let server;
            if (this.serverIdFromParams) {
                server = this.system.servers.find((server: any) => {
                    return server.id === this.serverIdFromParams;
                });
            }
            if (typeof(server) === 'undefined') {
                if (this.system.servers.length > 0) {
                    server = this.system.servers[0];
                    this.uriService.updateURI(`systems/${this.system.id}/servers/${server.id}`);
                } else {
                    return;
                }
            }

            this.applyService.hardReset();
            const { url } = server;
            const [ip, port] = url.slice(url.indexOf('//') + 2).split(':');
            this.ipPortWatcher.value = port;
            server.ip = ip;
            server.osName = server.osInfo !== '' ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
            this.selectedServer = server;
            if (!this.selectedServer.internalStatus) {
                this.setStatus('checking');
            }
            this.checkIfOnline(server.id);
            this.menuService.setDetailsSection(this.selectedServer.id);

            this.renameDisabled = !this.system.permissions.editAdmins;
            this.restartDisabled = !this.system.permissions.isAdmin;
            this.detachDisabled = !this.system.permissions.editAdmins;
            this.resetDisabled = !this.system.permissions.editAdmins;
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

    setStatus(status) {
        this.selectedServer.internalStatus = this.CONFIG.serverStatus[status];
        this.selectedServer.shownStatus = this.LANG.servers.status[status];
    }

    checkIfOnline(serverId) {
        return this.system.getModuleInfo(serverId).toPromise()
            .then(() => this.setStatus('online'))
            .catch(() => this.setStatus('offline'));
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
                .then(() => this.setStatus('restarting'));
    }

    detachServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .detachServer(this.system, id, name)
            .then(detach => {
                this.setStatus('detaching');
                // make sure that server gets removed from the menu
            });
    }

    resetServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .resetServer(this.system, id, name)
                // will take some time to reset and then restart the server
                .then(() => this.setStatus('reseting'));
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
