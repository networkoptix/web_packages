/**
 * @fileoverview Require types on named function arguments without
 * types or informative default parameters.
 *
 * This rule should be cut down or removed once the noImplicitAny option
 * is enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

'use strict';

const { isUntypedValue } = require('./utils');

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const namedParents = [
    'VariableDeclarator',
    'MethodDefinition',
    'PropertyDefinition',
];

const nonAssignments = [
    'Identifier',
    'ObjectPattern',
    'RestElement',
];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedArg: 'Untyped argument.',
        },
    },
    create: function (context) {
        function checkForUntypedArgs(node) {
            const { id, parent, params } = node;

            const isNamed = id !== null || namedParents.includes(parent.type);
            if (!isNamed) {
                return;
            }

            params.forEach(param => {
                if (
                    nonAssignments.includes(param.type) &&
                    !param.typeAnnotation
                ) {
                    context.report({
                        node: param,
                        messageId: 'untypedArg'
                    });
                } else if (
                    param.type === 'AssignmentPattern' &&
                    !param.left.typeAnnotation &&
                    isUntypedValue(param.right)
                ) {
                    context.report({
                        node: param,
                        messageId: 'untypedArg'
                    });
                }
            });
        }

        return {
            FunctionDeclaration(node) {
                checkForUntypedArgs(node);
            },
            FunctionExpression(node) {
                checkForUntypedArgs(node);
            },
            ArrowFunctionExpression(node) {
                checkForUntypedArgs(node);
            },
        };
    }
};
