"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            nonSignalInComputed: 'Non-signal mutable properties should not be used in computed signals, as only signals will trigger recomputation',
        },
    },
    defaultOptions: [],
    create(context) {
        const reaonlyProps = new WeakMap();
        return {
            ClassBody(node) {
                reaonlyProps.set(node, new Set());
                node.body.forEach(clsElem => {
                    if (clsElem.type === utils_1.AST_NODE_TYPES.PropertyDefinition && clsElem.readonly) {
                        reaonlyProps.get(node).add(clsElem.key.name);
                    }
                });
            },
            'ClassBody CallExpression[callee.name="computed"] MemberExpression > ThisExpression'(node) {
                let classBody = node;
                while (classBody.type !== utils_1.AST_NODE_TYPES.ClassBody) {
                    classBody = classBody.parent;
                }
                const classProperty = node.parent
                    .property.name;
                if (reaonlyProps.get(classBody).has(classProperty)) {
                    return;
                }
                let target = node;
                while (target.parent.type === utils_1.AST_NODE_TYPES.MemberExpression ||
                    (target.parent.type === utils_1.AST_NODE_TYPES.CallExpression &&
                        target.parent.callee === target)) {
                    target = target.parent;
                    if (target.type === utils_1.AST_NODE_TYPES.MemberExpression &&
                        target.property.name.endsWith('$$')) {
                        return;
                    }
                }
                context.report({
                    node: target,
                    messageId: 'nonSignalInComputed',
                });
            },
        };
    },
});
