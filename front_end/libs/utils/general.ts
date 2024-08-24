/* eslint-disable @typescript-eslint/no-use-before-define */
/* General-purpose utilities. If a function/type involves in-house or
third party data/types it should probably go in nx.ts instead. */

import { Location } from '@angular/common';
import { last, zip } from 'lodash-es';
import { combineLatest, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@environments/environment';

/* String */
/** @deprecated Old version has nullish coalescing for undefined argument, but this shouldn't ever happen.
 *
 * TODO: Phase out old version and move cleaning as close to API return point as possible
 */
export function cleanIdLegacy(id: unknown): string | undefined {
    return (id as string)?.replace(/{|}/g, '');
}

const __wrappedIdRegex = /^{[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}}$/;
const __unwrappedIdRegex = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;
export function cleanId(dirtyId: string): string {
    if (!environment.production) {
        if (__unwrappedIdRegex.test(dirtyId)) {
            console.warn('Attempting to clean already clean uuid');
        } else if (!__wrappedIdRegex.test(dirtyId)) {
            console.warn('Attempting to clean non-uuid string');
        }
    }
    return dirtyId.replace(/{|}/g, '');
}

export function dirtyId(id: string): string {
    return id[0] === '{' ? id : `{${id}}`;
}

export function cleanIp(ip: string): string {
    const checkIpv6 =
        /^(?:(?:(?:[0-9A-Fa-f]{0,4}:){7}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}:[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){5}:(?:[0-9A-Fa-f]{0,4}:)?[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){4}:(?:[0-9A-Fa-f]{0,4}:){0,2}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){3}:(?:[0-9A-Fa-f]{0,4}:){0,3}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){2}:(?:[0-9A-Fa-f]{0,4}:){0,4}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){6}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:(?:[0-9A-Fa-f]{0,4}:){0,5}:(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:::(?:[0-9A-Fa-f]{0,4}:){0,5}(?:(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2}))\.){3}(?:(?:25[0-5])|(?:2[0-4]\d)|(?:1\d{2})|(?:\d{1,2})))|(?:[0-9A-Fa-f]{0,4}::(?:[0-9A-Fa-f]{0,4}:){0,5}[0-9A-Fa-f]{0,4})|(?:::(?:[0-9A-Fa-f]{0,4}:){0,6}[0-9A-Fa-f]{0,4})|(?:(?:[0-9A-Fa-f]{0,4}:){1,7}:))$/;
    return (ip.match(checkIpv6) || ip.split(':'))[0];
}

export function isUUID(value: string): boolean {
    const uuidRegex = new RegExp(
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        'i',
    );
    return uuidRegex.test(value);
}

export function cleanSmbUrl(url: string): string {
    return last(url.split('@')).replace('smb:/', '');
}

export function highlight(text: string, start?: number, end?: number): string {
    start = start ?? 0;
    end = end ?? text.length;
    const head = text.slice(0, start);
    const highlighted = `<strong class="highlighted">${text.slice(start, end)}</strong>`;
    const tail = text.slice(end);
    return `${head}${highlighted}${tail}`;
}

export function highlightAll(text: string, target: string): string {
    if (!text) {
        return text;
    }
    const regex = new RegExp(`(${target})`, 'gi');
    return text.replace(regex, '<strong class="highlighted">$1</strong>');
}

export function strSplice(text: string, index: number, replacement: string): string {
    return text.slice(0, index) + replacement + text.slice(index);
}

export function caseInsensitiveSearch(text: string, search: string): boolean {
    return text.toLowerCase().includes(search.toLowerCase());
}

export function spaceSplitSearch(items: string[], search: string): string[] {
    const searches = search.trim().split(/\s+/);
    return items.filter(item => searches.some(search => caseInsensitiveSearch(item, search)));
}

export function slashJoin(
    parts: (string | number)[],
    opts: { leading?: boolean; trailing?: boolean } = {},
): string {
    const parts_ = parts.map(p => (typeof p === 'string' ? p : p.toString()));
    if (opts?.leading) {
        parts_.splice(0, 0, '/');
    }
    if (opts?.trailing) {
        parts_.push('/');
    }
    return parts_.reduce(Location.joinWithSlash);
}

/* Number */
export function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

