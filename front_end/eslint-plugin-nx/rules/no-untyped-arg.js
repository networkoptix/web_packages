/**
 * @fileoverview Require types on non-callback function arguments without
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
            const { parent, params } = node;

            const isExport = (
                node.type === 'FunctionDeclaration' &&
                parent.type.startsWith('Export')
            ) || (
                node.type === 'ArrowFunctionExpression' &&
                parent.type === 'VariableDeclarator' &&
                parent.parent.type === 'VariableDeclaration' &&
                parent.parent.parent.type.startsWith('Export')
            );
            const isPublicMethod = (
                parent.type === 'PropertyDefinition' ||
                parent.type === 'MethodDefinition'
            ) && (
                !parent.accessibility ||
                parent.accessibility === 'public'
            );
            if (isExport || isPublicMethod) {
                return;
            }
            /* Exports/public methods already require explicit argument
            types from explicit-module-boundary-types, avoid duplicate error */

            if (
                parent.type.startsWith('Expression') ||
                parent.type.endsWith('Expression') ||
                parent.type === 'Property'
            ) {
                return;
            }
            /* Don't require for callbacks and other expressions,
            or for object properties */

            params.forEach(param => {
                if (param.type === 'Identifier' && !param.typeAnnotation) {
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
