/**
 * @fileoverview Require types for properties/variables without initial values
 * or where types cannot be inferred from initial values.
 *
 * This rule should be cut down or removed once the noImplicitAny option is
 * enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, isUntypedValue } from './utils';
import type { AngularDecorator } from './utils';

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
    name: 'no-untyped-init',
    meta: {
        docs: {
            description: 'Require types for properties/variables without initial values or where types cannot be inferred from initial values',
            recommended: false
        },
        type: 'problem',
        schema: [],
        messages: {
            untypedProp: 'Untyped property.',
            untypedDeclaration: 'Untyped declaration.',
        },
    },
    defaultOptions: [],
    create(context) {
        function reportNode(
            node: TSESTree.Node,
            expression: TSESTree.Expression,
            messageId: 'untypedProp' | 'untypedDeclaration'
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
                const isInputOrOutput = decorators
                    ?.some((d: AngularDecorator) =>
                        d.expression.callee.name === 'Input' ||
                        d.expression.callee.name === 'Output'
                    );
                if (isInputOrOutput) {
                    return;
                }

                reportNode(node, value, 'untypedProp');
            },
            VariableDeclaration(node) {
                const { parent, declarations } = node;

                if (forTypes.includes(parent.type)) {
                    // Ignore assignments in for/forof/forin
                    return;
                }

                declarations.forEach(declarator => {
                    const { id: { typeAnnotation }, init } = declarator;
                    if (typeAnnotation) {
                        return;
                    }
                    reportNode(node, init, 'untypedDeclaration');
                });
            },
        };
    }
});
