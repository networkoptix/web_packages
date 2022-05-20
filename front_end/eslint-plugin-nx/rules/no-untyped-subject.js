/**
 * @fileoverview Require generics for RxJS subjects where type cannot
 * be inferred from an initial value.
 *
 * @author Andrew Wu
 */

'use strict';

const { isUntypedValue } = require('./utils');

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedSubject: 'Untyped subject.'
        },
    },
    create: function (context) {
        return {
            PropertyDefinition(node) {
                const { typeAnnotation, value } = node;
                if (value === null) {
                    return;
                }
                if (
                    value.type === 'NewExpression' &&
                    value.callee.name.endsWith('Subject') &&
                    !value.typeParameters &&
                    !typeAnnotation
                    // Subject type annotations require a generic argument
                ) {
                    if (
                        !value.arguments.length ||
                        isUntypedValue(value.arguments[0])
                    ) {
                        context.report({
                            node,
                            messageId: 'untypedSubject'
                        });
                    }
                }
            }
        };
    }
};
