const fs = require('fs');
const path = require('path');
const process = require('process');

const errorCount = {};
const relativeReplacements = {};
let stdOut = fs.readFileSync('./lint_out.txt', { encoding: 'utf-8' });
let currentFile;
for (const line of stdOut.split('\n')) {
    if (fs.existsSync(line)) {
        currentFile = path.relative(__dirname, line).replace(/\\/g, '/');
        relativeReplacements[line] = currentFile;
        errorCount[currentFile] = 0;
    } else if (/\s+\d+:\d+/.test(line)) {
        errorCount[currentFile] += 1;
    }
}

Object.entries(relativeReplacements).forEach(([abs, rel]) => {
    stdOut = stdOut.replace(abs, rel);
});

const errorTxt =
    '/** Error counts for files with type linting errors.\n\n * Update this file with `npm run update-type-blacklist`.\n */\nmodule.exports = ' +
    JSON.stringify(errorCount, null, 4).replace(/"/g, "'") +
    ';\n/*' +
    stdOut +
    '\n*/';
process.stdout.write(errorTxt);
process.exit(0);
