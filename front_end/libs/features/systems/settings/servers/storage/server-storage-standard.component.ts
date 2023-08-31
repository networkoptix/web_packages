import { DOCUMENT } from '@angular/common';
import { Component, Inject, ViewContainerRef, LOCALE_ID, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    combineLatest,
    BehaviorSubject,
    Subject,
    defer,
    of,
    timer,
    Observable,
    firstValueFrom,
} from 'rxjs';
import {
    map,
    takeUntil,
    delay,
    retryWhen,
    distinctUntilChanged,
    bufferCount,
    concatMap,
    filter,
    tap,
    switchMap,
    take,
    startWith,
} from 'rxjs/operators';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { pollingTimeout } from '@pages/static-variables-features';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ChangedIdReturned, RebuildArchiveResponse } from '@services/system-api.types';
import {
    STORAGE_STATUS,
    Storage,
    STORAGE_TYPES,
    CurrentStorageState,
    MODE,
} from '@services/system.service/storage-manager/storage';
import { UpdateTriggers } from '@services/system.service/storage-manager/storage-state';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { icons } from '@static-variables';
import { cleanId, cleanSmbUrl } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

enum MODE_INDEX {
    MAIN = 0,
    BACKUP = 1,
    NOT_IN_USE = 3,
}

enum TARGET_STORAGE {
    BACKUP,
    MAIN,
}

type Mode = DropdownItem<string>;

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-server-storage-component',
    templateUrl: 'server-storage-standard.component.html',
    styleUrls: ['server-storage-standard.component.scss'],
})
export class NxSystemStorageComponent implements OnInit {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG = staticLang;
    viewContainerRef: ViewContainerRef;
    storageTypes = STORAGE_TYPES;
    storageModes = MODE;
    saveSettings: Process;
    resetWatchers: () => void;

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
    forceShowBackupBlock = false;
    reindexingStorages: MODE[] = [];
    previouslyReserved = new Set<string>();
    beingUpdated: string[] = [];
    cachedSizes: Record<string, { vms: number; total: number }> = {};

    stopReindex$ = new Subject<TARGET_STORAGE>();
    currentStorageState: CurrentStorageState;
    dropdownOffset$ = new BehaviorSubject(0);
    scrollOffset$ = new BehaviorSubject(0);
    cancelPolling$ = new Subject<string>();
    icons = icons;

    dropdownOffsetCalc$ = combineLatest([
        this.dropdownOffset$.pipe(distinctUntilChanged()),
        this.scrollOffset$.pipe(distinctUntilChanged()),
    ]).pipe(
        map(([offset, scroll]) => offset - scroll + 22), // margin offset
    );

    isBackupOn: Watcher<boolean>;
    modeWatchers: Record<string, Watcher<string, NxSystemStorageComponent>> = {};

    ddWidth: number;
    modes: Mode[];
    STATUS = STORAGE_STATUS;

    cleanSmbUrl = cleanSmbUrl;

    constructor(
        @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        private processService: NxProcessService,
        private applyService: NxApplyService,
        @Inject(LOCALE_ID) public locale: string,
        private uriService: NxUriService,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.viewContainerRef = viewContainerRef;
        this.loading = true;

        this.modes = [
            { name: this.LANG.storage.modes.main, value: 'modeMain' },
            { name: this.LANG.storage.modes.backup, value: 'modeBackup' },
            { name: 'horizontal', value: '' },
            { name: this.LANG.storage.modes.notInUse, value: 'modeNotUsed' },
        ];
    }

    ngOnInit(): void {
        this.calcDDWidth();
        this.init();
    }

    ngOnChanges(changes: NgChanges<NxSystemStorageComponent>): void {
        const previousServerId = changes.serverId.previousValue;
        if (changes.serverId.currentValue !== previousServerId) {
            const previousServer = this.system.serverManager.servers.find(
                server => server.id === previousServerId,
            );
            if (previousServer?.status === 'Offline') {
                this.system.storageManager.reinitializeForOfflineToOnlineServer();
                this.init();
            }
            this.loading = true;
            this.currentStorageState = null;
            this.waitingForStorages = true;
        }
    }

