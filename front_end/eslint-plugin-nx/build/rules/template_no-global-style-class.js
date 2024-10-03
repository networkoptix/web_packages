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
                const { details } = node.keySpan;
                if (!details || !details.startsWith('class.')) {
                    return;
                }
                const className = details.split('.').pop();
                checkForbidden(className, (0, template_utils_1.sourceSpanToLoc)(node.keySpan));
            },
        };
    },
});
