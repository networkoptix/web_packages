"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const namedParents = [
    utils_1.AST_NODE_TYPES.VariableDeclarator,
    utils_1.AST_NODE_TYPES.MethodDefinition,
    utils_1.AST_NODE_TYPES.PropertyDefinition,
];
const nonAssignments = [
    utils_1.AST_NODE_TYPES.Identifier,
    utils_1.AST_NODE_TYPES.ObjectPattern,
    utils_1.AST_NODE_TYPES.RestElement,
];
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedArg: 'Untyped argument.',
        },
    },
    defaultOptions: [],
    create(context) {
        function checkForUntypedArgs(node) {
            const { id, parent, params } = node;
            const isNamed = id !== null || namedParents.includes(parent.type);
            if (!isNamed) {
                return;
            }
            params.forEach(param => {
                if (nonAssignments.includes(param.type) &&
                    !param.typeAnnotation) {
                    context.report({
                        node: param,
                        messageId: 'untypedArg',
                    });
                }
                else if (param.type === utils_1.AST_NODE_TYPES.AssignmentPattern &&
                    !param.left.typeAnnotation &&
                    (0, utils_2.isUntypedValue)(param.right)) {
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
                if ((parent.type === utils_1.AST_NODE_TYPES.VariableDeclarator &&
                    parent.id.typeAnnotation) ||
                    (parent.type === utils_1.AST_NODE_TYPES.PropertyDefinition && parent.typeAnnotation)) {
                    return;
                }
                checkForUntypedArgs(node);
            },
        };
    },
});
