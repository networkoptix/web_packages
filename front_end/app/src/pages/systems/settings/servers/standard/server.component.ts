import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy, Input, SimpleChanges, OnChanges
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxApplyService, Watcher }   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxMenuService }             from '../../../../../menu';
import { NxSettingsService }         from '../../settings.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { NxUriService, ChildRoutes } from '../../../../../services/uri.service';
import { NxUtilsService }            from '../../../../../services/utils.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-standard-server-component',
    templateUrl : 'server.component.html',
    styleUrls   : ['server.component.scss']
})

export class NxSystemStandardServerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() system: NxSystem;
    @Input() selectedServer;
    @Input() isOffline: boolean;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    viewContainerRef: ViewContainerRef;
    serverIdFromParams;

    saveSettings: Process;
    ipPortWatcher: any = new Watcher<number>();
    previousInputValue: number;
    checking: boolean;
    serverLoaded = false;

    betaMode: boolean;
    renameDisabled: boolean;
    restartDisabled: boolean;
    detachDisabled: boolean;
    resetDisabled: boolean;
    portChangeDisabled: boolean;
    serverUnavailable: boolean;
    serverOffline: boolean;
    canSeeInfo: boolean;
    fullInfoPath: string;
    parsedServerId: string;

    private setupDefaults() {
        this.checking = false;
        this.serverOffline = false;
        this.renameDisabled = true;
        this.restartDisabled = true;
        this.detachDisabled = true;
        this.resetDisabled = true;
        this.portChangeDisabled = true;
        this.serverUnavailable = true;
        // this.debugMode = this.CONFIG.clientMode.debug;
        this.menuService.section = 'servers';
        this.canSeeInfo = false;
        this.fullInfoPath = '';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.initForApplyService();

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            [this.ipPortWatcher]);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.system?.currentValue?.info) {
            this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring ||
                changes.system.currentValue.info.capabilities?.vms_metrics) &&
                changes.system.currentValue.canViewInfo();

            if (this.canSeeInfo) {
                this.fullInfoPath = this.uriService.getSystemSettingsRoute({ childRoute: ChildRoutes.HEALTH }) + this.CONFIG.menus.systemSettings.servers.path;
            }
        }

        if (changes.selectedServer?.currentValue) {
            const { currentValue, previousValue } = changes.selectedServer;
            if (previousValue && currentValue.id !== previousValue.id) {
                this.serverLoaded = false;
            }
            this.setServer();
        }
    }

    ngOnDestroy(): void {}

    setServer(): void {
        this.betaMode = this.CONFIG.clientMode.beta || this.route.snapshot.queryParams.beta !== undefined;
        const { ip, port } = this.selectedServer;
        this.selectedServer.ip = ip;
        this.parsedServerId = NxUtilsService.cleanId(this.selectedServer.id);
        this.selectedServer.osName = this.selectedServer.osInfo ? JSON.parse(this.selectedServer.osInfo).platform : this.LANG.common.unknown;

        this.checkIfOnline(this.selectedServer.id)
            .catch(error => console.error(error));

        this.renameDisabled = !this.system.permissions.isAdmin;
        this.restartDisabled = !this.system.permissions.isAdmin;
        this.detachDisabled = !this.system.permissions.editAdmins;
        this.resetDisabled = !this.system.permissions.editAdmins;
        this.portChangeDisabled = !this.system.permissions.editAdmins;

        if (!this.applyService.locked) {
            this.applyService.hardReset();
            this.ipPortWatcher.value = port;
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
        this.selectedServer.internalStatus = status ? this.CONFIG.servers.status[status] : '';
        this.selectedServer.shownStatus = status ? this.LANG.servers.status[status] : '';
        this.serverOffline = [this.CONFIG.servers.status.offline, this.CONFIG.servers.status.checking]
            .includes(this.selectedServer.internalStatus);
        this.serverUnavailable = this.serverOffline ||
            (!this.system.currentServerNotBusy && this.system.currentBusyServerIds.has(this.selectedServer.id));
    }

    checkIfOnline(serverId) {
        return this.system.getServers().toPromise()
            .then(res => {
                if (res) {
                    const servers: any[] = Object.entries(res).map(server => server[1]);
                    this.setStatus(servers.find(server => server.id === serverId).status === 'Online'
                        ? '' : this.CONFIG.servers.status.offline);
                    this.serverLoaded = true;
                }
            })
            .catch(err => {
                console.error(err);
                this.setStatus(this.CONFIG.servers.status.offline);
                this.serverLoaded = true;
            });
    }

    checkStatus() {
        this.checking = true;
        this.setStatus(this.CONFIG.servers.status.checking);
        this.system.getServers().toPromise()
            .then(res => {
                if (res) {
                    const servers: any[] = Object.entries(res).map(server => server[1]);
                    const isOnline = servers.find(server => server.id === this.selectedServer.id).status === 'Online';
                    setTimeout(() => {
                        this.setStatus(isOnline ? '' : this.CONFIG.servers.status.offline);
                        this.checking = false;
                    }, this.CONFIG.servers.checkStatusTimeout);
                }
            })
            .catch(err => {
                console.error(err);
                this.setStatus(this.CONFIG.servers.status.offline);
            });
    }

    renameServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs.renameServer(this.system, id, name)
            .then(newName => {
                if (newName) {
                    this.selectedServer.name = newName;
                }
            });
    }

    restartServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .restartServer(this.system, id, name)
            .then(res => this.setStatus(res));
    }

    detachServer() {
        const { id, name } = this.selectedServer;
        const currentServerIndex = this.system.servers.findIndex((server) => server.id === id);
        const nextServerIndex = currentServerIndex + 1 !== this.system.servers.length ? currentServerIndex + 1 : currentServerIndex - 1;
        const nextServerId = this.system.servers[nextServerIndex].id;
        return this.dialogs
            .detachServer(this.system, id, name)
            .then(detach => {
                if (detach === 'success') {
                    this.uriService
                        .updateURI(`systems/${this.system.id}/servers/${nextServerId}`)
                        .catch(error => {
                            console.error(error);
                        });

                    this.menuService.detail = nextServerId;
                }
            });
    }

    resetServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .resetServer(this.system, id, name)
            // will take some time to reset and then restart the server
            .then(() => this.setStatus('resetting'));
    }

    storePreviousValue(e) {
        // prevents [.+-e] from being input
        if (e.key === '.' || e.key === '+' || e.key === '-' || e.key === 'e') {
            e.preventDefault();
        }
        this.previousInputValue = this.ipPortWatcher.value;
    }

    validationCheckForInput() {
        // checks if entering a value less than min or greater than max
        // null exception for less than since it gets cast to 0
        if (
            (this.ipPortWatcher.value < this.CONFIG.servers.port.min && this.ipPortWatcher.value !== null) ||
            this.ipPortWatcher.value > this.CONFIG.servers.port.max
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
