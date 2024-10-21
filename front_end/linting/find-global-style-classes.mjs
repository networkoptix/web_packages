import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';

import { compileLocalBootstrap, compileNxGlobalStyles } from './compile-global-styles.mjs';

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
 * @param {string} cssString CSS file string
 * @returns {Set<string>} Found class names
 */
function readInputStylesheet(cssString) {
    const ast = css.parse(cssString);
    const classNames = parseRules(ast.stylesheet.rules);
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
        `const classes = new Set(${JSON.stringify(Array.from(classNames), null, 4)});`,
        'export default classes;\n',
    ].join('\n');
    fs.writeFileSync(file, content);
}

const compiledNxGlobal = compileNxGlobalStyles();
const collatedClasses = readInputStylesheet(compiledNxGlobal);
collatedClasses.add('table-wrapper'); // See comment in compile function
writeOutputSet('../eslint-plugin-nx/src/data/nx-global-style-classes.ts', collatedClasses);

const compiledBootstrap = compileLocalBootstrap();
const bootstrapClasses = readInputStylesheet(compiledBootstrap);
writeOutputSet('../eslint-plugin-nx/src/data/bootstrap-classes.ts', bootstrapClasses);

process.chdir('../eslint-plugin-nx');
childProcess.execSync('npm run build');
