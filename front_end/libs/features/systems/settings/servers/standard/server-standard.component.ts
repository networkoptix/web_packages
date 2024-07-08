import { Component, OnChanges, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { of, SubscriptionLike, Subject, timer, firstValueFrom } from 'rxjs';
import {
    catchError,
    delay,
    filter,
    retry,
    switchMap,
    takeUntil,
    tap,
    timeout,
} from 'rxjs/operators';

import { InfoBlockSection, InfoBlockLine } from '@components/info-block/info-block.component.types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxAppStateService } from '@services/nx-app-state.service';
import { Servers } from '@services/nx-config/base-config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { icons, clientMode, menus, servers } from '@static-variables';
import { cleanIdLegacy } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { DropdownStorage } from './server-standard.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-standard-server-component',
    templateUrl: 'server-standard.component.html',
    styleUrls: ['server-standard.component.scss'],
})
export class NxSystemStandardServerComponent implements OnChanges, OnDestroy {
    @Input() system: NxSystem;
    @Input() selectedServer: NxSystemServer;
    @Input() isOffline: boolean;
    @Output() loaded = new EventEmitter<boolean>(false);

    LANG = staticLang;

    editMode = false;

    saveSettings: Process;
    ipPortWatcher = new Watcher<number>();
    serverNameWatcher = new Watcher<string>('');
    previousInputValue: number;
    checking: boolean;
    private _serverLoaded = false;
    portBusy: boolean;

    dropdownStorages: DropdownStorage[] = [];
    saveStorageWatcher = new Watcher<boolean>(false);
    systemStorageChosen = false;
    currentAnalyticsDbId: string;
    selectedStorage: DropdownStorage;
    checkingForDataAnalytics = false;
    storagesLoading = true;
    showAnalytics = false;
    analyticsDbChanged = false;

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
    storageSubscription: SubscriptionLike;
    destroyRestartTake$ = new Subject<boolean>();
    icons = icons;
    servers: Servers;

    internalStatus: string = '';
    shownStatus: string = '';

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
        this.menuService.selectedSection$$.set('servers');
        this.fullInfoPath = '';

