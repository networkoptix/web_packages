/**
 * @fileoverview Require component inputs and outputs be explicitly typed.
 *
 * @author Andrew Wu
 */

'use strict';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const primitives = ['boolean', 'number', 'string'];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [], // no options
        hasSuggestions: true,
        messages: {
            missingInput: 'Missing Input type.',
            inferType: 'Infer type from default value',
            missingOutput: 'Missing Output generic.',
        }
    },
    create: function (context) {
        return {
            /**
             * @param {import('@typescript-eslint/utils')
             * .TSESTree.PropertyDefinition} node
             */
            'PropertyDefinition[decorators]': function (node) {
                const isInput = node.decorators.some(d =>
                    d.expression.callee.name === 'Input'
                );
                if (isInput && !node.typeAnnotation) {
                    const { value } = node;
                    if (value !== null && value.type === 'Literal') {
                        const valueType = typeof value.value;
                        if (primitives.includes(valueType)) {
                            context.report({
                                node,
                                messageId: 'missingInput',
                                suggest: [{
                                    messageId: 'inferType',
                                    fix: function (fixer) {
                                        return fixer.insertTextAfter(
                                            node.key,
                                            `: ${valueType}`
                                        );
                                    },
                                }]
                            });
                        } else {
                            context.report({
                                node,
                                messageId: 'missingInput',
                            });
                        }
                    } else {
                        context.report({
                            node,
                            messageId: 'missingInput',
                        });
                    }
                    return;
                }

                const isOutput = node.decorators.some(d =>
                    d.expression.callee.name === 'Output'
                );
                if (isOutput) {
                    const { value, typeAnnotation } = node;
                    if (!value) {
                        // Not initialized yet
                    } else if (!typeAnnotation) {
                        if (!value.typeParameters) {
                            context.report({
                                node,
                                messageId: 'missingOutput',
                            });
                        }
                    } else if (!typeAnnotation.typeAnnotation.typeParameters) {
                        // This case is already covered by TS since type
                        // EventEmitter<T> requires 1 argument, but still
                        // including here for consistency
                        context.report({
                            node,
                            messageId: 'missingOutput',
                        });
                    }
                }
            }
        };
    }
};
