/**
 * @fileoverview Require types for properties/variables without initial values
 * or where types cannot be inferred from initial values.
 *
 * This rule should be cut down or removed once the noImplicitAny option is
 * enabled in tsconfig.json.
 *
 * @author Andrew Wu
 */

'use strict';

const { isUntypedValue } = require('./utils');

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
