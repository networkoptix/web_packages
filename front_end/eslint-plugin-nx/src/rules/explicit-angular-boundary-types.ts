/**
 * @fileoverview Require component inputs and outputs be explicitly typed.
 *
 * @author Andrew Wu
 */

import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, decoratorName, decoratorHasCall } from './utils';
import type { Decorator } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const primitives = ['boolean', 'number', 'string'];

type TypeAnnotation = TSESTree.TSTypeAnnotation & {
    typeAnnotation: TSESTree.TSTypeReference;
};

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [], // no options
        hasSuggestions: true,
        messages: {
            missingInput: 'Missing Input type.',
            inferType: 'Infer type from default value',
            missingOutput: 'Missing Output generic.',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            'PropertyDefinition[decorators]'(node: TSESTree.PropertyDefinition) {
                const isInput = node.decorators.some(
                    (d: Decorator) => decoratorHasCall(d) && decoratorName(d) === 'Input',
                );
                if (isInput && !node.typeAnnotation) {
                    const { value } = node;
                    if (value !== null && value.type === AST_NODE_TYPES.Literal) {
                        const valueType = typeof value.value;
                        if (primitives.includes(valueType)) {
                            context.report({
                                node,
                                messageId: 'missingInput',
                                suggest: [
                                    {
                                        messageId: 'inferType',
                                        fix(fixer) {
                                            return fixer.insertTextAfter(
                                                node.key,
                                                `: ${valueType}`,
                                            );
                                        },
                                    },
                                ],
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

                const isOutput = node.decorators.some(
                    (d: Decorator) => decoratorHasCall(d) && decoratorName(d) === 'Output',
                );
                if (isOutput) {
                    const typeAnnotation = node.typeAnnotation as TypeAnnotation;
                    const value = node.value as TSESTree.NewExpression;
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
            },
        };
    },
});
