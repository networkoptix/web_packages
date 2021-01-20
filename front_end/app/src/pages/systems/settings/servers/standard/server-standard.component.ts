import {
    Component, OnInit, SimpleChanges, OnChanges,
    OnDestroy, Input, Output, EventEmitter
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import {
    UntilDestroy, untilDestroyed
}                                    from '@ngneat/until-destroy';
import {
    of, SubscriptionLike, Subject, Observable
}                                                 from 'rxjs';
import { catchError, delay, filter, map, switchMap, tap } from 'rxjs/operators';

import {
    InfoBlockSection, InfoBlockLine
}                                    from '../../../../../components/info-block/info-block.component';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxApplyService, Watcher }   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxMenuService }             from '../../../../../menu';
import { ICamera, NxSystem }         from '../../../../../services/system.service';
import { NxUriService, ChildRoutes } from '../../../../../services/uri.service';
import { NxUtilsService }            from '../../../../../services/utils.service';
import { NxToastService }            from '../../../../../dialogs/toast.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';

interface DropdownStorage {
    name: string,
    id: string,
    isOnline: boolean,
    isUsedForWriting: boolean,
    isWritable: boolean,
    isNotSystem: boolean,
    selected: boolean,
    value: string
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-standard-server-component',
    templateUrl : 'server-standard.component.html',
    styleUrls   : ['server-standard.component.scss']
})
export class NxSystemStandardServerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() system: NxSystem;
    @Input() selectedServer;
    @Input() isOffline: boolean;
    @Output() loaded = new EventEmitter(false);

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    serverIdFromParams;

    editMode = false;

    saveSettings: Process;
    ipPortWatcher: any = new Watcher<number>();
    serverNameWatcher = new Watcher('');
    previousInputValue: number;
    checking: boolean;
    _serverLoaded = false;

    dropdownStorages: any[] = [];
    saveStorageWatcher = new Watcher<boolean>(false);
    systemStorageChosen = false;
    currentAnalyticsDbId: any;
    selectedStorage: Partial<DropdownStorage>;
    checkingForDataAnalytics = false;
    storagesLoading = true;
    showAnalytics = true;

    betaMode: boolean;
    renameDisabled: boolean;
    restartDisabled: boolean;
    detachDisabled: boolean;
    resetDisabled: boolean;
    portChangeDisabled: boolean;
    serverUnavailable: boolean;
    serverOffline: boolean;
    fullInfoPath: string;
    parsedServerId: string;
    serverDetails: InfoBlockSection;
    serversSubscription: SubscriptionLike;
    checkIfOnlineSubscription: SubscriptionLike;
    storageSubscription: SubscriptionLike;
    analyticsSubscription: SubscriptionLike;
    unsub$ = new Subject<string>();

    set serverLoaded(value) {
        this._serverLoaded = value;
        this.loaded.emit(value);
    }

    get serverLoaded() {
        return this._serverLoaded;
    }

    get serverName() {
        return this.serverNameWatcher.value;
    }

    set serverName(value) {
        this.serverNameWatcher.value = value;
    }

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
        this.fullInfoPath = '';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.initForApplyService();

        this.applyService.addWatchersAndFunctionsFromChild(
            [this.ipPortWatcher, this.saveStorageWatcher, this.serverNameWatcher],
            this.saveSettings,
            () => {
                this.applyService.reset();
                this.selectedStorage = this.dropdownStorages.find(({ value: id }) => id === this.currentAnalyticsDbId);
            }
        );

        this.applyService.setVisible(false);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.system?.currentValue?.info && this.system.canViewInfo()) {
            this.fullInfoPath = this.uriService.getSystemSettingsRoute({ systemId: this.system.id, childRoute: ChildRoutes.HEALTH }) + this.CONFIG.menus.systemSettings.servers.path;
        }

        if (changes.selectedServer?.currentValue) {
            const { currentValue, previousValue } = changes.selectedServer;
            if (previousValue) {
                // remove added properties
                delete previousValue.internalStatus;
                delete previousValue.shownStatus;
            }

            if (currentValue.id !== previousValue?.id) {
                this.setServer();
            }
        }
    }

    ngOnDestroy() {}

    setServer(): void {
        this.serverLoaded = false;
        this.showAnalytics = true;
        this.betaMode = this.CONFIG.clientMode.beta || this.route.snapshot.queryParams.beta !== undefined;
        this.serverName = this.serverNameWatcher.originalValue = this.selectedServer.name;
        const { ip, port } = this.selectedServer;
        this.selectedServer.ip = ip;
        this.parsedServerId = NxUtilsService.cleanId(this.selectedServer.id);
        this.selectedServer.osName = this.selectedServer.osInfo ? JSON.parse(this.selectedServer.osInfo).platform : this.LANG.common.unknown?.();

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
            this.ipPortWatcher.originalValue = this.ipPortWatcher.value = +port;
        }
        this.getCurrentStorages();
    }

    initForApplyService(): void {
        this.saveSettings = this.processService.createProcess(async() => {
            const port = this.ipPortWatcher;
            const serverId = this.selectedServer.id;
            if (this.serverNameWatcher.changed) {
                await this.system.renameServer(this.selectedServer.id, this.serverNameWatcher.value)
                    .then(() => {
                        this.serverNameWatcher.originalValue = this.serverNameWatcher.value;
                        this.selectedServer.name = this.serverNameWatcher.value;
                    })
                    .catch(() => {
                        this.serverNameWatcher.reset();
                        const options = {
                            classname : this.CONFIG.toast.warning,
                            autohide  : true,
                            delay     : this.CONFIG.alertTimeout
                        };
                        this.toastService.show(
                            NxLanguageProviderService.translate(
                                this.LANG.toastMessage.nameFail?.(),
                                { type: this.LANG.common.server?.() }
                            ), options);
                    });
            }
            try {
                if (!port.value) {
                    port.value = port.originalValue;
                } else if (port.value !== port.originalValue) {
                    const portReturn = await this.system.changeServerPort(port.value, serverId);
                    if (portReturn) {
                        port.originalValue = port.value;
                    }
                }
                if (this.saveStorageWatcher.value) {
                    const params = {
                        metadataStorageId: this.selectedStorage.id
                    };
                    try {
                        await this.system.updateResource(this.selectedServer.id, params);
                        await this.system.update();
                        this.saveStorageWatcher.value = false;
                        this.currentAnalyticsDbId = this.selectedStorage.id;
                    } catch (err) {
                        console.error(err);
                        this.saveStorageWatcher.value = true;
                    }
                }
            } catch (error) {
                return Promise.reject(error);
            }
            this.applyService.reset();

            return Promise.resolve();
        });
    }

    setStatus(status) {
        this.selectedServer.internalStatus = status ? this.CONFIG.servers.status[status] : '';
        this.selectedServer.shownStatus = status ? this.LANG.servers.status[status]?.() : '';
        this.serverOffline = [this.CONFIG.servers.status.offline, this.CONFIG.servers.status.checking]
            .includes(this.selectedServer.internalStatus);
        this.serverUnavailable = this.serverOffline ||
            (!this.system.currentServerNotBusy && this.system.currentBusyServerIds.has(this.selectedServer.id));
    }

    checkIfOnline = (serverId) => {
        return this.system.getServers().pipe(untilDestroyed(this)).toPromise().then(res => {
            if (res) {
                const servers: any[] = Object.entries(res).map(server => server[1]);
                this.setStatus(servers.find(server => server.id === serverId).status === 'Online'
                    ? '' : this.CONFIG.servers.status.offline);
                this.applyService.setVisible(true);
            }
        }, err => {
            console.error(err);
            this.setStatus(this.CONFIG.servers.status.offline);
            this.applyService.setVisible(true);
        });
    }

    checkStatus() {
        this.checking = true;
        this.setStatus(this.CONFIG.servers.status.checking);

        if (this.serversSubscription) {
            this.serversSubscription.unsubscribe();
        }
        // adding time to avoid server status flashing "Checking..." if system is offline
        // TODO: Check spec for time
        this.serversSubscription = this.system.getForceServers()
            .pipe(
                catchError(err => {
                    console.error(err);
                    return of(false);
                }))
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
            this.applyService.setWarn(this.LANG.servers.portWarning?.());
        } else {
            this.applyService.setWarn('');
        }
    }

    async changeAnalyticsStorage(newStorage: Partial<DropdownStorage>) {
        const hasMultipleStorages = this.dropdownStorages.length > 1;
        this.systemStorageChosen = hasMultipleStorages && !newStorage.isNotSystem;
        if (newStorage.id === this.currentAnalyticsDbId) return;
        // check if analytics data exists
        this.checkingForDataAnalytics = true;
        const analyticsData = await this.system.storageManager.checkForAnalyticsData(this.selectedServer.id).toPromise();
        const analyticsDataExists = Boolean(analyticsData[0]);
        if (analyticsDataExists) {
            this.dialogs.changeStorage(this.system)
                .then(async(closeRes) => {
                    if (closeRes === 'changeOk') {
                        this.selectedStorage = newStorage;
                        this.saveStorageWatcher.originalValue = false;
                        this.saveStorageWatcher.value = false;
                        const params = {
                            metadataStorageId: this.selectedStorage.id
                        };
                        await this.system.updateResource(this.selectedServer.id, params);
                        await this.system.update();
                    } else if (closeRes === 'error') {
                        const options = {
                            classname : this.CONFIG.toast.warning,
                            autohide  : true,
                            delay     : this.CONFIG.alertTimeout
                        };
                        this.systemStorageChosen = hasMultipleStorages && !this.selectedStorage.isNotSystem;
                        this.toastService.show(this.LANG.servers.analyticsDataPolicyError?.(), options);
                    } else if (closeRes === 'cancel') {
                        this.selectedStorage = { ...this.selectedStorage };
                        this.systemStorageChosen = hasMultipleStorages && !this.selectedStorage.isNotSystem;
                    }
                    this.currentAnalyticsDbId = this.selectedStorage.id;
                    this.saveStorageWatcher.value = false;
                });
        } else {
            this.selectedStorage = newStorage;
            this.saveStorageWatcher.value = this.selectedStorage.id !== this.currentAnalyticsDbId;
            this.systemStorageChosen = hasMultipleStorages && !this.selectedStorage.isNotSystem;
        }
        this.checkingForDataAnalytics = false;
    }

    getCurrentStorages() {
        this.storageSubscription = this.system.storageManager.storageState$.pipe(
            filter(({ storageInfoLoaded, analyticsLoaded }) => storageInfoLoaded && analyticsLoaded)
        ).subscribe(({
            currentAnalyticsDbLocation,
            analyticsDbTargetLocations
        }) => {
            this.currentAnalyticsDbId = currentAnalyticsDbLocation?.storageId;
            this.dropdownStorages = analyticsDbTargetLocations.map(({ url, isOnline, storageStatus, storageId, isWritable, freeSpace }) => {
                const selected = this.currentAnalyticsDbId === storageId;
                return {
                    name        : url,
                    isOnline,
                    isWritable,
                    isNotSystem : !storageStatus?.includes('system'),
                    selected,
                    id          : storageId,
                    value       : storageId,
                    freeSpace
                };
            });
            this.selectedStorage = this.dropdownStorages.find(store => store.selected) || this.selectDefaultStorage();
            this.storagesLoading = false;
            this.serverLoaded = true;
            if (this.saveStorageWatcher.value === undefined) {
                this.saveStorageWatcher.value = false;
            }
        });
    }

    selectDefaultStorage() {
        const firstPass = this.selectDefaultStorageRecursion(
            this.dropdownStorages,
            ['isNotSystem', 'isUsedForWriting', 'isOnline', 'isWritable']
        );
        return firstPass ||
            this.selectDefaultStorageRecursion(
                this.dropdownStorages,
                ['isOnline', 'isWritable'],
                true
            );
    }

    selectDefaultStorageRecursion(
        storages: Partial<DropdownStorage>[],
        criteria: string[],
        lastSetOfCriteria: boolean = false
    ): Partial<DropdownStorage> | false {
        const [curCriteria, ...remainingCriteria] = criteria;
        const filteredStorages = storages.filter(storage => storage[curCriteria]);
        if (filteredStorages.length === 1) {
            return filteredStorages[0];
        } else if (filteredStorages.length === 0 || storages.length === filteredStorages.length) {
            return this.highestFreeSpace(storages);
        } else if (remainingCriteria.length === 0) {
            return lastSetOfCriteria ? this.highestFreeSpace(filteredStorages) : false;
        } else {
            return this.selectDefaultStorageRecursion(filteredStorages, remainingCriteria);
        }
    }

    highestFreeSpace(storage) {
        return storage.reduce((max, next) => {
            return +max.freeSpace >= +next.freeSpace ? max : next;
        }, 0);
    }

    // Breadcrumbs for beta swagger navigation:
    // routerLink="/api-tool/{{system.id}}/{{parsedServerId}}
}
