"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const forTypes = [
    utils_1.AST_NODE_TYPES.ForStatement,
    utils_1.AST_NODE_TYPES.ForOfStatement,
    utils_1.AST_NODE_TYPES.ForInStatement,
];
module.exports = (0, utils_2.createRule)({
    name: 'no-untyped-init',
    meta: {
        docs: {
            description: 'Require types for properties/variables without initial values or where types cannot be inferred from initial values',
            recommended: false
        },
        type: 'problem',
        schema: [],
        messages: {
            untypedProp: 'Untyped property.',
            untypedDeclaration: 'Untyped declaration.',
        },
    },
    defaultOptions: [],
    create(context) {
        function reportNode(node, expression, messageId) {
            if (expression === null || (0, utils_2.isUntypedValue)(expression)) {
                context.report({
                    node,
                    messageId,
                });
            }
        }
        return {
            PropertyDefinition(node) {
                const { decorators, typeAnnotation, value } = node;
                if (typeAnnotation) {
                    return;
                }
                const isInputOrOutput = decorators
                    ?.some((d) => d.expression.callee.name === 'Input' ||
                    d.expression.callee.name === 'Output');
                if (isInputOrOutput) {
                    return;
                }
                reportNode(node, value, 'untypedProp');
            },
            VariableDeclaration(node) {
                const { parent, declarations } = node;
                if (forTypes.includes(parent.type)) {
                    return;
                }
                declarations.forEach(declarator => {
                    const { id: { typeAnnotation }, init } = declarator;
                    if (typeAnnotation) {
                        return;
                    }
                    reportNode(node, init, 'untypedDeclaration');
                });
            },
        };
    }
});