    init = (): void => {
        this.loading = true;
        this.waitingForStorages = true;
        this.previouslyReserved.clear();
        this.canSeeDetailInfo = this.system.permissionManager.isAdmin();
        this.system.storageManager.serverId$.pipe(untilDestroyed(this)).subscribe(() => {
            this.saveSettings = null;
        });
        this.system.storageManager.storageState$.pipe(untilDestroyed(this)).subscribe(
            async state => {
                const { analyticsLoaded, storageInfoLoaded, storageStatsLoaded, vmsSpaceLoaded } =
                    state;
                const sources = [
                    analyticsLoaded,
                    storageInfoLoaded,
                    storageStatsLoaded,
                    vmsSpaceLoaded,
                ];
                if (
                    sources.every(loaded => loaded) &&
                    !this.updatingModes.length &&
                    !this.applyService.locked
                ) {
                    if (
                        (!state.locations.length && this.currentStorageState?.locations.length) ||
                        this.applyService.locked
                    ) {
                        return;
                    }
                    this.currentStorageState = state;
                    this.currentStorageState.locations.forEach(store => {
                        const reservedOrBeingChecked = [
                            STORAGE_STATUS.RESERVED,
                            STORAGE_STATUS.BEING_CHECKED,
                        ].includes(store.status);
                        const storageId = store.storageId;
                        this.cachedSizes[storageId] ||= { vms: 0, total: 0 };
                        this.cachedSizes[storageId].vms ||= store.vmsSpace;
                        this.cachedSizes[storageId].total ||= store.totalSpace;
                        const mode = this.selectMode(store)?.value || 'modeNotUsed';
                        if (!this.modeWatchers[this.normalizeId(storageId)]) {
                            this.modeWatchers[this.normalizeId(storageId)] = new Watcher(
                                mode,
                                this,
                            );
                            this.applyService.addWatchers(
                                [this.modeWatchers[this.normalizeId(storageId)]],
                                this,
                            );
                        } else {
                            if (reservedOrBeingChecked || this.previouslyReserved.has(storageId)) {
                                this.modeWatchers[this.normalizeId(storageId)].originalValue = mode;
                            }
                            const watcher = this.modeWatchers[this.normalizeId(storageId)];
                            watcher.originalValue = mode;
                            watcher.value = mode;
                        }
                        if (reservedOrBeingChecked) {
                            this.previouslyReserved.add(storageId);
                        } else if (this.previouslyReserved.has(storageId)) {
                            this.previouslyReserved.delete(storageId);
                        }
                    });
                    const backupState = await this.system.storageManager
                        .getBackupState(this.serverId)
                        .catch(err => {
                            console.error(err);
                            return { backup: false, custom: false };
                        });
                    this.customSettings = backupState.custom;
                    this.isBackupOn = new Watcher(backupState.backup);
                    this.backupState = backupState.backup;
                    if (this.loading && this.currentStorageState?.beingChecked) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        this.pollStats();
                    }
                    this.setupWatchers();
                    this.loading = false;
                    this.waitingForStorages = false;
                    if (this.currentStorageState?.reindexing) {
                        this.currentStorageState.reindexing.forEach(mode => {
                            this.reindexing(TARGET_STORAGE[mode.toUpperCase()]);
                        });
                    }
                }
            },
            () => {
                this.waitingForStorages = false;
                this.currentStorageState = null;
                this.setupWatchers();
            },
        );
    };

    pollStats = async (update: boolean = false): Promise<void> => {
        this.cancelPolling$.next('cancel previous');
        if (update) {
            await timer(1500)
                .pipe(
                    switchMap(_ => this.system.storageManager.update()),
                    take(2),
                )
                .toPromise();
        }
        const started = Date.now();
        const triggerUpdate = (type: UpdateTriggers): Observable<CurrentStorageState> =>
            this.system.storageManager.update(type);
        const pollUpdater$ = new Subject<number>();
        pollUpdater$
            .pipe(
                tap(time => {
                    if (started < time - pollingTimeout) {
                        this.changedModes = [];
                        this.updatingModes = [];
                        triggerUpdate(UpdateTriggers.STATS)
                            .pipe(untilDestroyed(this))
                            .subscribe(state => {
                                this.currentStorageState.locations = (state?.locations || []).map(
                                    location => {
                                        if (
                                            location.storageStatus.includes(
                                                STORAGE_STATUS.BEING_CHECKED,
                                            )
                                        ) {
                                            location.status = STORAGE_STATUS.INACCESSIBLE;
                                            location.storageStatus = `${location.storageStatus.replace(
                                                STORAGE_STATUS.BEING_CHECKED,
                                                '',
                                            )} | ${STORAGE_STATUS.INACCESSIBLE}`;
                                        }
                                        return location;
                                    },
                                );
                            });
                        this.forceShowBackupBlock = false;
                        this.cancelPolling$.next('timeout');
                    }
                }),
                startWith(0),
                delay(1500),
                switchMap(_ => {
                    triggerUpdate(UpdateTriggers.STATS);
                    triggerUpdate(UpdateTriggers.INFO);
                    return this.system.storageManager.statsUpdated$.pipe(take(1));
                }),
                map(_ => {
                    const state = this.system.storageManager.storageState;
                    this.updatingModes = (state?.locations || [])
                        .filter(({ storageStatus }) =>
                            storageStatus.includes(STORAGE_STATUS.BEING_CHECKED),
                        )
                        .map(({ storageId }) => storageId);
                    for (const location of this.currentStorageState?.locations || []) {
                        if (
                            location.storageStatus.includes(STORAGE_STATUS.BEING_CHECKED) &&
                            !this.updatingModes.includes(location.storageId)
                        ) {
                            location.storageStatus = location.storageStatus.replace(
                                STORAGE_STATUS.BEING_CHECKED,
                                '',
                            );
                        }
                    }
                    if (this.updatingModes.length) {
                        pollUpdater$.next(Date.now());
                    } else {
                        this.forceShowBackupBlock = false;
                    }
                }),
                takeUntil(this.cancelPolling$),
            )
            .subscribe();
    };

    setupWatchers = (): void => {
        const modeWatchers = Object.entries(this.modeWatchers);
        this.backupState = this.isBackupOn.originalValue;
        this.resetWatchers = (): void => {
            this.isBackupOn.reset();
            this.backupState = this.isBackupOn.originalValue;
            const storage = this.currentStorageState?.locations || [];
            this.changedModes = [];
            modeWatchers.forEach(([id, watcher]) => {
                watcher.reset();
                const store = storage.find(({ storageId }) => storageId === cleanId(id));
                if (!store) {
                    return;
                }
                store.usedForWriting = true;
                store.isBackup = false;
                switch (watcher.originalValue) {
                    case 'modeBackup':
                        store.isBackup = true;
                        break;

                    case 'modeNotUsed':
                        store.usedForWriting = false;
                        break;
                }
            });
        };
        const handleFailedBackupChange = (backupSaveState: string): void => {
            const backup = backupSaveState === 'StartFail';
            this.backupState = !backup;
            this.isBackupOn.originalValue = !backup;
            this.isBackupOn.value = backup;
        };
        const updateBackup = (): Promise<void | string> => {
            if (this.system.useRest) {
                return Promise.resolve();
                // Skip updating any settings for 4.3 since the backup implementation is pending for that version
            } else if (this.isBackupOn.originalValue === this.backupState) {
                return Promise.resolve('backupToggleNotUpdated');
            } else if (this.backupState) {
                this.setDefaultBackupSettings().catch(err => {
                    console.error(err);
                    handleFailedBackupChange('StartFail');
                });
            } else {
                this.turnOffBackup().catch(err => {
                    console.error(err);
                    handleFailedBackupChange('StopFail');
                });
            }
        };

        if (modeWatchers.length) {
            this.saveSettings = this.processService.createProcess(
                () => {
                    return Promise.all([updateBackup(), this.handleModeUpdate()]).then(res => {
                        if (res[1] !== 'storageModesNotUpdated') {
                            this.pollStats();
                        }
                        return res;
                    });
                },
                { name: 'saveSettingsServerStorage' },
            );
            this.applyService.addWatchersAndFunctionsFromChild(
                [this.isBackupOn, ...Object.values(this.modeWatchers)],
                this.saveSettings,
                this.resetWatchers,
                null,
                this,
            );
        } else {
            this.applyService.addWatchersAndFunctionsFromChild(
                [this.isBackupOn],
                this.processService.createProcess(updateBackup, { name: 'updateBackup' }),
                () => {
                    this.isBackupOn.reset();
                    this.backupState = this.isBackupOn.originalValue;
                },
            );
        }
    };

    setDefaultBackupSettings = async (): Promise<void> => {
        if (this.system.useRest) {
            const cameras: Record<string, string>[] = this.system.cameraManager.cameras.map(
                ({ id }) => ({
                    id,
                    backupPolicy: 'CameraBackupDefault',
                    backupQuality: 'CameraBackupDefault',
                    backupType: 'CameraBackupDefault',
                    backupContentType: 'archive',
                }),
            );
            await Promise.all(
                cameras.map(({ id, ...changes }) =>
                    this.system.serverManager.setCameraUserSettings(this.serverId, id, changes),
                ),
            );
        }
        await this.system.storageManager.updateOrGetBackupControl(this.serverId, 'start');
        if (!this.system.useRest) {
            await firstValueFrom(
                this.system.updateOrGetSystemSettings({
                    backupNewCamerasByDefault: true,
                    backupQualities: 'CameraBackupLowQuality',
                }),
            );
            await Promise.all(
                this.system.serverManager.servers.map(({ id, backupType }) => {
                    return backupType !== 'BackupManual' || id === this.serverId
                        ? this.system.serverManager.setServerUserSettings(id, {
                              backupType: 'BackupRealTime',
                          })
                        : null;
                }),
            );
            // await this.system.serverManager.initSystemMediaServers();
            const cameraSettingsToSave = this.system.cameraManager.cameras.reduce(
                (cameras, camera) => {
                    if (
                        !['CameraBackupLowQuality', 'CameraBackupDefault'].includes(
                            camera.backupQuality,
                        )
                    ) {
                        let retries = 5;
                        const update = (): Promise<ChangedIdReturned | void> => {
                            if (retries < 5) {
                                console.error(
                                    `save retry attempt ${5 - retries} for ${camera.id} camera `,
                                );
                            }
                            retries--;
                            return this.system.serverManager
                                .setCameraUserSettings(this.serverId, camera.id, {
                                    backupType: 'CameraBackupLowQuality',
                                })
                                .catch(() =>
                                    retries ? update() : console.error('failed to save camera.id'),
                                );
                        };
                        cameras.push(update);
                    }
                    return cameras;
                },
                [] as (() => Promise<ChangedIdReturned | void>)[],
            );
            if (cameraSettingsToSave.length) {
                await of(...cameraSettingsToSave)
                    .pipe(
                        bufferCount(30),
                        concatMap(saveSettings => Promise.all(saveSettings.map(save => save()))),
                    )
                    .toPromise();
            }
            await this.system.update();
        }
        this.customSettings = false;
        this.isBackupOn.originalValue = true;
        this.isBackupOn.value = true;
        this.backupState = true;
        return Promise.resolve();
    };

    turnOffBackup = async (retries = 5): Promise<void> => {
        this.isBackupOn.originalValue = !retries;
        this.isBackupOn.value = !retries;
        this.backupState = !retries;
        await this.system.serverManager.setServerUserSettings(this.serverId, {
            backupType: 'BackupManual',
        });
        if (this.system.useRest) {
            const cameras: Record<string, string>[] = this.system.cameraManager.cameras.map(
                ({ id }) => ({ id, backupPolicy: 'off' }),
            );
            await Promise.all(
                cameras.map(({ id, ...changes }) =>
                    this.system.serverManager.setCameraUserSettings(this.serverId, id, changes),
                ),
            );
        }
        const backupControlRes = await this.system.storageManager.updateOrGetBackupControl(
            this.serverId,
            'stop',
        );
        const state = backupControlRes && backupControlRes.reply?.state;
        // backupControlRes?.reply in this case is bad - updateOrGetBackupControl is called if backupControlRes is undefined
        if (!this.system.useRest && state !== 'BackupState_None') {
            await this.system.storageManager.updateOrGetBackupControl(this.serverId, 'stop');
            return this.turnOffBackup(retries - 1);
        } else {
            this.isBackupOn.originalValue = false;
            this.isBackupOn.value = false;
            this.backupState = false;
        }
    };

    normalizeId = (id: unknown): string => `{${cleanId(id || '')}}`;

    getIconSrc(store: Storage): string {
        const svgName =
            this.updatingModes.includes(store.storageId) || !store.storageType
                ? 'loading.svg'
                : `storage_${store.storageType}.svg`;
        return `${this.icons.dirTextButtons}${svgName}`;
    }

    doesModeExist = (mode: MODE): boolean => {
        const watcherMode = `mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
        if (
            watcherMode === 'modeBackup' &&
            this.currentStorageState.locations.some(
                ({ isBackup, status }) =>
                    isBackup &&
                    [STORAGE_STATUS.BEING_CHECKED, STORAGE_STATUS.INACCESSIBLE].includes(status),
            )
        ) {
            return true;
        }
        return Object.values(this.modeWatchers).some(mw => mw.value === watcherMode);
    };

    modeReindexDisabled = (reindexMode: MODE): boolean => {
        const noStorages = !this.doesModeExist(reindexMode);
        const onlineStorages = this.currentStorageState.locations.filter(
            ({ isOnline, mode, status, storageId }) =>
                isOnline &&
                reindexMode === mode &&
                ![STORAGE_STATUS.BEING_CHECKED, STORAGE_STATUS.INACCESSIBLE].includes(status) &&
                !this.updatingModes.includes(storageId),
        ).length;
        return noStorages || !onlineStorages;
    };

    getModes(store: Storage): Mode[] {
        return this.modes.map(mode => ({
            ...mode,
            disabled: mode.value !== 'modeMain' && store.mainOnly,
        }));
    }

    checkArchiveWarning({ storageId, vmsSpace }: Storage): boolean {
        const { value, originalValue } = this.modeWatchers[this.normalizeId(storageId)];
        return [value, originalValue].every(state => state === 'modeNotUsed') && !!vmsSpace;
    }

    selectMode(store: Storage): Mode {
        const watcher = this.modeWatchers[`{${store.storageId}}`];
        if (watcher?.changed) {
            return this.modes.find(({ value }) => value === watcher.value);
        }
        switch (store.mode) {
            case MODE.NOT_IN_USE:
                return (
                    this.modes.find(({ value }) => value === watcher?.value) ||
                    this.modes[MODE_INDEX.NOT_IN_USE]
                );
            case MODE.MAIN:
                return this.modes[MODE_INDEX.MAIN];
            default:
                return this.modes[MODE_INDEX.BACKUP];
        }
    }

    updateFirstColumnSize({ width }: { width: number }): void {
        this.dropdownOffset$.next(width);
    }

    handleScroll(event: Event): void {
        this.scrollOffset$.next((event.target as HTMLFormElement).scrollLeft);
    }

    checkDisabled = (store: Storage): boolean =>
        (store.status !== STORAGE_STATUS.REINDEXING && store.status !== STORAGE_STATUS.IN_USE) ||
        this.updatingModes.includes(store.storageId) ||
        this.selectMode(store).value === 'modeNotUsed';

    changeMode(
        {
            isBackup,
            storageId,
            url,
            reservedSpace: spaceLimit,
            usedForWriting,
            storageType,
        }: Storage,
        selected: Mode,
    ): void {
        const id = this.normalizeId(storageId);
        const updateParams = {
            id,
            isBackup,
            url,
            spaceLimit,
            usedForWriting,
            parentId: this.serverId,
            storageType,
        };
        const checkChanged = (
            { value }: Mode,
            currentlyBackup: boolean = isBackup,
            currentlyUsed: boolean = usedForWriting,
        ): boolean => {
            const useAsBackup = value === 'modeBackup';
            const useForWriting = value !== 'modeNotUsed';
            return currentlyBackup !== useAsBackup || currentlyUsed !== useForWriting;
        };
        if (checkChanged(selected)) {
            updateParams.isBackup = selected.value === 'modeBackup';
            updateParams.usedForWriting = selected.value !== 'modeNotUsed';
            this.modeWatchers[this.normalizeId(id)].value = selected.value;
            this.changedModes = [...this.changedModes, id];
            const store = this.currentStorageState.locations.find(
                ({ storageId }) => this.normalizeId(storageId) === this.normalizeId(id),
            );
            store.usedForWriting = updateParams.usedForWriting;
            if (selected.value !== 'modeNotUsed') {
                store.isBackup = updateParams.isBackup;
                if (store.isBackup && store.currentStorageState.onlineBackups === 1) {
                    this.backupState = this.isBackupOn.originalValue;
                }
            }
        }

        const hasArchive = (id: string): boolean =>
            !!this.currentStorageState.locations.find(({ storageId }) => id === `{${storageId}}`)
                ?.vmsSpace;
        const showWarn = Object.entries(this.modeWatchers).some(
            ([id, { changed, value }]) => value === 'modeNotUsed' && changed && hasArchive(id),
        );
        this.applyService.setWarn(showWarn ? this.LANG.storage.stillHasArchivesPreWarning : '');
    }

    handleModeUpdate = async (): Promise<string> => {
        this.forceShowBackupBlock = false;
        const updating: string[] = [];
        for (const id in this.modeWatchers) {
            const store = this.currentStorageState.locations.find(
                ({ storageId }) => storageId === cleanId(id),
            );
            const currentMode = `mode${store?.mode.charAt(0).toUpperCase() + store?.mode.slice(1)}`;
            if (store && this.modeWatchers[id].originalValue !== currentMode) {
                store.storageStatus += ` | ${STORAGE_STATUS.BEING_CHECKED}`;
                this.modeWatchers[id].originalValue = currentMode;
                if (
                    (!store.storageId.startsWith('/') || store.storageType === 'usb') &&
                    store.status !== STORAGE_STATUS.RESERVED
                    // Excludes non changeable storage
                ) {
                    if (store.storageId.startsWith('/')) {
                        // Add new external storage
                        const updatedStore = await this.system.storageManager
                            .saveStorage({
                                parentId: this.serverId,
                                url: store.storageId,
                                storageType: 'usb',
                                usedForWriting: true,
                                isWritable: true,
                                isBackup: currentMode === 'modeBackup',
                            })
                            .toPromise();
                        updating.push(updatedStore.id);
                    } else {
                        updating.push(store.storageId);
                    }
                }
                this.forceShowBackupBlock ||= currentMode === 'modeBackup';
            }
        }
        this.beingUpdated = updating.filter(id => !this.updatingModes.includes(id));
        this.updatingModes = [...this.updatingModes, ...updating];
        return this.updatingModes.length
            ? this.currentStorageState
                  .saveStorages()
                  .toPromise()
                  .catch(err => console.error(err))
            : Promise.resolve('storageModesNotUpdated');
    };

    checkIfChanged(id: string): boolean {
        return this.beingUpdated.includes(id);
    }

    calcDDWidth(): void {
        const modes: Record<string, string> = Object.entries(this.LANG.storage.modes).reduce(
            (accum, [key, value]) => ({ ...accum, [key]: value }),
            {},
        );
        // Add max additional width here for each key of this.LANG.storage.modes
        const addWidth = {
            disabled: 36,
            reserved: 36,
            main: 36,
            notInUse: 56,
        };

        this.ddWidth = Object.entries(modes).reduce((width, current) => {
            const [key, currentText] = current;
            // calculate dd size ... for simplicity a span is used
            const dd = this.document.createElement('span');
            dd.style.visibility = 'hidden';
            dd.innerText = currentText;
            this.document.body.appendChild(dd);
            // add button's left and right padding and space for info icon
            const iconWidths = addWidth[key] || 16;
            const currentWidth = Math.round(dd.getBoundingClientRect().width + iconWidths);

            this.document.body.removeChild(dd);
            return Math.max(width, currentWidth);
        }, 0);
    }

    deleteStorage(storage: Storage): void {
        this.dialogs
            .confirm({
                title: this.LANG.storage.deleteExternalStorage,
                message: cleanSmbUrl(storage.url),
                footer: {
                    buttonClass: 'btn-danger',
                    actionLabel: this.LANG.dialogs.buttons.delete,
                    cancelLabel: this.LANG.dialogs.buttons.cancel,
                },
            })
            .then(response => {
                if (response) {
                    this.system.mediaserver
                        .removeStorage({ id: storage.storageId })
                        .toPromise()
                        .then(async response => {
                            if (response.id) {
                                this.currentStorageState.locations =
                                    this.currentStorageState.locations.filter(
                                        ({ storageId }) => storageId !== cleanId(response.id),
                                    );
                                await firstValueFrom(
                                    this.system.storageManager.update().pipe(take(1)),
                                );
                                this.toastService.notify(
                                    {
                                        value: this.LANG.storage.storageDeleted,
                                        params: {
                                            url: cleanSmbUrl(storage.url),
                                        },
                                    },
                                    ToastType.Success,
                                );
                            } else {
                                throw new Error('failed to remove storage');
                            }
                        })
                        .catch(_ => {
                            this.toastService.notify(
                                {
                                    value: this.LANG.storage.failedRemove,
                                    params: {
                                        url: cleanSmbUrl(storage.url),
                                    },
                                },
                                ToastType.Danger,
                            );
                        });
                }
            });
    }

    backupState$ = new BehaviorSubject(false);

    get backupState(): boolean {
        return this.backupState$.value;
    }

    set backupState(value: boolean) {
        if (this.system.useRest) {
            // Skip changing backup state for 4.3 systems, implementation pending for that version
            return;
        }
        this.backupState$.next(value);
        this.isBackupOn.value = value;
    }

    get infoPath(): string {
        return (
            this.uriService.getSystemSettingsRoute({
                systemId: this.system.id,
                childRoute: ChildRoutes.HEALTH,
            }) + 'storages'
        );
    }

    resetBackupToDefault(): void {
        this.dialogs.resetBackupSettings(this);
    }

    addExternalStorage = (): void => {
        this.dialogs
            .addStorage({
                serverId: this.serverId,
                storageManager: this.system.storageManager,
                cancelPolls: () => {
                    this.updatingModes = [];
                    this.cancelPolling$.next('cancel existing');
                },
            })
            .finally(this.pollStats);
    };

    reindexStorage(type: MODE): void {
        this.reindexingStorages = [...this.reindexingStorages, type];
        this.reindexing(TARGET_STORAGE[type.toUpperCase()], 'start');
    }

    updateStorageStatus(type: number, status: STORAGE_STATUS): void {
        const mode = type ? MODE.MAIN : MODE.BACKUP;
        if (status === STORAGE_STATUS.REINDEXING) {
            this.reindexingStorages = [...new Set<MODE>([...this.reindexingStorages, mode])];
        }
    }

    reindexing(type: TARGET_STORAGE, action?: string): void {
        const onlyCheck = !action;
        if (action) {
            this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
        }
        let toastType = ToastType.Success;
        let message: string;

        defer(() =>
            this.system.storageManager.rebuildArchive(this.serverId, type, action).pipe(
                map((res: RebuildArchiveResponse) => {
                    const reply = res.reply || res.main || res.backup;
                    if (reply && ['RebuildState_None', 'none'].includes(reply.state)) {
                        type ? (this.percentMainDone = 1) : (this.percentBackupDone = 1);
                        return res;
                    }

                    // v.2 responses
                    if (res.main || res.backup) {
                        action = 'update';
                    } else {
                        if (reply && reply.totalProgress === 0) {
                            action = undefined;
                        }
                    }

                    if (type) {
                        this.percentMainDone = reply.totalProgress;
                        this.reindexingMain = true;
                        this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                    } else {
                        this.percentBackupDone = reply.totalProgress;
                        this.reindexingBackup = true;
                        this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                    }
                    throw Object.assign(new Error(), res);
                }),
            ),
        )
            .pipe(
                retryWhen(errors => errors.pipe(delay(1000))),
                untilDestroyed(this),
                takeUntil(this.stopReindex$.pipe(filter(stopping => stopping === type))),
            )
            .subscribe(
                (res: RebuildArchiveResponse) => {
                    const reply = res.reply || res.main || res.backup;
                    if (['RebuildState_None', 'none'].includes(reply.state)) {
                        this[`percent${type ? 'Main' : 'Backup'}Done`] = 0;
                        message =
                            this.LANG.storage.reindexingDone[`${type ? 'main' : 'backup'}Success`];
                    }
                },
                err => {
                    console.error(err);
                    message = this.LANG.storage.reindexingDone[`${type ? 'main' : 'backup'}Failed`];
                    toastType = ToastType.Warning;
                },
            )
            .add(() => {
                this.updateStorageStatus(type, STORAGE_STATUS.IN_USE);
                this.cancelIndexing(type ? 'main' : 'backup');
                this[`reindexing${type ? 'Main' : 'Backup'}`] = false;
                if (message && !onlyCheck) {
                    this.toastService.notify(message, toastType);
                }
            });
    }

    cancelIndexing(type: 'main' | 'backup'): void {
        const target = TARGET_STORAGE[type.toUpperCase()];
        this[type === 'main' ? 'percentMainDone' : 'percentBackupDone'] = 0;
        this.system.storageManager.rebuildArchive(this.serverId, target, 'stop').toPromise();
        this.reindexingStorages = this.reindexingStorages.filter(mode => mode !== type);
        this.stopReindex$.next(target);
    }

    getStorageTypeTooltip(storageType: string): string {
        return storageType ? this.LANG.system.storageToolTips[storageType.toLowerCase()] : '';
    }

    getStatusTooltip(status: string): string {
        return this.LANG.storage[status];
    }
}
