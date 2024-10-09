import childProcesses from 'child_process';
import fs from 'fs';

export function compileGlobalStyles() {
    const commonDir = '../common/styles/common';
    const scssFiles = fs.readdirSync(commonDir).map(f => `${commonDir}/` + f);
    scssFiles.push('../libs/dialogs/dialogs.scss');
    // const scssFiles = [`${commonDir}/_typography.scss`];

    const AT_RULES = /@(use|import|forward|extend).+;\n/g;
    const INCLUDE = /@include .+?(\(| {|;)/g;
    const DUMMY_NO_CONTENT = /@include dummy-mixin(\(.+?\))?;/g;
    const MIXIN_DECLARATION = /@mixin ([\w\-]+)(\(.+?\))? {.+?\n}/gms;
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
        // // Prevent empty ruleset from being tree-shaken
        contents = contents.replace(MIXIN_DECLARATION, '');
        contents = contents.replace(VAR_DECLARATION, '');
        contents = contents.replace(FLOATING_VARS, '$dummy-variable');

        contents = contents.replace(TRANSPARENTIZE, 'black'); // 0 doesn't work as arg
        toCollate.push(contents);
    }

    const collated = toCollate.join('\n');
    fs.writeFileSync('collated.scss', collated);
    childProcesses.execSync(`npx sass collated.scss:collated.css --no-source-map`);
}

export function rmCompiledGlobalStyles() {
    fs.rmSync('./collated.scss');
    fs.rmSync('./collated.css');
}
