"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
module.exports = (0, utils_2.createRule)({
    name: 'no-untyped-subject',
    meta: {
        docs: {
            description: 'Require generics for RxJS subjects where type cannot be inferred from an initial value',
            recommended: false
        },
        type: 'problem',
        schema: [],
        messages: {
            untypedSubject: 'Untyped subject.'
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            PropertyDefinition(node) {
                const { typeAnnotation, value } = node;
                if (value === null) {
                    return;
                }
                if (value.type === utils_1.AST_NODE_TYPES.NewExpression &&
                    value.callee
                        .name.endsWith('Subject') &&
                    !value.typeParameters &&
                    !typeAnnotation) {
                    if (!value.arguments.length ||
                        (0, utils_2.isUntypedValue)(value.arguments[0])) {
                        context.report({
                            node,
                            messageId: 'untypedSubject'
                        });
                    }
                }
            }
        };
    }
});
