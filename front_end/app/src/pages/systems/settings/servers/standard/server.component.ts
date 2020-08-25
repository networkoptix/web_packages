import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy, Input, SimpleChanges, OnChanges
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { finalize, map }             from 'rxjs/operators';
import {
    timer, combineLatest, SubscriptionLike
}                                    from 'rxjs';

import {
    InfoBlockSection, InfoBlockLine
}                                    from '../../../../../components/info-block/info-block.component';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxApplyService, Watcher }   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxMenuService }             from '../../../../../menu';
import { NxSystem }                  from '../../../../../services/system.service';
import { NxUriService, ChildRoutes } from '../../../../../services/uri.service';
import { NxUtilsService }            from '../../../../../services/utils.service';
import { NxToastService }            from '../../../../../dialogs/toast.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';

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

    serverName: string;
    editMode = false;
    emptyName = false;

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
    serverDetails: InfoBlockSection;
    serversSubscription: SubscriptionLike;

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
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private toastService: NxToastService
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

        this.applyService.setVisible(false);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.system?.currentValue?.info) {
            this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring ||
                changes.system.currentValue.info.capabilities?.vms_metrics) &&
                changes.system.currentValue.canViewInfo();

            if (this.canSeeInfo) {
                this.fullInfoPath = this.uriService.getSystemSettingsRoute({ systemId: this.system.id, childRoute: ChildRoutes.HEALTH }) + this.CONFIG.menus.systemSettings.servers.path;
            }
        }

        if (changes.selectedServer?.currentValue) {
            const { currentValue, previousValue } = changes.selectedServer;
            if (previousValue?.id === currentValue.id) {
                return;
            }
            this.serverLoaded = false;
            this.setServer();
        }
    }

    ngOnDestroy(): void {}

    setServer(): void {
        this.betaMode = this.CONFIG.clientMode.beta || this.route.snapshot.queryParams.beta !== undefined;
        this.serverName = this.selectedServer.name;
        const { ip, port } = this.selectedServer;
        this.selectedServer.ip = ip;
        this.parsedServerId = NxUtilsService.cleanId(this.selectedServer.id);
        this.selectedServer.osName = this.selectedServer.osInfo ? JSON.parse(this.selectedServer.osInfo).platform : this.LANG.common.unknown;

        this.checkIfOnline(this.selectedServer.id)
            .catch(error => console.error(error))
            .finally(() => this.applyService.setVisible(true));

        this.renameDisabled = !this.system.permissions.editAdmins;
        this.restartDisabled = !this.system.permissions.isAdmin;
        this.detachDisabled = !this.system.permissions.editAdmins;
        this.resetDisabled = !this.system.permissions.editAdmins;
        this.portChangeDisabled = !this.system.permissions.editAdmins;

        this.serverDetails = new InfoBlockSection([
            new InfoBlockLine(this.LANG.common.ip(), this.selectedServer.ip || '-'),
            new InfoBlockLine(this.LANG.common.os(), this.selectedServer.osName || '-'),
            new InfoBlockLine(this.LANG.common.version(), this.selectedServer.version || '-')
        ]);

        if (!this.applyService.locked) {
            this.applyService.hardReset();
            this.ipPortWatcher.value = +port;
            this.applyService.reset();
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

        if (this.serversSubscription) {
            this.serversSubscription.unsubscribe();
        }
        // adding time to avoid server status flashing "Checking..." if system is offline
        this.serversSubscription = combineLatest(
            timer(this.CONFIG.servers.minLoaderTime),
            this.system.getServers()
                .pipe(
                    catchError(err => {
                        console.error(err);
                        return of(false);
                    })))
            .pipe(
                map(x => x[1])
            )
            .subscribe(result => {
                if (result) {
                    const servers: any[] = Object.entries(result).map(server => server[1]);
                    const isOnline = servers.find(server => server.id === this.selectedServer.id).status === 'Online';
                    this.setStatus(isOnline ? '' : this.CONFIG.servers.status.offline);
                } else {
                    this.setStatus(this.CONFIG.servers.status.offline);
                }
                this.checking = false;
            });
    }

    handleBlur() {
        const originalName = this.selectedServer.name;
        this.editMode = false;

        if (!this.serverName || this.emptyName) {
            this.serverName = originalName;
        } else if (this.serverName !== originalName) {
            this.system.renameServer(this.selectedServer.id, this.serverName)
                .then(() => { this.selectedServer.name = this.serverName; })
                .catch(() => {
                    this.selectedServer.name = originalName;
                    const options = {
                        classname : this.CONFIG.toast.warning,
                        autohide  : true,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(
                        NxLanguageProviderService.translate(
                            this.LANG.toastMessage.nameFail,
                            { type: this.LANG.common.server }
                        ), options);
                });
        }
    }

    handleFocus() {
        this.editMode = true;
    }

    handleNameChange(newName) {
        this.emptyName = /^\s+$/.test(newName);
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
