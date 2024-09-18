/**
 * @fileoverview Require types for properties/variables without initial values
 * or where types cannot be inferred from initial values.
 *
 * This rule should be cut down or removed once the noImplicitAny option is
 * enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import { createRule, decoratorHasCall, decoratorName, isUntypedValue } from './utils';
import type { Decorator } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const forTypes = [
    AST_NODE_TYPES.ForStatement,
    AST_NODE_TYPES.ForOfStatement,
    AST_NODE_TYPES.ForInStatement,
];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedProp: 'Untyped property.',
            untypedParamProp: 'Untyped parameter property.',
            untypedDeclaration: 'Untyped declaration.',
        },
    },
    defaultOptions: [],
    create(context) {
        function reportNode(
            node: TSESTree.Node,
            expression: TSESTree.Expression,
            messageId: 'untypedProp' | 'untypedParamProp' | 'untypedDeclaration',
        ): void {
            if (expression === null || isUntypedValue(expression)) {
                context.report({
                    node,
                    messageId,
                });
            }
        }

        return {
            PropertyDefinition(node) {
                const { decorators, typeAnnotation, value } = node;
                if (typeAnnotation) {
                    return;
                }

                /* Inputs and outputs are handled
                by explicit-angular-boundary-types rule */
                const isInputOrOutput = decorators?.some(
                    (d: Decorator) =>
                        decoratorHasCall(d) &&
                        (decoratorName(d) === 'Input' || decoratorName(d) === 'Output'),
                );
                if (isInputOrOutput) {
                    return;
                }

                reportNode(node, value, 'untypedProp');
            },
            'ClassBody > MethodDefinition[kind="constructor"]'(node: TSESTree.MethodDefinition) {
                node.value.params.forEach(param => {
                    if (param.type !== AST_NODE_TYPES.TSParameterProperty) {
                        return;
                    }

                    const { parameter } = param;
                    if (parameter.type === AST_NODE_TYPES.Identifier && !parameter.typeAnnotation) {
                        context.report({
                            node: param,
                            messageId: 'untypedParamProp',
                        });
                    } else if (
                        parameter.type === AST_NODE_TYPES.AssignmentPattern &&
                        !parameter.left.typeAnnotation &&
                        isUntypedValue(parameter.right)
                    ) {
                        context.report({
                            node: param,
                            messageId: 'untypedParamProp',
                        });
                    }
                });
            },
            VariableDeclaration(node) {
                const { parent, declarations } = node;

                if (forTypes.includes(parent.type)) {
                    // Ignore assignments in for/forof/forin
                    return;
                }

                declarations.forEach(declarator => {
                    const {
                        id: { typeAnnotation },
                        init,
                    } = declarator;
                    if (typeAnnotation) {
                        return;
                    }
                    reportNode(node, init, 'untypedDeclaration');
                });
            },
        };
    },
});
