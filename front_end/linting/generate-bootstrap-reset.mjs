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

/** @type {css.Rule} */
const rootReset = structuredClone(
    bootstrap.stylesheet.rules.find(r => isEqual(r.selectors, ['html'])),
);
rootReset.selectors = [':host'];
rootReset.declarations = unsetDeclarations(rootReset.declarations);

/** @type {css.Rule} */
const body = bootstrap.stylesheet.rules.find(r => isEqual(r.selectors, ['body']));
rootReset.declarations = rootReset.declarations.concat(
    unsetDeclarations(body.declarations).filter(
        bd => !rootReset.declarations.find(rd => rd.property === bd.property),
    ),
);

nonClassRules.push({ type: 'comment', comment: ` Generated reset for Bootstrap styling ` });
nonClassRules.push(rootReset);

const CLASSED_ELEMENT = /^[a-z\d]+(\[.+?\])*?\./;
const ROOTS = [':root', 'html', 'body'];

for (const rule of bootstrap.stylesheet.rules) {
    if (rule.type !== 'rule') {
        continue;
    }
    const selectors = rule.selectors.filter(
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
    if (rule.declarations.some(d => d.value.includes('!important'))) {
        continue;
    }
    const declarations = rule.declarations.map(({ value, ...rest }) => ({
        ...rest,
        value: 'unset',
    }));
    const modified = structuredClone(rule);
    modified.selectors = selectors;
    modified.declarations = declarations;
    nonClassRules.push(modified);
}

bootstrap.stylesheet.rules = nonClassRules;
fs.writeFileSync(
    '../libs/nx-components/src/lib/styles/_bootstrap-reset.scss',
    css.stringify(bootstrap),
);