        this.portBusy = false;
    }

    constructor(
        private appState: NxAppStateService,
        private accountService: NxAccountService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        public route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private toastService: NxToastService,
        private ribbonService: NxRibbonService,
    ) {
        this.servers = servers;

        this.setupDefaults();
        this.initializeBusyServerWatcher();
    }

    private initializeBusyServerWatcher(): void {
        const serverTimers = {
            checkMs: 10000,
            requestTimeoutMs: 5000,
            retryDelayMs: 5000, // Retry time is doubled each attempt. Currently, it retries at 5s, 10s, 20s.
        };
        let fetchingServersLock = false;
        timer(0, serverTimers.checkMs)
            .pipe(
                filter(() => this.system?.currentBusyServerIds.size > 0 && !fetchingServersLock),
                delay(1000), // small delay in case the tick happens in the middle of restarting.
                tap(() => {
                    fetchingServersLock = true;
                }),
                switchMap(() =>
                    this.system.serverManager.getForceServers(false).pipe(
                        timeout(serverTimers.requestTimeoutMs),
                        // count means additional attempts
                        retry({
                            count: 2,
                            delay: (error, attempt) => {
                                if (error?.status !== 502) {
                                    // Do not retry unauthorized attempts.
                                    throw Error('Something went wrong...');
                                }
                                return timer(serverTimers.retryDelayMs * 2 ** attempt);
                            },
                        }),
                        // Return an empty array so the subscription doesn't complete.
                        catchError(() => of<NxSystemServer[]>([])),
                    ),
                ),
                tap(() => {
                    fetchingServersLock = false;
                }),
                filter(servers => servers.length > 0),
                untilDestroyed(this),
            )
            .subscribe(servers => {
                Array.from(this.system.currentBusyServerIds.values())
                    .map(serverId => servers.find(({ id }) => id === serverId))
                    .filter(server => server.status?.toLowerCase() === this.servers.status.online)
                    .forEach(server => {
                        this.system.currentBusyServerIds.delete(server.id);
                        if (server.id === this.selectedServer.id) {
                            this.ribbonService.hide();
                            this.setStatus('');
                            this.toastService.notify(
                                this.LANG.servers.restartSuccessful,
                                ToastType.Success,
                            );
                        }
                    });
            });
    }

    ngOnChanges(changes: NgChanges<NxSystemStandardServerComponent>): void {
        if (changes.system?.currentValue?.info && this.system.permissionManager.isAdmin$$()) {
            this.showAnalytics ||= this.system.version >= 5.1;
            this.fullInfoPath =
                this.uriService.getSystemSettingsRoute({
                    systemId: this.system.id,
                    childRoute: ChildRoutes.HEALTH,
                }) + menus.systemSettings.servers.path;
        }

        if (changes.selectedServer?.currentValue) {
            const { currentValue, previousValue } = changes.selectedServer;
            this.serverOffline = false;
            if (!this.applyService.locked) {
                setTimeout(() => {
                    this.setServer(currentValue?.id !== previousValue?.id);
                });
            }
            this.checkIfOnline(cleanIdLegacy(currentValue.id));
        }
    }

    ngOnDestroy(): void {
        this.destroyRestartTake$.next(true);
        this.destroyRestartTake$.complete();
    }

    setServer(isDifferentServer: boolean = false): void {
        this.initForApplyService();

        this.applyService.setVisible(false);
        this.serverLoaded = false;
        this.betaMode = clientMode.beta || this.route.snapshot.queryParams.beta !== undefined;
        this.serverName = this.selectedServer.name;
        this.serverNameWatcher.originalValue = this.selectedServer.name;
        const { ip, port: serverPort } = this.selectedServer;
        this.selectedServer.ip = ip;
        this.parsedServerId = cleanIdLegacy(this.selectedServer.id);
        const osName = this.selectedServer.osInfo?.platform;
        const { isAdmin, editAdmins } = this.system.permissionManager.permissions$$();
        this.enableEdit = isAdmin;
        this.restartDisabled = !isAdmin;
        this.detachDisabled = !editAdmins;
        this.resetDisabled = !editAdmins;
        this.portChangeDisabled = !editAdmins;

        this.serverDetails = new InfoBlockSection([
            new InfoBlockLine(this.LANG.common.ip, this.selectedServer.ip || '-'),
            new InfoBlockLine(this.LANG.common.os, osName || '-'),
            new InfoBlockLine(this.LANG.common.version, this.selectedServer.version || '-'),
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
                this.selectedStorage =
                    this.dropdownStorages.find(
                        ({ value: id }) => id === this.currentAnalyticsDbId,
                    ) || this.selectDefaultStorage();
                this.setSystemStorageChosen(this.selectedStorage);
            },
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
                await this.system.serverManager
                    .renameServer(this.selectedServer.id, this.serverNameWatcher.value)
                    .then(() => {
                        this.serverNameWatcher.originalValue = this.serverNameWatcher.value;
                        this.selectedServer.name = this.serverNameWatcher.value;
                    })
                    .catch(() => {
                        this.serverNameWatcher.reset();
                        this.toastService.notify(
                            {
                                value: this.LANG.toastMessage.nameFail,
                                params: {
                                    type: this.LANG.common.server,
                                },
                            },
                            ToastType.Warning,
                        );
                    });
            }

            try {
                if (!port.value) {
                    port.value = port.originalValue;
                } else if (port.value !== port.originalValue) {
                    const portReturn = await this.system.serverManager.changeServerPort(
                        port.value,
                        serverId,
                    );
                    if (portReturn?.error === '3') {
                        this.portBusy = true;
                        port.value = port.originalValue;
                    } else {
                        port.originalValue = port.value;
                        newPort = port.value;
                    }
                }

                if (this.saveStorageWatcher.value) {
                    try {
                        if (this.analyticsDbChanged) {
                            const params = {
                                metadataStorageId: this.selectedStorage.id,
                            };
                            await this.system.serverManager.updateResource(
                                this.selectedServer.id,
                                params,
                            );
                            this.system.serverManager.invalidateStorageAnalytics(
                                this.selectedServer.id,
                            );
                        }

                        await firstValueFrom(this.system.storageManager.update());
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
            if (
                this.environment.isLocal &&
                newPort &&
                (await firstValueFrom(this.system.mediaserver.checkIfConnectedToServer(serverId)))
            ) {
                setTimeout(() => {
                    this.uriService.changePort(newPort.toString());
                });
            }

            await this.system.update();

            this.applyService.reset();
            return Promise.resolve();
        });
    }

    setStatus(status?: string): void {
        this.internalStatus = status ? servers.status[status] : '';
        this.shownStatus = status ? this.LANG.servers.status[status] : '';
        this.certError = servers.status.mismatchedcertificate === this.internalStatus;
        this.serverOffline = [
            servers.status.mismatchedcertificate,
            servers.status.offline,
            servers.status.checking,
        ].includes(this.internalStatus);

        this.serverUnavailable =
            this.serverOffline || this.system.currentBusyServerIds.has(this.selectedServer.id);

        if (!this.serverOffline && this.system.currentBusyServerIds.has(this.selectedServer.id)) {
            this.internalStatus = servers.status.restarting;
        }

        if (this.serverOffline || this.serverUnavailable) {
            this.storagesLoading = false;
            this.dropdownStorages = [];
        }

        if (environment.isLocal && status === 'restarting') {
            // Force overlay to show - don't wait next api call to fail --TT
            this.appState.systemAvailable$.next(false);
        }
    }

    checkIfOnline(serverId: string): Promise<void> {
        return firstValueFrom(
            this.system.serverManager.getServers().pipe(untilDestroyed(this)),
        ).then(
            res => {
                if (res) {
                    this.setStatus(
                        res
                            .find(server => cleanIdLegacy(server.id) === cleanIdLegacy(serverId))
                            .status.toLowerCase(),
                    );
                    this.applyService.setVisible(true);
                }
            },
            err => {
                console.error(err);
                this.setStatus(servers.status.offline);
                this.applyService.setVisible(true);
            },
        );
    }

    checkStatus(): void {
        this.checking = true;
        this.setStatus(servers.status.checking);

        if (this.serversSubscription) {
            this.serversSubscription.unsubscribe();
        }
        // adding time to avoid server status flashing "Checking..." if system is offline
        this.serversSubscription = this.system.serverManager
            .getForceServers(false)
            .pipe(
                catchError(err => {
                    console.error(err);
                    return of(false);
                }),
            )
            .subscribe((result: NxSystemServer[] | false) => {
                if (result) {
                    const isOnline =
                        result.find(server => server.id === this.selectedServer.id).status ===
                        'Online';
                    this.setStatus(isOnline ? '' : servers.status.offline);
                } else {
                    this.setStatus(servers.status.offline);
                }
                this.checking = false;
            });
    }

    restartServer(): Promise<void> {
        const { system, selectedServer: server } = this;

        return this.dialogs.restartServer({ system, server }).then(res => {
            if (!res) {
                return;
            }
            this.system.isAvailable = false;
            this.system.storageManager.update();
            this.setStatus(res);
            if (environment.isLocal) {
                this.appState.systemAvailable$
                    .pipe(untilDestroyed(this), takeUntil(this.destroyRestartTake$))
                    .subscribe(status => {
                        if (status) {
                            this.destroyRestartTake$.next(true);
                            this.accountService.logout(false);
                        }
                    });
            }
        });
    }

    detachServer(): Promise<void> {
        const { system, selectedServer: server } = this;
        const currentServerIndex = this.system.serverManager.servers.findIndex(
            s => s.id === server.id,
        );
        const nextServerIndex =
            currentServerIndex + 1 !== this.system.serverManager.servers.length
                ? currentServerIndex + 1
                : currentServerIndex - 1;
        const nextServerId = this.system.serverManager.servers[nextServerIndex].id;
        return this.dialogs.detachServer({ system, server }).then(detached => {
            if (detached) {
                this.uriService
                    .updateURI(`systems/${this.system.id}/servers/${nextServerId}`)
                    .catch(error => {
                        console.error(error);
                    });

                this.menuService.selectedDetailsSection$$.set(nextServerId);
            }
        });
    }

    resetServer(): Promise<void> {
        const { system, selectedServer: server } = this;
        return this.dialogs.resetServer({ system, server }).then(resetting => {
            if (resetting) {
                this.setStatus('resetting');
            }
        });
        // will take some time to reset and then restart the server
    }

    onPortChange(port: number): void {
        this.portBusy = false;
        if (port && port >= servers.port.min && port < servers.port.max) {
            this.ipPortWatcher.value = port;
        }
        this.applyService.unsetInvalidField('port');
        if (this.ipPortWatcher.value === null) {
            this.applyService.setInvalidField('port');
        } else if (this.ipPortWatcher.value < servers.port.restrictedMax) {
            this.applyService.setInvalidField('port');
            this.applyService.setWarn(this.LANG.servers.portWarning);
        } else {
            this.applyService.setWarn('');
        }
    }

    private setSystemStorageChosen(storage: DropdownStorage): void {
        const hasMultipleStorages = this.dropdownStorages.length > 1;
        this.systemStorageChosen = hasMultipleStorages && storage && !storage.isNotSystem;
    }

    async changeAnalyticsStorage(newStorage: DropdownStorage): Promise<void> {
        this.setSystemStorageChosen(newStorage);

        if (newStorage.id === this.currentAnalyticsDbId) {
            this.saveStorageWatcher.value = false;
            return;
        }

        // check if analytics data exists
        this.checkingForDataAnalytics = true;
        const analyticsData = await firstValueFrom(
            this.system.storageManager.checkForAnalyticsData(this.selectedServer.id),
        );

        const analyticsDataExists = Boolean(analyticsData[0]);
        if (analyticsDataExists) {
            await this.dialogs.changeStorage(this.system).then(async closeRes => {
                if (closeRes === 'changeOk') {
                    this.selectedStorage = newStorage;
                    this.saveStorageWatcher.originalValue = false;
                    this.saveStorageWatcher.value = false;
                    const params = {
                        metadataStorageId: this.selectedStorage.id,
                    };
                    await this.system.serverManager.updateResource(this.selectedServer.id, params);
                    this.system.serverManager.invalidateStorageAnalytics(this.selectedServer.id);
                    await this.system.update();
                    this.system.storageManager.update();
                    this.analyticsDbChanged = true;
                } else if (closeRes === 'error') {
                    this.setSystemStorageChosen(this.selectedStorage);
                    this.toastService.notify(
                        this.LANG.servers.analyticsDataPolicyError,
                        ToastType.Warning,
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
            this.saveStorageWatcher.value = this.selectedStorage.id !== this.currentAnalyticsDbId;
            this.analyticsDbChanged = true;
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
        this.storageSubscription = this.system.storageManager.storageState$
            .pipe(
                filter(
                    ({ storageInfoLoaded, analyticsLoaded }) =>
                        storageInfoLoaded && analyticsLoaded,
                ),
            )
            .subscribe(
                ({
                    currentAnalyticsDbLocation,
                    analyticsDbTargetLocations,
                    hasAnalyticsData,
                    hasCompatibleAnalyticsPlugins,
                }) => {
                    this.currentAnalyticsDbId = currentAnalyticsDbLocation?.storageId;
                    this.dropdownStorages = analyticsDbTargetLocations.map(
                        ({
                            url,
                            isOnline,
                            storageStatus,
                            storageId,
                            isWritable,
                            freeSpace,
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
                                freeSpace,
                                disabled: !isOnline,
                            };
                        },
                    );
                    if (!this.saveStorageWatcher.value) {
                        this.selectedStorage =
                            this.dropdownStorages.find(store => store.selected) ||
                            this.selectDefaultStorage();
                    }
                    this.storagesLoading = false;
                    this.showAnalytics ||=
                        !!currentAnalyticsDbLocation ||
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
                },
            );
    }

    selectDefaultStorage(): DropdownStorage {
        const firstPass = this.selectDefaultStorageRecursion(this.dropdownStorages, [
            'isNotSystem',
            'isUsedForWriting',
            'isOnline',
            'isWritable',
        ]);
        return (
            firstPass ||
            this.selectDefaultStorageRecursion(
                this.dropdownStorages,
                ['isOnline', 'isWritable'],
                true,
            )
        );
    }

    /* If lastSetOfCriteria = true, will always return a Dropdown storage,
    otherwise may return false (see selectDefaultStorage() above) */
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria?: boolean,
    ): DropdownStorage | false;
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria: true,
    ): DropdownStorage;
    selectDefaultStorageRecursion(
        storages: DropdownStorage[],
        criteria: (keyof DropdownStorage)[],
        lastSetOfCriteria: boolean = false,
    ): DropdownStorage | false {
        const [curCriteria, ...remainingCriteria] = criteria;
        const filteredStorages = storages.filter(storage => storage[curCriteria]);
        const findSystem = this.system.version >= 5.0 ? this.highestFreeSpace : this.firstNonSystem;
        if (filteredStorages.length === 1) {
            return filteredStorages[0];
        } else if (filteredStorages.length === 0 || storages.length === filteredStorages.length) {
            return findSystem(storages);
        } else if (remainingCriteria.length === 0) {
            return lastSetOfCriteria ? findSystem(filteredStorages) : false;
        } else {
            return this.selectDefaultStorageRecursion(filteredStorages, remainingCriteria);
        }
    }

    firstNonSystem(storage: DropdownStorage[]): DropdownStorage {
        return (
            storage
                .sort((a, b) => a.name.localeCompare(b.name, navigator.language, { numeric: true }))
                .find(({ isNotSystem }) => isNotSystem) || storage[0]
        );
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
