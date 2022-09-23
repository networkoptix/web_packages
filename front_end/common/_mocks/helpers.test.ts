import { Subject } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';

export class HelperMockProvider<Provider, Value> {
    constructor(public provide: Provider, public useValue?: Value) {
        if (!useValue) {
            this.useValue = <Value>{};
        }
    }

    static mapServices = <T>(provider: T) =>
        provider instanceof HelperMockProvider
            ? provider
            : new HelperMockProvider<T, {}>(provider, {});
}

export const sanitizerMock = {
    sanitize: (_, val) => val,
    bypassSecurityTrustHtml: val => val
};

const parseStaticTranslations = staticLangNode => Object.entries(
    staticLangNode
).reduce((
    parsed, [key, value]
) => ({
    ...parsed,
    [key]: typeof value === 'string'
        ? () => value
        : parseStaticTranslations(value)
}), {});

const buildMapped = (overrides, mappedTarget, nodes = []) => {
    Object.entries(overrides).forEach(([node, value]) => {
        const nodeList = [...nodes, node];
        if (typeof value === 'function') {
            mappedTarget.push({
                nodeList,
                value
            });
        } else {
            buildMapped(value, mappedTarget, nodeList);
        }
    });
};

const mapOverrides = overrides => {
    const mapped = [];
    buildMapped(overrides, mapped);
    return mapped;
};

const applyOverrides = (target, mapped) => {
    mapped.forEach(({ nodeList, value }) => {
        const targetNode = nodeList.pop();
        let node = target;
        nodeList.forEach(nodeName => {
            node = node[nodeName];
        });
        node[targetNode] = value;
    });
};

/**
 * Generate mock translations from static file
 *
 * The overrides object is used for strings that accept either parameters or pluralization.
 * Those will need to have custom functions to handle.
 *
 * Example override:
 *
 * const langMock = getMockTranslations({
 *     common: {
 *         morePlugins: ({ count, startTag, endTag }) => `${startTag}${count}${endTag} more integrations...`
 *     }
 *  })
 *
 * @param overrides - Accepts an object with overrides
 */
export const getMockTranslations = (overrides?: any) => {
    const translations = parseStaticTranslations(staticLang);
    if (overrides) {
        const overrideMapping = mapOverrides(overrides);
        applyOverrides(translations, overrideMapping);
    }

    return {
        translations,
        getTranslations: () => translations,
        translateSubject: new Subject()
    };
};
