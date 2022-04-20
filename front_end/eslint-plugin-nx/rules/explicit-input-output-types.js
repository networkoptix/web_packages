/**
 * @fileoverview Require component inputs and outputs be explicitly typed.
 *
 * @author Andrew Wu
 */

'use strict';

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

const primitives = ['boolean', 'number', 'string'];

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [], // no options
        hasSuggestions: true,
    },
    create: function (context) {
        return {
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
                                message: 'Missing Input type',
                                suggest: [{
                                    desc: 'Infer type from default value',
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
                                message: 'Missing Input type',
                            });
                        }
                    } else {
                        context.report({
                            node,
                            message: 'Missing Input type',
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
                                message: 'Missing Output generic',
                            });
                        }
                    } else if (!typeAnnotation.typeAnnotation.typeParameters) {
                        // This case is already covered by TS since type
                        // EventEmitter<T> requires 1 argument, but still
                        // including here for consistency
                        context.report({
                            node,
                            message: 'Missing Output generic',
                        });
                    }
                }
            }
        };
    }
};
