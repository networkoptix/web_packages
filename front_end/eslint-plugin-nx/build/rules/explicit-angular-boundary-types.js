"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const primitives = ['boolean', 'number', 'string'];
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        hasSuggestions: true,
        messages: {
            missingInput: 'Missing Input type.',
            inferType: 'Infer type from default value',
            missingOutput: 'Missing Output generic.',
        }
    },
    defaultOptions: [],
    create(context) {
        return {
            'PropertyDefinition[decorators]'(node) {
                const isInput = node.decorators.some((d) => (0, utils_2.decoratorHasCall)(d) && (0, utils_2.decoratorName)(d) === 'Input');
                if (isInput && !node.typeAnnotation) {
                    const { value } = node;
                    if (value !== null && value.type === utils_1.AST_NODE_TYPES.Literal) {
                        const valueType = typeof value.value;
                        if (primitives.includes(valueType)) {
                            context.report({
                                node,
                                messageId: 'missingInput',
                                suggest: [{
                                        messageId: 'inferType',
                                        fix(fixer) {
                                            return fixer.insertTextAfter(node.key, `: ${valueType}`);
                                        },
                                    }]
                            });
                        }
                        else {
                            context.report({
                                node,
                                messageId: 'missingInput',
                            });
                        }
                    }
                    else {
                        context.report({
                            node,
                            messageId: 'missingInput',
                        });
                    }
                    return;
                }
                const isOutput = node.decorators.some((d) => (0, utils_2.decoratorHasCall)(d) && (0, utils_2.decoratorName)(d) === 'Output');
                if (isOutput) {
                    const typeAnnotation = node.typeAnnotation;
                    const value = node.value;
                    if (!value) {
                    }
                    else if (!typeAnnotation) {
                        if (!value.typeParameters) {
                            context.report({
                                node,
                                messageId: 'missingOutput',
                            });
                        }
                    }
                    else if (!typeAnnotation.typeAnnotation.typeParameters) {
                        context.report({
                            node,
                            messageId: 'missingOutput',
                        });
                    }
                }
            }
        };
    }
});
