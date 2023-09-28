"use strict";
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
const textRegex = /[a-zA-Z]+/;
const dataUnits = [
    'B',
    'b',
    'bps',
    ...'kMGTPEZY'.split('').reduce((units, prefix) => {
        return [...units, `${prefix}B`, `${prefix}bit`, `${prefix}bps`];
    }, []),
];
function shouldBeTranslated(text) {
    return textRegex.test(text) && !dataUnits.includes(text.trim());
}
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            translationRequired: 'Translation required',
            untranslatedText: 'Untranslated text',
        },
        fixable: 'code',
    },
    defaultOptions: [],
    create(context) {
        return {
            Element$1(node) {
                if (node.children.length === 0) {
                    return;
                }
                if (node.name.startsWith(':svg')) {
                    return;
                }
                const hasTranslate = node.attributes.some(a => a.name === 'translate' && a.value === '');
                if (hasTranslate) {
                    return;
                }
                const loc = (0, template_utils_1.sourceSpanToLoc)(node.sourceSpan);
                function checkForUntranslatedText(text) {
                    if (text.type === template_utils_1.TMPL_AST_NODES.Text$3 && shouldBeTranslated(text.value)) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    }
                    else if (text.type === template_utils_1.TMPL_AST_NODES.BoundText &&
                        text.value.ast.strings.some(s => shouldBeTranslated(s))) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    }
                }
                if (node.children.length === 1 &&
                    node.children[0].type === template_utils_1.TMPL_AST_NODES.Text$3) {
                    const [text] = node.children;
                    if (!shouldBeTranslated(text.value)) {
                        return;
                    }
                    const { startSourceSpan: { start, end }, } = node;
                    function fix(fixer) {
                        let translateStr;
                        if (start.line === end.line) {
                            translateStr = ' translate';
                        }
                        else {
                            const ltCol = start.col;
                            const gtCol = end.col - 1;
                            translateStr =
                                ltCol === gtCol
                                    ? `${' '.repeat(4)}translate\n${' '.repeat(ltCol)}`
                                    : `translate\n${' '.repeat(gtCol)}`;
                        }
                        return fixer.insertTextBeforeRange([end.offset - 1, end.offset], translateStr);
                    }
                    context.report({
                        loc,
                        messageId: 'translationRequired',
                        fix,
                    });
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
            },
        };
    },
});
