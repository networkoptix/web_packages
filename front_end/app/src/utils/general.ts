/* General-purpose utility functions not strongly associated with/specialized
for a particular part of the codebase. No in-house specific types/structures. */

import type { TemplateRef } from '@angular/core';
import { last } from 'lodash-es';
import { combineLatest, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

/* String */
export function cleanId(id: unknown): string | undefined {
    return (id as string)?.replace(/{|}/g, '');
}

export function cleanIp(ip: string): string {
    const checkIpv6 = /^(?:(?:(?:[0-9A-Fa-f]{0,4}:){7}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}:[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){5}:(?:[0-9A-Fa-f]{0,4}:)?[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){4}:(?:[0-9A-Fa-f]{0,4}:){0,2}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){3}:(?:[0-9A-Fa-f]{0,4}:){0,3}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){2}:(?:[0-9A-Fa-f]{0,4}:){0,4}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:(?:[0-9A-Fa-f]{0,4}:){0,5}:(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:::(?:[0-9A-Fa-f]{0,4}:){0,5}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:[0-9A-Fa-f]{0,4}::(?:[0-9A-Fa-f]{0,4}:){0,5}[0-9A-Fa-f]{0,4})|(?:::(?:[0-9A-Fa-f]{0,4}:){0,6}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){1,7}:))$/;
    return (ip.match(checkIpv6) || ip.split(':'))[0];
}

export function isUUID(value: string): boolean {
    const uuidRegex = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');
    return uuidRegex.test(value);
}

export function cleanSmbUrl(url: string): string {
    return last(url.split('@')).replace('smb:/', '');
}

export function htmlToEntity(target: string[] | string): string {
    return (Array.isArray(target) ? target[0] : target)
        ?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlight(text: string, start?: number, end?: number): string {
    start = start ?? 0;
    end = end ?? text.length;
    const head = text.slice(0, start);
    const highlighted =
        `<strong class="highlighted">${text.slice(start, end)}</strong>`;
    const tail = text.slice(end);
    return `${head}${highlighted}${tail}`;
};

/* Number */
export function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

export function wrapWithPercent(
    numerator: number,
    denominator: number,
    wrappedValue: string | number,
    precision = 2
): string {
    const percentage = (numerator / denominator) * 100;
    return `${precision ? percentage.toPrecision(precision) : percentage}% (${wrappedValue})`;
}

/* Array */
export function moveArrayElem<T>(
    arr: T[],
    oldIndex: number,
    newIndex: number
): T[] {
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

/** Generates a sorting function for use with `Array.sort()`.
 * @param fn - A function which will be passed the array items being compared
 * @param ascendingOrder - Sort by ascending order (default)
*/
export function paramSortFunc<Param = unknown>(
    fn: (param: Param) => unknown,
    ascendingOrder: boolean = true
): (a: Param, b: Param) => number {
    return (a, b) => {
        if (fn(a) < fn(b)) {
            return (ascendingOrder) ? -1 : 1;
        }
        if (fn(a) > fn(b)) {
            return (ascendingOrder) ? 1 : -1;
        }
        return 0;
    };
}

export function mapValuesToStrings(
    obj: Record<string, unknown>
): Record<string, string> {
    Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            obj[key] = value.map(String).join(',');
        // } else if (typeof value === 'object') {
        //     mapValuesToStrings(value);
        // Branch doesn't appear to do anything
        } else {
            obj[key] = String(value);
        }
    });
    return obj as Record<string, string>;
}

/**
 * Helper function to initialize local variables from object properties named in  `keys`.
 *
 * USAGE: `pickFrom(this.dialogData, ['serverId', 'storageManager', 'cancelPolls'] , this)`;
 *
 * @param {Record<string, any>} source An object with targeted properties
 * @param {string[]} keys An array with key names to be targeted
 * @param {Record<string, any>} target Specifies the object to be updated with  extracted properties
 * @param {boolean} updateTarget
 */
export function pickFrom<
    S extends Record<string, any>,
    O extends Record<string, any>,
>(
    source: S,
    keys: (keyof S)[],
): O;
export function pickFrom<
    S extends Record<string, any>,
    T extends Record<string, any>,
    O extends T = T,
>(
    source: S,
    keys: (keyof S & keyof O)[],
    target: T,
    updateTarget?: boolean
): O;
export function pickFrom<
    S extends Record<string, any>,
    T extends Record<string, any>,
    O extends Record<string, any>
>(
    source: S,
    keys: (keyof S)[],
    target: T,
    updateTarget: false
): Record<keyof T | keyof O, any>;
export function pickFrom(
    source: Record<string, any>,
    keys: string[],
    target: Record<string, any> = {},
    updateTarget: boolean = true
): Record<string, any> {
    return keys.reduce((acc, key) => {
        if (updateTarget) {
            acc[key] = source[key];
            return acc;
        }
        return { ...acc, key: source[key] };
    }, target);
};

/* DOM */
export interface PseudoAnchorTarget {
    id: string;
    target: HTMLElement;
    eventType: string;
    handler: (event: Event) => void
}

/** Create pseudo anchor out of an element and attach an event handler
 * typical usage is element supplied by translations i.e. `Blah <span  id=\"target\">{number}</span>`
 * @param {PseudoAnchorTarget[]} targetArr Array to store current targets  (anchors) ... needed for handlers cleanup
 * @param {HTMLElement} target Element we want to make an anchor
 * @param {TemplateRef} template Template to show or `undefined`
 * @param {string} eventType
 * @param {Function} handler Function to be caller on event ...
 * ... function should be passed bind to `this` (`this.showPopoverWithTemplate. bind(this)`)
 * ... or if specific/no additional params as `() => { this.onFeedbackClick.emit ('page'); }`
 */
export function addPseudoAnchor(
    targetArr: PseudoAnchorTarget[],
    target: HTMLElement,
    template: TemplateRef<any>,
    eventType: string,
    handler: (template: TemplateRef<any>, target: HTMLElement) => void
): void {
    const newTarget: PseudoAnchorTarget = {
        id: `${target.id}`,
        target: target,
        eventType,
        handler: event => handler(template, event.target as HTMLElement)
    };
    targetArr.push(newTarget);
    createPseudoAnchor(target, eventType, newTarget.handler);
}

export function clearPseudoAnchors(targetArr: PseudoAnchorTarget[]): [] {
    targetArr.forEach(({ target, eventType, handler }) => {
        target.removeEventListener(eventType, handler);
    });
    return [];
}

function createPseudoAnchor(
    target: HTMLElement,
    eventType: string,
    handler: (e: Event) => void
): void {
    target.classList.add('pseudo-anchor');
    target.addEventListener(eventType, handler);
}

/* Async */
/**
 * Use for async tasks that run quickly but for the UI you'd like to delay initial output of stream.
 */
export function delayInitial<Source>(
    source: Observable<Source> | Promise<Source>,
    msDelay = 750
) {
    return combineLatest([source, timer(msDelay)])
        .pipe(map(([source]) => source));
}

/* TypeScript */
/**
 * Use this to enforce that class implementation exactly matches interface or other class.
 *
 * Usage:
 * class Example implements Exacty<InterfaceOrClass, Example>{}
 */
export type Exactly<T, U> = { [K in keyof U]: K extends keyof T ? T[K] : never };
