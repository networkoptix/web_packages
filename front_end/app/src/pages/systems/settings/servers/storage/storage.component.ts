import {
    Component, Inject, OnDestroy, LOCALE_ID, Input, OnChanges, SimpleChanges
}                                       from '@angular/core';
import { Subscription }                 from 'rxjs';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';
import {
    NxSystem, Watcher,
    NxLanguageProviderService,
    NxProcessService, Process,
    NxUtilsService
}                                       from '../../../../../services';
import { NxDialogsService }             from '../../../../../dialogs';
import { LanguageI18NStaticTypes }      from '../../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemAdvancedStorageComponent implements OnDestroy, OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;

    showStorage: boolean;
    systemSubscription: Subscription;
    saveSettings: Process;
    storages = [];
    watchers: Watcher<any>[] = [];

    constructor(
        languageService: NxLanguageProviderService,
        @Inject(LOCALE_ID) private locale: string,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.LANG = languageService.translations;

        this.showStorage = false;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.system || changes.serverId) {
            this.init();
        }
    }

    init() {
        if (this.system.currentServerNotBusy) {
            if (this.system && this.system.servers && this.system.servers.length) {
                this.updateAndGetStorage();
            }
        }
    }

    resetWatchers() {
        this.watchers.forEach(watcher => watcher.reset());
    }

    updateWatchers() {
        this.watchers.forEach(watcher => {
            watcher.originalValue = watcher.value;
        });
    }

    get watchersChanged() {
        return this.watchers.reduce((changed, watcher) => changed || watcher.originalValue !== watcher.value, false);
    }

    updateAndGetStorage() {
        this.system.updateOrGetSystemStorage().toPromise().then(response => {
            this.showStorage = (Object.keys(response.reply.storages).length > 0);
            const { storages, watchers } = mapStorages(response.reply.storages);
            this.storages = storages;
            this.watchers = watchers;
            this.updateSaveProcess();
        });
    }

    updateSaveProcess() {
        this.saveSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemStorage(this.buildUpdateParams())
                .toPromise()
                .then(response => {
                    if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error)
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.storageSettingsSaved, this.LANG.dialogs.titles.success)
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.storageSettingsNotSaved, this.LANG.dialogs.titles.error)
                        .catch(error => {
                            console.error(error);
                        });
                }).then((res) => {
                    this.updateWatchers();
                    Promise.resolve(res);
                });
        });
    }

    buildUpdateParams() {
        return this.storages.map(toParams(this.serverId));
    }

    friendlyBytes(bits, gbTb?: 'GB' | 'TB') {
        const { locale } = this;
        return NxUtilsService.fromBits(bits, { locale, roundTo: gbTb === 'TB' ? 1073741824 * 102.4 : 1073741824 });
    }

    ngOnDestroy() {}
}

export const toParams = (serverId) => ({ totalSpace, isBackup, reservedSpace, isUsedForWriting, url, storageType, storageId, maxReserve, ...storage }) => ({
    addParams      : [{ name: 'space', value: `${totalSpace}` }],
    id             : storageId,
    isBackup       : isBackup,
    parentId       : `{${serverId}}`,
    spaceLimit     : Math.round(Math.min(reservedSpace.bits, maxReserve.bits)),
    storageType    : storageType,
    // Static according saveStorages documentation /nx/vms/server/nx_vms_server_db/src/local_connection_factory.cpp
    typeId         : '{f8544a40-880e-9442-b78a-9da6db6862b4}',
    url            : url,
    usedForWriting : isUsedForWriting.value
});

export const mapStorages = (storages) => storages.map(({ freeSpace: free, reservedSpace: reserved, totalSpace, isUsedForWriting: ufw, ...storage }) => {
    const reservedSpace = new BitConverter(reserved);
    const freeSpace = new FreeSpace(new BitConverter(free), reservedSpace);
    const maxReserve = new BitConverter(freeSpace.bits + reservedSpace.bits);
    const isUsedForWriting = new Watcher<boolean>();
    isUsedForWriting.value = ufw;
    return { ...storage, freeSpace, reservedSpace, totalSpace, isUsedForWriting, maxReserve, watchers: [...reservedSpace.watcher, isUsedForWriting] };
}).reduce(({ storages, watchers }, { watchers: moreWatchers, ...storage }) => ({
    storages : [...storages, storage],
    watchers : [...watchers, ...moreWatchers]
}), { storages: [], watchers: [] });

export class BitConverter {
    _bits = new Watcher<number>()
    _uom = new Watcher<string>()

    get watcher() {
        return [this._bits, this._uom];
    }

    set bits(value) {
        this._bits.value = value;
    }

    get bits() {
        return this._bits.value;
    }

    set uom(value) {
        this._uom.value = value;
    }

    get uom() {
        return this._uom.value;
    }

    constructor(initialBits: number) {
        this._uom.value = initialBits > 1073741824 * 1024 / 4 ? 'TB' : 'GB';

        if (this._uom.value === 'GB') {
            this._bits.value = Math.round((Math.round(initialBits / this.bitsGb)) * this.bitsGb);
        } else {
            this._bits.value = (Math.round(initialBits / (this.bitsTb / 1000)) * this.bitsTb) / 1000;
        }
    }

        private bitsGb = 1073741824;
        private bitsTb = 1073741824 * 1024

        get GB(): number {
            const roundBy = this.bitsGb;
            const rounded = Math.round(this.bits / roundBy) * roundBy;
            this.bits = rounded;
            return Math.round(this.bits / this.bitsGb);
        }

        set GB(gb: number) { this.bits = gb * this.bitsGb; }

        get TB(): number {
            const roundBy = this.bitsTb / 1000;
            const rounded = Math.round(this.bits / roundBy) * roundBy;
            this.bits = rounded;
            return Math.round(this.bits / this.bitsTb * 1000) / 1000;
        }

        set TB(tb: number) { this.bits = tb * this.bitsTb; }

        get unitsInCurrentUom() { return this[this.uom]; }
        set unitsInCurrentUom(units) {
            this[this.uom] = units;
        }
}

export class FreeSpace {
        private freeExcludeReserved: BitConverter

        constructor(free: BitConverter, private reserved: BitConverter) {
            this.freeExcludeReserved = new BitConverter(free.bits + reserved.bits);
        }

        get bits() {
            return this.freeExcludeReserved.bits - this.reserved.bits;
        }

        set bits(value) {
            this.reserved.bits = new BitConverter(value).bits;
        }
}
