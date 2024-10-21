import fs from 'fs';

import * as sass from 'sass';

export function compileNxGlobalStyles() {
    const commonDir = '../common/styles/common';
    const scssFiles = fs
        .readdirSync(commonDir)
        .filter(f => f !== '_tables.scss')
        .map(f => `${commonDir}/` + f);
    // Most of the class selectors in tables are contained in a specific table class
    scssFiles.push('../libs/dialogs/dialogs.scss');

    const AT_RULES = /@(use|import|forward|extend).+;\n/g;
    const INCLUDE = /@include .+?(\(| {|;)/g;
    const DUMMY_NO_CONTENT = /@include dummy-mixin(\(.+?\))?;/g;
    const MIXIN_DECLARATION = /@mixin ([\w\-]+)(\(.+?\))? {.+?\n}/gms;
    const VAR_DECLARATION = /^\$[\w\-]+\s*:.+;/gm;
    const FLOATING_VARS = /(([\w\-\_]+\.)|-)?\$[\w\-]+/g; // Catch import name and -$var negation

    const toCollate = [
        '@function dummy-function($args) { @return 0; }',
        '@mixin dummy-mixin($args...) { @content; };',
        '$dummy-variable: 0;',
    ];

    /* Bludgeon global style files with regex until they can be compiled on their own */
    for (const file of scssFiles) {
        let contents = fs.readFileSync(file, { encoding: 'utf-8' });
        contents = contents.replace(AT_RULES, '');
        contents = contents.replace(INCLUDE, '@include dummy-mixin$1');
        contents = contents.replace(DUMMY_NO_CONTENT, 'height: 3.14;');
        // // Prevent empty ruleset from being tree-shaken
        contents = contents.replace(MIXIN_DECLARATION, '');
        contents = contents.replace(VAR_DECLARATION, '');
        contents = contents.replace(FLOATING_VARS, '$dummy-variable');
        contents = contents.replaceAll('sass-rem.rem', 'dummy-function');

        toCollate.push(contents);
    }

    const collated = toCollate.join('\n');
    const compiled = sass.compileString(collated);
    return compiled.css;
}

export function compileLocalBootstrap() {
    const compiled = sass.compile('../common/styles/bootstrap-4.5.2/entry.scss', {
        loadPaths: ['../node_modules'],
    });
    return compiled.css;
}
