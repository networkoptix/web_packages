/**
 * @fileoverview Enforce $$ suffix naming convention for signals
 *
 * This rule checks for two ways of creating signals:
 *
 * 1. Creating new signals using `signal()` and other functions
 *
 * 2. Selecting from a NgRx store using `.selectSignal()`
 *
 * Weaknesses: Using type-ignorant syntax analysis means that renaming or otherwise not
 * directly using the creation functions (like creating a function that returns new signals)
 * will not be caught
 *
 * @author Andrew Wu
 */

import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const newSignalNames = ['signal', 'computed', 'toSignal'];
// https://angular.io/api/core/rxjs-interop/toSignal

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            signalEnd: 'Signals should end with $$',
        },
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
            'VariableDeclarator[id.type="Identifier"], PropertyDefinition'(
                node: TSESTree.VariableDeclarator | TSESTree.PropertyDefinitionNonComputedName,
            ) {
                const key = (
                    node.type === AST_NODE_TYPES.VariableDeclarator ? node.id : node.key
                ) as TSESTree.Identifier;
                const value =
                    node.type === AST_NODE_TYPES.VariableDeclarator ? node.init : node.value;

                if (!value || value.type !== AST_NODE_TYPES.CallExpression) {
                    return; // No value or not a value from a function/method call
                }

                const { callee } = value;
                if (callee.type === AST_NODE_TYPES.Identifier) {
                    // This branch checks for creating new signals

                    if (!newSignalNames.includes(callee.name)) {
                        return; // Not creating a signal
                    }

                    if (!key.name.endsWith('$$')) {
                        context.report({
                            node: key,
                            messageId: 'signalEnd',
                        });
                    }
                } else if (
                    node.type === AST_NODE_TYPES.PropertyDefinition &&
                    callee.type === AST_NODE_TYPES.MemberExpression
                ) {
                    // This branch checks for `signalProp = this.store.selectSignal()`
                    // https://ngrx.io/api/store/Store#selectSignal

                    const { object, property } = callee;
                    // object is everything before the property
                    // property is the actual property (in this case, method being called)

                    const isThisStore =
                        object.type === AST_NODE_TYPES.MemberExpression &&
                        object.object.type === AST_NODE_TYPES.ThisExpression &&
                        object.property.type === AST_NODE_TYPES.Identifier &&
                        object.property.name === 'store';

                    const isSelectSignal =
                        property.type === AST_NODE_TYPES.Identifier &&
                        property.name === 'selectSignal';

                    if (isThisStore && isSelectSignal && !key.name.endsWith('$$')) {
                        context.report({
                            node: key,
                            messageId: 'signalEnd',
                        });
                    }
                }
            },
        };
    },
});
