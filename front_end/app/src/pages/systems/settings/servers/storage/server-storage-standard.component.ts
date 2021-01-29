import {
    Component, Inject, ViewContainerRef, LOCALE_ID, Input, OnInit, SimpleChanges
}                                       from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    combineLatest, BehaviorSubject, Subject, defer, of, timer
}                                       from 'rxjs';
import {
    map, takeUntil, delay, retryWhen, distinctUntilChanged, bufferCount, concatMap, filter, tap, switchMap, take, startWith
}                                       from 'rxjs/operators';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { Watcher, NxApplyService }   from '@services/apply.service';
import { NxDialogsService }          from '@services/../dialogs/dialogs.service';
import { NxToastService }            from '@services/../dialogs/toast.service';
import { NxSystem }                  from '@services/system.service';
import { LanguageI18NStaticTypes }   from '@services/../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '@services/nx-config';
import { ChildRoutes, NxUriService } from '@services/uri.service';
import { ChangedIdReturned }         from '@services/system-api.types';
import {
    LogLevel, NxLogger, NxUtilsService
}                                    from '@services/utils.service';
import {
    CurrentStorageState, MODE, STORAGE_TYPES
}                                    from '@services/system.service/system/storage-manager/current-storage-state';
import { STORAGE_STATUS, Storage }   from '@services/system.service/system/storage-manager/storage';
import { UpdateTriggers }            from '@services/system.service/system/storage-manager/storage-state';

enum MODE_INDEX {
    MAIN = 0,
    BACKUP = 1,
    NOT_IN_USE = 3
}

enum TARGET_STORAGE {
    BACKUP,
    MAIN
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

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    viewContainerRef: ViewContainerRef;
    storageTypes = STORAGE_TYPES;
    storageModes = MODE;
    saveSettings: Process;
    resetWatchers: () => any;

    canSeeDetailInfo: boolean;
    loading: boolean;
    waitingForStorages = true;
    reindexingMain = false;
    percentMainDone = 0;
    reindexingBackup = false;
    percentBackupDone = 0;
    changedModes: string[] = [];
    updatingModes: string[] = [];
    customSettings = false;
    systemHasBackupsOn = false;
    reindexingStorages: MODE[] = [];

    stopReindex$ = new Subject<TARGET_STORAGE>();
    currentStorageState: CurrentStorageState;
    dropdownOffset$ = new BehaviorSubject(0);
    scrollOffset$ = new BehaviorSubject(0);
    cancelPolling$ = new Subject<string>();

    dropdownOffsetCalc$ = combineLatest([
        this.dropdownOffset$.pipe(distinctUntilChanged()),
        this.scrollOffset$.pipe(distinctUntilChanged())
    ]).pipe(
        map(([offset, scroll]) => offset - scroll + 22) // margin offset
    )

    isBackupOn = new Watcher(false);
    modeWatchers: {[key: string]: Watcher<any>} = {};

