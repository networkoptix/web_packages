"use strict";
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
const textRegex = /[a-zA-Z]+/;
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            translationRequired: 'Translation required',
            untranslatedText: 'Untranslated text',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            'Element$1'(node) {
                if (node.children.length === 0) {
                    return;
                }
                const hasTranslate = node.attributes.some(a => a.name === 'translate' && a.value === '');
                if (hasTranslate) {
                    return;
                }
                const loc = (0, template_utils_1.sourceSpanToLoc)(node.sourceSpan);
                function checkForUntranslatedText(text) {
                    if (text.type === template_utils_1.TMPL_AST_NODES.Text$3 &&
                        textRegex.test(text.value)) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    }
                    else if (text.type === template_utils_1.TMPL_AST_NODES.BoundText &&
                        text.value.ast.strings.some(s => textRegex.test(s))) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    }
                }
                if (node.children.length === 1 &&
                    node.children[0].type === template_utils_1.TMPL_AST_NODES.Text$3) {
                    const [text] = node.children;
                    if (textRegex.test(text.value)) {
                        context.report({
                            loc,
                            messageId: 'translationRequired'
                        });
                    }
                }
                else {
                    let reported = false;
                    for (const child of node.children) {
                        reported = checkForUntranslatedText(child);
                        if (reported) {
                            break;
                        }
                    }
                }
            }
        };
    }
});
