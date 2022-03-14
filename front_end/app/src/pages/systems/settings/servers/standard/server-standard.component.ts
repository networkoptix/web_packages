import {
    Component,
    OnChanges,
    OnDestroy,
    Input,
    Output,
    EventEmitter,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { of, SubscriptionLike, Subject } from 'rxjs';
import { catchError, filter, skipWhile, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    InfoBlockSection,
    InfoBlockLine
} from '@components/info-block/info-block.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxApplyService, Watcher } from '@services/apply.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { GetMediaServers } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxUriService, ChildRoutes } from '@services/uri.service';
import { NxMenuService } from '@src/menu/menu.service';
import { cleanId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

export interface DropdownStorage {
    name: string,
    id: string,
    isOnline: boolean,
    isUsedForWriting?: boolean,
    isWritable: boolean,
    isNotSystem: boolean,
    selected: boolean,
    value: string,
    freeSpace: number
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-standard-server-component',
    templateUrl: 'server-standard.component.html',
    styleUrls: ['server-standard.component.scss']
})
export class NxSystemStandardServerComponent implements OnChanges, OnDestroy {
    @Input() system: NxSystem;
    @Input() selectedServer: NxSystemServer;
    @Input() isOffline: boolean;
    @Output() loaded = new EventEmitter(false);

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    editMode = false;

    saveSettings: Process;
    ipPortWatcher = new Watcher<number>();
    serverNameWatcher = new Watcher<string>('');
    previousInputValue: number;
    checking: boolean;
    _serverLoaded = false;
    portBusy: boolean;

    dropdownStorages: DropdownStorage[] = [];
    saveStorageWatcher = new Watcher<boolean>(false);
    systemStorageChosen = false;
    currentAnalyticsDbId: string;
    selectedStorage: DropdownStorage;
    checkingForDataAnalytics = false;
    storagesLoading = true;
    showAnalytics = false;

    betaMode: boolean;
    enableEdit: boolean;
    restartDisabled: boolean;
    detachDisabled: boolean;
    resetDisabled: boolean;
    portChangeDisabled: boolean;
    serverUnavailable: boolean;
    serverOffline: boolean;
    certError: boolean;
    fullInfoPath: string;
    parsedServerId: string;
    serverDetails: InfoBlockSection;
    serversSubscription: SubscriptionLike;
    checkIfOnlineSubscription: SubscriptionLike;
    storageSubscription: SubscriptionLike;
    analyticsSubscription: SubscriptionLike;
    destroyRestartTake$ = new Subject<boolean>();

    readonly environment = environment;

    set serverLoaded(value: boolean) {
        this._serverLoaded = value;
        this.loaded.emit(value);
    }

    get serverLoaded(): boolean {
        return this._serverLoaded;
    }

    get serverName(): string {
        return this.serverNameWatcher.value;
    }

    set serverName(value: string) {
        this.serverNameWatcher.value = value;
    }

