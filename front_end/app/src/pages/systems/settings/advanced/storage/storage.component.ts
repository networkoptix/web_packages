import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy, LOCALE_ID
}                                     from '@angular/core';
import {
    filter, map, delay,
    retryWhen
}                                     from 'rxjs/operators';
import { Subscription }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService } from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../../language_i18n_static_types';
import { NxSystem } from '../../../../../services/system.service';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxApplyService } from '../../../../../services/apply.service';
import { NxProcessService } from '../../../../../services/process.service';
import { NxDialogsService } from '../../../../../dialogs/dialogs.service';
import { NxSettingsService } from '../../settings.service';
import { NxMenuService } from '../../../../../components/menu/menu.service';
import { NxUriService } from '../../../../../services/uri.service';

export class BitConverter {
    constructor(public bits: number) {}

    private bitsGb = 1073741824;
    private bitsTb = 1073741824 * 102.4

    get gb(): number { return this.bits / this.bitsGb; }
    set gb(gb: number) { this.bits = gb * this.bitsGb; }

    get tb(): number { return this.bits / this.bitsTb; }
    set tb(tb: number) { this.bits = tb * this.bitsTb; }
}

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-storage-component',
    templateUrl : 'storage.component.html',
    styleUrls   : ['storage.component.scss']
})
export class NxSystemAdvancedStorageComponent implements OnDestroy {
    // TODO: Replace with request to system
    response = {
        error       : '0',
        errorString : '',
        reply       : {
            storageProtocols: [
                'smb'
            ],
            storages: [
                {
                    freeSpace        : 1837679546368,
                    isBackup         : false,
                    isExternal       : false,
                    isOnline         : true,
                    isUsedForWriting : true,
                    isWritable       : true,
                    reservedSpace    : 32212254720,
                    storageId        : '{301a17be-003c-7302-b28a-ccdc1a4c4a63}',
                    storageStatus    : 'used|system',
                    storageType      : 'local',
                    totalSpace       : 1964203130880,
                    url              : '/opt/networkoptix/mediaserver/var/data'
                },
                {
                    freeSpace        : 183767954636 * 3,
                    isBackup         : false,
                    isExternal       : false,
                    isOnline         : true,
                    isUsedForWriting : false,
                    isWritable       : true,
                    reservedSpace    : 32212254720,
                    storageId        : '{301a17be-003c-7302-b28a-ccdc1a4c4a63}',
                    storageStatus    : 'used|system',
                    storageType      : 'local',
                    totalSpace       : 1964203130880,
                    url              : '/opt/networkoptix/mediaserver/var/second'
                },
                {
                    freeSpace        : 183767954636 * 2,
                    isBackup         : false,
                    isExternal       : false,
                    isOnline         : true,
                    isUsedForWriting : false,
                    isWritable       : false,
                    reservedSpace    : 32212254720,
                    storageId        : '{301a17be-003c-7302-b28a-ccdc1a4c4a63}',
                    storageStatus    : 'used|system',
                    storageType      : 'local',
                    totalSpace       : 1964203130880,
                    url              : '/opt/networkoptix/mediaserver/var/third'
                }
            ]
        }
    }

    storages = this.response.reply.storages.map(({ freeSpace: free, reservedSpace: reserved, totalSpace: total, ...storage }) => {
        const freeSpace = new BitConverter(free);
        const reservedSpace = new BitConverter(reserved);
        const totalSpace = new BitConverter(total);
        return { ...storage, freeSpace, reservedSpace, totalSpace };
    });

    units = [
        // 'B',
        // 'kB',
        // 'MB',
        'GB',
        'TB'
        // 'PB',
        // 'EB',
        // 'ZB',
        // 'YB'
    ];

    constructor(@Inject(LOCALE_ID) private locale: string) {}

    friendlyBytes(bits, gbTb?: 'GB' | 'TB') {
        const { locale } = this;
        return fromBits(bits, { locale, roundTo: gbTb === 'TB' ? 1073741824 * 102.4 : 1073741824 });
    }

    log(event) {
        console.log(event);
    }

    ngOnDestroy() {}
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
