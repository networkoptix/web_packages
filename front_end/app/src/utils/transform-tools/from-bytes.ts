const BYTE_UNITS = [
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

const BIT_UNITS = [
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

/*
Formats the given number using `Number#toLocaleString`.
- If locale is a string, the value is expected to be a locale-key (for example: `de`).
- If locale is true, the system default locale is used for translation.
- If no value for locale is specified, the number is returned unmodified.
*/

const toLocaleString = (number: number, locale): string | number => (
    typeof locale === 'string'
        ? number.toLocaleString(locale)
        : locale === true
            ? number.toLocaleString()
            : number);

export const fromBytes = (number: number, options: IFromBytesOptions = { bits: false, base: 1024 }): string => {
    const UNITS = options.bits ? BIT_UNITS : BYTE_UNITS;
    const is1024 = options.base === 1024;

    if (options.signed && number === 0) {
        return ' 0 ' + UNITS[0];
    }

    const isNegative = number < 0;
    const prefix = isNegative ? '-' : (options.signed ? '+' : '');

    if (isNegative) {
        number = -number;
    }

    if (number < 1) {
        const numberString = toLocaleString(number, options.locale);
        return prefix + numberString + ' ' + UNITS[0];
    }

    const getLog = (num: number): number => is1024 ? Math.log2(num) / 10 : Math.log10(num) / 3;
    const exponent = Math.min(Math.floor(getLog(number)), UNITS.length - 1);

    number = Number((number / Math.pow(options.base, exponent)).toPrecision(3));
    const numberString = toLocaleString(number, options.locale);

    const unit = UNITS[exponent];

    return prefix + numberString + ' ' + unit;
};

export interface IFromBytesOptions {
    bits: boolean
    base: 1000 | 1024
    signed?: boolean
    locale?: string | boolean
}
