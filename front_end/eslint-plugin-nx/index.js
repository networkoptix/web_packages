const fs = require('fs');
const path = require('path');

const ignore = [
    'rule-template.js',
    'utils.js',
];

module.exports = {
    rules: fs.readdirSync(path.join(__dirname, 'rules'))
        .reduce((rules, file) => {
            if (ignore.includes(file)) {
                return rules;
            }
            const { name } = path.parse(file);
            rules[name] = require(`./rules/${name}`);
            return rules;
        }, {})
};
