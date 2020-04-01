import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy, Input, SimpleChanges, OnChanges
} from '@angular/core';
import { ActivatedRoute }              from '@angular/router';
import { Subscription, of, interval }  from 'rxjs';
import {
    filter, map, delay,
    retryWhen, delayWhen, catchError
}                                      from 'rxjs/operators';
import { AutoUnsubscribe }             from 'ngx-auto-unsubscribe';
import { NxConfigService, IConfig }    from '../../../../../services/nx-config';
import { NxDialogsService }            from '../../../../../dialogs/dialogs.service';
import { NxLanguageProviderService }   from '../../../../../services/nx-language-provider';
import { NxMenuService }               from '../../../../../components/menu/menu.service';
import { NxProcessService }            from '../../../../../services/process.service';
import { NxSystem }                    from '../../../../../services/system.service';
import { NxApplyService, Watcher }     from '../../../../../services/apply.service';
import { NxUriService }                from '../../../../../services/uri.service';
import { LanguageI18NStaticTypes }     from '../../../../../../language_i18n_static_types';
import { NxSettingsService }           from '../../settings.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-standard-server-component',
    templateUrl : 'server.component.html',
    styleUrls   : ['server.component.scss']
})

export class NxSystemStandardServerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() system: NxSystem;
    @Input() selectedServer: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    // system: NxSystem;
    viewContainerRef: ViewContainerRef;
    serverIdFromParams: any;

    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    saveSettings: any;
    ipPortWatcher: any = new Watcher<number>();
    previousInputValue: number;
    checking: boolean;

    renameDisabled: boolean;
    restartDisabled: boolean;
    detachDisabled: boolean;
    resetDisabled: boolean;
    portChangeDisabled: boolean;
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
        // this.debugMode = this.CONFIG.clientMode.debug;
        this.menuService.setSection('servers');
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
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnInit(): void {
        // this.systemSubscription = this.settingsService.systemSubject
        //     .pipe(filter(data => data !== undefined))
        //     .subscribe((system) => {
        //         this.settingsService.footerSubject.next(true);
        //         this.system = system;
        //         // Route guard did not worked :( ... so doing it the old way ...was done in users.component, so replicating
        //         if (!this.system.permissions || !this.system.permissions.editUsers) {
        //             this.uriService
        //                 .updateURI('systems/' + this.system.id, {})
        //                 .catch(error => {
        //                     console.error(error);
        //                 });
        //
        //             return;
        //         }
        //         if (this.system) {
        //             this.system.getInfoAndPermissions(false).catch(() => {}).then(system => {
        //                 this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring || system.info.capabilities && system.info.capabilities.vms_metrics) && this.system.canViewInfo();
        //                 if (this.canSeeInfo) {
        //                     this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl + system.id + this.CONFIG.menus.systemHealth.baseUrl + this.CONFIG.menus.systemSettings.servers.path;
        //                 }
        //             });
        //         }
        // if (this.serverSubscription) {
        //     this.serverSubscription.unsubscribe();
        // }
        // this.serverSubscription = this.system.infoSubject
        //     .pipe(
        //         map(system => {
        //             if (!system.servers || system.servers.length === 0) {
        //                 throw system;
        //             }
        //         }),
        //         retryWhen(err => err.pipe(delay(1000)))
        //     )
        //     .subscribe(() => {
        //         if (this.system.currentServerNotBusy) {
        //             if (this.system && this.system.servers && this.system.servers.length) {
        //                 this.system.initSystemMediaServers();
        //             }
        //             if (!this.applyService.locked) {
        //                 this.setServer();
        //             }
        //         }
        //     });
        // });

        this.initForApplyService();

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            () => this.applyService.reset(),
            [this.ipPortWatcher]);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.system && changes.system.currentValue && changes.system.currentValue.info) {
            this.canSeeInfo = (this.CONFIG.cloudCapabilities.healthMonitoring ||
                changes.system.currentValue.info.capabilities &&
                changes.system.currentValue.info.capabilities.vms_metrics) &&
                changes.system.currentValue.canViewInfo();

            if (this.canSeeInfo) {
                this.fullInfoPath = this.CONFIG.menus.systemSettings.baseUrl +
                    changes.system.currentValue.id + this.CONFIG.menus.systemHealth.baseUrl +
                    this.CONFIG.menus.systemSettings.servers.path;
            }
        }

        if (changes.selectedServer && changes.selectedServer.currentValue) {
            this.setServer();
        }
    }

    ngOnDestroy(): void {}

    setServer(): void {
        // if (this.system && this.system.servers && this.system.servers.length > 0) {
        // let server;
        // if (this.serverIdFromParams) {
        //     server = this.system.servers.find((server: any) => {
        //         return server.id === this.serverIdFromParams;
        //     });
        // }
        // if (typeof server === 'undefined') {
        //     if (this.system.servers.length > 0) {
        //         server = this.system.servers[0];
        //
        //         this.uriService
        //             .updateURI(`systems/${this.system.id}/servers/${server.id}`)
        //             .catch(error => {
        //                 console.error(error);
        //             });
        //     } else {
        //         return;
        //     }
        // }

        this.applyService.hardReset();
        // const { ip, port } = server;
        // this.ipPortWatcher.value = port;
        // server.ip = ip;
        // server.osName = server.osInfo !== '' ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
        // this.selectedServer = server;

        this.checkIfOnline(this.selectedServer.id)
            .catch(error => console.error(error));

        // this.menuService.setDetailsSection(this.selectedServer.id);
        this.renameDisabled = !this.system.permissions.editAdmins;
        this.restartDisabled = !this.system.permissions.isAdmin;
        this.detachDisabled = !this.system.permissions.editAdmins;
        this.resetDisabled = !this.system.permissions.editAdmins;
        this.portChangeDisabled = !this.system.permissions.editAdmins;
        this.applyService.reset();
        this.applyService.setVisible(true);
        // }
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
    }

    checkIfOnline(serverId) {
        return this.system.getModuleInfo(serverId).toPromise()
            .then(() => this.setStatus(''))
            .catch(() => this.setStatus(this.CONFIG.servers.status.offline));
    }

    checkStatus() {
        this.checking = true;
        this.setStatus(this.CONFIG.servers.status.checking);
        const now = new Date().getTime();
        this.system.getModuleInfo(this.selectedServer.id)
            .pipe(
                catchError(() => of('error')),
                delayWhen(() => interval(3400 - ((new Date().getTime()) - now)))
            )
            .subscribe(res => {
                this.setStatus(res === 'error' ? this.CONFIG.servers.status.offline : '');
                this.checking = false;
            });
    }

    renameServer() {
        const { id, name } = this.selectedServer;
        return this.dialogs.renameServer(this.system, id, name)
            .then(newName => { this.selectedServer.name = newName; });
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

                    this.menuService.setDetailsSection(nextServerId);
                }
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
