import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';
import { isEqual } from 'lodash-es';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const bootstrap = css.parse(
    fs.readFileSync('../node_modules/bootstrap/dist/css/bootstrap.css', { encoding: 'utf-8' }),
);

/**
 *
 * @param {css.Declaration[]} declarations
 * @returns {css.Declaration[]}
 */
function unsetDeclarations(declarations) {
    return declarations.map(({ value, ...rest }) => ({
        ...rest,
        value: 'unset',
    }));
}

/** @type {(css.Rule | css.Comment)[]} */
const nonClassRules = [];
nonClassRules.push({ type: 'comment', comment: ` Generated reset for Bootstrap styling ` });
const CLASSED_ELEMENT = /^[a-z\d]+(\[.+?\])*?\./;
const ROOTS = [':root', 'html', 'body'];
const ELEMENT = /^[a-z\d]+/;
const escapeElementReplace = [/^([a-z\d]+)/, '$1[data-escape-global-style]'];

const elements = new Set();
for (const rule of bootstrap.stylesheet.rules) {
    if (rule.type !== 'rule') {
        continue;
    }
    let selectors = rule.selectors.filter(
        selector =>
            !(
                ROOTS.includes(selector) ||
                selector.startsWith('*') ||
                selector.startsWith('.') ||
                CLASSED_ELEMENT.test(selector)
            ),
    );
    if (!selectors.length) {
        continue;
    }
    if (
        isEqual(selectors, [
            'article',
            'aside',
            'figcaption',
            'figure',
            'footer',
            'header',
            'hgroup',
            'main',
            'nav',
            'section',
        ])
    ) {
        /* article, aside, figcaption, figure, footer, header, hgroup, main, nav, section {
            display: block;
        } */
        // These are all display: block by default
        continue;
    }
    if (isEqual(selectors, ['table'])) {
        /* table {
            border-collapse: collapse;
        } */
        // This is the preferred default
        continue;
    }
    if (selectors.some(s => s.startsWith('button'))) {
        selectors = selectors.filter(s => !s.startsWith('[type='));
        // Redundant with button targeted
    }

    if (rule.declarations.some(d => d.value.includes('!important'))) {
        continue;
    }
    const declarations = unsetDeclarations(rule.declarations);
    for (const selector of selectors) {
        const match = selector.match(ELEMENT);
        if (match) {
            elements.add(match[0]);
        }
    }
    const modified = structuredClone(rule);
    modified.selectors = selectors.map(s =>
        ELEMENT.test(s)
            ? s.replace(...escapeElementReplace)
            : s.replace(']', '][data-escape-global-style]'),
    );
    modified.declarations = declarations;
    nonClassRules.push(modified);
}

bootstrap.stylesheet.rules = nonClassRules;
fs.writeFileSync('../common/styles/_bootstrap-reset.scss', css.stringify(bootstrap));

const content = [
    '/* eslint-disable */',
    `const classes = new Set(${JSON.stringify([...elements.values()])});`,
    'export default classes;\n',
].join('\n');
fs.writeFileSync('../eslint-plugin-nx/src/data/bootstrap-elements.ts', content);