export function wrapWithPercent(
    numerator: number,
    denominator: number,
    wrappedValue: string | number,
    precision = 2,
): string {
    const percentage = (numerator / denominator) * 100;
    return `${precision ? percentage.toPrecision(precision) : percentage}% (${wrappedValue})`;
}

/* Datetime */
export function offsetDate(
    base: Date | number,
    offset: {
        year?: number;
        month?: number;
        day?: number;
        hour?: number;
        minute?: number;
        second?: number;
        millisecond?: number;
    },
): Date {
    const date = base instanceof Date ? base : new Date(base);

    const { year, month, day, hour, minute, second, millisecond } = offset;
    if (year) {
        date.setFullYear(date.getFullYear() + year);
    }
    if (month) {
        date.setMonth(date.getMonth() + month);
    }
    if (day) {
        date.setDate(date.getDate() + day);
    }
    if (hour) {
        date.setHours(date.getHours() + hour);
    }
    if (minute) {
        date.setMinutes(date.getMinutes() + minute);
    }
    if (second) {
        date.setSeconds(date.getSeconds() + second);
    }
    if (millisecond) {
        date.setMilliseconds(date.getMilliseconds() + millisecond);
    }
    return date;
}

export enum MS {
    millisecond = 1,
    second = 1000,
    minute = MS.second * 60,
    hour = MS.minute * 60,
    day = MS.hour * 24,
}

type MsParts = { ms: number } & { [k in Exclude<keyof typeof MS, 'ms'>]?: number };
export function msToParts(ms: number, maxUnit: Exclude<keyof typeof MS, 'ms'> = 'hour'): MsParts {
    let keys: (keyof typeof MS)[] = ['day', 'hour', 'minute', 'second', 'millisecond'];
    keys = keys.slice(keys.indexOf(maxUnit));
    return Object.fromEntries(
        keys.map(k => {
            const value = Math.floor(ms / MS[k]);
            ms -= value * MS[k];
            return [k, value];
        }),
    ) as MsParts;
}

export function coerceDate(date: number | Date): Date {
    return typeof date === 'number' ? new Date(date) : date;
}

