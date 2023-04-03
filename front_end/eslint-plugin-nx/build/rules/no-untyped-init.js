"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const forTypes = [
    utils_1.AST_NODE_TYPES.ForStatement,
    utils_1.AST_NODE_TYPES.ForOfStatement,
    utils_1.AST_NODE_TYPES.ForInStatement,
];
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedProp: 'Untyped property.',
            untypedParamProp: 'Untyped parameter property.',
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
                const isInputOrOutput = decorators?.some((d) => (0, utils_2.decoratorHasCall)(d) && ((0, utils_2.decoratorName)(d) === 'Input' ||
                    (0, utils_2.decoratorName)(d) === 'Output'));
                if (isInputOrOutput) {
                    return;
                }
                reportNode(node, value, 'untypedProp');
            },
            'ClassBody > MethodDefinition[kind="constructor"]'(node) {
                node.value.params.forEach(param => {
                    if (param.type !== utils_1.AST_NODE_TYPES.TSParameterProperty) {
                        return;
                    }
                    const { parameter } = param;
                    if (parameter.type === utils_1.AST_NODE_TYPES.Identifier &&
                        !parameter.typeAnnotation) {
                        context.report({
                            node: param,
                            messageId: 'untypedParamProp'
                        });
                    }
                    else if (parameter.type === utils_1.AST_NODE_TYPES.AssignmentPattern &&
                        !parameter.left.typeAnnotation &&
                        (0, utils_2.isUntypedValue)(parameter.right)) {
                        context.report({
                            node: param,
                            messageId: 'untypedParamProp'
                        });
                    }
                });
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
