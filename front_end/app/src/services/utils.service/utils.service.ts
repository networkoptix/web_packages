import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, LOCALE_ID, TemplateRef } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { isArray } from 'rxjs/internal-compatibility';

import { MenuNode } from '@services/menus.service.types';

import * as uv from './utilConstants';

@Injectable({
    providedIn: 'root'
})
export class NxUtilsService {
    public static sortASC = true;
    public static sortDESC = false;
    public momentWithLocale;

    constructor(
        private deviceService: DeviceDetectorService,
        @Inject(LOCALE_ID) private locale: string,
        @Inject(DOCUMENT) private document: Document
    ) {
        import('moment').then(moment => {
            this.momentWithLocale = moment.locale(locale);
        });
    }

    static cleanId(id: unknown): string | undefined {
        return (id as string)?.replace(/{|}/g, '');
    }

    static cleanIp(ip: string): string {
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
    }

    static isEqual<T>(obj1: T, obj2: T): boolean {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    static deepCopy<T extends {}>(obj: T): T {
        // will not copy any methods ... i.e. pluralization functions
        return JSON.parse(JSON.stringify(obj));
    }

    static deepCopyWithCircularReference<T extends Object>(obj: T, hash = new WeakMap()): T {
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

    static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    // Sort array of objects
    static byParam<Param = unknown>(
        fn: (params: Param) => string | number,
        order: boolean
    ): (a: Param, b: Param) => number {
        return (a, b) => {
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
     * Pass a function that evaluates a menu node to fulfill a specific condition,
     * findMenuNode will traverse an array of menuNodes and try to find a node that fulfills the conditionalFunction
     */
    static findMenuNode(nodes: MenuNode[], conditionalFunction: (node: MenuNode) => boolean) {
        let foundNode = null;
        const findNode = (node: MenuNode) => {
            if (conditionalFunction(node)) {
                foundNode = node;
                return;
            }
            for (const childNode of node.nodes) {
                findNode(childNode);
            }
        };
        for (const rootNode of nodes) {
            if (!foundNode) {
                findNode(rootNode);
            }
        }
        return foundNode;
    }

    /**
     * Looks to be unused
     */
    // public keepOriginalOrder = (a, b) => a.key;

    /**
     * Looks to be unused
     */
    // static byResolution(fn: (any) => any, order: boolean) {
    //     return (a, b) => {
    //         const x = fn(a).map(Number);
    //         const y = fn(b).map(Number);

    //         if (x[0] < y[0] || x[1] < y[1]) {
    //             return (order) ? -1 : 1;
    //         }
    //         if (x[0] > y[0] || x[1] > y[1]) {
    //             return (order) ? 1 : -1;
    //         }
    //         return 0;
    //     };
    // }

    static yesNo(bVal: unknown): string {
        if (bVal === undefined || bVal === null) {
            return 'Unknown';
        }

        return bVal ? 'Yes' : 'No';
    }

    static mod(n: number, m: number): number {
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

    // TODO: In Angular13 branch when replacing exportCSV I modified file save too - this should go!
    public saveAs(data: BlobPart, filename: string, type: string): boolean | void {
        const a: HTMLAnchorElement = this.document.createElement('a');
        let objectUrl: string;
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
        setTimeout(() => {
            a.click();
            this.document.body.removeChild(a);
        });

        // revokeObjectURL breaks download on MSEdge and Firefox
        // URL.revokeObjectURL(objectUrl);
    }

    static isUUID(value) {
        const uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');
        return uuidRegex.test(value);
    }

    // static timestamp methods
    public msFromNowToString(input: number, suffix = false): string {
        return this.momentWithLocale().subtract(input).fromNow(!suffix);
    }

    public isTablet(): boolean {
        return this.deviceService.isTablet();
    }

    public isMobile(): boolean {
        return this.deviceService.isMobile();
    }

    public isChrome(): boolean {
        return this.deviceService.browser === 'Chrome';
    }

    public isSafari(): boolean {
        return this.deviceService.browser === 'Safari';
    }

    /**
     * Return IPv4 address or IPv6 address if none
     */
    static formatURL(server) {
        function ipReducer(
            result: { ipv6: string[], ipv4: string[] },
            currentValue: string
        ) {
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
            if (addresses.ipv6[0].startsWith('[')) {
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
    }

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
        let exponent = Math.min(Math.floor(getLog(number)), UNITS.length - 1);

        number = number / Math.pow(base, exponent);

        /* A fix to cover the "blind spot" from 1000-1024 created by
        directly displaying binary storage values as decimal */
        if (number >= 1000 && number < 1024 && exponent < UNITS.length - 1) {
            number = number / 1024;
            exponent += 1;
        }

        number = Math.round(number * 100) / 100; // round 2 decimals
        const numberString = uv.toLocaleString(number, options.locale);

        const unit = UNITS[exponent];

        return `${prefix}${numberString} ${unit}`;
    }

    static wrapWithPercent(
        numerator: number,
        denominator: number,
        wrappedValue: string | number,
        precision = 2
    ): string {
        const percentage = (numerator / denominator) * 100;
        return `${precision ? percentage.toPrecision(precision) : percentage}% (${wrappedValue})`;
    }

    static isNumber(n: any): boolean {
        return !isNaN(parseFloat(n)) && !isNaN(n - 0);
    }

    static cleanSmbUrl(url: string): string {
        return url.split('@').reverse()[0].replace('smb:/', '');
    }

    static htmlWiper(target: string[] | string): string {
        // test HTML
        // <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=" onload="$.getScript('evil.js');1<2>3">
        return (isArray(target) ? target[0] : target)?.replace(new RegExp(/(<.*>)|(>.*[\/]?>)/, 'gi'), '');
    }

    static htmlToEntity(target: string[] | string): string {
        return (isArray(target) ? target[0] : target)?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    static findTouch(e: TouchEvent): Touch | undefined {
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

    static calcOffsetX(e: MouseEvent | TouchEvent): number {
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

    static calcOffsetY(e: MouseEvent | TouchEvent): number {
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

    static highlight(text: string, start?: number, end?: number): string {
        start = start ?? 0;
        end = end ?? text.length;
        const head = text.slice(0, start);
        const highlighted =
            `<strong class="highlighted">${text.slice(start, end)}</strong>`;
        const tail = text.slice(end);
        return `${head}${highlighted}${tail}`;
    };

    static mapValuesToStrings(
        obj: Record<string, unknown>
    ): Record<string, string | string[]> {
        Object.values(obj).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                obj[key] = value.map(String);
            // } else if (typeof value === 'object') {
            //     return NxUtilsService.mapValuesToStrings(value);
            // Branch doesn't appear to do anything
            } else {
                obj[key] = String(value);
            }
        });
        return obj as Record<string, string | string[]>;
    }

    /* Create pseudo anchor out of an element and attach an event handler
    * typical usage is element supplied by translations i.e. "Blah <span id=\"target\">{number}</span>"
    * @param {object[]} targetArr Array to store current targets(anchors) ... needed for handlers cleanup
    * @param {HTMLElement} target Element we want to make an anchor
    * @param {TemplateRef} template Template to show or "undefined"
    * @param {string} eventType
    * @param {Function} handler Function to be caller on event ...
    * ... function should be passed bind to "this" (this.showPopoverWithTemplate.bind(this))
    * ... or if specific/no additional params as () => { this.onFeedbackClick.emit('page'); }
    */
    static addPseudoAnchor(targetArr: object[], target: HTMLElement, template: TemplateRef<any>, eventType: string, handler: Function) {
        const newTarget = {
            id: `${target.id}`,
            target: target,
            eventType,
            handler: (event) => handler(template, event.target)
        };
        targetArr.push(newTarget);
        NxUtilsService.createPseudoAnchor(target, eventType, newTarget.handler);
    }

    static clearPseudoAnchors(targetArr: object[]) {
        targetArr.forEach(({ target, eventType, handler }: any) => {
            target.removeEventListener(eventType, handler);
        });
        return [];
    }

    private static createPseudoAnchor(target: HTMLElement, eventType: string, handler: (event: Event) => void) {
        target.classList.add('pseudo-anchor');
        target.addEventListener(eventType, handler);
    }
}
