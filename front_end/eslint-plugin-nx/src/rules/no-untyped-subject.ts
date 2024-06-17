/**
 * @fileoverview Require generics for RxJS subjects where type cannot
 * be inferred from an initial value.
 *
 * @author Andrew Wu
 */

import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, isUntypedValue } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedSubject: 'Untyped subject.',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            PropertyDefinition(node) {
                const { typeAnnotation, value } = node;
                if (value === null) {
                    return;
                }
                if (
                    value.type === AST_NODE_TYPES.NewExpression &&
                    value.callee.type === AST_NODE_TYPES.Identifier &&
                    value.callee.name.endsWith('Subject') &&
                    !value.typeParameters &&
                    !typeAnnotation
                    // Subject type annotations require a generic argument
                ) {
                    if (!value.arguments.length || isUntypedValue(value.arguments[0])) {
                        context.report({
                            node,
                            messageId: 'untypedSubject',
                        });
                    }
                }
            },
        };
    },
});
