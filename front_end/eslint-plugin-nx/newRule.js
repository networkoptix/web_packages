const fs = require('fs');
const path = require('path');

const newRuleName = process.argv[2] && process.argv[2].trim();
if (!newRuleName) {
    console.error('A rule name must be provided');
    process.exit(1);
}

const ignore = [
    'rule-template.js',
    'utils.js',
];
const existingRules = fs.readdirSync(path.join(__dirname, 'rules'))
    .filter(file => !ignore.includes(file))
    .map(file => path.parse(file).name);
if (existingRules.includes(newRuleName)) {
    console.error('Rule already exists.');
    process.exit(1);
}
if (ignore.includes(`${newRuleName}.js`)) {
    console.error('Reserved file name.');
    process.exit(1);
}

if (!/^[a-z]+(-[a-z]+)*$/.test(newRuleName)) {
    console.error('Rule name must be kebab-case.');
    process.exit(1);
}

fs.copyFileSync('./rules/rule-template.js', `./rules/${newRuleName}.js`);
const testFile = fs.readFileSync('./tests/test-template.js', 'utf8');
fs.writeFileSync(
    `./tests/${newRuleName}.test.js`,
    testFile.replace(/rule-name/g, newRuleName)
);

console.log(`New rule ${newRuleName} successfully created.`);
