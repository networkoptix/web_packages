"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUntypedValue = exports.createRule = void 0;
const utils_1 = require("@typescript-eslint/utils");
exports.createRule = utils_1.ESLintUtils.RuleCreator(() => undefined);
function isUntypedValue(expression) {
    const isNull = expression.value === null;
    const isUndefined = expression.type === utils_1.AST_NODE_TYPES.Identifier &&
        expression.name === 'undefined';
    const isEmptyArray = expression.type === utils_1.AST_NODE_TYPES.ArrayExpression &&
        !expression.elements.length;
    const isEmptyObject = expression.type === utils_1.AST_NODE_TYPES.ObjectExpression &&
        !expression.properties.length;
    return isNull || isUndefined || isEmptyArray || isEmptyObject;
}
exports.isUntypedValue = isUntypedValue;
