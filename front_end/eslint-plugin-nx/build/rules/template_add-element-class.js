"use strict";
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
const elementClasses = new Map([]);
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            missingClass: 'Missing element class',
        },
        fixable: 'code',
    },
    defaultOptions: [],
    create(context) {
        return {
            Element$1(node) {
                const { name, attributes } = node;
                if (elementClasses.has(name)) {
                    const elementClass = elementClasses.get(name);
                    const classAttribute = attributes.find(a => a.name === 'class');
                    if (classAttribute) {
                        const { valueSpan } = classAttribute;
                        const value = context.sourceCode
                            .getText()
                            .slice(valueSpan.start.offset, valueSpan.end.offset);
                        const values = value.split(' ').filter(Boolean);
                        if (!values.includes(elementClass)) {
                            context.report({
                                messageId: 'missingClass',
                                loc: (0, template_utils_1.sourceSpanToLoc)(node.sourceSpan),
                                fix(fixer) {
                                    return fixer.replaceTextRange([valueSpan.start.offset, valueSpan.end.offset], `${elementClass} ${value}`);
                                },
                            });
                        }
                    }
                    else {
                        const { startSourceSpan } = node;
                        context.report({
                            messageId: 'missingClass',
                            loc: (0, template_utils_1.sourceSpanToLoc)(startSourceSpan),
                            fix(fixer) {
                                return fixer.insertTextAfterRange([
                                    startSourceSpan.start.offset,
                                    startSourceSpan.start.offset + name.length + 1,
                                ], ` class="${elementClass}"`);
                            },
                        });
                    }
                }
            },
        };
    },
});
