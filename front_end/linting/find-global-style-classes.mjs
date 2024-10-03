import childProcesses from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import css from 'css';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const commonDir = '../common/styles/common';
const scssFiles = fs.readdirSync(commonDir).map(f => `${commonDir}/` + f);
scssFiles.push('../libs/dialogs/dialogs.scss');

const AT_RULES = /@(use|import|forward|extend).+;\n/g;
const INCLUDE = /@include .+?(\(| {|;)/g;
const DUMMY_NO_CONTENT = /@include dummy-mixin(\(.+?\))?;/g;
const MIXIN_DECLARATION = /@mixin ([\w\-]+)(\(.+\))? {.+?\n}/gms;
const VAR_DECLARATION = /^\$[\w\-]+\s*:.+;/gm;
const FLOATING_VARS = /(([\w\-\_]+\.)|-)?\$[\w\-]+/g; // Catch import name and -$var negation
const TRANSPARENTIZE = /transparentize\(.+?\)/g;

const toCollate = ['@mixin dummy-mixin($args...) { @content; };', '$dummy-variable: 0;'];

/* Bludgeon global style files with regex until they can be compiled on their own */
for (const file of scssFiles) {
    let contents = fs.readFileSync(file, { encoding: 'utf-8' });
    contents = contents.replace(AT_RULES, '');
    contents = contents.replace(INCLUDE, '@include dummy-mixin$1');
    contents = contents.replace(DUMMY_NO_CONTENT, 'height: 3.14;');
    // Prevent empty ruleset from being tree-shaken
    contents = contents.replace(MIXIN_DECLARATION, '');
    contents = contents.replace(VAR_DECLARATION, '');
    contents = contents.replace(FLOATING_VARS, '$dummy-variable');

    contents = contents.replace(TRANSPARENTIZE, 'black'); // 0 doesn't work as arg
    toCollate.push(contents);
}

const collated = toCollate.join('\n');
fs.writeFileSync('collated.scss', collated);
childProcesses.execSync(`npx sass collated.scss:collated.css --no-source-map`);

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

fs.rmSync('./collated.scss');
fs.rmSync('./collated.css');
