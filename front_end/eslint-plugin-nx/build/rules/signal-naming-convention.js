"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const signalTypes = ['Signal', 'WritableSignal'];
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            signalEnd: 'Signals should end with $$',
        },
    },
    defaultOptions: [],
    create(context) {
        const services = utils_1.ESLintUtils.getParserServices(context);
        function checkKeyName(key) {
            const tsType = services.getTypeAtLocation(key);
            const typeSymbol = tsType.symbol || tsType.aliasSymbol;
            if (!typeSymbol) {
                return;
            }
            const { name } = typeSymbol;
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
                }
                else if (node.parent.type === utils_1.AST_NODE_TYPES.ObjectExpression &&
                    node.key.type === utils_1.AST_NODE_TYPES.Identifier) {
                    checkKeyName(node.key);
                }
                else if (node.parent.type === utils_1.AST_NODE_TYPES.ObjectPattern &&
                    node.value.type === utils_1.AST_NODE_TYPES.Identifier) {
                    checkKeyName(node.value);
                }
            },
            'VariableDeclarator, PropertyDefinition, TSPropertySignature'(node) {
                const key = node.type === utils_1.AST_NODE_TYPES.VariableDeclarator ? node.id : node.key;
                if (key.type === utils_1.AST_NODE_TYPES.ArrayPattern) {
                    for (const element of key.elements) {
                        if (element.type === utils_1.AST_NODE_TYPES.Identifier) {
                            checkKeyName(element);
                        }
                    }
                }
                else if (key.type === utils_1.AST_NODE_TYPES.Identifier) {
                    checkKeyName(key);
                }
            },
        };
    },
});
