import { combineLatest, Observable, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const BYTE_UNITS: Byte[] = [
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

interface IFromBytesOptions {
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

const toLocaleString = (number: number, locale): string | number =>
    typeof locale === 'string'
        ? number.toLocaleString(locale)
        : locale
            ? number.toLocaleString()
            : number;

/**
 * Use this to enforce that class implementation exactly matches interface or other class.
 *
 * Usage:
 * class Example implements Exacty<InterfaceOrClass, Example>{}
 */
type Exactly<T, U> = { [K in keyof U]: K extends keyof T ? T[K] : never };

export {
    BYTE_UNITS,
    BIT_UNITS,
    BPS_UNITS,
    IFromBytesOptions,
    UnitTypeOptions,
    Byte,
    Bit,
    Bps,
    toLocaleString,
    Exactly
};

/**
* Provides a fallback value for errors.
*/
export const fallback = <T>(value: T) => catchError(() => Promise.resolve(value));

/**
 * Use for async tasks that run quickly but for the UI you'd like to delay initial output of stream.
 */
export const delayInitial = <Source>(source: Observable<Source> | Promise<Source>, msDelay = 750) => combineLatest([source, timer(msDelay)]).pipe(map(([source]) => source));
