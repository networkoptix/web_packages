"use strict";
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [{
                title: 'Allowed element names',
                description: 'Elements that are allowed to be within translated elements (i.e. contain no text)',
                type: 'array',
                items: {
                    type: 'string',
                },
            }],
        messages: {
            noText: 'No text to translate',
            notOnlyText: 'Translated elements should only contain text',
        },
    },
    defaultOptions: [[]],
    create(context, [allowedElems]) {
        return {
            'TextAttribute[name="translate"][value=""]'(node) {
                const element = node.parent;
                if (!element.children.length) {
                    context.report({
                        loc: (0, template_utils_1.sourceSpanToLoc)(node.sourceSpan),
                        messageId: 'noText'
                    });
                }
                else if (element.children.length > 1 ||
                    element.children[0].type !== template_utils_1.TMPL_AST_NODES.Text$3) {
                    element.children.forEach(child => {
                        if (child.type !== template_utils_1.TMPL_AST_NODES.Text$3 &&
                            !allowedElems.includes(child.name)) {
                            context.report({
                                loc: (0, template_utils_1.sourceSpanToLoc)(child.sourceSpan),
                                messageId: 'notOnlyText'
                            });
                        }
                    });
                }
            }
        };
    }
});
