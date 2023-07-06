import { ESLintUtils, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator.withoutDocs;

/**
 * Whether a type cannot be inferred from an initial value
 */
export function isUntypedValue(expression: TSESTree.CallExpressionArgument): boolean {
    const isNull = (expression as TSESTree.NullLiteral).value === null;
    const isUndefined =
        expression.type === AST_NODE_TYPES.Identifier && expression.name === 'undefined';
    const isEmptyArray =
        expression.type === AST_NODE_TYPES.ArrayExpression && !expression.elements.length;
    const isEmptyObject =
        expression.type === AST_NODE_TYPES.ObjectExpression && !expression.properties.length;

    return isNull || isUndefined || isEmptyArray || isEmptyObject;
}

export interface DecoratorCall extends TSESTree.Decorator {
    expression: TSESTree.CallExpression & { callee: TSESTree.Identifier };
}

export interface DecoratorNoCall extends TSESTree.Decorator {
    expression: TSESTree.Identifier;
}

/** Type for decorator with or without call */
export type Decorator = DecoratorCall | DecoratorNoCall;

export function decoratorName(decorator: Decorator): string {
    return decorator.expression.type === AST_NODE_TYPES.CallExpression
        ? decorator.expression.callee.name
        : decorator.expression.name;
}

// Angular decorators (e.g. Input, Output, Component) should always have
// calls afaik
export function decoratorHasCall(decorator: Decorator): decorator is DecoratorCall {
    return decorator.expression.type === AST_NODE_TYPES.CallExpression;
}
