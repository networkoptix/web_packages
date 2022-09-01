const BYTE_UNITS = [
    'B',
    'kB',
    'MB',
    'GB',
    'TB',
    'PB',
    'EB',
    'ZB',
    'YB',
] as const;
type Byte = typeof BYTE_UNITS[number];

const BIT_UNITS = [
    'b',
    'kbit',
    'Mbit',
    'Gbit',
    'Tbit',
    'Pbit',
    'Ebit',
    'Zbit',
    'Ybit',
] as const;
type Bit = typeof BIT_UNITS[number];

const BPS_UNITS = [
    'bps',
    'kbps',
    'Mbps',
    'Gbps',
    'Tbps',
    'Pbps',
    'Ebps',
    'Zbps',
    'Ybps',
] as const;
// type Bps = typeof BPS_UNITS[number];

const unitLists = {
    bit: BIT_UNITS,
    byte: BYTE_UNITS,
    bps: BPS_UNITS,
};

type UnitTypeOptions = 'bit' | 'byte' | 'bps';

interface IFromBytesOptions {
    unitType?: UnitTypeOptions;
    signed?: boolean;
    locale?: string | boolean;
    percentFrom?: number;
    roundTo?: number | { unit: Byte | Bit; toDecimal: number };
}

/**
 * Formats the given number using `Number.toLocaleString()`.
 * - If locale is a string, the value is expected to be a locale-key (for example: `de`).
 * - If locale is `true`, the system default locale is used for translation.
 * - If no value for locale is specified, the number is returned unmodified.
 */
function numberToLocaleString(
    number: number,
    locale?: string | boolean
): string | number {
    if (typeof locale === 'string') {
        return number.toLocaleString(locale);
    } else if (locale) {
        return number.toLocaleString();
    } else {
        return number;
    }
}

export function bitsToString(
    number: number,
    options?: IFromBytesOptions
): string {
    const defaultOptions: IFromBytesOptions = { unitType: 'byte' };
    // round to GB / 10 bits
    options = { ...defaultOptions, ...options };

    if (typeof options.roundTo === 'number') {
        number = Math.round(number / options.roundTo) * options.roundTo;
    } else if (options.roundTo) {
        // TODO: Need to figure out how to take an object {unit: 'GB', toDecimal: 1} and use it to figure out rounding
        throw new Error("I haven't implemented this feature yet...");
    }

    const UNITS = unitLists[options.unitType];
    const base = options.unitType === 'byte' ? 1024 : 1000;

    if (options.signed && number === 0) {
        return ` 0 ${UNITS[0]}`;
    }

    let prefix = '';
    if (number < 0) {
        number = -number;
        prefix = '-';
    } else if (options.signed) {
        prefix = '+';
    }

    if (number < 1) {
        const numberString = numberToLocaleString(number, options.locale);
        return `${prefix}${numberString} ${UNITS[0]}`;
    }

    function getLog(num: number): number {
        return base === 1024 ? Math.log2(num) / 10 : Math.log10(num) / 3;
    }
    const exponent = Math.min(Math.floor(getLog(number)), UNITS.length - 1);

    number = Math.round(Number(number / Math.pow(base, exponent)) * 100) / 100;
    // round 2 decimals
    const numberString = numberToLocaleString(number, options.locale);

    return `${prefix}${numberString} ${UNITS[exponent]}`;
}

export const bytesToString = (
    number: number,
    options?: IFromBytesOptions
): string => bitsToString(number * 8, options);
