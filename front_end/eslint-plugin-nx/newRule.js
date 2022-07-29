const fs = require('fs');
const path = require('path');

const newRuleName = process.argv[2] && process.argv[2].trim();
if (!newRuleName) {
    console.error('A rule name must be provided');
    process.exit(1);
}

const ignore = [
    'rule-template.ts',
    'utils.ts',
];
const existingRules = fs.readdirSync(path.join(__dirname, 'src', 'rules'))
    .filter(file => !ignore.includes(file))
    .map(file => path.parse(file).name);
if (existingRules.includes(newRuleName)) {
    console.error('Rule already exists.');
    process.exit(1);
}
if (ignore.includes(`${newRuleName}.ts`)) {
    console.error('Reserved file name.');
    process.exit(1);
}

if (!/^[a-z]+(-[a-z]+)*$/.test(newRuleName)) {
    console.error('Rule name must be kebab-case.');
    process.exit(1);
}

const ruleFile = fs.readFileSync('./src/rules/rule-template.ts', 'utf8');
fs.writeFileSync(
    `./src/rules/${newRuleName}.ts`,
    ruleFile.replace(/rule-name/g, newRuleName)
);
const testFile = fs.readFileSync('./src/tests/test-template.ts', 'utf8');
fs.writeFileSync(
    `./src/tests/${newRuleName}.test.ts`,
    testFile.replace(/rule-name/g, newRuleName)
);

console.log(`New rule ${newRuleName} successfully created.`);
