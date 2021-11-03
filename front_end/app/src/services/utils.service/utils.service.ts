import {
    Inject, Injectable, LOCALE_ID
}                                   from '@angular/core';
import { DOCUMENT }                 from '@angular/common';
import { DeviceDetectorService }    from 'ngx-device-detector';

import * as uv     from './utilConstants';
import { isArray } from 'rxjs/internal-compatibility';

@Injectable({
    providedIn: 'root'
})
export class NxUtilsService {
    public static sortASC = true;
    public static sortDESC = false;
    public momentWithLocale

    constructor(
        private deviceService: DeviceDetectorService,
        @Inject(LOCALE_ID) private locale: string,
        @Inject(DOCUMENT) private document: Document
    ) {
        import('moment').then(moment => {
            this.momentWithLocale = moment.locale(locale);
        });
    }

    static cleanId(id: string | undefined) {
        return id?.replace(/{|}/g, '');
    }

    static cleanIp(ip: string) {
        const checkIpv6 = /^(?:(?:(?:[0-9A-Fa-f]{0,4}:){7}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}:[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){5}:(?:[0-9A-Fa-f]{0,4}:)?[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){4}:(?:[0-9A-Fa-f]{0,4}:){0,2}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){3}:(?:[0-9A-Fa-f]{0,4}:){0,3}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){2}:(?:[0-9A-Fa-f]{0,4}:){0,4}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:(?:[0-9A-Fa-f]{0,4}:){0,5}:(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:::(?:[0-9A-Fa-f]{0,4}:){0,5}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:[0-9A-Fa-f]{0,4}::(?:[0-9A-Fa-f]{0,4}:){0,5}[0-9A-Fa-f]{0,4})|(?:::(?:[0-9A-Fa-f]{0,4}:){0,6}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){1,7}:))$/;
        return (ip.match(checkIpv6) || ip.split(':'))[0];
    }

    static move<T>(arr: T[], oldIndex: number, newIndex: number): T[] {
        while (oldIndex < 0) {
            oldIndex += arr.length;
        }
        while (newIndex < 0) {
            newIndex += arr.length;
        }
        if (newIndex >= arr.length) {
            let k = newIndex - arr.length;
            while ((k--) + 1) {
                arr.push(undefined);
            }
        }
        arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
        return arr;
    };

    static isEqual<T>(obj1: T, obj2: T) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    static deepCopy<T extends {}>(obj: T): T {
        // will not copy any methods ... i.e. pluralization functions
        return JSON.parse(JSON.stringify(obj));
    }

    static deepCopyWithCircularReference(obj, hash = new WeakMap()) {
        if (Object(obj) !== obj || obj instanceof Function) return obj;
        if (hash.has(obj)) return hash.get(obj); // Cyclic reference
        const result = Object.create(Object.getPrototypeOf(obj));
        if (obj instanceof Map) {
            Array.from(obj, ([key, val]) => result.set(NxUtilsService.deepCopyWithCircularReference(key, hash),
                NxUtilsService.deepCopyWithCircularReference(val, hash)));
        } else if (obj instanceof Set) { Array.from(obj, (key) => result.add(NxUtilsService.deepCopyWithCircularReference(key, hash))); }
        hash.set(obj, result);
        return Object.assign(result, ...Object.keys(obj).map(
            key => ({ [key]: NxUtilsService.deepCopyWithCircularReference(obj[key], hash) })));
    }

    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    // Sort array of objects
    static byParam<Param extends any>(fn: (params: Param) => string | number, order: boolean) {
        return (a: Param, b: Param) => {
            if (fn(a) < fn(b)) {
                return (order) ? -1 : 1;
            }
            if (fn(a) > fn(b)) {
                return (order) ? 1 : -1;
            }
            return 0;
        };
    }

    /**
     * Looks to be unused
     */
    public keepOriginalOrder = (a, b) => a.key;

    /**
     * Looks to be unused
     */
    static byResolution(fn: (any) => any, order: boolean) {
        return (a, b) => {
            const x = fn(a).map(Number);
            const y = fn(b).map(Number);

            if (x[0] < y[0] || x[1] < y[1]) {
                return (order) ? -1 : 1;
            }
            if (x[0] > y[0] || x[1] > y[1]) {
                return (order) ? 1 : -1;
            }
            return 0;
        };
    }

    static yesNo<T>(bVal: T): string {
        if (bVal === undefined || bVal === null) {
            return 'Unknown';
        }

        return bVal ? 'Yes' : 'No';
    }

    static mod(n: number, m: number) {
        return ((n % m) + m) % m;
    }

    /**
     * Parse url string to:
     *   href,
     *   protocol -> match[1],
     *   host     -> match[2],
     *   hostname -> match[3],
     *   port     -> match[4],
     *   pathname -> match[5],
     *   search   -> match[6],
     *   hash     -> match[7]
     *
     * */
    static getRelativeLocation(href: string): string {
        // eslint-disable-next-line no-useless-escape
        const match = href.match(/^(https?:)?\/\/(([^:\/?#]*)(?::([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
        if (match) {
            return match[5] + match[6] + match[7];
        } else {
            // href not recognized as valid url
            return href;
        }
    }

    public saveAs(data: BlobPart, filename: string, type: string) {
        const a: HTMLAnchorElement = this.document.createElement('a') as HTMLAnchorElement;
        let objectUrl;
        let blob: Blob;

        data = JSON.stringify(data);

        if (this.deviceService.isDesktop()) {
            blob = new Blob([data], { type });
            if (navigator.msSaveOrOpenBlob) {
                navigator.msSaveOrOpenBlob(blob, filename);
                return false;
            }
            objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
        } else {
            a.href = 'data:' + type + ';charset=UTF-8,' + encodeURIComponent(data);
        }

        a.download = filename;

        this.document.body.appendChild(a);

        // Safari in HM standalone does not work without timeout after appendChild, reason unclear
        // TODO: Investigate why download doesn't work without timeout
        setTimeout(() => {
            a.click();
            this.document.body.removeChild(a);
        });

        // revokeObjectURL breaks download on MSEdge and Firefox
        // URL.revokeObjectURL(objectUrl);
    }

    // static timestamp methods
    public msFromNowToString(input: number, suffix = false): string {
        return this.momentWithLocale().subtract(input).fromNow(!suffix);
    }

    public isTablet() {
        return this.deviceService.isTablet();
    }

    public isMobile() {
        return this.deviceService.isMobile();
    }

    public isChrome() {
        return this.deviceService.browser === 'Chrome';
    }

    public isSafari() {
        return this.deviceService.browser === 'Safari';
    }

    /**
     * Return IPv4 address or IPv6 address if none
     */
    static formatURL<T extends any>(server: any) {
        function ipReducer(result: {ipv6: string[], ipv4: string[]}, currentValue: string) {
            if (currentValue[0] === '[') {
                result.ipv6.push(currentValue);
            } else if (currentValue) {
                result.ipv4.push(currentValue);
            }
            return result;
        }

        const addr = server.networkAddresses.split(';');
        const addresses = addr.reduce(ipReducer, { ipv4: [], ipv6: [] });

        if (addresses.ipv4.length > 0) {
            const [ip, port] = addresses.ipv4[0].split(':');
            server.ip = ip;
            server.port = port || '';
        } else if (addresses.ipv6.length > 0) {
            if (addresses.ipv6[0].indexOf('[') === 0) {
                const [ip, port] = addresses.ipv6[0].split(']:');
                server.ip = ip.substring(1);
                server.port = port || '';
            } else {
                server.ip = addresses.ipv6[0];
                server.port = '';
            }
        } else {
            server.ip = 'N/A';
            server.port = '';
        }

        return server;
    };

    /** Storage Utilities */

    /*
        Formats the given number using `Number#toLocaleString`.
        - If locale is a string, the value is expected to be a locale-key (for example: `de`).
        - If locale is true, the system default locale is used for translation.
        - If no value for locale is specified, the number is returned unmodified.
    */
    // Need to add logic to figure out rounding
    static fromBits(number: number, options?: uv.IFromBytesOptions): string {
        const defaultOptions: uv.IFromBytesOptions = { unitType: 'byte' }; // round to GB / 10 bits
        options = { ...defaultOptions, ...options };

        if (typeof options.roundTo === 'number') {
            number = Math.round(number / options.roundTo) * options.roundTo;
        } else if (options.roundTo) {
            // TODO: Need to figure out how to take an object {unit: 'GB', toDecimal: 1} and use it to figure out rounding
            throw new Error("I haven't implemented this feature yet...");
        }

        const unitList = {
            bit: uv.BIT_UNITS,
            byte: uv.BYTE_UNITS,
            bps: uv.BPS_UNITS
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
            const numberString = uv.toLocaleString(number, options.locale);
            return prefix + numberString + ' ' + UNITS[0];
        }

        const getLog = (num: number): number =>
            is1024 ? Math.log2(num) / 10 : Math.log10(num) / 3;
        const exponent = Math.min(Math.floor(getLog(number)), UNITS.length - 1);

        number = Math.round(Number(number / Math.pow(base, exponent)) * 100) / 100; // round 2 decimals
        const numberString = uv.toLocaleString(number, options.locale);

        const unit = UNITS[exponent];

        return `${prefix}${numberString} ${unit}`;
    };

    static wrapWithPercent = (numerator: number, denominator: number, wrappedValue: string | number, precision = 2) => {
        const percentage = (numerator / denominator) * 100;
        return `${precision ? percentage.toPrecision(precision) : percentage}% (${wrappedValue})`;
    };

    static isNumber(n): boolean {
        return !isNaN(parseFloat(n)) && !isNaN(n - 0);
    };

    static cleanSmbUrl(url: string) {
        return url.split('@').reverse()[0].replace('smb:/', '');
    }

    static htmlWiper(target) {
        // test HTML
        // <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=" onload="$.getScript('evil.js');1<2>3">
        return (isArray(target) ? target[0] : target)?.replace(new RegExp(/(<.*>)|(>.*[\/]?>)/, 'gi'), '');
    }

    static htmlToEntity(target) {
        return (isArray(target) ? target[0] : target)?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    static findTouch(e: TouchEvent) {
        return e.targetTouches?.[0] || e.changedTouches?.[0] || e.touches?.[0];
    }

    static calcClientX(e: MouseEvent|TouchEvent): number {
        let clientX;
        if (e instanceof MouseEvent || 'clientX' in e) {
            clientX = e.clientX;
        } else {
            clientX = NxUtilsService.findTouch(e).clientX || 0;
        }
        return clientX;
    }

    static calcOffsetX(e: MouseEvent|TouchEvent): number {
        let offsetX;
        if (e instanceof MouseEvent || 'offsetX' in e) {
            offsetX = e.offsetX;
        } else {
            // @ts-ignore
            const rect = (e.target)?.getBoundingClientRect();
            offsetX = (NxUtilsService.findTouch(e)?.pageX || 0) - rect.left;
        }
        return offsetX;
    }

    static calcOffsetY(e: MouseEvent|TouchEvent): number {
        let offsetY;
        if (e instanceof MouseEvent || 'offsetY' in e) {
            offsetY = e.offsetY;
        } else {
            // @ts-ignore
            const rect = (e.target)?.getBoundingClientRect();
            offsetY = (NxUtilsService.findTouch(e)?.pageY || 0) - rect.top;
        }
        return offsetY;
    }

    static calcScreenX(e: MouseEvent|TouchEvent): number {
        let screenX;
        if (e instanceof MouseEvent || 'screenX' in e) {
            screenX = e.screenX;
        } else {
            screenX = NxUtilsService.findTouch(e)?.screenX || 0;
        }
        return screenX;
    }

    static highlight = (
        text: string, start, end
    ) => [0, start || 0, end || 0].map((
        splitAt, curInd, fullText
    ) => text.slice(
        splitAt, fullText[curInd + 1]
    )).reduce((
        result, section, curInd
    ) => `${result}${curInd === 1 ? `<strong class="highlighted">${section}</strong>` : section}`, '');

    static mapValuesToStrings = (obj) => {
        Object.keys(obj).forEach(key => {
            const isObject = typeof obj[key] === 'object';
            const isArray = Array.isArray(obj[key]);
            if (isArray) {
                obj[key] = obj[key].map(val => '' + val);
            } else if (isObject) {
                return NxUtilsService.mapValuesToStrings(obj[key]);
            } else {
                obj[key] = '' + obj[key];
            }
        });
        return obj;
    };
}
