"use strict";
const utils_1 = require("@typescript-eslint/utils");
const utils_2 = require("./utils");
function hasInjectionToken(param, propName) {
    return param.decorators?.some((d) => (0, utils_2.decoratorHasCall)(d) &&
        (0, utils_2.decoratorName)(d) === 'Inject' &&
        d.expression.arguments[0]?.type === utils_1.AST_NODE_TYPES.Identifier &&
        d.expression.arguments[0].name === propName.toUpperCase());
}
function hasInjectedProp(classBody, propName) {
    return classBody.body.some(b => b.type === utils_1.AST_NODE_TYPES.MethodDefinition &&
        b.kind === 'constructor' &&
        b.value.params.some(p => {
            return (p.type === utils_1.AST_NODE_TYPES.TSParameterProperty &&
                p.parameter.type === utils_1.AST_NODE_TYPES.Identifier &&
                p.parameter.name === propName &&
                hasInjectionToken(p, propName));
        }));
}
module.exports = (0, utils_2.createRule)({
    meta: {
        type: 'problem',
        schema: [
            {
                title: 'Banned variables names',
                description: 'Variables which should not be accessed globally',
                type: 'array',
                items: {
                    type: 'string',
                },
            },
        ],
        messages: {
            forbiddenGlobal: 'Forbidden global variable',
        },
        fixable: 'code',
        hasSuggestions: true,
    },
    defaultOptions: [[]],
    create(context, [bannedVars]) {
        return {
            'ClassBody Identifier'(node) {
                if (!bannedVars.includes(node.name)) {
                    return;
                }
                const { parent, name } = node;
                const isBaseObject = parent.type === utils_1.AST_NODE_TYPES.MemberExpression && parent.object === node;
                const notMemberExp = parent.type !== utils_1.AST_NODE_TYPES.MemberExpression;
                let isNotGlobal = false;
                switch (parent.type) {
                    case utils_1.AST_NODE_TYPES.FunctionExpression:
                    case utils_1.AST_NODE_TYPES.ArrowFunctionExpression:
                    case utils_1.AST_NODE_TYPES.FunctionDeclaration:
                    case utils_1.AST_NODE_TYPES.TSDeclareFunction:
                    case utils_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression:
                    case utils_1.AST_NODE_TYPES.TSParameterProperty:
                    case utils_1.AST_NODE_TYPES.TSInterfaceDeclaration:
                    case utils_1.AST_NODE_TYPES.TSInterfaceHeritage:
                    case utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration:
                    case utils_1.AST_NODE_TYPES.TSTypeReference:
                    case utils_1.AST_NODE_TYPES.MethodDefinition:
                    case utils_1.AST_NODE_TYPES.ArrayPattern:
                    case utils_1.AST_NODE_TYPES.RestElement:
                        isNotGlobal = true;
                        break;
                    case utils_1.AST_NODE_TYPES.PropertyDefinition:
                        if (parent.key === node) {
                            isNotGlobal = true;
                        }
                        break;
                    case utils_1.AST_NODE_TYPES.VariableDeclarator:
                        if (parent.id === node) {
                            isNotGlobal = true;
                        }
                        break;
                    case utils_1.AST_NODE_TYPES.Property:
                        const { parent: { type }, } = parent;
                        if (type === utils_1.AST_NODE_TYPES.ObjectPattern) {
                            isNotGlobal = true;
                        }
                        if (type === utils_1.AST_NODE_TYPES.ObjectExpression && parent.key === node) {
                            isNotGlobal = true;
                        }
                        break;
                }
                if (isBaseObject || (notMemberExp && !isNotGlobal)) {
                    let scope = context.getScope();
                    while (scope.type !== utils_1.TSESLint.Scope.ScopeType.global) {
                        if (scope.set.has(name)) {
                            const variable = scope.set.get(name);
                            const identifier = variable.identifiers[0];
                            if (identifier.name === name && identifier.range[1] < node.range[0]) {
                                return;
                            }
                        }
                        scope = scope.upper;
                    }
                    let classBody = node.parent;
                    while (classBody.type !== utils_1.AST_NODE_TYPES.ClassBody) {
                        classBody = classBody.parent;
                    }
                    if (hasInjectedProp(classBody, name)) {
                        context.report({
                            node,
                            messageId: 'forbiddenGlobal',
                            fix(fixer) {
                                return fixer.insertTextBefore(node, 'this.');
                            },
                        });
                    }
                    else {
                        context.report({
                            node,
                            messageId: 'forbiddenGlobal',
                        });
                    }
                }
            },
        };
    },
});
