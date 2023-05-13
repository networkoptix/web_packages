/* Specific-purpose utility functions. If a function/type only involves
primitives it should probaly go in general.ts intead.  */

import type { TranslateService } from '@ngx-translate/core';
import { zip } from 'lodash-es';
import type { IStepOption } from 'ngx-ui-tour-md-menu';

import staticLang from '@common/language/language_i18n_static.json';
import type {
    TranslateObject,
    Translatable,
    SingleTranslateObject,
} from '@pipes/nx-translate.types';
import type { MenuNode } from '@services/menus.service.types';
import { nxConfig as CONFIG } from '@services/nx-config/config';
import type { ec2MediaServer } from '@services/system-api.types';
import type { CloudUserCompat } from '@services/system.service/user-manager/user-manager-types';

import type { RecursiveKeyMap } from './general';

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

export type ParsedNetworkAddresses<S> = S & { ip: string; port: string };
export function setServerIpAndPort<S extends Pick<ec2MediaServer, 'networkAddresses'>>(
    server: S,
): ParsedNetworkAddresses<S> {
    const ipv4Addresses: string[] = []; // 192.168.5.1:7001
    const ipv6Addresses: string[] = []; // [fe80::e58b:1151:3859:a75a%2]:7001
    server.networkAddresses.split(';').forEach(addr => {
        if (addr.startsWith('[')) {
            ipv6Addresses.push(addr);
        } else if (addr) {
            ipv4Addresses.push(addr);
        }
    });

    let ip: string;
    let port: string;
    if (ipv4Addresses.length) {
        [ip, port] = ipv4Addresses[0].split(':');
    } else if (ipv6Addresses.length) {
        [ip, port] = ipv6Addresses[0].slice(1).split(']:');
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

export function isAdmin(userOrRole: { permissions: string } | CloudUserCompat): boolean {
    const { permissions } = userOrRole;
    return (
        permissions.includes(CONFIG.accessRoles.globalAdminPermissionFlag) ||
        ('customPermissions' in userOrRole &&
            CONFIG.accessRoles.adminAccess.includes(userOrRole.accessRole.toLowerCase()))
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

/** Generate string for the `_with` param for `/rest` endpoints.
 *
 * e.g. `'foo,bar,fizz.buzz'` => Get properties `foo`, `bar`, and `buzz` inside `fizz`
 */
export function withKeyMap(keys: RecursiveKeyMap<unknown>): string {
    const props: string[] = [];

    function addKeys(keys: RecursiveKeyMap<unknown>, parentKeys: string[]): void {
        Object.entries<true | RecursiveKeyMap<unknown>>(keys).forEach(([key, value]) => {
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
