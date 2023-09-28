"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
module.exports = {
    rules: fs_1.default
        .readdirSync(path_1.default.join(__dirname, 'rules'))
        .reduce((rules, file) => {
        if (file.includes('utils.')) {
            return rules;
        }
        const { name } = path_1.default.parse(file);
        const ruleName = name.startsWith('template_')
            ? name.replace('template_', 'template/')
            : name;
        rules[ruleName] = require(`./rules/${name}`);
        return rules;
    }, {}),
};
