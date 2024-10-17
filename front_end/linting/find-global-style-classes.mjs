import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';

import { compileGlobalStyles, rmCompiledGlobalStyles } from './compile-global-styles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

/**
 *
 * @param {css.StyleRules['rules']} rules
 * @returns {Set<string>}
 */
function parseRules(rules) {
    /** @type {Set<string>} */
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

    for (const rule of rules) {
        if (rule.type === 'rule') {
            parseRule(rule);
        } else if ('rules' in rule && rule.rules) {
            const nestedRules = parseRules(rule.rules);
            for (const nested of nestedRules) {
                classNames.add(nested);
            }
        }
    }
    return classNames;
}

/**
 *
 * @param {string} file CSS file
 * @returns {Set<string>} Found class names
 */
function readInputStylesheet(file) {
    const contents = css.parse(fs.readFileSync(file, { encoding: 'utf-8' }));
    const classNames = parseRules(contents.stylesheet.rules);
    return classNames;
}

/**
 *
 * @param {string} file TS file
 * @param {Set<string>} classNames Found class names
 * @returns {void}
 */
function writeOutputSet(file, classNames) {
    const content = [
        '/* eslint-disable */',
        `const classes = new Set(${JSON.stringify(Array.from(classNames))});`,
        'export default classes;\n',
    ].join('\n');
    fs.writeFileSync(file, content);
}

compileGlobalStyles();
const collatedClasses = readInputStylesheet('./collated.css');
collatedClasses.add('table-wrapper'); // See comment in compile function
writeOutputSet('../eslint-plugin-nx/src/data/nx-global-style-classes.ts', collatedClasses);
rmCompiledGlobalStyles();

const bootstrapClasses = readInputStylesheet('../node_modules/bootstrap/dist/css/bootstrap.css');
const utilClasses = readInputStylesheet('./_bootstrap-utils.css');
for (const util of utilClasses) {
    bootstrapClasses.delete(util);
}
writeOutputSet('../eslint-plugin-nx/src/data/bootstrap-classes.ts', bootstrapClasses);
