/* eslint-disable @typescript-eslint/no-use-before-define */
/* Specific-purpose utility functions. If a function/type only involves
primitives it should probaly go in general.ts intead.  */

import type {
    ConnectedPosition,
    HorizontalConnectionPos,
    OriginConnectionPosition,
    OverlayConnectionPosition,
    VerticalConnectionPos,
} from '@angular/cdk/overlay';
import type { TranslateService } from '@ngx-translate/core';
import { zip } from 'lodash-es';
import type { IStepOption } from 'ngx-ui-tour-md-menu';

import staticLang from '@language_static';
import type {
    TranslateObject,
    Translatable,
    SingleTranslateObject,
} from '@pipes/nx-translate.types';
import type { MenuNode } from '@services/menus.service.types';
import type { OrgSystem, System, UserSystem } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig as CONFIG } from '@services/nx-config/config';
import type {
    NxOrgSystemInfo,
    NxSystemInfo,
    NxUserSystemInfo,
} from '@services/systems.service.types';

import type { ArrayType } from './general';

/**
 * Pass a function that evaluates a menu node to fulfill a specific condition,
 * findMenuNode will traverse an array of menuNodes and try to find a node that fulfills the conditionalFunction
 */
export function findMenuNode(
    nodes: MenuNode[],
    conditionalFunction: (node: MenuNode) => boolean,
): MenuNode {
    let foundNode: MenuNode = null;
    const findNode = (node: MenuNode): void => {
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

export type WithIpAndPort<S> = S & { ip: string; port: string };
export function setServerIpAndPort<S extends { endpoints: string[] }>(server: S): WithIpAndPort<S> {
    let ipv4Address: string; // 192.168.5.1:7001
    let ipv6Address: string; // [fe80::e58b:1151:3859:a75a%2]:7001
    for (const address of server.endpoints) {
        if (address.startsWith('[')) {
            ipv6Address ??= address;
        } else if (address) {
            ipv4Address ??= address;
        }

        if (ipv4Address) {
            break;
        }
    }

    let ip: string;
    let port: string;
    if (ipv4Address) {
        [ip, port] = ipv4Address.split(':');
    } else if (ipv6Address) {
        [ip, port] = ipv6Address.slice(1).split(']:');
    } else {
        ip = 'N/A';
        port = '';
    }

    return { ...server, ip, port };
}

export function getSysLang(window: Window): string {
    return window.navigator.languages[0];
}

type TranslatableStep = Omit<IStepOption, 'title' | 'content'> & {
    title: Translatable;
    content: Translatable;
};

export const translateStep =
    (instant: (TranslatableObject) => string) =>
    (step: TranslatableStep): IStepOption => ({
        ...step,
        title: instant(step.title),
        content: instant(step.content),
    });

const tourDefaults: IStepOption = {
    enableBackdrop: true,
    backdropConfig: {
        backgroundColor: 'var(--tour-background)',
    },
    placement: {
        xPosition: 'after',
        yPosition: 'below',
        ...staticLang.tours.defaults,
    },
};

export const generateTour =
    (tourId: string, baseConfig: Omit<IStepOption, 'anchorId'> = tourDefaults) =>
    (stepNamesOrConfigs: (string | IStepOption)[]): TranslatableStep[] =>
        stepNamesOrConfigs
            .map(step => {
                const isConfig = typeof step !== 'string';
                const lookup = isConfig ? step.anchorId : step;
                const anchorId = `${tourId}_${lookup}`;
                const config = isConfig ? { ...tourDefaults, ...baseConfig, ...step } : baseConfig;
                const translations = staticLang.tours?.[tourId]?.[lookup];
                const tourTitle = staticLang.tours?.[tourId]?.title;
                if (tourTitle && translations) {
                    translations.title = { value: tourTitle, params: { step: translations.title } };
                }
                return translations ? { ...config, ...translations, anchorId } : null;
            })
            .filter(step => !!step);

export interface Language {
    [key: string]: Language | string;
}

export const processLanguageFactory = (customStrings: { [key: string]: string }) =>
    function processLanguage(language: Language) {
        if (language) {
            Object.entries(language).forEach(([key, phrase]) => {
                if (typeof phrase === 'string') {
                    language[key] = Object.entries(customStrings).reduce(
                        (text: string, [rKey, rValue]) =>
                            text.replace(new RegExp(rKey, 'g'), rValue),
                        phrase,
                    );
                } else if (typeof phrase !== 'number') {
                    language[key] = processLanguage(phrase);
                }
            });
        }
        return language;
    };

export const toTranslateObj = (value: Translatable): TranslateObject =>
    typeof value === 'string' ? { value } : value;

const flattenTranslatables = ([start, ...end]: Translatable[]): TranslateObject => ({
    value: staticLang.exclude.nested,
    params: {
        start,
        end: end.length > 1 ? flattenTranslatables(end) : end.pop(),
    },
});

/**
 * Tagged template literal for using markup within templates.
 *
 * For simple inner HTML, just use regular string concatenation instead of this.
 *
 * Example:
 * import { nestedTranslation as nt } from '@utils/nx'
 *
 * const translatable = nt`
 * <div class="some-class">
 *     ${translatableObjectOrString}
 * </div>
 * ${nt`
 *     <span>
 *         ${anotherTranlatable}
 *     </span>`
 * }`
 * @param strings
 * @param translatableExpressions
 * @returns
 */
export const nestedTranslation = (
    strings: TemplateStringsArray,
    ...translatableExpressions: Translatable[]
): TranslateObject =>
    flattenTranslatables(
        zip(strings, translatableExpressions.map(toTranslateObj))
            .reduce((vals, val) => [...vals, ...val], [])
            .filter(val => val),
    );

export const ZERO_ID = '{00000000-0000-0000-0000-000000000000}';

export function isAdmin(userOrRole: { accessRole?: string; permissions: string }): boolean {
    const { permissions } = userOrRole;
    return (
        permissions.includes(CONFIG.accessRoles.globalAdminPermissionFlag) ||
        ('customPermissions' in userOrRole &&
            CONFIG.accessRoles.adminAccess.includes(userOrRole?.accessRole.toLowerCase()))
    );
}

type HtmlTag = keyof HTMLElementTagNameMap;
const selfClosingTags: readonly HtmlTag[] = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
];
const blockLevelTags: readonly HtmlTag[] = [
    'address',
    'article',
    'aside',
    'blockquote',
    'details',
    'dialog',
    'dd',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'header',
    'hgroup',
    'hr',
    'li',
    'main',
    'nav',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul',
];
export interface HtmlObj {
    name: HtmlTag;
    classes?: string[];
    props?: { name: string; value?: string }[];
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    children?: HtmlStrElem[];
}
type HtmlStrElem = string | HtmlObj | SingleTranslateObject;
function isTranslatable(elem: HtmlStrElem): elem is SingleTranslateObject {
    return typeof elem === 'object' && 'value' in elem;
}
function isInlineElem(elem: HtmlStrElem): boolean {
    return typeof elem === 'string' || isTranslatable(elem) || !blockLevelTags.includes(elem.name);
}
// TODO: More testing
export function htmlStrConstructor(nodes: HtmlStrElem[], translate?: TranslateService): string {
    function parseHtmlObj(
        { name, classes, props, children }: HtmlObj,
        indent: number,
        parentInline: boolean = false, // Format children of inline elements as all inline
    ): string {
        const parts = [`${' '.repeat(indent * 4)}<${name}`];
        if (classes?.length || props?.length) {
            parts.push(' ');
        }

        if (classes?.length) {
            parts.push('class="', classes.join(' '), '"');
            if (props?.length) {
                parts.push(' ');
            }
        }

        if (props?.length) {
            parts.push(props.map(p => (!p.value ? p.name : `${p.name}="${p.value}"`)).join(' '));
        }

        const isSelfClosing = selfClosingTags.includes(name);
        if (!isSelfClosing) {
            parts.push('>');
        }

        if (isSelfClosing && children) {
            throw new Error(`Self closing element <${name} /> cannot have children`);
        }

        const formatChildrenAsBlock =
            !parentInline &&
            children?.some(
                c => typeof c !== 'string' && !isTranslatable(c) && blockLevelTags.includes(c.name),
            );
        if (children?.length) {
            const blockNewline = `\n${' '.repeat((indent + 1) * 4)}`;
            if (formatChildrenAsBlock) {
                parts.push(blockNewline);
            }
            children.forEach((c, i) => {
                if (typeof c === 'string') {
                    parts.push(c);
                } else if (isTranslatable(c)) {
                    parts.push(translate.instant(c.value, c.params));
                } else if (parentInline || !blockLevelTags.includes(c.name)) {
                    parts.push(parseHtmlObj(c, indent + 1, true));
                } else {
                    if (i > 0 && isInlineElem(c[i - 1])) {
                        parts.push(blockNewline);
                    }
                    parts.push(parseHtmlObj(c, indent + 1));
                    if (i < children.length - 1) {
                        parts.push(blockNewline);
                    }
                }
            });
        }

        if (isSelfClosing) {
            parts.push(' />');
        } else if (formatChildrenAsBlock && children?.length) {
            parts.push(`\n${' '.repeat(indent * 4)}</${name}>`);
        } else if (!formatChildrenAsBlock || !children?.length) {
            parts.push(`</${name}>`);
        }

        return parts.join('');
    }

    const elems: string[] = [];
    nodes.forEach((node, i) => {
        if (typeof node === 'string') {
            elems.push(node);
        } else if (isTranslatable(node)) {
            elems.push(translate.instant(node.value, node.params));
        } else if (!blockLevelTags.includes(node.name)) {
            elems.push(parseHtmlObj(node, 0, true));
        } else {
            if (i > 0 && isInlineElem(nodes[i - 1])) {
                elems.push('\n');
            }
            elems.push(parseHtmlObj(node, 0));
            if (i < nodes.length - 1) {
                elems.push('\n');
            }
        }
    });
    return elems.join('');
}

/*
for key of keyof targetType
    if key extends keyof keys
        if keys[key] extends true
            targetType[key]
        else
            // Additional branch
            if keys[key] extends NxRecursiveKeyMap<ArrayElementType<targetType[key]>>
                NxRecursivePick<ArrayElementType<targetType[key]>, keys[key]>[]
            else
                if keys[key] extends NxRecursiveKeyMap<targetType[key]>:
                    NxRecursivePick<targetType[key], value>
                else
                    never
    else
        never
*/
/** A modification of the general RecursivePick type to also be able to pick array elements.
 *
 * This one is specifically for use with the `_with` parameter for API requests since the
 * parameter is applied to array elements.
 *
 */
export type NxRecursivePick<T, Keys extends NxRecursiveKeyMap<T>> = Pick<
    {
        [K in keyof T]: K extends keyof Keys
            ? Keys[K] extends true
                ? T[K]
                : Keys[K] extends NxRecursiveKeyMap<ArrayType<T[K]>>
                  ? NxRecursivePick<ArrayType<T[K]>, Keys[K]>[]
                  : Keys[K] extends NxRecursiveKeyMap<T[K]>
                    ? NxRecursivePick<T[K], Keys[K]>
                    : never
            : never;
    },
    keyof T & keyof Keys
>;

/* The ordering of the branches is important here.

Arrays extend object but interfaces *do not* extend Record so we need to first
check for arrays, then filter objects out from primitives.
*/
export type NxRecursiveKeyMap<T> = {
    [K in keyof T]?: T[K] extends unknown[]
        ? NxRecursiveKeyMap<T[K][number]> | true
        : T[K] extends object
          ? NxRecursiveKeyMap<T[K]> | true
          : true;
};

/** Generate string for the `_with` param for `/rest` endpoints.
 *
 * e.g. `'foo,bar,fizz.buzz'` => Get properties `foo`, `bar`, and `buzz` inside `fizz`
 */
export function withKeyMap(keys: NxRecursiveKeyMap<unknown>): string {
    const props: string[] = [];

    function addKeys(keys: NxRecursiveKeyMap<unknown>, parentKeys: string[]): void {
        Object.entries<true | NxRecursiveKeyMap<unknown>>(keys).forEach(([key, value]) => {
            const keyList = [...parentKeys, key];
            if (value === true) {
                props.push(keyList.join('.'));
            } else {
                addKeys(value, keyList);
            }
        });
    }
    addKeys(keys, []);

    return props.join(',');
}

/** Attach service to window for debugging from console */
export function _attachToWindow(arg: object, name?: string): void {
    const key = name ?? arg.constructor.name;
    window[key] = arg;
    console.info(
        `${key}${
            key !== arg.constructor.name ? ` (${arg.constructor.name})` : ''
        } attached for debugging`,
    );
}

export function cleanIds<T>(obj: T): T {
    const regex = /^{[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}}$/;
    // e.g. {81adbd2a-2511-69b2-44d6-53ff4d75920e}
    Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && regex.test(value)) {
            obj[key] = value.slice(1, -1);
        }
    });
    return obj;
}

