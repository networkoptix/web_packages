/**
 * @fileoverview Enforce $$ suffix naming convention for signals
 *
 * @author Andrew Wu
 */

import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const signalTypes = ['Signal', 'WritableSignal', 'InputSignal'];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            signalEnd: 'Signals should end with $$ unless in a component only using control flow',
        },
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        function checkKeyName(key: TSESTree.Identifier): void {
            const tsType = services.getTypeAtLocation(key);
            const typeSymbol = tsType.symbol || tsType.aliasSymbol;
            if (!typeSymbol) {
                return; // Literal value, not a signal
            }
            const { name } = typeSymbol;

            // const checker = services.program.getTypeChecker();
            // console.log(checker.typeToString(tsType));
            // This will return the generic as well

            if (signalTypes.includes(name) && !key.name.endsWith('$$')) {
                context.report({
                    node: key,
                    messageId: 'signalEnd',
                });
            }
        }

        return {
            Property(node) {
                if (node.computed) {
                    // Ignore computed property names, could be anything
                } else if (
                    node.parent.type === AST_NODE_TYPES.ObjectExpression &&
                    node.key.type === AST_NODE_TYPES.Identifier
                ) {
                    checkKeyName(node.key);
                    // const obj = { key: value }
                } else if (
                    node.parent.type === AST_NODE_TYPES.ObjectPattern &&
                    node.value.type === AST_NODE_TYPES.Identifier
                ) {
                    checkKeyName(node.value);
                    // const { key: newKey } = { ... }
                }
            },
            'VariableDeclarator, PropertyDefinition, TSPropertySignature'(
                node:
                    | TSESTree.VariableDeclarator
                    | TSESTree.PropertyDefinitionNonComputedName
                    | TSESTree.TSPropertySignature,
            ) {
                const key = node.type === AST_NODE_TYPES.VariableDeclarator ? node.id : node.key;
                if (key.type === AST_NODE_TYPES.ArrayPattern) {
                    for (const element of key.elements) {
                        if (element.type === AST_NODE_TYPES.Identifier) {
                            checkKeyName(element);
                        }
                    }
                } else if (key.type === AST_NODE_TYPES.Identifier) {
                    checkKeyName(key);
                }
            },
        };
    },
});
