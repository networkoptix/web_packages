/**
 * @param {import('@typescript-eslint/utils').TSESTree.Expression} expression
 * @returns {boolean} Whether a type cannot be inferred from an initial value
 */
function isUntypedValue(expression) {
    const isNull = expression.value === null;
    const isUndefined = expression.type === 'Identifier' &&
        expression.name === 'undefined';
    const isEmptyArray = expression.type === 'ArrayExpression' &&
        !expression.elements.length;
    const isEmptyObject = expression.type === 'ObjectExpression' &&
        !expression.properties.length;

    return isNull || isUndefined || isEmptyArray || isEmptyObject;
}

module.exports = {
    isUntypedValue,
};