export function isOrgSystem(system: System): system is OrgSystem;
export function isOrgSystem(system: NxSystemInfo): system is NxOrgSystemInfo;
export function isOrgSystem(system: System | NxSystemInfo): boolean {
    return 'organizationId' in system;
}

export function isUserSystem(system: System): system is UserSystem;
export function isUserSystem(system: NxSystemInfo): system is NxUserSystemInfo;
export function isUserSystem(system: System | NxSystemInfo): boolean {
    return 'ownerAccountId' in system;
}

enum Compass8 {
    N = 'North',
    NE = 'Northeast',
    E = 'East',
    SE = 'Southeast',
    S = 'South',
    SW = 'Southwest',
    W = 'West',
    NW = 'Northwest',
}
type Compass8Shorthand = keyof typeof Compass8;

function compass8ToAngularPosition(direction: Compass8Shorthand): {
    x: HorizontalConnectionPos;
    y: VerticalConnectionPos;
} {
    switch (direction) {
        case 'N':
            return { x: 'center', y: 'top' };
        case 'NE':
            return { x: 'end', y: 'top' };
        case 'E':
            return { x: 'end', y: 'center' };
        case 'SE':
            return { x: 'end', y: 'bottom' };
        case 'S':
            return { x: 'center', y: 'bottom' };
        case 'SW':
            return { x: 'start', y: 'bottom' };
        case 'W':
            return { x: 'start', y: 'center' };
        case 'NW':
            return { x: 'start', y: 'top' };
    }
}
function originPosition(direction: Compass8Shorthand): OriginConnectionPosition {
    const { x, y } = compass8ToAngularPosition(direction);
    return { originX: x, originY: y };
}
function overlayPosition(direction: Compass8Shorthand): OverlayConnectionPosition {
    const { x, y } = compass8ToAngularPosition(direction);
    return { overlayX: x, overlayY: y };
}

export function connectedPosition(
    position: {
        originPoint: Compass8Shorthand;
        overlayPoint: Compass8Shorthand;
    } & Omit<ConnectedPosition, `origin${'X' | 'Y'}` | `overlay${'X' | 'Y'}`>,
): ConnectedPosition {
    const { originPoint, overlayPoint, ...other } = position;
    return {
        ...originPosition(originPoint),
        ...overlayPosition(overlayPoint),
        ...other,
    };
}
