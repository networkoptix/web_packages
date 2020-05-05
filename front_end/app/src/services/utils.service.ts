import {
    Inject, Injectable, LOCALE_ID
}                                   from '@angular/core';
import { NxConfigService, IConfig } from './nx-config';
import { DOCUMENT }                 from '@angular/common';
import { DeviceDetectorService }    from 'ngx-device-detector';
import * as moment                  from 'moment';

@Injectable({
    providedIn: 'root'
})
export class NxUtilsService {
    private CONFIG: IConfig;

    public static sortASC = true;
    public static sortDESC = false;
    public momentWithLocale = moment

    constructor(
        configService: NxConfigService,
        private deviceService: DeviceDetectorService,
        @Inject(LOCALE_ID) private locale: string,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.CONFIG = configService.getConfig();
        this.momentWithLocale(locale);
    }

    static cleanId(id: string) {
        return id.replace(/{|}/g, '');
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
        return JSON.parse(JSON.stringify(obj));
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

    /**
     * Return IPv4 address or IPv6 address if none
     */
    static formatURL<T extends any>(server: T) {
        function ipReducer(result: any, currentValue: any) {
            if (currentValue[0] === '[') {
                result.ipv6.push(currentValue);
            } else {
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
}
