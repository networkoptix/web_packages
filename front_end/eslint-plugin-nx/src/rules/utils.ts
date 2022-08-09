import { ESLintUtils, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator.withoutDocs;

/**
 * Whether a type cannot be inferred from an initial value
 */
export function isUntypedValue(expression: TSESTree.Expression): boolean {
    const isNull = (expression as TSESTree.NullLiteral).value === null;
    const isUndefined = expression.type === AST_NODE_TYPES.Identifier &&
        expression.name === 'undefined';
    const isEmptyArray = expression.type === AST_NODE_TYPES.ArrayExpression &&
        !expression.elements.length;
    const isEmptyObject = expression.type === AST_NODE_TYPES.ObjectExpression &&
        !expression.properties.length;

    return isNull || isUndefined || isEmptyArray || isEmptyObject;
}

/** Type assuming that all decorators have calls (e.g. `Input()`). */
export type AngularDecorator = TSESTree.Decorator & {
    expression: TSESTree.CallExpression & {
        callee: TSESTree.Identifier;
    };
};
