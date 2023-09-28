"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
const newSignalNames = ['signal', 'computed', 'toSignal'];
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
        return {
            'VariableDeclarator[id.type="Identifier"], PropertyDefinition'(node) {
                const key = (node.type === utils_1.AST_NODE_TYPES.VariableDeclarator ? node.id : node.key);
                const value = node.type === utils_1.AST_NODE_TYPES.VariableDeclarator ? node.init : node.value;
                if (!value || value.type !== utils_1.AST_NODE_TYPES.CallExpression) {
                    return;
                }
                const { callee } = value;
                if (callee.type === utils_1.AST_NODE_TYPES.Identifier) {
                    if (!newSignalNames.includes(callee.name)) {
                        return;
                    }
                    if (!key.name.endsWith('$$')) {
                        context.report({
                            node: key,
                            messageId: 'signalEnd',
                        });
                    }
                }
                else if (node.type === utils_1.AST_NODE_TYPES.PropertyDefinition &&
                    callee.type === utils_1.AST_NODE_TYPES.MemberExpression) {
                    const { object, property } = callee;
                    const isThisStore = object.type === utils_1.AST_NODE_TYPES.MemberExpression &&
                        object.object.type === utils_1.AST_NODE_TYPES.ThisExpression &&
                        object.property.type === utils_1.AST_NODE_TYPES.Identifier &&
                        object.property.name === 'store';
                    const isSelectSignal = property.type === utils_1.AST_NODE_TYPES.Identifier &&
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
