import {
    Component, Inject, OnDestroy, LOCALE_ID, Input, OnChanges, SimpleChanges
}                                       from '@angular/core';
import { Subscription }                 from 'rxjs';
import { map }                          from 'rxjs/operators';
import { UntilDestroy }                 from '@ngneat/until-destroy';
import { NxSystem }                     from '@services/system.service';
import { LanguageI18NStaticTypes }      from '@services/../../language_i18n_static_types';
import { NxLanguageProviderService }    from '@services/nx-language-provider';
import { Watcher }                      from '@services/apply.service';
import { NxProcessService, Process }    from '@services/process.service';
import { NxDialogsService }             from '@services/../dialogs/dialogs.service';
import { IConfig, NxConfigService }      from '@services/nx-config';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-server-advanced-storage-component',
    templateUrl : 'server-storage-adv.component.html',
    styleUrls   : ['server-storage-adv.component.scss']
})
export class NxSystemAdvancedStorageComponent implements OnDestroy, OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    loading: boolean;
    showStorage: boolean;
    systemSubscription: Subscription;
    saveSettings: Process;
    storages = [];
    watchers: Watcher<any>[] = [];
    failedToLoad = false;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.config;

        this.showStorage = false;
        this.loading = true;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.system || changes.serverId) {
            this.init();
        }
    }

    init() {
        this.loading = true;
        if (this.system.currentServerNotBusy) {
            if (this.system && this.system.servers && this.system.servers.length) {
                this.updateAndGetStorage();
            }
        }
    }

    clamp(input, max, min = 0) {
        return Math.min(Math.max(input, min), max);
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
        this.system.getStorages({ id: this.serverId })
            .pipe(
                map((storages: any) => storages.map(({ id }) => id))
            ).subscribe((storageIds) => {
                if (!storageIds.length) {
                    this.loading = false;
                    this.showStorage = false;
                    this.failedToLoad = false;
                    this.storages = [];
                    this.watchers = [];
                    return;
                }
                this.system.updateOrGetSystemStorage({ serverId: this.serverId }, true).toPromise().then(response => {
                    this.loading = false;
                    this.failedToLoad = false;
                    this.showStorage = (Object.keys(response.reply.storages).length > 0);
                    const { storages, watchers } = mapStorages(response.reply.storages, storageIds);
                    this.storages = storages;
                    this.watchers = watchers;
                    this.updateSaveProcess();
                }).catch(() => {
                    this.failedToLoad = true;
                });
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
                            .alert(errorToShow, this.LANG.dialogs.titles.error?.())
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.storageSettingsSaved?.(), this.LANG.dialogs.titles.success?.())
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.storageSettingsNotSaved?.(), this.LANG.dialogs.titles.error?.())
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
        return fromBits(bits, { locale, roundTo: gbTb === 'TB' ? 1073741824 * 102.4 : 1073741824 });
    }

    ngOnDestroy() {}
}

export const toParams = (serverId) => ({ totalSpace, isBackup, reservedSpace, isUsedForWriting, url, storageType, storageId, maxReserve, ...storage }) => ({
    addParams      : [{ name: 'space', value: `${totalSpace}` }],
    id             : storageId,
    isBackup       : isBackup,
    parentId       : serverId,
    spaceLimit     : Math.round(Math.min(reservedSpace.bits, maxReserve.bits)),
    storageType    : storageType,
    // Static according saveStorages documentation /nx/vms/server/nx_vms_server_db/src/local_connection_factory.cpp
    typeId         : '{f8544a40-880e-9442-b78a-9da6db6862b4}',
    url            : url,
    usedForWriting : isUsedForWriting.value
});

export const mapStorages = (storages, storageIds) => storages.map(({ freeSpace: free, reservedSpace: reserved, totalSpace, isUsedForWriting: ufw, ...storage }) => {
    if (!storageIds.includes(storage.storageId)) {
        return false;
    }
    const reservedSpace = new BitConverter(reserved);
    const freeSpace = new BitConverter(free);
    const remainingSpace = new FreeSpace(new BitConverter(freeSpace.bits - reservedSpace._bits.originalValue), reservedSpace);
    const maxReserve = new BitConverter(freeSpace.bits + reservedSpace.bits);
    const isUsedForWriting = new Watcher<boolean>();
    isUsedForWriting.value = ufw;
    return { ...storage, freeSpace, reservedSpace, totalSpace, isUsedForWriting, maxReserve, remainingSpace, watchers: [...reservedSpace.watcher, isUsedForWriting] };
}).reduce(({ storages, watchers }, { watchers: moreWatchers, ...storage }) => storage ? ({
    storages : [...storages, storage],
    watchers : [...watchers, ...moreWatchers]
}) : { storages, watchers }, { storages: [], watchers: [] });

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