    private setupDefaults(): void {
        this.checking = false;
        this.serverOffline = false;
        this.certError = false;
        this.enableEdit = false;
        this.restartDisabled = true;
        this.detachDisabled = true;
        this.resetDisabled = true;
        this.portChangeDisabled = true;
        this.serverUnavailable = true;
        // this.debugMode = this.CONFIG.clientMode.debug;
        this.menuService.section = 'servers';
        this.fullInfoPath = '';

        this.portBusy = false;
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

    ngOnChanges(changes: NgChanges<NxSystemStandardServerComponent>) {
        if (changes.system?.currentValue?.info && this.system.canViewInfo()) {
            this.fullInfoPath = this.uriService.getSystemSettingsRoute({
                systemId: this.system.id,
                childRoute: ChildRoutes.HEALTH
            }) + this.CONFIG.menus.systemSettings.servers.path;
        }

        if (changes.selectedServer?.currentValue) {
            const { currentValue, previousValue } = changes.selectedServer;
            if (previousValue) {
                // remove added properties
                delete previousValue.internalStatus;
                delete previousValue.shownStatus;
            }

            if (!isEqual(currentValue, previousValue)) {
                if (!this.applyService.locked) {
                    setTimeout(() => this.setServer(
                        currentValue?.id !== previousValue?.id
                    ));
                }
            } else {
                this.checkIfOnline(cleanId(currentValue.id));
            }
        }
    }

    ngOnDestroy() {
        this.destroyRestartTake$.complete();
    }

    setServer(isDifferentServer: boolean = false): void {
        this.initForApplyService();

        this.applyService.setVisible(false);
        this.serverLoaded = false;
        this.betaMode = this.CONFIG.clientMode.beta ||
            this.route.snapshot.queryParams.beta !== undefined;
        this.serverName = this.selectedServer.name;
        this.serverNameWatcher.originalValue = this.selectedServer.name;
        const { ip, port: serverPort } = this.selectedServer;
        this.selectedServer.ip = ip;
        this.parsedServerId = cleanId(this.selectedServer.id);
        this.selectedServer.osName = this.selectedServer.osInfo
            ? JSON.parse(this.selectedServer.osInfo).platform
            : this.LANG.common.unknown?.();
        const { isAdmin, editAdmins } = this.system.userManager.permissions;
        this.enableEdit = isAdmin;
        this.restartDisabled = !isAdmin;
        this.detachDisabled = !editAdmins;
        this.resetDisabled = !editAdmins;
        this.portChangeDisabled = !editAdmins;

        this.serverDetails = new InfoBlockSection([
            new InfoBlockLine(
                this.LANG.common.ip(),
                this.selectedServer.ip || '-'
            ),
            new InfoBlockLine(
                this.LANG.common.os(),
                this.selectedServer.osName || '-'
            ),
            new InfoBlockLine(
                this.LANG.common.version(),
                this.selectedServer.version || '-'
            )
        ]);

        this.ipPortWatcher.originalValue = +serverPort;
        this.ipPortWatcher.value = +serverPort;
        this.checkIfOnline(this.parsedServerId).finally(() => {
            this.serverLoaded = true;
        });

        this.getCurrentStorages(isDifferentServer);

        this.applyService.addWatchers([this.saveStorageWatcher]);
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.ipPortWatcher, this.serverNameWatcher],
            this.saveSettings,
            () => {
                this.applyService.reset();
                this.applyService.unsetInvalidField('port');
                this.selectedStorage = this.dropdownStorages.find(
                    ({ value: id }) => id === this.currentAnalyticsDbId
                ) || this.selectDefaultStorage();
                this.setSystemStorageChosen(this.selectedStorage);
            }
        );
    }

    initForApplyService(): void {
        if (this.saveSettings) {
            return;
        }
        this.saveSettings = this.processService.createProcess(async () => {
            const port = this.ipPortWatcher;
            const serverId = this.selectedServer.id;
            let newPort: number;

            if (this.serverNameWatcher.changed) {
                await this.system.renameServer(
                    this.selectedServer.id,
                    this.serverNameWatcher.value
                ).then(() => {
                    this.serverNameWatcher.originalValue = this.serverNameWatcher.value;
                    this.selectedServer.name = this.serverNameWatcher.value;
                }).catch(() => {
                    this.serverNameWatcher.reset();
                    const options = {
                        classname: this.CONFIG.toast.warning,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };

                    this.toastService.show(
                        this.LANG.toastMessage.nameFail({
                            type: this.LANG.common.server()
                        }),
                        options
                    );
                });
            }

            try {
                if (!port.value) {
                    port.value = port.originalValue;
                } else if (port.value !== port.originalValue) {
                    const portReturn = await this.system.serverManager
                        .changeServerPort(
                            port.value,
                            serverId
                        );
                    switch (portReturn.error) {
                        case '0':
                            await this.system.update();
                            port.originalValue = port.value;
                            newPort = port.value;
                            break;
                        case '3':
                            this.portBusy = true;
                            port.value = port.originalValue;
                            break;
                    }
                }
                if (this.saveStorageWatcher.value) {
                    const params = {
                        metadataStorageId: this.selectedStorage.id
                    };
                    try {
                        await this.system.serverManager.updateResource(
                            this.selectedServer.id,
                            params
                        );
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
            if (this.environment.isLocal && newPort && await this.system.mediaserver.checkIfConnectedToServer(serverId).toPromise()) {
                setTimeout(() => {
                    this.uriService.changePort(newPort);
                });
            }

            this.applyService.reset();
            return Promise.resolve();
        });
    }

    setStatus(status?: string): void {
        this.selectedServer.internalStatus = status
            ? this.CONFIG.servers.status[status]
            : '';
        this.selectedServer.shownStatus = status
            ? this.LANG.servers.status[status]?.()
            : '';
        this.certError = (
            this.CONFIG.servers.status.mismatchedcertificate ===
            this.selectedServer.internalStatus
        );
        this.serverOffline = [
            this.CONFIG.servers.status.mismatchedcertificate,
            this.CONFIG.servers.status.offline,
            this.CONFIG.servers.status.checking
        ].includes(this.selectedServer.internalStatus);
        this.serverUnavailable = this.serverOffline ||
            (
                !this.system.currentServerNotBusy &&
                this.system.currentBusyServerIds.has(this.selectedServer.id)
            );

        if (
            !this.serverOffline &&
            (
                !this.system.currentServerNotBusy &&
                this.system.currentBusyServerIds.has(this.selectedServer.id)
            )
        ) {
            this.selectedServer.internalStatus = this.CONFIG.servers.status.restarting;
        }

        if (this.serverOffline || this.serverUnavailable) {
            this.storagesLoading = false;
            this.dropdownStorages = [];
        }
    }

    checkIfOnline(serverId: string): Promise<void> {
        return this.system.serverManager
            .getServers()
            .pipe(untilDestroyed(this))
            .toPromise()
            .then(res => {
                if (res) {
                    this.setStatus(
                        res.find(server => (
                            cleanId(server.id) === cleanId(serverId)
                        )).status.toLowerCase()
                    );
                    this.applyService.setVisible(true);
                }
            }, err => {
                console.error(err);
                this.setStatus(this.CONFIG.servers.status.offline);
                this.applyService.setVisible(true);
            });
    }

    checkStatus(): void {
        this.checking = true;
        this.setStatus(this.CONFIG.servers.status.checking);

        if (this.serversSubscription) {
            this.serversSubscription.unsubscribe();
        }
        // adding time to avoid server status flashing "Checking..." if system is offline
        this.serversSubscription = this.system.serverManager.getForceServers(false)
            .pipe(
                catchError(err => {
                    console.error(err);
                    return of(false);
                }))
            .subscribe((result: GetMediaServers[] | false) => {
                if (result) {
                    const isOnline = result.find(server =>
                        server.id === this.selectedServer.id
                    ).status === 'Online';
                    this.setStatus(
                        isOnline ? '' : this.CONFIG.servers.status.offline
                    );
                } else {
                    this.setStatus(this.CONFIG.servers.status.offline);
                }
                this.checking = false;
            });
    }

    restartServer(): Promise<void> {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .restartServer(this.system, id, name)
            .then((res: string) => {
                this.system.isAvailable = false;
                this.setStatus(res);
                this.system.infoSubject
                    .pipe(
                        untilDestroyed(this),
                        skipWhile(system => system.isOnline),
                        takeUntil(this.destroyRestartTake$))
                    .subscribe(() => {
                        if (this.system.isOnline) {
                            this.system.currentServerNotBusy = true;
                            this.system.currentBusyServerIds.delete(id);
                            this.system.isAvailable = true;
                            this.destroyRestartTake$.next(true);
                            this.destroyRestartTake$.complete();
                            this.setStatus('');
                        }
                    });
            }).catch(() => {
                // Dialog was canceled
            });
    }

    detachServer(): Promise<void> {
        const { id, name } = this.selectedServer;
        const currentServerIndex = this.system.servers.findIndex(server =>
            server.id === id
        );
        const nextServerIndex = currentServerIndex + 1 !== this.system.servers.length
            ? currentServerIndex + 1
            : currentServerIndex - 1;
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
            }).catch(() => {
                // Dialog was canceled
            });
    }

    resetServer(): Promise<void> {
        const { id, name } = this.selectedServer;
        return this.dialogs
            .resetServer(this.system, id, name)
            // will take some time to reset and then restart the server
            .then(() => this.setStatus('resetting'))
            .catch(() => {
                // Dialog was canceled
            });
    }

    onPortChange(port: number): void {
        this.portBusy = false;
        if (
            port &&
            port >= this.CONFIG.servers.port.min &&
            port < this.CONFIG.servers.port.max
        ) {
            this.ipPortWatcher.value = port;
        }
        this.applyService.unsetInvalidField('port');
        if (this.ipPortWatcher.value === null) {
            this.applyService.setInvalidField('port');
        } else if (this.ipPortWatcher.value < this.CONFIG.servers.port.restrictedMax) {
            this.applyService.setInvalidField('port');
            this.applyService.setWarn(this.LANG.servers.portWarning?.());
        } else {
            this.applyService.setWarn('');
        }
    }

    private setSystemStorageChosen(storage: DropdownStorage): void {
        const hasMultipleStorages = this.dropdownStorages.length > 1;
        this.systemStorageChosen = hasMultipleStorages &&
            storage &&
            !storage.isNotSystem;
    }

    // Should be type DropdownStorage, but can't resolve with
    // <nx-select (onSelected)="changeAnalyticsStorage($event)> right now
    async changeAnalyticsStorage(newStorage): Promise<void> {
        this.setSystemStorageChosen(newStorage);

        if (newStorage.id === this.currentAnalyticsDbId) {
            this.saveStorageWatcher.value = false;
            return;
        }
        // check if analytics data exists
        this.checkingForDataAnalytics = true;
        const analyticsData = await this.system.storageManager
            .checkForAnalyticsData(this.selectedServer.id).toPromise();
        const analyticsDataExists = Boolean(analyticsData[0]);
        if (analyticsDataExists) {
            this.dialogs.changeStorage(this.system)
                .then(async closeRes => {
                    if (closeRes === 'changeOk') {
                        this.selectedStorage = newStorage;
                        this.saveStorageWatcher.originalValue = false;
                        this.saveStorageWatcher.value = false;
                        const params = {
                            metadataStorageId: this.selectedStorage.id
                        };
                        await this.system.serverManager.updateResource(
                            this.selectedServer.id,
                            params
                        );
                        await this.system.update();
                    } else if (closeRes === 'error') {
                        const options = {
                            classname: this.CONFIG.toast.warning,
                            autohide: true,
                            delay: this.CONFIG.alertTimeout
                        };
                        this.setSystemStorageChosen(this.selectedStorage);
                        this.toastService.show(
                            this.LANG.servers.analyticsDataPolicyError?.(),
                            options
                        );
                    } else if (closeRes === 'cancel') {
                        this.selectedStorage = { ...this.selectedStorage };
                        this.setSystemStorageChosen(this.selectedStorage);
                    }
                    this.currentAnalyticsDbId = this.selectedStorage.id;
                    this.saveStorageWatcher.value = false;
                });
        } else {
            this.selectedStorage = newStorage;
            this.saveStorageWatcher.value =
                this.selectedStorage.id !== this.currentAnalyticsDbId;
        }
        this.checkingForDataAnalytics = false;
    }

    getCurrentStorages(isDifferentServer: boolean = false): void {
        if (isDifferentServer && this.storageSubscription) {
            this.storagesLoading = true;
            this.storageSubscription.unsubscribe();
        } else if (this.storageSubscription) {
            return;
        }
        this.storageSubscription = this.system.storageManager.storageState$.pipe(
            filter(({ storageInfoLoaded, analyticsLoaded }) =>
                storageInfoLoaded && analyticsLoaded
            )
        ).subscribe(
            ({
                currentAnalyticsDbLocation,
                analyticsDbTargetLocations,
                hasAnalyticsData,
                hasCompatibleAnalyticsPlugins
            }) => {
                this.currentAnalyticsDbId = currentAnalyticsDbLocation?.storageId;
                this.dropdownStorages = analyticsDbTargetLocations.map(({
                    url,
                    isOnline,
                    storageStatus,
                    storageId,
                    isWritable,
                    freeSpace
                }): DropdownStorage => {
                    const selected = this.currentAnalyticsDbId === storageId;
                    return {
                        name: url,
                        isOnline,
                        isWritable,
                        isNotSystem: !storageStatus
                            ? !this.systemStorageChosen
                            : !storageStatus.includes('system'),
                        selected,
                        id: storageId,
                        value: storageId,
                        freeSpace
                    };
                });
                if (!this.saveStorageWatcher.value) {
                    this.selectedStorage = this.dropdownStorages.find(store =>
                        store.selected
                    ) || this.selectDefaultStorage();
                }
                this.storagesLoading = false;
                this.showAnalytics = !!currentAnalyticsDbLocation ||
                    hasAnalyticsData ||
                    hasCompatibleAnalyticsPlugins;

                this.setSystemStorageChosen(this.selectedStorage);

                if (this.saveStorageWatcher.value === undefined) {
                    this.saveStorageWatcher.value = false;
                }
            },
            () => {
                this.currentAnalyticsDbId = null;
                this.dropdownStorages = [];
                this.storagesLoading = false;
            }
        );
    }

    selectDefaultStorage(): DropdownStorage {
        const firstPass = this.selectDefaultStorageRecursion(
            this.dropdownStorages,
            [
                'isNotSystem',
                'isUsedForWriting',
                'isOnline',
                'isWritable'
            ]
        );
        return firstPass || this.selectDefaultStorageRecursion(
            this.dropdownStorages,
            ['isOnline', 'isWritable'],
            true
        );
    }

    /* If lastSetOfCriteria = true, will always return a Dropdown storage,
    otherwise may return false (see selectDefaultStorage() above) */
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria?: boolean
    ): DropdownStorage | false;
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria: true
    ): DropdownStorage;
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria: boolean = false
    ): DropdownStorage | false {
        const [curCriteria, ...remainingCriteria] = criteria;
        const filteredStorages = storages.filter(storage => storage[curCriteria]);
        if (filteredStorages.length === 1) {
            return filteredStorages[0];
        } else if (
            filteredStorages.length === 0 ||
            storages.length === filteredStorages.length
        ) {
            return this.highestFreeSpace(storages);
        } else if (remainingCriteria.length === 0) {
            return lastSetOfCriteria
                ? this.highestFreeSpace(filteredStorages)
                : false;
        } else {
            return this.selectDefaultStorageRecursion(
                filteredStorages,
                remainingCriteria
            );
        }
    }

    highestFreeSpace(storage: DropdownStorage[]): DropdownStorage {
        return storage.reduce((currentHighest, currentStorage) => {
            return currentHighest.freeSpace >= currentStorage.freeSpace
                ? currentHighest
                : currentStorage;
        }, storage[0]);
    }

    // Breadcrumbs for beta swagger navigation:
    // routerLink="/api-tool/{{system.id}}/{{parsedServerId}}
}
