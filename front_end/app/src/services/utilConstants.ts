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

export {
    BYTE_UNITS,
    BIT_UNITS,
    BPS_UNITS,
    IFromBytesOptions,
    UnitTypeOptions,
    Byte,
    Bit,
    Bps,
    toLocaleString
};
