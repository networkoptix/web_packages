import { Inject, Injectable, LOCALE_ID }       from '@angular/core';
import { NxConfigService, IConfig } from './nx-config';
import { DOCUMENT }                 from '@angular/common';
import { DeviceDetectorService }    from 'ngx-device-detector';
import * as moment from 'moment';

export interface Array {
    move(arr: Array, oldIndex: number, newIndex: number): void;
}

@Injectable({
    providedIn: 'root'
})
export class NxUtilsService {
    CONFIG: IConfig;

    public static sortASC = true;
    public static sortDESC = false;
    public momentWithLocale = moment

    constructor(configService: NxConfigService,
                private deviceService: DeviceDetectorService,
                @Inject(LOCALE_ID) private locale: string,
                @Inject(DOCUMENT) private document: Document
    ) {
        this.CONFIG = configService.getConfig();
        this.momentWithLocale(locale);
    }

    static move(arr, oldIndex, newIndex): Array {
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

    static isEqual(obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    static deepCopy(obj = {}) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Sort array of objects
    static byParam(fn: (string) => number, order: boolean) {
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

    public keepOriginalOrder = (a, b) => a.key;

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

    static yesNo(bVal: boolean | undefined | null): string {
        if (bVal === undefined || bVal === null) {
            return 'Unknown';
        }

        return bVal ? 'Yes' : 'No';
    }

    static mod(n, m) {
        return ((n % m) + m) % m;
    }

    static getRelativeLocation(href: string): string {
        /*
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

    // TODO static string methods, still need to implmement pluralize and translate
    public pluralize(qty: number, single, plural, zero = plural) {
        return `${qty} ${qty === 0 ? zero : qty === single ? single : plural}`;
    }

    public translate = (str: string) => str // TODO: Need to figure out how to do translate pipe within function

    public isTablet() {
        return this.deviceService.isTablet();
    }

    public isMobile() {
        return this.deviceService.isMobile();
    }
}
