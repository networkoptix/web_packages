/**
 * @fileoverview Require types on named function arguments without
 * types or informative default parameters.
 *
 * This rule should be cut down or removed once the noImplicitAny option
 * is enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import { createRule, isUntypedValue } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const namedParents = [
    AST_NODE_TYPES.VariableDeclarator,
    AST_NODE_TYPES.MethodDefinition,
    AST_NODE_TYPES.PropertyDefinition,
];

const nonAssignments = [
    AST_NODE_TYPES.Identifier,
    AST_NODE_TYPES.ObjectPattern,
    AST_NODE_TYPES.RestElement,
];
type NonAssignment = TSESTree.Identifier | TSESTree.ObjectPattern | TSESTree.RestElement;

type FunctionLike =
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression;

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedArg: 'Untyped argument.',
        },
    },
    defaultOptions: [],
    create(context) {
        function checkForUntypedArgs(node: FunctionLike): void {
            const { id, parent, params } = node;

            const isNamed = id !== null || namedParents.includes(parent.type);
            if (!isNamed) {
                return;
            }

            params.forEach(param => {
                if (
                    nonAssignments.includes(param.type) &&
                    !(param as NonAssignment).typeAnnotation
                ) {
                    context.report({
                        node: param,
                        messageId: 'untypedArg',
                    });
                } else if (
                    param.type === AST_NODE_TYPES.AssignmentPattern &&
                    !param.left.typeAnnotation &&
                    isUntypedValue(param.right)
                ) {
                    context.report({
                        node: param,
                        messageId: 'untypedArg',
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
                const { parent } = node;
                if (
                    (parent.type === AST_NODE_TYPES.VariableDeclarator &&
                        parent.id.typeAnnotation) ||
                    (parent.type === AST_NODE_TYPES.PropertyDefinition && parent.typeAnnotation)
                ) {
                    return;
                    // Ignore if arrow function is explicitly typed
                }
                checkForUntypedArgs(node);
            },
        };
    },
});
