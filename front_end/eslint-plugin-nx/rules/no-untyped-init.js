/**
 * @fileoverview Require types for properties/variables without initial values
 * or with initial values of empty array or empty object.
 *
 * This rule should be cut down or removed once the noImplicitAny option is
 * enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

'use strict';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const forTypes = [
    'ForStatement',
    'ForOfStatement',
    'ForInStatement',
];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            untypedProp: 'Untyped property.',
            untypedDeclaration: 'Untyped declaration.',
        },
    },
    create: function (context) {
        function reportNode(node, expression, messageId) {
            if (expression === null) {
                context.report({
                    node,
                    messageId,
                });
            } else {
                const isEmptyArray = expression.type === 'ArrayExpression' &&
                    !expression.elements.length;
                const isEmptyObject = expression.type === 'ObjectExpression' &&
                    !expression.properties.length;
                if (isEmptyArray || isEmptyObject) {
                    context.report({
                        node,
                        messageId,
                    });
                }
            }
        }

        return {
            PropertyDefinition(node) {
                const { decorators, typeAnnotation, value } = node;
                if (typeAnnotation) {
                    return;
                }

                /* Inputs and outputs are handled
                by explicit-input-output-types rule */
                const isInputOrOutput = decorators && decorators.some(d =>
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
};
