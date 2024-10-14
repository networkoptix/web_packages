"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const bootstrap_classes_1 = __importDefault(require("../data/bootstrap-classes"));
const nx_global_style_classes_1 = __importDefault(require("../data/nx-global-style-classes"));
const template_utils_1 = require("./template-utils");
const utils_1 = require("./utils");
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            forbiddenBootstrap: 'Forbidden Bootstrap class {{ className }}',
            forbiddenNx: 'Forbidden global style class {{ className }}',
        },
    },
    defaultOptions: [],
    create(context) {
        function checkForbidden(className, loc) {
            if (bootstrap_classes_1.default.has(className)) {
                context.report({
                    loc,
                    messageId: 'forbiddenBootstrap',
                    data: { className },
                });
            }
            if (nx_global_style_classes_1.default.has(className)) {
                context.report({
                    loc,
                    messageId: 'forbiddenNx',
                    data: { className },
                });
            }
        }
        return {
            'TextAttribute[name="class"]'(node) {
                const classes = node.value.split(' ');
                for (const className of classes) {
                    checkForbidden(className, (0, template_utils_1.sourceSpanToLoc)(node.valueSpan));
                }
            },
            BoundAttribute(node) {
                const { sourceSpan, keySpan, valueSpan, value } = node;
                if (!keySpan.details) {
                }
                else if (keySpan.details === 'class') {
                    if (sourceSpan.start.offset === keySpan.start.offset) {
                        const ast = value.ast;
                        const astStrings = ast.strings
                            .filter(Boolean)
                            .flatMap(s => s.split(' ').filter(Boolean));
                        for (const astString of astStrings) {
                            checkForbidden(astString.trim(), (0, template_utils_1.sourceSpanToLoc)(valueSpan));
                        }
                    }
                    else {
                    }
                }
                else if (keySpan.details.startsWith('class.')) {
                    const className = keySpan.details.split('.').pop();
                    checkForbidden(className, (0, template_utils_1.sourceSpanToLoc)(keySpan));
                }
                else if (keySpan.details === 'ngClass') {
                    const ast = value.ast;
                    if (ast.type === template_utils_1.TMPL_AST_NODES.LiteralMap) {
                        const astMap = ast;
                        for (const keyObj of astMap.keys) {
                            checkForbidden(keyObj.key, (0, template_utils_1.sourceSpanToLoc)(valueSpan));
                        }
                    }
                    else if (ast.type === template_utils_1.TMPL_AST_NODES.Conditional) {
                        const astConditional = ast;
                        if (astConditional.trueExp.type === template_utils_1.TMPL_AST_NODES.LiteralPrimitive) {
                            const astTrueExp = astConditional.trueExp;
                            if (typeof astTrueExp.value === 'string') {
                                checkForbidden(astTrueExp.value, (0, template_utils_1.sourceSpanToLoc)(valueSpan));
                            }
                        }
                        if (astConditional.falseExp.type === template_utils_1.TMPL_AST_NODES.LiteralPrimitive) {
                            const astFalseExp = astConditional.falseExp;
                            if (typeof astFalseExp.value === 'string') {
                                checkForbidden(astFalseExp.value, (0, template_utils_1.sourceSpanToLoc)(valueSpan));
                            }
                        }
                    }
                }
            },
        };
    },
});
