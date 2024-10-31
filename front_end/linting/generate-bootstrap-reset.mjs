import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';
import { isEqual } from 'lodash-es';

import { compileLocalBootstrap } from './compile-global-styles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const compiledBootstrap = compileLocalBootstrap();
const bootstrap = css.parse(compiledBootstrap);

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
    if (isEqual(selectors, ['table']) || isEqual(selectors, ['th'])) {
        /* table {
            border-collapse: collapse;
        }
        th {
            text-align: inherit;
        } */
        // Preferred defaults
        continue;
    }
    if (isEqual(selectors, ['img'])) {
        /* img {
            vertical-align: middle;
        } */
        // Removes extra margins from inline images
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
    `const classes = new Set(${JSON.stringify(Array.from(elements.values()), null, 4)});`,
    'export default classes;\n',
].join('\n');
process.chdir('../eslint-plugin-nx');
fs.writeFileSync('./src/data/bootstrap-elements.ts', content);
childProcess.execSync('npm run build');