/* Array */
export function moveArrayElem<T>(arr: T[], oldIndex: number, newIndex: number): T[] {
    while (oldIndex < 0) {
        oldIndex += arr.length;
    }
    while (newIndex < 0) {
        newIndex += arr.length;
    }
    if (newIndex >= arr.length) {
        let k = newIndex - arr.length;
        while (k-- + 1) {
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
export function paramSortFunc<Param>(
    fn: (param: Param) => number,
    ascendingOrder: boolean = true,
): (a: Param, b: Param) => number {
    return (a, b) => {
        if (fn(a) < fn(b)) {
            return ascendingOrder ? -1 : 1;
        }
        if (fn(a) > fn(b)) {
            return ascendingOrder ? 1 : -1;
        }
        return 0;
    };
}

/**
 * Generates a function for updating result depending on ascending or descending order.
 *
 * @param ascendingOrder - Sort by ascending order (default)
 * @returns - (result: number) => number
 */
function sortOrderFactory(ascendingOrder = true): (result: number) => number {
    return result => (ascendingOrder ? result : -result);
}

/**
 * Updates result depending on ascending or descending order.
 *
 * @param result - Result of comparison
 * @param ascendingOrder - Sort by ascending order (default)
 */
function sortOrder(result: number, ascendingOrder = true): number {
    return sortOrderFactory(ascendingOrder)(result);
}

/**
 * @deprecated Use `alphaNumericSort` instead.
 *
 * Global sorting spec has been created which requires custom implementation.
 *
 * Generates a function for alphabetic sorting (case insensitive).
 * @param fn - A function which returns a string from item being sorted
 * @param ascendingOrder - Sort by ascending order (default)
 * @param options - Additional options for the collator used for string comparison.
 */
export const alphabeticalSort = alphaNumericSort;

type ProcessStep = (cur: string) => string | string[];

const removeSpaces = (cur: string): string[] => cur.split(' ');
const replaceDashesBeforeNumbers = (cur: string): string => {
    const characters = cur.split('');
    const mappedCharacters = characters.map((char, index) => {
        if (char === '-') {
            const nextNonDash = parseInt(
                characters.slice(index + 1).find(char => char !== '-') || '0',
            );
            if (!Number.isNaN(nextNonDash)) {
                return index === characters.length - 1 ? '' : '0';
            }
        }
        return char;
    });
    return mappedCharacters.join('');
};
const replaceUnicode = (cur: string): string[] => {
    const specialCharRegex = /[\p{P}\p{S}]/giu;
    const matches = cur.match(specialCharRegex)?.map(char => char.charCodeAt(0).toString());
    const other = cur.split(specialCharRegex);
    const flat = zip(other, matches)
        .flat()
        .filter((segment): segment is string => !!segment && typeof segment === 'string');
    return flat;
};

const initialProcessSteps: ProcessStep[] = [
    removeSpaces,
    replaceDashesBeforeNumbers,
    replaceUnicode,
];

const fallbackProcessSteps: ProcessStep[] = [];

const initialSortingPasses = (
    options: Intl.CollatorOptions,
): ((a: string, b: string) => number)[] => {
    const ignoreCase = (a: string, b: string): number =>
        a.toLowerCase().localeCompare(b.toLowerCase(), navigator.language, options);

    const upperFirst = (a: string, b: string): number =>
        a.localeCompare(b, navigator.language, { ...options, caseFirst: 'upper' });

    return [ignoreCase, upperFirst];
};

const fallbackSortingPasses = (
    options: Intl.CollatorOptions,
): ((a: string, b: string) => number)[] => {
    const shortestFirst = (a: string, b: string): number => {
        const firstDiff = zip(a.split(''), b.split(''))
            .map(([diffA = '', diffB = '']) => ({ diffA, diffB }))
            .find(({ diffA, diffB }) => diffA !== diffB);
        if (firstDiff) {
            const { diffA, diffB } = firstDiff;
            const diffs = [diffA, diffB];
            const dashedLast = diffs.every(Boolean) && diffs.some(diff => diff === '-');

            const result = diffA.localeCompare(diffB, navigator.language, options);
            if (dashedLast) {
                return -result;
            }
            return result;
        }
        return a.length - b.length;
    };

    return [shortestFirst];
};

/** Generates a function for sorting mixed alphabetic and numeric strings.
 *
 * Numeric segments are sorted numerically, while alphabetic segments are sorted alphabetically.
 *
 * This is to match the sorting behavior used within the thick client.
 *
 * See global sorting spec for more details:
 *
 * https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Global+sorting
 *
 * @param locale - Locale to use for comparison
 * @param fn - A function which returns a string from item being sorted
 * @param ascendingOrder - Sort by ascending order (default)
 * @param caseFirst - Handle sorting by upper first, lower first, or false for no preference (default: 'upper')
 */
export function alphaNumericSort<P>(
    fn: (param: P) => string,
    ascendingOrder: boolean = true,
    collationOptions: Omit<
        Intl.CollatorOptions,
        'numeric' | 'caseFirst' | 'ignorePunctuation'
    > = {},
): (a: P, b: P) => number {
    const options = {
        ...collationOptions,
        numeric: true,
        ignorePunctuation: false,
        caseFirst: 'false' as const,
        usage: 'sort' as const,
    };

    const processWithSteps =
        (processSteps: ProcessStep[]) =>
        (arg: P): string[] =>
            processSteps.reduce((acc, process) => acc.flatMap(process), [fn(arg)]);

    const handleSort =
        (processSteps: ProcessStep[], handler: (a: string[], b: string[]) => number) =>
        (a: P, b: P) =>
            handler(processWithSteps(processSteps)(a), processWithSteps(processSteps)(b));

    const getOrdering = (
        a: string[],
        b: string[],
        cases: ((a: string, b: string) => number)[],
    ): number => {
        const zipped = zip(a, b).map(([a = '', b = '']) => ({ a, b }));
        const runPass = (handler: (a: string, b: string) => number): number =>
            zipped.map(({ a, b }) => handler(a, b)).find(val => val !== 0) || 0;

        const handler = cases.find(runPass);
        return handler ? runPass(handler) : 0;
    };

    const initial = handleSort(initialProcessSteps, (a, b) =>
        sortOrder(getOrdering(a, b, initialSortingPasses(options)), ascendingOrder),
    );

    const fallback = handleSort(fallbackProcessSteps, (a, b) =>
        sortOrder(getOrdering(a, b, fallbackSortingPasses(options)), ascendingOrder),
    );

    return (a, b) => {
        const initialResult = initial(a, b);

        if (initialResult) {
            return initialResult;
        }

        return fallback(a, b);
    };
}

export const alphaNumericSortByName = alphaNumericSort<{ name: string }>(param => param.name);

/* Object */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isObject(obj: unknown): obj is Object {
    return !!obj && obj.constructor === Object;
}

export function mapValuesToStrings(obj: Record<string, unknown>): Record<string, string> {
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
 * USAGE: `assignFrom(this.dialogData, ['serverId', 'storageManager', 'cancelPolls'] , this)`;
 *
 * @param source An object with targeted properties
 * @param keys An array with key names to be targeted
 * @param target Specifies the object to be updated with selected properties
 */
export function assignFrom<S extends Pick<T, K[number]>, K extends readonly (keyof T)[], T>(
    source: S,
    keys: K,
    target: T,
): void {
    keys.forEach(k => {
        target[k] = source[k];
    });
}

/* DOM */
/**
 * Scroll an item into view inside in a list container like a dropdown
 *
 * The list container element must be the ancestor the browser uses for calculating coordinates.
 *
 * https://javascript.info/size-and-scroll#offsetparent-offsetleft-top
 *
 * @param item The item element to scroll to
 * @param container The container element of the item
 */
export function scrollItemIntoView(item: HTMLElement, container: HTMLElement): void {
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const containerVisibleTop = container.scrollTop;
    const containerVisibleBottom = containerVisibleTop + container.offsetHeight;

    if (itemTop < containerVisibleTop) {
        item.scrollIntoView(true); // alignToTop
    } else if (itemBottom > containerVisibleBottom) {
        item.scrollIntoView(false);
    }
}

export type AriaDisabledValue = 'true' | 'false';
export function ariaDisabledValue(state: boolean): AriaDisabledValue {
    return state ? 'true' : 'false';
}

/** Check whether a mouse event is inside an element */
export function clickedInside(
    { pageX: eventX, pageY: eventY }: Pick<MouseEvent, 'pageX' | 'pageY'>,
    element: HTMLElement,
): boolean {
    const elemRect = element.getBoundingClientRect();
    const withinHorizontal = elemRect.left <= eventX && eventX <= elemRect.right;
    const withinVertical = elemRect.top <= eventY && eventY <= elemRect.bottom;
    return withinHorizontal && withinVertical;
}

/* Async */
/**
 * Use for async tasks that run quickly but for the UI you'd like to delay initial output of stream.
 */
export function delayInitial<Source>(
    source: Observable<Source> | Promise<Source>,
    msDelay = 750,
): Observable<Source> {
    return combineLatest([source, timer(msDelay)]).pipe(map(([source]) => source));
}

/* TypeScript */
/**
 * Use this to enforce that class implementation exactly matches interface or other class.
 *
 * Usage:
 * class Example implements Exacty<InterfaceOrClass, Example>{}
 */
export type Exactly<T, U> = { [K in keyof U]: K extends keyof T ? T[K] : never };

/**
 * Decorator used to enforce that a class has certain static properties/methods from an interface.
 *
 * Usage Example:
 *
 * @staticImplements<CloudServiceAPI>()
 * export class LicenseServerAPI extends BaseCloudServiceAPI {}
 */
export function staticImplements<T>() {
    return <U extends T>(constructor: U) => constructor;
}

/**
 * Filter keys based on value type.
 *
 * `T`: Type to filter
 *
 * `F`: Filter type
 *
 * Source: https://stackoverflow.com/a/63553761
 */
export type KeyFilter<T, F> = {
    [K in keyof T]: T[K] extends F ? K : never;
}[keyof T];

/** Get element type of array. */
export type ArrayType<T> = T extends (infer Item)[] ? Item : never;

/** Get type from observable */
export type ObservableValueType<T> = T extends Observable<infer Item> ? Item : never;

/** Get type from returned observable */
export type ReturnedObservableValueType<T extends (...args: unknown[]) => unknown> =
    ObservableValueType<ReturnType<T>>;

/*
for key of keyof targetType
    if key extends keyof keys
        // We want this property
        if keys[key] extends true
            targetType[key]
            // Doesn't need recursion, get the property
        else
            if keys[key] extends RecursiveKeyMap<targetType[key]>:
                // This should always be true since we know keys matches
                // targetType in structure, but still needs to be asserted for TS
                RecursivePick<targetType[key], value>
            else
                never
                // This branch is never reached, but is syntactically needed
    else
        never
        // We don't want this property
*/
/** A recursive version of the `Pick` utility type.
 *
 * The key map should be a type with keys matching the object keys you want to pick.
 * The values on the key map should be `true` if the unchanged property value is wanted,
 * or another key map if only specific nested properties are wanted.
 *
 * For example, to create a type with picked properties `foo`, `bar`,
 * and `buzz` inside top-level `fizz`, the `RecursiveKeyMap` would be
 * `{ foo: true; bar: true; fizz: { buzz: true } }`.
 *
 * Pick: https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys
 *
 * Source: https://stackoverflow.com/a/54949737
 */
export type RecursivePick<T, Keys extends RecursiveKeyMap<T>> = Pick<
    {
        [K in keyof T]: K extends keyof Keys
            ? Keys[K] extends true
                ? T[K]
                : Keys[K] extends RecursiveKeyMap<T[K]>
                  ? RecursivePick<T[K], Keys[K]>
                  : never
            : never;
    },
    keyof T & keyof Keys
>;

export type RecursiveKeyMap<T> = {
    [K in keyof T]?: T[K] extends object ? RecursiveKeyMap<T[K]> | true : true;
};

export function buildTopLevelKeyMap<T>(
    topKeys: readonly (keyof T)[],
): Record<(typeof topKeys)[number], true> {
    return Object.fromEntries(topKeys.map(k => [k, true])) as Record<
        (typeof topKeys)[number],
        true
    >;
}

export function extractVideoLayout(videoLayout: string): {
    width: number;
    height: number;
    sensors: number[];
    gridAspect: number;
} {
    const {
        height: _height = '1',
        sensors: _sensors = '',
        width: _width = '1',
    } = Object.fromEntries(new URLSearchParams(videoLayout.replace(/;/g, '&')).entries());

    const width = parseInt(_width);
    const height = parseInt(_height);
    const sensors = _sensors.split(',').map(val => parseInt(val));
    const gridAspect = width / height;

    return {
        width,
        height,
        sensors,
        gridAspect,
    };
}

export function getParameterByName(name: string): string | null {
    const params = new URLSearchParams(window.location.search);

    return params.get(name);
}

/**
 * A function that wraps a target object and notifies a notifier function when a method is called.
 *
 * Whenever a method is called the notifier function is called with the method name as the
 * first argument, arguments passed to the method as the second argument, and result as the
 * third argument.
 *
 * Example for triggering side effects when a method is called.
 *
 * ```
 * const updateTargetObjectState = () => updateTargetObjectState.triggerUpdate();
 * const proxiedObject = interceptMethodCalls(targetObject, updateTargetObjectState);
 * ```
 *
 * Example for logging method calls.
 * ```
 * const logMethodCall = (method, args, result) => console.info({ method, args, result });
 * const proxiedObject = interceptMethodCalls(objectToDebug, logMethodCall);
 * ```
 *
 * @param obj - Target to interceptMethodCalls
 * @param fn - Notifier function
 * @returns Proxy of Target
 */
export function interceptMethodCalls<
    Target extends object,
    Notifier extends (prop: keyof Target, args: unknown[], result: unknown) => unknown,
>(obj: Target, fn: Notifier): Target {
    return new Proxy(obj, {
        get(target, prop) {
            if (typeof target[prop] === 'function') {
                return new Proxy(target[prop], {
                    apply: (target, thisArg, argumentsList) => {
                        const result = Reflect.apply(target, thisArg, argumentsList);
                        fn(prop as keyof Target, argumentsList, result);
                        return result;
                    },
                });
            } else {
                return Reflect.get(target, prop);
            }
        },
    });
}

export const getActualWidth = (el: Element): number =>
    ['margin-left', 'margin-right', 'padding-left', 'padding-right'].reduce(
        (totalSize, prop) => totalSize + parseFloat(getComputedStyle(el).getPropertyValue(prop)),
        el.clientWidth,
    );

export const getActualHeight = (el: Element): number =>
    ['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'].reduce(
        (totalSize, prop) => totalSize + parseFloat(getComputedStyle(el).getPropertyValue(prop)),
        el.clientHeight,
    );
