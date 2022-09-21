import {
    Component,
    Inject,
    OnDestroy,
    LOCALE_ID,
    Input,
    OnChanges,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { Watcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import {
    CurrentStorageState,
    Storage,
    STORAGE_STATUS,
} from '@services/system.service/storage-manager/storage';
import type { NxSystem } from '@services/system.service/system';
import { bitsToString } from '@utils/bits-to-string';
import { NgChanges } from '@utils/ng-changes';

type GbOrTb = 'GB' | 'TB';
class BitConverter {
    private _bits = new Watcher<number>();
    private _unit = new Watcher<GbOrTb>();

    get watcher(): [Watcher<number>, Watcher<GbOrTb>] {
        return [this._bits, this._unit];
    }

    set bits(value: number) {
        this._bits.value = value;
    }

    get bits(): number {
        return this._bits.value;
    }

    set unit(value: GbOrTb) {
        this._unit.value = value;
    }

    get unit(): GbOrTb {
        return this._unit.value;
    }

    constructor(initialBits: number) {
        this._unit.value = initialBits > 1073741824 * 1024 / 4 ? 'TB' : 'GB';

        if (this._unit.value === 'GB') {
            this._bits.value = Math.round(
                (Math.round(initialBits / this.bitsGb)) * this.bitsGb
            );
        } else {
            this._bits.value = (
                Math.round(initialBits / (this.bitsTb / 1000)) * this.bitsTb
            ) / 1000;
        }
    }

    private bitsGb = 1073741824;
    private bitsTb = 1073741824 * 1024;

    get GB(): number {
        const roundBy = this.bitsGb;
        const rounded = Math.round(this.bits / roundBy) * roundBy;
        this.bits = rounded;
        return Math.round(this.bits / this.bitsGb);
    }

    set GB(gb: number) {
        this.bits = gb * this.bitsGb;
    }

    get TB(): number {
        const roundBy = this.bitsTb / 1000;
        const rounded = Math.round(this.bits / roundBy) * roundBy;
        this.bits = rounded;
        return Math.round(this.bits / this.bitsTb * 1000) / 1000;
    }

    set TB(tb: number) {
        this.bits = tb * this.bitsTb;
    }

    get value(): number {
        return this[this.unit];
    }

    set value(value_: number) {
        this[this.unit] = value_;
    }
}

class FreeSpace {
    private freeExcludeReserved: BitConverter;

    constructor(free: BitConverter, private reserved: BitConverter) {
        this.freeExcludeReserved = new BitConverter(free.bits + reserved.bits);
    }

    get bits(): number {
        return this.freeExcludeReserved.bits - this.reserved.bits;
    }

    set bits(value: number) {
        this.reserved.bits = new BitConverter(value).bits;
    }
}

type AdvancedPicked = 'url' | 'storageType' | 'storageId' | 'storageStatus' | 'isOnline';
interface AdvancedStorage extends Pick<Storage, AdvancedPicked> {
    reservedSpace: BitConverter;
    freeSpace: BitConverter;
    isUsedForWriting: Watcher<boolean>;

    remainingSpace: FreeSpace;
    maxReserve: BitConverter;
    totalSpace: BitConverter;
}

function mapStorages(
    storages: Storage[]
): [AdvancedStorage[], Watcher<unknown>[]] {
    const advancedStorages: AdvancedStorage[] = [];
    const watchers: Watcher<unknown>[] = [];

    storages.forEach(s => {
        const totalSpace = new BitConverter(s.totalSpace);
        const reservedSpace = new BitConverter(s.reservedSpace);
        const freeSpace = new BitConverter(s.freeSpace);
        const remainingSpace = new FreeSpace(
            new BitConverter(freeSpace.bits - reservedSpace.bits),
            reservedSpace
        );
        const maxReserve = new BitConverter(freeSpace.bits + s.vmsSpace);
        const isUsedForWriting = new Watcher<boolean>();
        isUsedForWriting.value = s.usedForWriting;

        advancedStorages.push({
            ...s,
            freeSpace,
            reservedSpace,
            totalSpace,
            isUsedForWriting,
            maxReserve,
            remainingSpace,
        });
        watchers.push(...reservedSpace.watcher, isUsedForWriting);
    });

    return [advancedStorages, watchers];
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-server-advanced-storage-component',
    templateUrl: 'server-storage-adv.component.html',
    styleUrls: ['server-storage-adv.component.scss']
})
export class NxSystemAdvancedStorageComponent implements OnDestroy, OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    currentStorageState: CurrentStorageState;
    loading: boolean = true;
    showStorage: boolean = false;
    systemSubscription: Subscription;
    saveSettings: Process;
    storages: AdvancedStorage[] = [];
    watchers: Watcher<unknown>[] = [];
    failedToLoad = false;

    Math = Math;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.config;
    }

    ngOnChanges(changes: NgChanges<NxSystemAdvancedStorageComponent>): void {
        if (changes.system || changes.serverId) {
            this.init();
        }
    }

    init(): void {
        this.loading = true;
        if (this.system.currentServerNotBusy) {
            if (this.system?.serverManager.servers?.length) {
                this.updateAndGetStorage();
            }
        }
    }

    isInacessible(storage: AdvancedStorage): boolean {
        return storage.storageStatus.includes(STORAGE_STATUS.INACCESSIBLE) || !storage.isOnline;
    }

    clamp(input: number, storage: AdvancedStorage): void {
        const max = Math.min(
            storage.maxReserve[storage.reservedSpace.unit],
            storage.totalSpace[storage.reservedSpace.unit],
        );
        const current = storage.reservedSpace.value;
        const roundTo = storage.reservedSpace.unit === 'GB' ? 0 : 3;
        const updated = Number(Math.min(Math.max(input, 0), max).toFixed(roundTo));
        if (updated === current && current !== input) {
            // Force change detection to update input value if model gets out of sync with input
            storage.reservedSpace.value = 0;
        }
        setTimeout(() => {
            storage.reservedSpace.value = updated;
        });
    }

    resetWatchers(): void {
        this.watchers.forEach(watcher => watcher.reset());
    }

    updateWatchers(): void {
        this.watchers.forEach(watcher => {
            watcher.originalValue = watcher.value;
        });
    }

    get watchersChanged(): boolean {
        return this.watchers.some(w => w.originalValue !== w.value);
    }

    updateAndGetStorage(): void {
        this.system.storageManager.storageState$.pipe(
            filter(({ storageInfoLoaded }) => storageInfoLoaded)
        ).subscribe(currentState => {
            this.loading = false;
            this.failedToLoad = false;
            this.showStorage = !!currentState.locations.length;

            if (
                this.showStorage &&
                this.currentStorageState?.locations?.length ===
                currentState.locations?.length &&
                this.watchersChanged
            ) {
                return; // if things seem same do not interrupt user
            }

            this.currentStorageState = currentState;
            if (!this.showStorage) {
                this.storages = [];
                this.watchers = [];
            } else {
                [this.storages, this.watchers] = mapStorages(
                    currentState.locations
                );
                this.updateSaveProcess();
            }
        });
    }

    private saveStorages(): void {
        this.storages.forEach(({ storageId: id, isUsedForWriting, reservedSpace }) => {
            const storage = this.currentStorageState.locations
                .find(({ storageId }) => storageId === id);
            storage.usedForWriting = isUsedForWriting.value;
            storage.reservedSpace = Math.round(reservedSpace.bits);
        });

        this.currentStorageState.saveStorages()
            .toPromise().then(response => {
                if (response.error !== undefined && response.error !== '0') {
                    const errorToShow = response.errorString;
                    this.dialogsService
                        .alert(errorToShow, this.LANG.dialogs.titles.error())
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.storageSettingsSaved(),
                            this.LANG.dialogs.titles.success()
                        ).catch(error => {
                            console.error(error);
                        });
                }
            }, () => {
                this.dialogsService
                    .alert(
                        this.LANG.dialogs.message.storageSettingsNotSaved(),
                        this.LANG.dialogs.titles.error()
                    ).catch(error => {
                        console.error(error);
                    });
            }).then(() => {
                this.updateWatchers();
            });
    }

    updateSaveProcess(): void {
        this.saveSettings = this.processService.createProcess(() => {
            const overwrite = this.storages.some(s =>
                s.remainingSpace.bits < 0
            );
            if (overwrite) {
                return this.dialogsService.reserveSpaceWarning()
                    .then((res: string | void) => {
                        if (res === 'accept') {
                            this.saveStorages();
                        }
                    });
            } else {
                this.saveStorages();
                return Promise.resolve();
            }
        });
    }

    friendlyBytes(bits: number, gbTb?: GbOrTb): string {
        const { locale } = this;
        return bitsToString(
            bits,
            {
                locale,
                roundTo: gbTb === 'TB' ? 1073741824 * 102.4 : 1073741824
            }
        );
    }

    ngOnDestroy(): void { }
}
