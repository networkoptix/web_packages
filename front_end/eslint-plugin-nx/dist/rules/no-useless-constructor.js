"use strict";
const utils_1 = require("./utils");
module.exports = (0, utils_1.createRule)({
    name: 'no-useless-constructor',
    meta: {
        docs: {
            description: 'A custom implementation of the no-useless-constructor rule that ignores constructors if the class extends another class',
            recommended: false,
        },
        type: 'problem',
        schema: [],
        messages: {
            useless: 'Useless constructor.',
            removeUseless: 'Remove useless constructor',
        },
        hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
            'ClassBody > MethodDefinition[kind="constructor"]'(node) {
                if (node.parent.parent.superClass) {
                    return;
                }
                if (!node.value.body) {
                    return;
                }
                if (!node.value.params.length && !node.value.body.body.length) {
                    context.report({
                        node,
                        messageId: 'useless',
                        suggest: [{
                                messageId: 'removeUseless',
                                fix(fixer) {
                                    return fixer.remove(node);
                                },
                            }],
                    });
                }
            }
        };
    }
});