    ddWidth: number;
    modes: any;
    STATUS = STORAGE_STATUS

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
        this.calcDDWidth();
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.serverId.currentValue !== changes.serverId.previousValue) {
            this.loading = true;
            this.waitingForStorages = true;
        }
    }

    init = () => {
        this.loading = true;
        this.waitingForStorages = true;
        this.canSeeDetailInfo = this.system.canViewInfo();
        this.system.storageManager.storageState$.pipe(untilDestroyed(this)).subscribe(async(state) => {
            const { analyticsLoaded, storageInfoLoaded, storageStatsLoaded, vmsSpaceLoaded } = state;
            const sources = [analyticsLoaded, storageInfoLoaded, storageStatsLoaded, vmsSpaceLoaded];
            if (sources.every(loaded => loaded)) {
                this.currentStorageState = state;
                this.currentStorageState.locations.forEach((store, idx) => {
                    const storageId = store.storageId;
                    const mode = this.selectMode(store)?.value || 'modeNotInUse';
                    if (!this.modeWatchers[this.normalizeId(storageId)]) {
                        this.modeWatchers[this.normalizeId(storageId)] = new Watcher(mode);
                    } else {
                        this.modeWatchers[this.normalizeId(storageId)].value = mode;
                    }
                });
                await this.system.storageManager.getBackupState(
                    this.serverId, !!this.currentStorageState.onlineBackups
                ).then(this.setupWatchers).catch(_ => this.setupWatchers());
                if (this.loading && this.currentStorageState.beingChecked) {
                    this.pollStats();
                }
                this.waitingForStorages = this.loading = false;
                if (this.currentStorageState.reindexing) {
                    this.currentStorageState.reindexing.forEach(mode => {
                        this.reindexing(TARGET_STORAGE[mode.toUpperCase()]);
                    });
                }
            }
        }, () => {
            this.waitingForStorages = false;
            this.waitingForStorages = false;
            this.currentStorageState = null;
            this.setupWatchers();
        });
    }

    pollStats = async(update = false) => {
        this.cancelPolling$.next('cancel previous');
        if (update) {
            await timer(1500).pipe(
                switchMap(_ => this.system.storageManager.update()),
                take(2)
            ).toPromise();
        }
        const started = Date.now();
        const triggerUpdate = () => this.system.storageManager.update(UpdateTriggers.STATS);
        const pollUpdater$ = new Subject<number>();
        pollUpdater$.pipe(
            tap(time => {
                if (started < (time - this.CONFIG.pollingTimeout)) {
                    this.changedModes = [];
                    this.updatingModes = [];
                    this.currentStorageState.locations = this.currentStorageState.locations.map((location) => {
                        if (location.storageStatus.includes(STORAGE_STATUS.BEING_CHECKED)) {
                            location.status = STORAGE_STATUS.INACCESSIBLE;
                            location.storageStatus = `${location.storageStatus.replace(STORAGE_STATUS.BEING_CHECKED, '')} | ${STORAGE_STATUS.INACCESSIBLE}`;
                        }
                        return location;
                    });
                    this.cancelPolling$.next('timeout');
                }
            }),
            startWith(0),
            delay(1500),
            switchMap(_ => {
                triggerUpdate();
                return this.system.storageManager.statsUpdated$.pipe(take(1));
            }),
            map(_ => {
                const state = this.system.storageManager.storageState;
                this.updatingModes = state.locations.filter(({ storageStatus }) => storageStatus.includes(STORAGE_STATUS.BEING_CHECKED)).map(({ storageId }) => storageId)
                for (const location of this.currentStorageState.locations) {
                    if (location.storageStatus.includes(STORAGE_STATUS.BEING_CHECKED) && !this.updatingModes.includes(location.storageId)) {
                        location.storageStatus = location.storageStatus.replace(STORAGE_STATUS.BEING_CHECKED, '');
                    }
                }
                if (this.updatingModes.length) {
                    pollUpdater$.next(Date.now());
                }
            }),
            takeUntil(this.cancelPolling$)
        ).subscribe();
    }

    setupWatchers = (backupInitialState?: { backup: boolean, custom: boolean }) => {
        this.customSettings = backupInitialState?.custom;
        const modeWatchers = Object.entries(this.modeWatchers);
        if (backupInitialState !== undefined) {
            this.isBackupOn.originalValue = this.backupState = backupInitialState?.backup;
        }
        this.resetWatchers = () => {
            this.isBackupOn.reset();
            this.backupState = this.isBackupOn.originalValue;
            const storage = this.currentStorageState.locations;
            this.changedModes = [];
            modeWatchers.forEach(([id, watcher]) => {
                watcher.reset();
                const store = storage.find(({ storageId }) => storageId === NxUtilsService.cleanId(id));
                if (!store) {
                    return;
                };
                store.usedForWriting = true;
                store.isBackup = false;
                switch (watcher.originalValue) {
                    case 'modeBackup':
                        store.isBackup = true;
                        break;

                    case 'modeNotInUse':
                        store.usedForWriting = false;
                        break;
                }
            });
        };
        if (!this.saveSettings) {
            this.saveSettings = this.processService.createProcess(() => {
                let backupSaveState: 'StopFail' | 'StartFail';
                return Promise.all([
                    this.isBackupOn.originalValue === this.backupState
                        ? Promise.resolve()
                        : this.backupState
                            ? this.setDefaultBackupSettings().catch(err => {
                                console.error(err);
                                backupSaveState = 'StartFail';
                            })
                            : this.turnOffBackup().catch(err => {
                                console.error(err);
                                backupSaveState = 'StopFail';
                            }),
                    this.handleModeUpdate()
                ]).then(res => {
                    this.pollStats(true);
                    if (backupSaveState) {
                        const backup = backupSaveState === 'StartFail';
                        this.isBackupOn.originalValue = this.backupState = !backup;
                        this.isBackupOn.value = backup;
                    }
                    return res;
                });
            });
            this.applyService.addWatchersAndFunctionsFromChild(
                [this.isBackupOn, ...modeWatchers.map(([_, watcher]) => watcher)],
                this.saveSettings,
                this.resetWatchers
            );
        }
    }

    setDefaultBackupSettings = async() => {
        await this.system.storageManager.updateOrGetBackupControl(this.serverId, 'start');
        await this.system.updateOrGetSystemSettings({
            backupNewCamerasByDefault: true, backupQualities: 'CameraBackupLowQuality'
        }).toPromise();
        await this.system.setServerUserSettings(this.serverId, { backupType: 'BackupRealTime' });
        await this.system.serverManager.initSystemMediaServers();
        const cameraSettingsToSave = this.system.cameras.reduce((cameras, camera) => {
            if (!['CameraBackupLowQuality', 'CameraBackupDefault'].includes(camera.backupType)) {
                let retries = 5;
                const update = () => {
                    if (retries < 5) {
                        console.error(`save retry attempt ${5 - retries} for ${camera.id} camera `);
                    }
                    retries--;
                    return this.system.setCameraUserSettings(
                        this.serverId, camera.id,
                        { backupType: 'CameraBackupLowQuality' }
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
        this.backupState = this.isBackupOn.value = this.isBackupOn.originalValue = true;
        return Promise.resolve();
    }

    turnOffBackup = async() => {
        await this.system.serverManager.setServerUserSettings(this.serverId, { backupType: 'BackupManual' });
        const backupControlRes: any = await this.system.storageManager.updateOrGetBackupControl(this.serverId);

        const state = backupControlRes && backupControlRes.reply?.state;
        // backupControlRes?.reply in this case is bad - updateOrGetBackupControl is called if backupControlRes is undefined
        if (state !== 'BackupState_None') {
            await this.system.storageManager.updateOrGetBackupControl(this.serverId, 'stop');
        }
        if (state) {
            this.backupState = this.isBackupOn.value = this.isBackupOn.originalValue = false;
        }
    }

    normalizeId = (id) => `{${NxUtilsService.cleanId(id || '')}}`

    cleanUrl = NxUtilsService.cleanSmbUrl

    getIconSrc(store) {
        return `${this.CONFIG.icons.dir}${store.updating || this.updatingModes.includes(store.storageId) ? 'loading.svg' : `storage_${store.storageType}.svg`}`;
    }

    doesModeExist = (mode: MODE) => {
        const watcherMode = `mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
        return Object.values(this.modeWatchers).reduce((prev, { value }) => prev || value === watcherMode, false);
    }

    modeReindexDisabled = (reindexMode: MODE) => {
        const noStorages = !this.doesModeExist(reindexMode);
        const onlineStorages = this.currentStorageState.locations.filter(({ isOnline, mode }) => isOnline && reindexMode === mode).length;
        return noStorages || !onlineStorages;
    }

    getModes(store: Storage) {
        const checkDisabled = mode => ({ ...mode, disabled: mode.value !== 'modeMain' && store.mainOnly });
        return this.modes.map(checkDisabled);
    }

    checkArchiveWarning({ storageId, vmsSpace }: Storage) {
        const { value, originalValue } = this.modeWatchers[this.normalizeId(storageId)];
        return [value, originalValue].every(state => state === 'modeNotInUse') && vmsSpace;
    }

    selectMode(store) {
        if (!store.isUsedForWriting && !store.usedForWriting) {
            return this.modes[MODE_INDEX.NOT_IN_USE];
        } else if (!store.isBackup) {
            return this.modes[MODE_INDEX.MAIN];
        } else {
            return this.modes[MODE_INDEX.BACKUP];
        }
    }

    updateFirstColumnSize({ width }) {
        this.dropdownOffset$.next(width);
    }

    handleScroll(event) {
        this.scrollOffset$.next(event.target.scrollLeft);
    }

    checkDisabled = (store: Storage) => store.status !== STORAGE_STATUS.REINDEXING &&
        store.status !== STORAGE_STATUS.IN_USE ||
        this.updatingModes.includes(store.storageId) ||
        this.selectMode(store).value === 'modeNotInUse'

    changeMode(
        { isBackup, storageId, id: _id, url, reservedSpace: spaceLimit, isUsedForWriting: usedForWriting, storageType },
        selected
    ) {
        const id = this.normalizeId(storageId || _id);
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
            this.modeWatchers[this.normalizeId(id)].value = selected.value;
            this.changedModes = [...this.changedModes, id];
            const store = this.currentStorageState.locations.find(({ storageId }) => this.normalizeId(storageId) === this.normalizeId(id));
            store.isBackup = updateParams.isBackup;
            store.usedForWriting = updateParams.usedForWriting;
        }

        const hasArchive = id => !!this.currentStorageState.locations.find(({ storageId }) => id === storageId)?.vmsSpace;
        const showWarn = Object.entries(this.modeWatchers).some(([id, { changed, value }]) => value === 'modeNotInUse' && changed && hasArchive(id));
        this.applyService.setWarn(showWarn ? this.LANG.storage.stillHasArchivesPreWarning?.() : '');
    }

    handleModeUpdate = () => {
        console.log('ran');
        const updating = [];
        for (const id in this.modeWatchers) {
            const store = this.currentStorageState.locations.find(({ storageId }) => storageId === NxUtilsService.cleanId(id));
            const currentMode = `mode${store?.mode.charAt(0).toUpperCase() + store?.mode.slice(1)}`;
            if (store && this.modeWatchers[id].originalValue !== currentMode) {
                store.storageStatus += ` | ${STORAGE_STATUS.BEING_CHECKED}`;
                this.modeWatchers[id].originalValue = currentMode;
                if (!store.storageId.startsWith('/') && store.status !== STORAGE_STATUS.RESERVED) {
                    // Excludes non changeable storage
                    updating.push(store.storageId);
                }
            }
        }
        this.updatingModes = [...this.updatingModes, ...updating];
        return this.currentStorageState.saveStorages().toPromise().catch(err => console.error(err));
    };

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
            this.cleanUrl(storage.url),
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
                                this.currentStorageState.locations = this.currentStorageState.locations.filter(({ storageId }) => storageId !== NxUtilsService.cleanId(response.id));
                                this.toastService.notify(NxLanguageProviderService.translate(this.LANG.storage.storageDeleted, { url: this.cleanUrl(storage.url) }), 'success');
                            } else {
                                throw new Error('failed to remove storage');
                            }
                        }).catch(_ => {
                            this.toastService.notify(NxLanguageProviderService.translate(this.LANG.storage.failedRemove, { url: this.cleanUrl(storage.url) }), 'danger');
                        });
                }
            }).finally(() => {
                this.system.storageManager.update();
                this.pollStats(true);
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

    get infoPath() {
        return this.uriService.getSystemSettingsRoute({
            systemId   : this.system.id,
            childRoute : ChildRoutes.HEALTH
        }) + 'storages';
    }

    resetBackupToDefault() {
        return this.dialogs.resetBackupToDefaultSettings(this.system, this.setDefaultBackupSettings);
    }

    addExternalStorage() {
        return this.dialogs.addStorage(
            this.system,
            this.serverId,
            this.currentStorageState.locations,
            this.system.storageManager.update
        ).finally(() => this.pollStats(true));
    }

    reindexStorage(type: MODE) {
        this.reindexingStorages = [...this.reindexingStorages, type];
        return this.reindexing(TARGET_STORAGE[type.toUpperCase()], 'start');
    }

    updateStorageStatus(type: number, status) {
        const mode = type ? MODE.MAIN : MODE.BACKUP;
        if (status === STORAGE_STATUS.REINDEXING) {
            this.reindexingStorages = [...new Set<MODE>([...this.reindexingStorages, mode])];
        }
    }

    reindexing(type: TARGET_STORAGE, action?: string) {
        const onlyCheck = !action;
        if (action) {
            this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
        }
        const options = {
            classname : this.CONFIG.toast.success,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        let message: string;
        return defer(() => this.system.storageManager.rebuildArchive(this.serverId, type, action).pipe(
            map((res: any) => {
                if (res.reply && res.reply.state === 'RebuildState_None') {
                    type ? this.percentMainDone = 1 : this.percentBackupDone = 1;
                    return res;
                }
                if (res.reply && res.reply.totalProgress === 0) {
                    action = undefined;
                }
                if (type) {
                    this.percentMainDone = res.reply.totalProgress;
                    this.reindexingMain = true;
                    this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                } else {
                    this.percentBackupDone = res.reply.totalProgress;
                    this.reindexingBackup = true;
                    this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                }
                throw res;
            })
        )).pipe(
            retryWhen(errors => errors.pipe(delay(1000))),
            takeUntil(this.stopReindex$.pipe(filter(stopping => stopping === type))),
            untilDestroyed(this)
        ).subscribe(
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
        ).add(() => {
            this.updateStorageStatus(type, STORAGE_STATUS.IN_USE);
            this.cancelIndexing(type ? 'main' : 'backup');
            this[`reindexing${type ? 'Main' : 'Backup'}`] = false;
            if (message && !onlyCheck) {
                this.toastService.show(message, options);
            }
        });
    }

    cancelIndexing(type: 'main' | 'backup') {
        const target = TARGET_STORAGE[type.toUpperCase()];
        this[type === 'main' ? 'percentMainDone' : 'percentBackupDone'] = 0;
        this.system.storageManager.rebuildArchive(this.serverId, target, 'stop').toPromise();
        this.reindexingStorages = this.reindexingStorages.filter(mode => mode !== type);
        this.stopReindex$.next(target);
    }

    getStorageTypeTooltip(storageType: string) {
        return this.LANG.system.storageToolTips[storageType.toLowerCase()]();
    }

    getStatusTooltip(status: string) {
        return this.LANG.storage[status]();
    }
}
