import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';

import { compileGlobalStyles, rmCompiledGlobalStyles } from './compile-global-styles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

compileGlobalStyles();

/** Get class selectors in CSS files.
 *
 * @param {string} input CSS input file
 * @param {string} output TS output file
 * @returns {void}
 */
function parseFileForClasses(input, output) {
    const classNames = new Set();
    const CLASS_REGEX = /\.[\w\-]+/g;

    /**
     *
     * @param {css.Rule} rule
     * @returns {void}
     */
    function parseRule(rule) {
        const { selectors } = rule;
        if (selectors) {
            for (const selector of selectors) {
                const classes = selector.matchAll(CLASS_REGEX);
                for (const class_ of classes) {
                    classNames.add(class_[0].slice(1));
                }
            }
        }
    }

    /**
     *
     * @param {css.StyleRules['rules']} rules
     * @returns {void}
     */
    function parseRules(rules) {
        for (const rule of rules) {
            if (rule.type === 'rule') {
                parseRule(rule);
            } else if ('rules' in rule && rule.rules) {
                parseRules(rule.rules);
            }
        }
    }

    const file = css.parse(fs.readFileSync(input, { encoding: 'utf-8' }));
    parseRules(file.stylesheet.rules);
    const content = [
        '/* eslint-disable */',
        `const classes = new Set(${JSON.stringify([...classNames.values()])});`,
        'export default classes;\n',
    ].join('\n');
    fs.writeFileSync(output, content);
}

parseFileForClasses('./collated.css', '../eslint-plugin-nx/src/data/nx-global-style-classes.ts');
parseFileForClasses(
    '../node_modules/bootstrap/dist/css/bootstrap.css',
    '../eslint-plugin-nx/src/data/bootstrap-classes.ts',
);

rmCompiledGlobalStyles();
