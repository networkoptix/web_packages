import {
    Component, Inject, OnDestroy,
    LOCALE_ID, Input, OnChanges,
    SimpleChanges, OnInit
}                                                from '@angular/core';
import { UntilDestroy }                          from '@ngneat/until-destroy';
import { Subscription, interval, combineLatest } from 'rxjs';

import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { Watcher }                   from '../../../../../services/apply.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { map }                       from 'rxjs/operators';

enum MODE {
    MAIN = 0,
    BACKUP = 1,
    NOT_IN_USE = 3
}

enum STORAGE_STATUS {
    IN_USE,
    INACCESSIBLE,
    RESERVED,
    DISABLED
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
    saveSettings: Process;
    storage: any;
    watchers: Watcher<any>[] = [];
    reindexingMain = false;
    percentMainDone = 0;
    reindexingBackup = false;
    percentBackupDone = 0;

    ddWidth: number;
    modes: any;
    modeSelected: any;
    STATUS: any;
    percentDoneSubscription: Subscription;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.storage = [];
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

                        storage[idx] = { ...store };
                    });

                    this.showStorage = (Object.keys(storage).length > 0);
                    this.storage = storage;

                    this.loading = false;
                });
        }
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

    selectMode(store) {
        if (!store.isBackup) {
            return this.modes[MODE.MAIN];
        } else {
            return this.modes[MODE.BACKUP];
        }
    }

    changeMode(store, selected) {

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
        this.dialogsService
            .confirm(
                storage.url,
                this.LANG.storage.deleteExternalStorage(),
                this.LANG.dialogs.buttons.delete(),
                'btn-danger',
                this.LANG.dialogs.buttons.cancel()
            ).then((response) => {
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

    // openAddStorage() {
    //     this.dialogsService
    //         .addStorage(this.system, this.serverId)
    //         .then((response) => {
    //             if (response === this.CONFIG.responseOk) {
    //                 this.init();
    //             }
    addExternalStorage() {
        return this.dialogs.addExternalStorage()
            .then(res => {
                console.log('res from addExternalStorage dialog', res);
            });
    }

    reindexStorage(type: 'main' | 'backup') {
        if (type === 'main') {
            this.percentDoneSubscription = interval(1000).subscribe(val => {
                if (this.percentMainDone < 1) {
                    this.percentMainDone += Math.random() * 0.2;
                    if (this.percentMainDone > 1) {
                        this.percentMainDone = 1;
                        this.percentDoneSubscription.unsubscribe();
                    }
                }
            });
        }
    }

    cancelIndexing(type: 'main' | 'backup') {
        if (type === 'main') {
            this.percentMainDone = 0;
        } else {
            this.percentBackupDone = 0;
        }
        this.percentDoneSubscription.unsubscribe();
    }
}
