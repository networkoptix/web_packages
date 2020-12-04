import {
    Component, Inject, ViewContainerRef,
    LOCALE_ID, Input, Output, OnInit, EventEmitter
}                                    from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import {
    Subscription, interval, combineLatest, BehaviorSubject, Subject, defer, of
}                                    from 'rxjs';
import {
    map, first, takeUntil, delay, retryWhen, distinctUntilChanged, switchMap, tap, startWith, pairwise, bufferCount, concatMap
}                                    from 'rxjs/operators';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { Watcher, NxApplyService }   from '@services/apply.service';
import { NxDialogsService }          from '@services/../dialogs/dialogs.service';
import { NxToastService }            from '@services/../dialogs/toast.service';
import { NxSystem }                  from '@services/system.service';
import { LanguageI18NStaticTypes }   from '@services/../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '@services/nx-config';
import { ChildRoutes, NxUriService } from '@services/uri.service';
import { ChangedIdReturned } from '@services/system-api.types';
import { NxUtilsService } from '@services/utils.service';

enum MODE {
    MAIN = 0,
    BACKUP = 1,
    NOT_IN_USE = 3
}

enum STORAGE_STATUS {
    IN_USE,
    INACCESSIBLE,
    RESERVED,
    DISABLED,
    REINDEXING
}

enum STORAGE_TYPES {
    LOCAL = 'local',
    USB = 'usb',
    NETWORK = 'smb',
    SYSTEM_NETWORK = 'network',
    CLOUD = 'cloud'
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-storage-component',
    templateUrl : 'server-storage-standard.component.html',
    styleUrls   : ['server-storage-standard.component.scss']
})
export class NxSystemStorageComponent implements OnInit {
    @Input() system: NxSystem;
    @Input() serverId: string;
    @Output() storageEmit = new EventEmitter<any>();

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    viewContainerRef: ViewContainerRef;
    storageTypes = STORAGE_TYPES

    loading: boolean;
    reindexingMain = false;
    percentMainDone = 0;
    reindexingBackup = false;
    percentBackupDone = 0;
    onlineMains = 0;
    onlineBackups = 0;
    changedModes: string[] = [];
    customSettings = false;
    systemHasBackupsOn = false;

    storage$ = new BehaviorSubject<any[] | any>([]);
    triggerUpdate$ = new Subject<any>();
    refreshStorages$ = new Subject<any>();
    dropdownOffset$ = new BehaviorSubject(0);
    scrollOffset$ = new BehaviorSubject(0);

    dropdownOffsetCalc$ = combineLatest([
        this.dropdownOffset$.pipe(distinctUntilChanged()),
        this.scrollOffset$.pipe(distinctUntilChanged())
    ]).pipe(
        map(([offset, scroll]) => offset - scroll + 22) // margin offset
    )

    backupLocations$ = this.storage$.pipe(
        map(storage => storage.reduce(
            (hasBackup, { storageId }) => hasBackup ||
            this.modeWatchers[storageId]?.value === 'modeBackup',
            false
        ))
    )

    isBackupOn = new Watcher(false);
    modeWatchers: {[key: string]: Watcher<any>} = {};

    ddWidth: number;
    modes: any;
    STATUS = STORAGE_STATUS

    reindexingMainSubscription: Subscription;
    reindexingBackupSubscription: Subscription;
    triggerUpdateSubscription: Subscription;
    storageSubscription: Subscription;

    mainStorageIds: string[] = [];
    backupStorageIds: string[] = [];

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(ViewContainerRef) viewContainerRef,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        private processService: NxProcessService,
        private applyService: NxApplyService,
        @Inject(LOCALE_ID) public locale: string,
        private uriService: NxUriService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
        this.viewContainerRef = viewContainerRef;
        this.loading = true;