// Everything below this line copied from a utility on the cloud storage branch, remove once merged and import from transform utils

export const BYTE_UNITS: Byte[] = [
    'B',
    'kB',
    'MB',
    'GB',
    'TB',
    'PB',
    'EB',
    'ZB',
    'YB'
];

const BIT_UNITS: Bit[] = [
    'b',
    'kbit',
    'Mbit',
    'Gbit',
    'Tbit',
    'Pbit',
    'Ebit',
    'Zbit',
    'Ybit'
];

const BPS_UNITS: Bps[] = [
    'bps',
    'kbps',
    'Mbps',
    'Gbps',
    'Tbps',
    'Pbps',
    'Ebps',
    'Zbps',
    'Ybps'
];

/*
Formats the given number using `Number#toLocaleString`.
- If locale is a string, the value is expected to be a locale-key (for example: `de`).
- If locale is true, the system default locale is used for translation.
- If no value for locale is specified, the number is returned unmodified.
*/

const toLocaleString = (number: number, locale): string | number =>
    typeof locale === 'string'
        ? number.toLocaleString(locale)
        : locale === true
            ? number.toLocaleString()
            : number;

// Need to add logic to figure out rounding

export const fromBits = (
    number: number,
    options?: IFromBytesOptions
): string => {
    const defaultOptions: IFromBytesOptions = { unitType: 'byte' }; // round to GB / 10 bits
    options = { ...defaultOptions, ...options };

    if (typeof options.roundTo === 'number') {
        number = Math.round(number / options.roundTo) * options.roundTo;
    } else if (options.roundTo) {
        // TODO: Need to figure out how to take an object {unit: 'GB', toDecimal: 1} and use it to figure out rounding
        throw new Error("I haven't implemented this feature yet...");
    }

    const unitList = {
        bit  : BIT_UNITS,
        byte : BYTE_UNITS,
        bps  : BPS_UNITS
    };
    const UNITS = unitList[options.unitType];
    const base = options.unitType === 'byte' ? 1024 : 1000;
    const is1024 = base === 1024;

    if (options.signed && number === 0) {
        return ' 0 ' + UNITS[0];
    }

    const isNegative = number < 0;
    const prefix = isNegative ? '-' : options.signed ? '+' : '';

    if (isNegative) {
        number = -number;
    }

    if (number < 1) {
        const numberString = toLocaleString(number, options.locale);
        return prefix + numberString + ' ' + UNITS[0];
    }

    const getLog = (num: number): number =>
        is1024 ? Math.log2(num) / 10 : Math.log10(num) / 3;
    const exponent = Math.min(Math.floor(getLog(number)), UNITS.length - 1);

    number = Number(number / Math.pow(base, exponent)); // add toPrecision or something???
    const numberString = toLocaleString(number, options.locale);

    const unit = UNITS[exponent];

    return `${prefix}${numberString} ${unit}`;
};

export interface IFromBytesOptions {
    unitType?: UnitTypeOptions;
    signed?: boolean;
    locale?: string | boolean;
    percentFrom?: number;
    roundTo?:
        | number
        | {
              unit: Byte | Bit;
              toDecimal: number;
          };
}

type UnitTypeOptions = 'bit' | 'byte' | 'bps';

type Byte = 'B' | 'kB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB';

type Bit =
    | 'b'
    | 'kbit'
    | 'Mbit'
    | 'Gbit'
    | 'Tbit'
    | 'Pbit'
    | 'Ebit'
    | 'Zbit'
    | 'Ybit';

type Bps =
    | 'bps'
    | 'kbps'
    | 'Mbps'
    | 'Gbps'
    | 'Tbps'
    | 'Pbps'
    | 'Ebps'
    | 'Zbps'
    | 'Ybps';
