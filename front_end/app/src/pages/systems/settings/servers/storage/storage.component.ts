import {
    Component, Inject,
    LOCALE_ID, Input, OnChanges,
    SimpleChanges, OnInit
}                                                from '@angular/core';
import { UntilDestroy }                          from '@ngneat/until-destroy';
import { Subscription, interval, combineLatest, BehaviorSubject, Subject, defer } from 'rxjs';
import {
    map, first, takeUntil, delay, retryWhen
}                                    from 'rxjs/operators';

import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { Watcher }                   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxToastService }            from '../../../../../dialogs/toast.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';

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

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemStorageComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    loading: boolean;
    showStorage: boolean;
    systemSubscription: Subscription;
    storageSubscription: Subscription;
    systemStorageSubscription: Subscription;
    saveSettings: Process;
    systemStorages: any;
    watchers: Watcher<any>[] = [];
    reindexingMain = false;
    percentMainDone = 0;
    reindexingBackup = false;
    percentBackupDone = 0;
    storage$ = new BehaviorSubject<any[] | any>([]);

    doesBackupExist = false;
    isBackupOn = false;
    customSettings = false;

    ddWidth: number;
    modes: any;
    modeSelected: any;
    STATUS: any;
    reindexingMainSubscription: Subscription;
    reindexingBackupSubscription: Subscription;

    mainStorageIds: string[] = [];
    backupStorageIds: string[] = [];

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
        this.showStorage = false;
        this.loading = true;

        this.modes = [
            { name: this.LANG.storage.modes.main(), value: 'modeMain' },
            { name: this.LANG.storage.modes.backup(), value: 'modeBackup' },
            { name: 'horizontal', value: '' },
            { name: this.LANG.storage.modes.notInUse(), value: 'modeNotInUse' }
        ];

        this.STATUS = STORAGE_STATUS;
    }

    ngOnInit() {
        this.calcDDWidth();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.system?.currentValue || changes.serverId?.currentValue) {
            this.init();
        }
    }

    init() {
        this.loading = true;
        this.showStorage = false;

        if (this.system?.currentServerNotBusy && this.system?.servers?.length && this.serverId) {
            this.storageSubscription = combineLatest(
                this.system.getStorages({ id: this.serverId }),
                this.system.updateOrGetSystemStorage(),
                this.system.getRecordStats())

                .pipe(map(results => ({ storage: results[0], storeInfo: results[1].reply.storages, usage: results[2] })))
                .subscribe(results => {
                    if (results.storage.name === 'TimeoutError') {
                        console.error(results.storage.message);
                        this.loading = false;
                        return;
                    }

                    const storage = results.storage || [];

                    storage.hasAction = false;
                    storage.forEach((store, idx) => {
                        const storeInfo = results.storeInfo.find((info) => {
                            if (store.id === info.storageId) {
                                return info;
                            }
                        });

                        if (storeInfo) {
                            store = { ...storeInfo };
                        }

                        if (store.freeSpace) {
                            store.archiveSpace = this.getArchiveSpace(results.usage.reply, store.storageId);

                            store.status = STORAGE_STATUS.IN_USE; // default
                            store.statusTooltip = '';

                            if (store.isOnline) {
                                if (store.storageStatus.includes('tooSmall')) {
                                    store.status = STORAGE_STATUS.RESERVED;
                                    store.statusTooltip = this.LANG.storage.reservedTooSmallTooltip();
                                }
                                if (!store.storageStatus.includes('tooSmall') && store.storageStatus.includes('system')) {
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

                        storage[idx] = { ...store };
                    });

                    this.showStorage = (Object.keys(storage).length > 0);
                    this.updateStorage(storage);

                    this.loading = false;
                });
            this.getSystemStorages();
        }
    }

    checkIfBackupEnabled(server: any) {
        return !(
            server.backupType === 'BackupManual' ||
            server.backupType === 'BackupSchedule' && server.backupDuration <= 0
        );
    }

    // will finish in CLOUD-5589
    checkArchiveState() {
        let isBackupForCurrentServerEnabled = false;
        // let doesCurrentServerHaveDefaultSettings = false;
        let isBackupForAnyServersEnabled = false;
        this.system.servers.forEach(server => {
            if (server.id === this.serverId) {
                isBackupForCurrentServerEnabled = this.checkIfBackupEnabled(server);
                // need to figure out how to check for default settings
                // if (isBackupForCurrentServerEnabled) {
                //     doesCurrentServerHaveDefaultSettings = ?
                // }
            } else if (!isBackupForAnyServersEnabled) {
                isBackupForAnyServersEnabled = this.checkIfBackupEnabled(server);
            }
        });

        if (isBackupForCurrentServerEnabled) {
            this.isBackupOn = true;
            this.customSettings = true;
            // this.customSettings = !doesCurrentServerHaveDefaultSettings;
        } else {
            this.customSettings = false;
            this.isBackupOn = !isBackupForAnyServersEnabled;
            // if no server in system has backup settings on, should automatically save default settings and turn backup on?
            // if (this.isBackupOn) {
            //     // save default settings
            // }
        }
    }

    updateStorage(storage) {
        this.checkArchiveState();

        let numOfBackups = 0;
        let numOfMains = 0;
        let isUpdating = false;
        storage.forEach(({ isBackup, isUsedForWriting, status, updating }) => {
            if (isUsedForWriting) {
                isBackup ? status === 0 && numOfBackups++ : numOfMains++;
            }
            if (updating) isUpdating = true;
        });

        if (numOfMains === 1) {
            const store = storage.find(({ isBackup, isUsedForWriting }) => !isBackup && isUsedForWriting);
            store.mainOnly = true;
        }
        // gets rid of backup archive section if changing from backup to main
        // waits until finished changing modes when changing from main to backup
        this.doesBackupExist = Boolean(numOfBackups) && !isUpdating;
        this.storage$.next(storage);
    }

    getModes(mainOnly = false) {
        return this.modes.map((mode, index) => ({ ...mode, disabled: mainOnly && index }));
    }

    getArchiveSpace(usage, storageId): number {
        let aggregateSpace = 0;
        usage.forEach((chunk) => {
            chunk.recordedBytesPerStorage.forEach((storage) => {
                if (storage.key === storageId) {
                    aggregateSpace += parseInt(storage.value);
                }
            });
        });

        return aggregateSpace;
    }

    getSystemStorages() {
        this.systemStorageSubscription = this.system.getStorages()
            .subscribe(results => {
                if (results.name === 'TimeoutError') {
                    console.error(results.storage.message);
                    this.loading = false;
                    return;
                }
                this.systemStorages = results || [];
            });
    }

    selectMode(store) {
        if (!store.isUsedForWriting) {
            return this.modes[MODE.NOT_IN_USE];
        } else if (!store.isBackup) {
            return this.modes[MODE.MAIN];
        } else {
            return this.modes[MODE.BACKUP];
        }
    }

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
            this.system.saveStorage(updateParams).subscribe(this.handleModeUpdate(id, updateParams));
        }
    }

    handleModeUpdate = (storageIdToUpdate, updateParams) => () => {
        const setUpdating = (updating?) => {
            this.storage$.pipe(first()).subscribe(storage => {
                const store = storage.find(({ storageId }) => storageId === storageIdToUpdate);
                store.updating = updating;
                store.isBackup = updateParams.isBackup;
                store.isUsedForWriting = updateParams.usedForWriting;
                this.updateStorage(storage);
            });
        };
        setUpdating(true);
        const done$ = new Subject();
        interval(5000).pipe(takeUntil(done$)).subscribe(curInterval => {
            if (curInterval >= 6) {
                setUpdating(false);
                done$.next('done');
            } else {
                this.system.getStorageStatus({ path: updateParams.url }).pipe(takeUntil(done$)).subscribe(({ reply: { storage: { storageStatus } } }) => {
                    if (!storageStatus.includes('beingChecked')) {
                        setUpdating(false);
                        done$.next('done');
                    }
                });
            }
        });
    }

    calcDDWidth() {
        const longest = this.modes.reduce((a, b) => {
            if (b.name === 'horizontal' || a.name.length > b.name.length) {
                return a;
            }
            if (a.name === 'horizontal' || a.name.length < b.name.length) {
                return b;
            }
        });

        // calculate dd size ... for simplicity a span is used
        const dd = document.createElement('span');
        dd.style.visibility = 'hidden';
        dd.innerText = longest.name;
        document.body.appendChild(dd);
        // add button's left and right padding and space for info icon
        this.ddWidth = Math.round(dd.getBoundingClientRect().width + 80);

        document.body.removeChild(dd);
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
                        .removeStorage({ id: storage.storageId }).toPromise()
                        .then((response) => {
                            if (response.id) {
                                this.init();
                            }
                        });
                }
            });
    }

    updateBackupState(value) {
        // save new backup state
        this.isBackupOn = value;
    }

    resetBackupToDefault() {
        return this.dialogs.resetBackupToDefaultSettings(this.system)
            .then(res => {
                console.log('res from resetBack', res);
            });
    }

    addExternalStorage() {
        return this.dialogs.addStorage(this.system, this.serverId, this.storage$.value, this.systemStorages)
            .then(res => {
                if (res === this.CONFIG.responseOk) {
                    this.init();
                }
            });
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
}
