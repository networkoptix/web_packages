/**
 * @fileoverview Disallow use of global window in classes.
 *
 * @author Andrew Wu
 */

import { TSESTree, AST_NODE_TYPES, TSESLint } from '@typescript-eslint/utils';

import { createRule, decoratorHasCall, decoratorName, Decorator } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function hasInjectedWindow(param: TSESTree.TSParameterProperty): boolean {
    return param.decorators?.some((d: Decorator) =>
        decoratorHasCall(d) &&
        decoratorName(d) === 'Inject' &&
        d.expression.arguments[0]?.type === AST_NODE_TYPES.Identifier &&
        d.expression.arguments[0].name === 'WINDOW'
    );
}

/** Checks for `@Inject(WINDOW) window` (does not check accessibility or type) */
function hasInjectedWindowProp(classBody: TSESTree.ClassBody): boolean {
    return classBody.body.some(b =>
        b.type === AST_NODE_TYPES.MethodDefinition &&
        b.kind === 'constructor' &&
        b.value.params.some(p => {
            return p.type === AST_NODE_TYPES.TSParameterProperty &&
            p.parameter.type === AST_NODE_TYPES.Identifier &&
            p.parameter.name === 'window' &&
            hasInjectedWindow(p);
        })
    );
}

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            globalWindow: 'Do not use global window',
        },
        fixable: 'code',
        hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
            'ClassDeclaration Identifier[name="window"]'(node: TSESTree.Identifier) {
                const { parent } = node;

                const isBaseObject =
                    parent.type === AST_NODE_TYPES.MemberExpression &&
                    parent.object === node;

                const notMemberExp =
                    parent.type !== AST_NODE_TYPES.MemberExpression;

                /* Ignore the cases that aren't accessing the global
                window (this might be incomplete still) */
                let isNotGlobal = false;
                switch (parent.type) {
                    case AST_NODE_TYPES.FunctionExpression:
                    case AST_NODE_TYPES.ArrowFunctionExpression:
                    case AST_NODE_TYPES.FunctionDeclaration:
                    case AST_NODE_TYPES.TSDeclareFunction:
                    case AST_NODE_TYPES.TSEmptyBodyFunctionExpression:
                    case AST_NODE_TYPES.TSParameterProperty: // Function params
                    case AST_NODE_TYPES.TSInterfaceDeclaration:
                    case AST_NODE_TYPES.TSInterfaceHeritage:
                    case AST_NODE_TYPES.TSTypeAliasDeclaration:
                    case AST_NODE_TYPES.TSTypeReference: // Types
                    case AST_NODE_TYPES.MethodDefinition: // Method def
                    case AST_NODE_TYPES.ArrayPattern: // Destructure
                    case AST_NODE_TYPES.RestElement: // ...Rest
                        isNotGlobal = true;
                        break;
                    case AST_NODE_TYPES.PropertyDefinition:
                        if (parent.key === node) {
                            isNotGlobal = true;
                        }
                        break;
                    case AST_NODE_TYPES.VariableDeclarator:
                        if (parent.id === node) {
                            isNotGlobal = true;
                        }
                        break;
                    case AST_NODE_TYPES.Property:
                        const { parent: { type } } = parent;
                        // Destructuring
                        if (type === AST_NODE_TYPES.ObjectPattern) {
                            isNotGlobal = true;
                        }
                        // Key name
                        if (
                            type === AST_NODE_TYPES.ObjectExpression &&
                            parent.key === node
                        ) {
                            isNotGlobal = true;
                        }
                        break;
                }

                if (isBaseObject || (notMemberExp && !isNotGlobal)) {
                    /* Check if window has been declared as a variable in
                    scopes (though naming things after globals should
                    really be avoided) */
                    /* Note: "this" is not required when accessing window
                    in the constructor since it's using the injected
                    parameter and not the global property */
                    let scope = context.getScope();
                    while (scope.type !== TSESLint.Scope.ScopeType.global) {
                        if (scope.set.has('window')) {
                            const variable = scope.set.get('window');
                            const identifier = variable.identifiers[0];
                            if (
                                identifier.name === 'window' &&
                                identifier.range[1] < node.range[0]
                            ) {
                                return;
                            }
                        }
                        scope = scope.upper;
                    }

                    let classBody: TSESTree.Node = node.parent;
                    while (classBody.type !== AST_NODE_TYPES.ClassBody) {
                        classBody = classBody.parent;
                    }
                    if (hasInjectedWindowProp(classBody)) {
                        context.report({
                            node,
                            messageId: 'globalWindow',
                            fix(fixer) {
                                return fixer.insertTextBefore(node, 'this.');
                            }
                        });
                    } else {
                        context.report({
                            node,
                            messageId: 'globalWindow',
                        });
                    }
                }
            },
        };
    }
});
