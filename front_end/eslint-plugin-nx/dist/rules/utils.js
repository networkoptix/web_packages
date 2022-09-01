"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decoratorHasCall = exports.decoratorName = exports.isUntypedValue = exports.createRule = void 0;
const utils_1 = require("@typescript-eslint/utils");
exports.createRule = utils_1.ESLintUtils.RuleCreator.withoutDocs;
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
function decoratorName(decorator) {
    return decorator.expression.type === utils_1.AST_NODE_TYPES.CallExpression
        ? decorator.expression.callee.name
        : decorator.expression.name;
}
exports.decoratorName = decoratorName;
function decoratorHasCall(decorator) {
    return decorator.expression.type === utils_1.AST_NODE_TYPES.CallExpression;
}
exports.decoratorHasCall = decoratorHasCall;
