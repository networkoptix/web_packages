"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const bootstrap_elements_1 = __importDefault(require("../data/bootstrap-elements"));
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [
            {
                title: 'Other element enhancements',
                description: "Native element enhancements that don't follow the nx-element naming",
                type: 'array',
                items: {
                    type: 'string',
                },
            },
        ],
        messages: {
            escapeRequired: 'Element must escape global styling',
        },
        fixable: 'code',
    },
    defaultOptions: [[]],
    create(context, [otherEnhancements]) {
        return {
            Element$1(node) {
                const nxName = `nx-${node.name}`;
                if (bootstrap_elements_1.default.has(node.name) &&
                    !node.attributes.some(a => a.name === 'data-escape-global-style' ||
                        a.name === nxName ||
                        otherEnhancements.includes(a.name))) {
                    context.report({
                        loc: (0, template_utils_1.sourceSpanToLoc)(node.startSourceSpan),
                        messageId: 'escapeRequired',
                        fix(fixer) {
                            const { startSourceSpan: { end }, } = node;
                            return fixer.insertTextBeforeRange([end.offset - 1, end.offset], ' data-escape-global-style');
                        },
                    });
                }
            },
        };
    },
});
