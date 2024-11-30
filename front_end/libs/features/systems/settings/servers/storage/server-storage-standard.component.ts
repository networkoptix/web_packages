import {
    Component,
    computed,
    effect,
    inject,
    input,
    OnInit,
    signal,
    untracked,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { defer, firstValueFrom, Observable, of, Subject, timer } from 'rxjs';
import {
    bufferCount,
    concatMap,
    delay,
    filter,
    map,
    retryWhen,
    startWith,
    switchMap,
    take,
    takeUntil,
    tap,
} from 'rxjs/operators';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { pollingTimeout } from '@pages/static-variables-features';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ChangedIdReturned } from '@services/system-api.types';
import type { RebuildArchiveResponse } from '@services/system-api.types/servers.types';
import {
    CurrentStorageState,
    MODE,
    Storage,
    STORAGE_STATUS,
    STORAGE_TYPES,
} from '@services/system.service/storage-manager/storage';
import { UpdateTriggers } from '@services/system.service/storage-manager/storage-state';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { ChildRoutes } from '@services/uri.service.types';
import { icons } from '@static-variables';
import { cleanIdLegacy, cleanSmbUrl } from '@utils/general';

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
    system$$ = input.required<NxSystem>({ alias: 'system' });
    serverId$$ = input.required<string>({ alias: 'serverId' });

    readonly LANG = staticLang;
    readonly storageTypes = STORAGE_TYPES;
    readonly storageModes = MODE;
    readonly modes: Mode[] = [
        { name: this.LANG.storage.modes.main, value: 'main' },
        { name: this.LANG.storage.modes.backup, value: 'backup' },
        { name: 'horizontal', value: '' },
        { name: this.LANG.storage.modes.notInUse, value: 'notUsed' },
    ];
    readonly policies: Mode[] = [
        { name: this.LANG.storage.policies.exclusive, value: 'exclusive' },
        { name: this.LANG.storage.policies.shared, value: 'shared' },
        { name: this.LANG.storage.policies.isolated, value: 'isolated' },
    ];
    readonly STATUS = STORAGE_STATUS;
    readonly icons = icons;

    private dialogs = inject(NxDialogsService);
    private toastService = inject(NxToastService);
    private processService = inject(NxProcessService);
    private applyService = inject(NxApplyService);
    private uriService = inject(NxUriService);

    locale = inject(NxLanguageProviderService).currentLocale;
    cleanSmbUrl = cleanSmbUrl;

    saveSettings: Process | null;
    resetWatchers: () => void;

    private dropdownOffset$$ = signal<number>(0);
    private scrollOffset$$ = signal<number>(0);
    private previousServerId$$ = signal<string>('');

    private previouslyReserved = new Set<string>();
    private beingUpdated: string[] = [];
    private stopReindex$ = new Subject<TARGET_STORAGE>();
    private cancelPolling$ = new Subject<string>();

    loading$$ = signal<boolean>(true);
    waitingForStorages$$ = signal<boolean>(true);
    reindexingMain$$ = signal<boolean>(false);
    reindexingBackup$$ = signal<boolean>(false);
    customSettings$$ = signal<boolean>(false);
    forceShowBackupBlock$$ = signal<boolean>(false);
    backupState$$ = signal<boolean>(false);
    percentMainDone$$ = signal<number>(0);
    percentBackupDone$$ = signal<number>(0);

    canSeeDetailInfo$$ = computed(() => {
        const system = this.system$$();
        return !!system?.permissionManager.isAdmin$$();
    });
    canSeePolicySettings$$ = computed(() => {
        const system = this.system$$();
        return system?.version >= 6.1 && false; // Turning on this capability when CLOUD-14820 is implemented
    });
    dropdownOffsetCalc$$ = computed(() => this.dropdownOffset$$() - this.scrollOffset$$() + 22); // margin offset
    infoPath$$ = computed(() => {
        const systemId = this.system$$()?.id;
        if (!systemId) {
            return '';
        }
        return (
            this.uriService.getSystemSettingsRoute({
                systemId,
                childRoute: ChildRoutes.HEALTH,
            }) + 'storages'
        );
    });

    updatingModes: string[] = [];
    reindexingStorages: MODE[] = [];
    cachedSizes: Record<string, { vms: number; total: number }> = {};
    currentStorageState: CurrentStorageState | null;

    isBackupOn: Watcher<boolean>;
    modeWatchers: Record<string, Watcher<string, NxSystemStorageComponent>> = {};

    ddWidth: number;

    backupStateChangedEffect = effect(() => {
        this.isBackupOn.value = this.backupState$$();
    });
    _serverChangeEffect = effect(() => {
        const previousServerId = untracked(this.previousServerId$$);
        const serverId = this.serverId$$();
        const system = this.system$$();
        if (serverId === previousServerId) {
            return;
        }
        untracked(() => this.previousServerId$$.set(serverId));

        const previousServer = system.serverManager.servers.find(
            server => server.id === previousServerId,
        );

        untracked(() => {
            this.loading$$.set(true);
            this.waitingForStorages$$.set(true);
        });

        if (system.storageManager && previousServer?.status === 'Offline') {
            system.storageManager.reinitializeForOfflineToOnlineServer();
            untracked(() => this.init());
        }
    });

    ngOnInit(): void {
        this.calcDDWidth();
        this.init();
    }

    private init(): void {
        const system = this.system$$();
        this.loading$$.set(true);
        this.waitingForStorages$$.set(true);
        this.previouslyReserved.clear();
        if (system.useRest && this.backupStateChangedEffect) {
            // Skip changing backup state for rest systems, implementation pending for that version
            this.backupStateChangedEffect.destroy();
        }
        if (!system.storageManager) {
            return;
        }
        system.storageManager.serverId$.pipe(untilDestroyed(this)).subscribe(() => {
            this.saveSettings = null;
        });
        system.storageManager.storageState$.pipe(untilDestroyed(this)).subscribe({
            next: async state => {
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
                        const mode = this.selectMode(store)?.value || 'notUsed';
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
                    const backupState = await system
                        .storageManager!.getBackupState(this.serverId$$())
                        .catch(err => {
                            console.error(err);
                            return { backup: false, custom: false };
                        });
                    this.customSettings$$.set(backupState.custom);
                    this.isBackupOn = new Watcher(backupState.backup);
                    this.backupState$$.set(backupState.backup);
                    if (this.loading$$() && this.currentStorageState?.beingChecked) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        this.pollStats();
                    }
                    this.setupWatchers();
                    this.loading$$.set(false);
                    this.waitingForStorages$$.set(false);
                    if (this.currentStorageState?.reindexing) {
                        this.currentStorageState.reindexing.forEach(mode => {
                            this.reindexing(TARGET_STORAGE[mode.toUpperCase()]);
                        });
                    }
                }
            },
            error: () => {
                this.waitingForStorages$$.set(false);
                this.currentStorageState = null;
                this.setupWatchers();
            },
        });
    }

    private pollStats = async (update: boolean = false): Promise<void> => {
        const system = this.system$$();
        this.cancelPolling$.next('cancel previous');
        if (update) {
            await firstValueFrom(
                timer(1500).pipe(
                    switchMap(_ => system.storageManager!.update()),
                    take(2),
                ),
            );
        }
        const started = Date.now();
        const triggerUpdate = (type: UpdateTriggers): Observable<CurrentStorageState> =>
            system.storageManager!.update(type);
        const pollUpdater$ = new Subject<number>();
        pollUpdater$
            .pipe(
                tap(time => {
                    if (started < time - pollingTimeout) {
                        this.updatingModes = [];
                        triggerUpdate(UpdateTriggers.STATS)
                            .pipe(untilDestroyed(this))
                            .subscribe(state => {
                                this.currentStorageState!.locations = (state?.locations || []).map(
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
                        this.forceShowBackupBlock$$.set(false);
                        this.cancelPolling$.next('timeout');
                    }
                }),
                startWith(0),
                delay(1500),
                switchMap(_ => {
                    triggerUpdate(UpdateTriggers.STATS);
                    triggerUpdate(UpdateTriggers.INFO);
                    return system.storageManager!.statsUpdated$.pipe(take(1));
                }),
                map(_ => {
                    const state = system.storageManager!.storageState;
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
                        this.forceShowBackupBlock$$.set(false);
                    }
                }),
                takeUntil(this.cancelPolling$),
            )
            .subscribe();
    };

    private setupWatchers = (): void => {
        const modeWatchers = Object.entries(this.modeWatchers);
        this.backupState$$.set(this.isBackupOn.originalValue);
        this.resetWatchers = (): void => {
            this.isBackupOn.reset();
            this.backupState$$.set(this.isBackupOn.originalValue);
            const storage = this.currentStorageState?.locations || [];
            modeWatchers.forEach(([id, watcher]) => {
                watcher.reset();
                const store = storage.find(({ storageId }) => storageId === cleanIdLegacy(id));
                if (!store) {
                    return;
                }
                store.usedForWriting = true;
                store.isBackup = false;
                switch (watcher.originalValue) {
                    case 'backup':
                        store.isBackup = true;
                        break;

                    case 'notUsed':
                        store.usedForWriting = false;
                        break;
                }
            });
        };
        const handleFailedBackupChange = (backupSaveState: string): void => {
            const backup = backupSaveState === 'StartFail';
            this.backupState$$.set(!backup);
            this.isBackupOn.originalValue = !backup;
            this.isBackupOn.value = backup;
        };
        const updateBackup = async (): Promise<void | string> => {
            const backupState = this.backupState$$();
            if (this.system$$().useRest) {
                return Promise.resolve();
                // Skip updating any settings for 4.3 since the backup implementation is pending for that version
            } else if (this.isBackupOn.originalValue === backupState) {
                return Promise.resolve('backupToggleNotUpdated');
            } else if (backupState) {
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
                    this.backupState$$.set(this.isBackupOn.originalValue);
                },
            );
        }
    };

    private setDefaultBackupSettings = async (): Promise<void> => {
        const serverId = this.serverId$$();
        const system = this.system$$();
        if (system.useRest) {
            const cameras: Record<string, string>[] = system.cameraManager.cameras.map(
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
                    system.serverManager.setCameraUserSettings(serverId, id, changes),
                ),
            );
        }
        await system.storageManager!.updateOrGetBackupControl(serverId, 'start');
        if (!system.useRest) {
            await firstValueFrom(
                system.updateOrGetSystemSettings({
                    backupNewCamerasByDefault: true,
                    backupQualities: 'CameraBackupLowQuality',
                }),
            );
            await Promise.all(
                system.serverManager.servers.map(({ id, backupType }) => {
                    return backupType !== 'BackupManual' || id === serverId
                        ? system.serverManager.setServerUserSettings(id, {
                              backupType: 'BackupRealTime',
                          })
                        : null;
                }),
            );
            // await this.system.serverManager.initSystemMediaServers();
            const cameraSettingsToSave = system.cameraManager.cameras.reduce(
                (cameras, camera) => {
                    if (
                        !['CameraBackupLowQuality', 'CameraBackupDefault'].includes(
                            camera.backupQuality,
                        )
                    ) {
                        let retries = 5;
                        const update = async (): Promise<ChangedIdReturned | void> => {
                            if (retries < 5) {
                                console.error(
                                    `save retry attempt ${5 - retries} for ${camera.id} camera `,
                                );
                            }
                            retries--;
                            return system.serverManager
                                .setCameraUserSettings(serverId, camera.id, {
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
                await firstValueFrom(
                    of(...cameraSettingsToSave).pipe(
                        bufferCount(30),
                        concatMap(saveSettings => Promise.all(saveSettings.map(save => save()))),
                    ),
                );
            }
            await system.update();
        }
        this.customSettings$$.set(false);
        this.isBackupOn.originalValue = true;
        this.isBackupOn.value = true;
        this.backupState$$.set(true);
        return Promise.resolve();
    };

    private turnOffBackup = async (retries = 5): Promise<void> => {
        const serverId = this.serverId$$();
        const system = this.system$$();
        this.isBackupOn.originalValue = !retries;
        this.isBackupOn.value = !retries;
        this.backupState$$.set(!retries);
        await system.serverManager.setServerUserSettings(serverId, {
            backupType: 'BackupManual',
        });
        if (system.useRest) {
            const cameras: Record<string, string>[] = system.cameraManager.cameras.map(
                ({ id }) => ({ id, backupPolicy: 'off' }),
            );
            await Promise.all(
                cameras.map(({ id, ...changes }) =>
                    system.serverManager.setCameraUserSettings(serverId, id, changes),
                ),
            );
        }
        const backupControlRes = await system.storageManager!.updateOrGetBackupControl(
            serverId,
            'stop',
        );
        const state = backupControlRes && backupControlRes.reply?.state;
        // backupControlRes?.reply in this case is bad - updateOrGetBackupControl is called if backupControlRes is undefined
        if (!system.useRest && state !== 'BackupState_None') {
            await system.storageManager!.updateOrGetBackupControl(serverId, 'stop');
            return this.turnOffBackup(retries - 1);
        } else {
            this.isBackupOn.originalValue = false;
            this.isBackupOn.value = false;
            this.backupState$$.set(false);
        }
    };

    normalizeId = (id: unknown): string => `{${cleanIdLegacy(id || '')}}`;

    getIconSrc(store: Storage): string {
        const svgName =
            this.updatingModes.includes(store.storageId) || !store.storageType
                ? 'loading.svg'
                : `storage_${store.storageType.replace(
                      STORAGE_TYPES.REMOVABLE,
                      STORAGE_TYPES.USB,
                  )}.svg`;
        return `${this.icons.dirTextButtons}${svgName}`;
    }

    doesModeExist = (mode: MODE): boolean => {
        const watcherMode = mode;
        if (
            watcherMode === 'backup' &&
            this.currentStorageState!.locations.some(
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
        const onlineStorages = this.currentStorageState!.locations.filter(
            ({ isOnline, mode, status, storageId }) =>
                isOnline &&
                reindexMode === mode &&
                ![STORAGE_STATUS.BEING_CHECKED, STORAGE_STATUS.INACCESSIBLE].includes(status) &&
                !this.updatingModes.includes(storageId),
        ).length;
        return noStorages || !onlineStorages;
    };

    checkArchiveWarning({ storageId, vmsSpace }: Storage): boolean {
        const { value, originalValue } = this.modeWatchers[this.normalizeId(storageId)];
        return [value, originalValue].every(state => state === 'notUsed') && !!vmsSpace;
    }

    selectMode(store: Storage): Mode {
        const watcher = this.modeWatchers[`{${store.storageId}}`];
        if (watcher?.changed) {
            return (
                this.modes.find(({ value }) => value === watcher.value) ||
                this.modes[MODE_INDEX.NOT_IN_USE]
            );
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
        this.dropdownOffset$$.set(width);
    }

    handleScroll(event: Event): void {
        this.scrollOffset$$.set((event.target as HTMLFormElement).scrollLeft);
    }

    checkDisabled = (store: Storage): boolean =>
        (store.status !== STORAGE_STATUS.REINDEXING && store.status !== STORAGE_STATUS.IN_USE) ||
        this.updatingModes.includes(store.storageId) ||
        this.selectMode(store).value === 'notUsed';

    changeMode(
        {
            isBackup,
            storageId,
            url,
            reservedSpace: spaceLimit,
            usedForWriting,
            storageType,
        }: Storage,
        selectedMode: string,
    ): void {
        const id = this.normalizeId(storageId);
        const updateParams = {
            id,
            isBackup,
            url,
            spaceLimit,
            usedForWriting,
            parentId: this.serverId$$(),
            storageType,
        };
        if (selectedMode !== this.modeWatchers[this.normalizeId(id)].value) {
            updateParams.isBackup = selectedMode === 'backup';
            updateParams.usedForWriting = selectedMode !== 'notUsed';
            this.modeWatchers[this.normalizeId(id)].value = selectedMode;
            const store = this.currentStorageState!.locations.find(
                ({ storageId }) => this.normalizeId(storageId) === this.normalizeId(id),
            )!;
            store.usedForWriting = updateParams.usedForWriting;
            if (selectedMode !== 'notUsed') {
                store.isBackup = updateParams.isBackup;
                if (store.isBackup && store.currentStorageState.onlineBackups === 1) {
                    this.backupState$$.set(this.isBackupOn.originalValue);
                }
            }
        }

        const hasArchive = (id: string): boolean =>
            !!this.currentStorageState!.locations.find(({ storageId }) => id === `{${storageId}}`)
                ?.vmsSpace;
        const showWarn = Object.entries(this.modeWatchers).some(
            ([id, { changed, value }]) => value === 'notUsed' && changed && hasArchive(id),
        );
        this.applyService.setWarn(showWarn ? this.LANG.storage.stillHasArchivesPreWarning : '');
    }

    private handleModeUpdate = async (): Promise<string> => {
        this.forceShowBackupBlock$$.set(false);
        const updating: string[] = [];
        for (const id in this.modeWatchers) {
            const store = this.currentStorageState!.locations.find(
                ({ storageId }) => storageId === cleanIdLegacy(id),
            );
            const currentMode = store ? store?.mode : '';
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
                        const updatedStore = await firstValueFrom(
                            this.system$$().storageManager!.saveStorage({
                                parentId: this.serverId$$(),
                                url: store.storageId,
                                storageType: 'usb',
                                usedForWriting: true,
                                isWritable: true,
                                isBackup: currentMode === 'backup',
                            }),
                        );
                        updating.push(updatedStore.id);
                    } else {
                        updating.push(store.storageId);
                    }
                }
                this.forceShowBackupBlock$$.update(
                    showBackupBlock => showBackupBlock || currentMode === 'backup',
                );
            }
        }
        this.beingUpdated = updating.filter(id => !this.updatingModes.includes(id));
        this.updatingModes = [...this.updatingModes, ...updating];
        return this.updatingModes.length
            ? firstValueFrom(this.currentStorageState!.saveStorages()).catch(err =>
                  console.error(err),
              )
            : Promise.resolve('storageModesNotUpdated');
    };

    checkIfChanged(id: string): boolean {
        return this.beingUpdated.includes(id);
    }

    private calcDDWidth(): void {
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
            const dd = document.createElement('span');
            dd.style.visibility = 'hidden';
            dd.innerText = currentText;
            document.body.appendChild(dd);
            // add button's left and right padding and space for info icon
            const iconWidths = addWidth[key] || 16;
            const currentWidth = Math.round(dd.getBoundingClientRect().width + iconWidths);

            document.body.removeChild(dd);
            return Math.max(width, currentWidth);
        }, 0);
    }

    async deleteStorage(storage: Storage): Promise<void> {
        try {
            const response = await this.dialogs.confirm({
                title: this.LANG.storage.deleteExternalStorage,
                message: cleanSmbUrl(storage.url),
                footer: {
                    buttonClass: 'btn-danger',
                    actionLabel: this.LANG.dialogs.buttons.delete,
                    cancelLabel: this.LANG.dialogs.buttons.cancel,
                },
            });
            if (!response) {
                return;
            }
        } catch {
            return;
        }
        try {
            const system = this.system$$();
            const response = await firstValueFrom(
                system.mediaserver.removeStorage({ id: storage.storageId }),
            );
            if (response.id) {
                this.currentStorageState!.locations = this.currentStorageState!.locations.filter(
                    ({ storageId }) => storageId !== cleanIdLegacy(response.id),
                );
                await firstValueFrom(system.storageManager!.update().pipe(take(1)));
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
        } catch {
            this.toastService.notify(
                {
                    value: this.LANG.storage.failedRemove,
                    params: {
                        url: cleanSmbUrl(storage.url),
                    },
                },
                ToastType.Danger,
            );
        }
    }

    async resetBackupToDefault(): Promise<void> {
        await this.dialogs.resetBackupSettings({
            system: this.system$$(),
            setDefaultBackupSettings: this.setDefaultBackupSettings,
        });
    }

    async addExternalStorage(): Promise<void> {
        try {
            await this.dialogs.addStorage({
                serverId: this.serverId$$(),
                storageManager: this.system$$().storageManager!,
                cancelPolls: () => {
                    this.updatingModes = [];
                    this.cancelPolling$.next('cancel existing');
                },
            });
        } finally {
            await this.pollStats();
        }
    }

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
            this.system$$()
                .storageManager!.rebuildArchive(this.serverId$$(), type, action)
                .pipe(
                    map((res: RebuildArchiveResponse) => {
                        const reply = res.reply || res.main || res.backup;
                        if (reply && ['RebuildState_None', 'none'].includes(reply.state)) {
                            if (type) {
                                this.percentMainDone$$.set(1);
                            } else {
                                this.percentBackupDone$$.set(1);
                            }
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

                        if (reply) {
                            if (type) {
                                this.percentMainDone$$.set(reply.totalProgress);
                                this.reindexingMain$$.set(true);
                                this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                            } else {
                                this.percentBackupDone$$.set(reply.totalProgress);
                                this.reindexingBackup$$.set(true);
                                this.updateStorageStatus(type, STORAGE_STATUS.REINDEXING);
                            }
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
                    if (['RebuildState_None', 'none'].includes(reply?.state ?? '')) {
                        if (type) {
                            this.percentMainDone$$.set(0);
                        } else {
                            this.percentBackupDone$$.set(0);
                        }

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
                this.cancelIndexing(type ? 'main' : 'backup').catch(err => console.error(err));
                if (type) {
                    this.reindexingMain$$.set(false);
                } else {
                    this.reindexingBackup$$.set(false);
                }
                if (message && !onlyCheck) {
                    this.toastService.notify(message, toastType);
                }
            });
    }

    async cancelIndexing(type: 'main' | 'backup'): Promise<void> {
        const target = TARGET_STORAGE[type.toUpperCase()];
        if (type === 'main') {
            this.percentMainDone$$.set(0);
        } else {
            this.percentBackupDone$$.set(0);
        }
        await firstValueFrom(
            this.system$$().storageManager!.rebuildArchive(this.serverId$$(), target, 'stop'),
        );
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