        this.modes = [
            { name: this.LANG.storage.modes.main(), value: 'modeMain' },
            { name: this.LANG.storage.modes.backup(), value: 'modeBackup' },
            { name: 'horizontal', value: '' },
            { name: this.LANG.storage.modes.notInUse(), value: 'modeNotInUse' }
        ];
    }

    ngOnInit() {
        this.storageEmit.emit();
        this.calcDDWidth();
        this.init();
    }

    ngOnChanges(changes) {
        if (!changes.serverId.firstChange) {
            this.loading = true;
            this.storageEmit.emit();
            this.triggerUpdate$.next('update');
        }
    }

    init = () => {
        this.loading = true;

        if (this.system.currentServerNotBusy && this.system.servers?.length && this.serverId) {
            this.storageSubscription = combineLatest([
                this.refreshStorages$,
                this.system.updateOrGetSystemStorage({ serverId: this.serverId }),
                this.refreshStorages$.pipe(switchMap(() => this.system.getServerStats(this.serverId)))
            ]).pipe(map(results => ({ storage: results[0], storeInfo: results[1].reply?.storages || [], usage: results[2] })))
                .subscribe(results => {
                    if (results.storage.name === 'TimeoutError') {
                        console.error(results.storage.message);
                        this.loading = false;
                        return;
                    }

                    const storage = results.storage || [];

                    results.storeInfo.forEach(({ storageId, url, ...storeInfo }) => {
                        const noStore = !storage.find(({ id }) => id === storageId);
                        if (noStore) {
                            storage.push({
                                ...storeInfo,
                                status        : STORAGE_STATUS.RESERVED,
                                storageId     : storageId === '{00000000-0000-0000-0000-000000000000}' ? url : storageId,
                                storageStatus : 'removable',
                                url
                            });
                        }
                    });

                    storage.hasAction = false;
                    storage.freeSpace = results.storeInfo.reduce(
                        (total, { freeSpace, isBackup, isUsedForWriting }) => total + (!isBackup && isUsedForWriting ? parseInt(freeSpace) : 0),
                        0
                    );
                    storage.forEach((store, idx) => {
                        this.modeWatchers[store.id] = new Watcher(this.selectMode(store).value);
                        const storeInfo = results.storeInfo.find((info) => {
                            if (store.id === info.storageId) {
                                return info;
                            }
                        });

                        if (storeInfo) {
                            store = { ...storeInfo };
                        }
                        if (store.freeSpace) {
                            store.archiveSpace = results.usage.reply.storages[NxUtilsService.cleanId(store.storageId)]?.space?.mediaSpaceB || 0;
                            store.status = STORAGE_STATUS.IN_USE; // default
                            store.statusTooltip = '';

                            if (store.isOnline) {
                                if (
                                    store.storageStatus.includes('tooSmall') ||
                                    store.storageStatus.includes('removable') &&
                                    store.freeSpace < (storage.freeSpace / 6)
                                ) {
                                    store.status = STORAGE_STATUS.RESERVED;
                                    store.statusTooltip = this.LANG.storage.reservedTooSmallTooltip();
                                } else if (
                                    store.storageStatus.includes('system') &&
                                    store.freeSpace < (storage.freeSpace / 6)
                                ) {
                                    store.status = STORAGE_STATUS.RESERVED;
                                    store.statusTooltip = this.LANG.storage.reservedSystemTooltip();
                                }
                            } else {
                                store.status = STORAGE_STATUS.INACCESSIBLE;
                                storage.hasAction = true;
                            }
                        } else {
                            store.status = STORAGE_STATUS.INACCESSIBLE;
                            storage.hasAction = true;
                        }

                        if (store.status === STORAGE_STATUS.IN_USE && store.isUsedForWriting) {
                            store.isBackup ? this.backupStorageIds.push(store.storageId)
                                : this.mainStorageIds.push(store.storageId);
                        }
                        const storagesWithActions = [STORAGE_TYPES.NETWORK, STORAGE_TYPES.CLOUD];
                        if (store.status === STORAGE_STATUS.INACCESSIBLE || storagesWithActions.includes(store.storageType)) {
                            store.hasAction = true;
                            storage.hasAction = true;
                        }

                        storage[idx] = { ...store };
                    });

                    this.setupWatchers();
                    this.updateStorage(storage);
                    this.updateCustom();
                });
            this.triggerUpdateSubscription = this.triggerUpdate$.pipe(
                startWith('trigger'),
                switchMap(() => this.system.getStorages({ id: this.serverId })),
                tap(this.refreshStorages$)
            ).subscribe(() => {
                this.system.getStorages().subscribe(storages => {
                    this.systemHasBackupsOn = storages.reduce((hasBackup, { isBackup }) => hasBackup || isBackup, false);
                });
            });
            return this.refreshStorages$.toPromise();
        }
    }

    setupWatchers = () => {
        const modeWatchers = Object.entries(this.modeWatchers);
        const resetWatchers = () => {
            this.isBackupOn.reset();
            this.backupState = this.isBackupOn.originalValue;
            const storage = this.storage$.value;
            this.changedModes = [];
            modeWatchers.forEach(([id, watcher]) => {
                watcher.reset();
                const store = storage.find(({ storageId }) => storageId === id);
                if (!store) {
                    return;
                };
                store.isUsedForWriting = true;
                store.isBackup = false;
                switch (watcher.originalValue) {
                    case 'modeBackup':
                        store.isBackup = true;
                        break;

                    case 'modeNotInUse':
                        store.isUsedForWriting = false;
                        break;
                }
            });
            this.storage$.next(storage);
        };

        const saveSettings: Process = this.processService.createProcess(() => {
            return Promise.all([
                this.isBackupOn.originalValue !== this.isBackupOn.value
                    ? Promise.resolve()
                    : this.backupState
                        ? this.setDefaultBackupSettings()
                        : this.turnOffBackup(),
                this.handleModeUpdate()
            ]);
        });
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.isBackupOn, ...modeWatchers.map(([_, watcher]) => watcher)],
            saveSettings,
            resetWatchers
        );
    }

    async doesCurrentServerHaveDefaultSettings() {
        try {
            // check if backupNewCamerasBeDefault in system settings is true
            const res: any = await this.system.updateOrGetSystemSettings().toPromise();
            if (res) {
                const { settings } = res.reply;
                if (!settings.backupNewCamerasByDefault) return false;
            }

            // check if server.backupType === 'BackupRealTime'
            const server = this.system.servers.find(({ id }) => this.serverId === id);
            if (server && server.backupType !== 'BackupRealTime') return false;

            // check all cameras to see if backupType === 'CameraBackupDefault' || 'CameraBackupLowQuality'
            return this.system.cameras.every(camera => {
                return ['CameraBackupDefault', 'CameraBackupLowQuality'].includes(camera.backupType);
            });
        } catch (error) {
            console.error('error while retrieving data checking server for default backup settings', error);
        }
    }

    updateCustom = () => {
        return this.doesCurrentServerHaveDefaultSettings().then(hasDefault => {
            this.customSettings = !hasDefault && this.isBackupOn.originalValue;
        });
    }

    setDefaultBackupSettings = async() => {
        try {
            await this.system.updateOrGetBackupControl(this.serverId, 'start');
            await this.system.updateOrGetSystemSettings({
                backupNewCamerasByDefault: true, backupQualities: 'CameraBackupDefault'
            }).toPromise();
            await this.system.setServerUserSettings(this.serverId, { backupType: 'BackupRealTime' });
            await this.system.initSystemMediaServers();
            const cameraSettingsToSave = this.system.cameras.reduce((cameras, camera) => {
                if (camera.backupType !== 'CameraBackupDefault') {
                    let retries = 5;
                    const update = () => {
                        if (retries < 5) {
                            console.error(`save retry attempt ${5 - retries} for ${camera.id} camera `);
                        }
                        retries--;
                        return this.system.setCameraUserSettings(
                            this.serverId, camera.id,
                            { backupType: 'CameraBackupDefault' }
                        ).catch(() => retries ? update() : console.error('failed to save camera.id'));
                    };
                    cameras.push(update);
                }
                return cameras;
            }, [] as (() => Promise<ChangedIdReturned>)[]);
            await of(...cameraSettingsToSave).pipe(
                bufferCount(30),
                concatMap((saveSettings) => Promise.all(saveSettings.map(save => save())))
            ).toPromise();
            await this.system.update();
            this.customSettings = false;
            this.backupState = true;
            this.isBackupOn.originalValue = true;
            return Promise.resolve();
        } catch (error) {
            console.error('error while setting backup to default settings', error);
        }
    }

    turnOffBackup = async() => {
        await this.system.setServerUserSettings(this.serverId, { backupType: 'BackupManual' });
        const backupControlRes: any = await this.system.updateOrGetBackupControl(this.serverId);

        // backupControlRes?.reply in this case is bad - updateOrGetBackupControl is called if backupControlRes is undefined
        if (backupControlRes && backupControlRes.reply.state !== 'BackupState_None') {
            await this.system.updateOrGetBackupControl(this.serverId, 'stop');
        }
        this.backupState = false;
        this.isBackupOn.originalValue = false;
    }

    checkIfBackupEnabled(server: any) {
        return !(
            server.backupType === 'BackupManual' ||
            server.backupType === 'BackupSchedule' && server.backupDuration <= 0
        );
    }

    checkArchiveState = () => {
        return this.system.servers.reduce(
            (enabled, { id, backupType, backupDuration }) => enabled ||
                id === this.serverId &&
                backupType === 'BackupRealTime' ||
                (backupType === 'BackupSchedule' && backupDuration > 0),
            false);
    }

    updateStorage(storage) {
        this.onlineBackups = 0;
        this.onlineMains = 0;
        let totalBackups = 0;
        let totalMains = 0;
        let isUpdating = false;
        storage.forEach(({ isBackup, isUsedForWriting, status, updating, hasAction, storageType }) => {
            if (isUsedForWriting) {
                isBackup ? totalBackups++ : totalMains++;
                if (![STORAGE_STATUS.RESERVED, STORAGE_STATUS.INACCESSIBLE].includes(status)) {
                    isBackup ? status === 0 && this.onlineBackups++ : this.onlineMains++;
                }
            }

            if (updating) {
                isUpdating = true;
            };
            const hasActions = [STORAGE_TYPES.NETWORK, STORAGE_TYPES.CLOUD];
            hasAction = status === STORAGE_STATUS.INACCESSIBLE || hasActions.includes(storageType) || true;
        });

        if (this.onlineMains === 1) {
            const store = storage.find(({ isBackup, isUsedForWriting, status }) => {
                return isUsedForWriting && ![STORAGE_STATUS.RESERVED, STORAGE_STATUS.INACCESSIBLE].includes(status) && !isBackup;
            });
            store.mainOnly = true;
        }
        this.isBackupOn.originalValue = this.doesModeExist('modeBackup') && this.checkArchiveState();
        this.backupState = this.isBackupOn.originalValue;

        const sortByTypeAndUrl = (
            { storageType: aType, url: aUrl },
            { storageType: bType, url: bUrl }
        ) => {
            const { LOCAL, USB, NETWORK, SYSTEM_NETWORK, CLOUD } = STORAGE_TYPES;
            const typeOrder = [LOCAL, USB, SYSTEM_NETWORK, NETWORK, CLOUD];
            if (aType === bType) {
                return aUrl < bUrl ? -1 : 1;
            }
            return typeOrder.indexOf(aType) - typeOrder.indexOf(bType);
        };

        const sortedStorage = storage.sort(sortByTypeAndUrl);
        this.storage$.next(sortedStorage);
        this.backupLocations$.pipe(
            startWith(true),
            pairwise(),
            map(([prev, cur]) => !prev && cur)
        ).subscribe((toggled) => {
            this.loading = false;
            if (toggled && !this.systemHasBackupsOn) {
                this.backupState = true;
            }
            this.storageEmit.emit(sortedStorage || []);
        });
    }

    getIconSrc(store) {
        return `${this.CONFIG.icons.dir}${store.updating ? 'loading.svg' : `storage_${store.storageType}.svg`}`;
    }

    doesModeExist = (mode: 'modeBackup' | 'modeMain') => {
        return Object.values(this.modeWatchers).reduce((prev, { value }) => prev || value === mode, false);
    }

    modeReindexDisabled = (mode: 'modeBackup' | 'modeMain') => {
        const noStorages = !this.doesModeExist(mode);
        const noOnlineStorages = !(mode === 'modeBackup' ? this.onlineBackups : this.onlineMains);
        return noStorages || noOnlineStorages;
    }

    getModes(store) {
        const countMains = Object.values(this.modeWatchers).reduce((prev, { value }) => value === 'modeMain' ? prev + 1 : prev, 0);
        const isMain = this.modeWatchers[store.storageId].value === 'modeMain';
        const checkType = mode => !(store.storageType === 'local' && mode.value === 'modeNotInUse' || !mode.value);
        const checkDisabled = mode => ({ ...mode, disabled: isMain && mode.value !== 'modeMain' && countMains <= 1 });
        return this.modes.filter(checkType).map(checkDisabled);
    }

    checkArchiveWarning(store) {
        const { value, originalValue } = this.modeWatchers[store.id || store.storageId];
        return [value, originalValue].every(state => state === 'modeNotInUse') && store.archiveSpace;
    }

    selectMode(store) {
        if (!store.isUsedForWriting && !store.usedForWriting) {
            return this.modes[MODE.NOT_IN_USE];
        } else if (!store.isBackup) {
            return this.modes[MODE.MAIN];
        } else {
            return this.modes[MODE.BACKUP];
        }
    }

    updateFirstColumnSize({ width }) {
        this.dropdownOffset$.next(width);
    }

    handleScroll(event) {
        this.scrollOffset$.next(event.target.scrollLeft);
    }

    checkDisabled = store => store.status !== STORAGE_STATUS.IN_USE || store.updating || this.selectMode(store).value === 'modeNotInUse'

    changeMode(
        { isBackup, storageId: id, url, reservedSpace: spaceLimit, isUsedForWriting: usedForWriting, storageType },
        selected
    ) {
        const updateParams = {
            id, isBackup, url, spaceLimit, usedForWriting, parentId: this.serverId, storageType
        };
        const checkChanged = ({ value }, currentlyBackup = isBackup, currentlyUsed = usedForWriting) => {
            const useAsBackup = value === 'modeBackup';
            const useForWriting = value !== 'modeNotInUse';
            return currentlyBackup !== useAsBackup || currentlyUsed !== useForWriting;
        };
        if (checkChanged(selected)) {
            updateParams.isBackup = selected.value === 'modeBackup';
            updateParams.usedForWriting = selected.value !== 'modeNotInUse';
            this.modeWatchers[id].value = selected.value;
            this.changedModes = [...this.changedModes, id];
            this.storage$.pipe(first()).subscribe(storage => {
                const store = storage.find(({ storageId }) => storageId === id);
                store.isBackup = updateParams.isBackup;
                store.isUsedForWriting = updateParams.usedForWriting;
                this.updateStorage(storage);
            });
        }

        const hasArchive = id => !!this.storage$.value.find(({ storageId }) => id === storageId)?.archiveSpace;
        const showWarn = Object.entries(this.modeWatchers).some(([id, { changed, value }]) => value === 'modeNotInUse' && changed && hasArchive(id));
        this.applyService.setWarn(showWarn ? this.LANG.storage.stillHasArchivesPreWarning?.() : '');
    }

    handleModeUpdate = () => {
        let updatingStores = [];
        if (!this.changedModes.length) {
            return Promise.resolve();
        }
        const setUpdating = (updating?, toUpdate = this.changedModes) => {
            if (!updating) {
                updatingStores = updatingStores.filter(id => !toUpdate.includes(id));
                this.changedModes = this.changedModes.filter(id => !updatingStores.includes(id));
                const storagesWithUpdatedStatus = this.storage$.value.map(store => ({ ...store, updating: updatingStores.includes(store.storageId) }));
                this.updateStorage(storagesWithUpdatedStatus);
            } else {
                this.storage$.pipe(first()).subscribe(storage => {
                    const updatedStorage = storage.map((store) => {
                        if (toUpdate.includes(store.storageId)) {
                            store.updating = updating;
                            updatingStores.push(store.storageId);
                        }
                        return store;
                    });
                    this.updateStorage(updatedStorage);
                });
            }
        };
        setUpdating(true);
        const done$ = new Subject();

        // Static according saveStorages documentation /nx/vms/server/nx_vms_server_db/src/local_connection_factory.cpp
        const typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
        const toUpdateParams = ({ totalSpace, isBackup, reservedSpace: spaceLimit, isUsedForWriting: usedForWriting, url, storageType, storageId: id, addParams }) => ({
            addParams : totalSpace || addParams.space ? [{ name: 'space', value: `${totalSpace || addParams.space}` }] : [],
            parentId  : this.serverId,
            id,
            isBackup,
            spaceLimit,
            storageType,
            typeId,
            url,
            usedForWriting
        });
        this.system.updateOrGetSystemStorage(this.storage$.value.map(toUpdateParams)).subscribe(() => {
            interval(5000).pipe(takeUntil(done$)).subscribe(curInterval => {
                if (curInterval >= 6 || !this.changedModes.length) {
                    setUpdating(false, updatingStores);
                    this.triggerUpdate$.next('update');
                    done$.next('done');
                } else {
                    updatingStores.forEach((id) => {
                        const path = this.storage$.value.find(({ storageId }) => storageId === id).url;
                        this.system.getStorageStatus(
                            { path }
                        ).pipe(
                            takeUntil(done$)
                        ).subscribe(({ reply: { storage: { storageStatus, storageId } } }) => {
                            if (!storageStatus.includes('beingChecked')) {
                                setUpdating(false, [storageId]);
                                if (!updatingStores.length) {
                                    this.triggerUpdate$.next('update');
                                    done$.next('done');
                                }
                            }
                        });
                    });
                }
            });
        });
        return done$.toPromise();
    }

    calcDDWidth() {
        const modes: {
            [key: string]: string
        } = Object.entries(this.LANG.storage.modes).reduce((accum, [key, value]) => ({ ...accum, [key]: value() }), {});
        // Add max additional width here for each key of this.LANG.storage.modes
        const addWidth = {
            disabled : 36,
            reserved : 36,
            main     : 36,
            notInUse : 56
        };

        this.ddWidth = Object.entries(modes).reduce((width, current) => {
            const [key, currentText] = current;
            // calculate dd size ... for simplicity a span is used
            const dd = document.createElement('span');
            dd.style.visibility = 'hidden';
            dd.innerText = currentText;
            document.body.appendChild(dd);
            // add button's left and right padding and space for info icon
            const iconWidths = addWidth[key] || 16;
            const currentWidth = Math.round(
                dd.getBoundingClientRect().width + iconWidths
            );

            document.body.removeChild(dd);
            return Math.max(width, currentWidth);
        }, 0);
    }

    deleteStorage(storage) {
        this.dialogs.confirm(
            storage.url,
            this.LANG.storage.deleteExternalStorage(),
            this.LANG.dialogs.buttons.delete(),
            'btn-danger',
            this.LANG.dialogs.buttons.cancel()
        )
            .then((response) => {
                if (response === true) {
                    this.system
                        .removeStorage({ id: storage.storageId || storage.id }).toPromise()
                        .then((response) => {
                            if (response.id) {
                                this.triggerUpdate$.next('update');
                            }
                        }).catch(_ => {
                            this.toastService.notify(NxLanguageProviderService.translate(this.LANG.storage.failedRemove, { url: storage.url }), 'warning');
                        });
                }
            });
    }

    backupState$ = new BehaviorSubject(false)

    get backupState() {
        return this.backupState$.value;
    }

    set backupState(value) {
        this.backupState$.next(value);
        this.isBackupOn.value = value;
    }

    resetBackupToDefault() {
        return this.dialogs.resetBackupToDefaultSettings(this.system, this.setDefaultBackupSettings);
    }

    addExternalStorage() {
        return this.dialogs.addStorage(this.system, this.serverId, this.storage$.value, () => this.triggerUpdate$.next('update'));
    }

    reindexStorage(type: 'main' | 'backup') {
        if (type === 'main') {
            this.reindexingMainSubscription = this.reindexing(1, 'start');
        } else {
            this.reindexingBackupSubscription = this.reindexing(0, 'start');
        }
    }

    updateStorageStatus(type: number, status) {
        const storages = this.storage$.value;
        const ids = type ? this.mainStorageIds : this.backupStorageIds;
        storages.map(store => {
            if (ids.includes(store.storageId)) {
                store.status = status;
            }
            return store;
        });
        this.storage$.next(storages);
    }

    reindexing(type: number, action: string) {
        this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
        const options = {
            classname : this.CONFIG.toast.success,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        let message: string;
        return defer(() => this.system.rebuildArchive(this.serverId, type, action).pipe(
            map((res: any) => {
                if (res.reply && res.reply.state === 'RebuildState_None') {
                    type ? this.percentMainDone = 1 : this.percentBackupDone = 1;
                    return res;
                }

                if (res.reply && res.reply.totalProgress === 0) {
                    action = undefined;
                }
                type ? this.percentMainDone = res.reply.totalProgress
                    : this.percentBackupDone = res.reply.totalProgress;
                throw res;
            })
        ))
            .pipe(retryWhen(errors => errors.pipe(delay(1000))))
            .subscribe(
                (res: any) => {
                    if (res.reply.state === 'RebuildState_None') {
                        this[`percent${type ? 'Main' : 'Backup'}Done`] = 0;
                        message = this.LANG.storage.reindexingDone[`${type ? 'main' : 'backup'}Success`]();
                    }
                },
                err => {
                    console.error(err);
                    message = this.LANG.storage.reindexingDone[`${type ? 'main' : 'backup'}Failed`]();
                    options.classname = this.CONFIG.toast.warning;
                }
            )
            .add(() => {
                this.updateStorageStatus(type, STORAGE_STATUS.IN_USE);
                type ? this.reindexingMainSubscription.unsubscribe()
                    : this.reindexingBackupSubscription.unsubscribe();
                this[`reindexing${type ? 'Main' : 'Backup'}`] = false;
                this.toastService.show(message, options);
            });
    }

    cancelIndexing(type: 'main' | 'backup') {
        if (type === 'main') {
            this.percentMainDone = 0;
            this.system.rebuildArchive(this.serverId, 1, 'stop').toPromise();
            this.reindexingMainSubscription.unsubscribe();
        } else {
            this.percentBackupDone = 0;
            this.system.rebuildArchive(this.serverId, 0, 'stop').toPromise();
            this.reindexingBackupSubscription.unsubscribe();
        }
    }

    getStorageTypeTooltip(storageType: string) {
        return this.LANG.system.storageToolTips[storageType.toLowerCase()]();
    }

    get infoPath() {
        return this.uriService.getSystemSettingsRoute({
            systemId   : this.system.id,
            childRoute : ChildRoutes.HEALTH
        }) + 'storages';
    }

    get canSeeInfo() {
        return this.system.info.capabilities && this.system.info.capabilities.vms_metrics && this.system.canViewInfo();
    }
}
