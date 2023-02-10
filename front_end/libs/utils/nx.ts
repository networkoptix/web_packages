/* Specific-purpose utility functions. If a function/type only involves
primitives it should probaly go in general.ts intead.  */

import { zip } from 'lodash-es';
import type { IStepOption } from 'ngx-ui-tour-md-menu';

import staticLang from '@common/language/language_i18n_static.json';
import type { TranslateObject, Translatable } from '@pipes/nx-translate.types';
import type { MenuNode } from '@services/menus.service.types';
import type { ec2MediaServer } from '@services/system-api.types';

/**
 * Pass a function that evaluates a menu node to fulfill a specific condition,
 * findMenuNode will traverse an array of menuNodes and try to find a node that fulfills the conditionalFunction
 */
export function findMenuNode(
    nodes: MenuNode[],
    conditionalFunction: (node: MenuNode) => boolean
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

export function setServerIpAndPort(
    server: ec2MediaServer
): ec2MediaServer & { ip: string; port: string } {
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

type TranslatableStep = Omit<IStepOption, 'title' | 'content'> & { title: Translatable; content: Translatable };

export const translateStep = (instant: (TranslatableObject) => string) => (step: TranslatableStep): IStepOption => ({
    ...step,
    title: instant(step.title),
    content: instant(step.content)
});

const tourDefaults: IStepOption = {
    enableBackdrop: true,
    backdropConfig: {
        backgroundColor: 'var(--tour-background)'
    },
    placement: {
        xPosition: 'after',
        yPosition: 'below',
        ...staticLang.tours.defaults
    }
};

export const generateTour = (
    tourId: string,
    baseConfig: Omit<IStepOption, 'anchorId'> = tourDefaults) => (stepNamesOrConfigs: (string | IStepOption)[]): TranslatableStep[] => stepNamesOrConfigs.map(step => {
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
}).filter(step => !!step);

interface Language {
    [key: string]: Language | string;
}

export const processLanguageFactory = (customStrings: { [key: string]: string }) => function processLanguage(language: Language) {
    if (language) {
        Object.entries(language).forEach(([key, phrase]) => {
            if (typeof phrase === 'string') {
                language[key] = Object.entries(customStrings)
                    .reduce((text: string, [rKey, rValue]) => text.replace(new RegExp(rKey, 'g'), rValue), phrase);
            } else if (typeof phrase !== 'number') {
                language[key] = processLanguage(phrase);
            }
        });
    }
    return language;
};

export const toTranslateObj = (value: Translatable): TranslateObject => typeof value === 'string' ? { value } : value;

const flattenTranslatables = ([start, ...end]: Translatable[]): TranslateObject => ({
    value: staticLang.exclude.nested,
    params: {
        start,
        end: end.length > 1 ? flattenTranslatables(end) : end.pop()
    }
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
export const nestedTranslation = (strings: TemplateStringsArray, ...translatableExpressions: Translatable[]): TranslateObject => flattenTranslatables(
    zip(strings, translatableExpressions.map(toTranslateObj)).reduce((vals, val) => [...vals, ...val], []).filter(val => val));
