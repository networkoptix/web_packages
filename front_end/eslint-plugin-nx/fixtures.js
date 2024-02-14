const { RuleTester } = require('@typescript-eslint/rule-tester');
const { after } = require('mocha');

RuleTester.afterAll = after;
// https://typescript-eslint.io/packages/rule-tester/#with-specific-frameworks
