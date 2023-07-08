/**
 * To run test language_compiled.json files within front end directory 'npm run test-lang'
 *
 * To target a specific directory, used for running as part of ci or build 'npm run test-lang {{directory}}'
 *
 * If this script starts causing build failures even though the language_compiled.json files are valid then set failOnBuild to false.
 */

import '@angular/compiler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANG_FILE = 'language_compiled.json';
const failOnBuild = false; // Set to false to prevent error from killing build
const sourceArg = process.argv[2];
const sourceDir = sourceArg || __dirname;
const compiler = new TranslateMessageFormatCompiler({ disablePluralKeyChecks: true });
const failedLangs = [];

function* walkSync(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            yield* walkSync(path.join(dir, file.name));
        } else if (file.name === LANG_FILE) {
            yield path.join(dir, file.name);
        }
    }
}

for (const filePath of walkSync(sourceDir)) {
    const langJson = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const translation = JSON.parse(langJson);
    const lang = translation.language;
    try {
        compiler.compile(translation, lang);
    } catch (e) {
        console.error(e);
        failedLangs.push(lang);
    }
}

if (!failedLangs.length) {
    console.log('language_compiled.json files successfully loaded');
} else {
    console.error(`Error loading translation(s) for "${JSON.stringify(failedLangs)}"`);
    if (!sourceArg) {
        console.error(
            'Issue is most likely double braces within the language_i18n_static.json file or invalid unicode within an Angular template',
        );
    }
    process.exitCode = !sourceArg || failOnBuild ? 1 : 0;
}
