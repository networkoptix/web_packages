/**
 * @fileoverview A custom implementation of the no-useless-constructor rule
 * that ignores constructors if the class extends another class.
 *
 * This is to avoid Angular decorator weirdness with abstract base components.
 *
 * https://github.com/angular/angular/issues/35367#issuecomment-585182508
 *
 * @author Andrew Wu
 */

'use strict';

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            useless: 'Useless constructor.',
            removeUseless: 'Remove useless constructor',
        },
        // fixable: true,
        hasSuggestions: true,
    },
    create: function (context) {
        return {
            /**
             * @param {import('@typescript-eslint/utils')
             * .TSESTree.MethodDefinition} node
             */
            'ClassBody > MethodDefinition[kind="constructor"]'(node) {
                // Ignore if class extends another class
                // MethodDefinition => ClassBody => ClassDeclaration
                if (node.parent.parent.superClass) {
                    return;
                }

                // Ignore overload signatures
                if (!node.value.body) {
                    return;
                }

                // No params and no body contents
                if (!node.value.params.length && !node.value.body.body.length) {
                    context.report({
                        node,
                        messageId: 'useless',
                        suggest: [{
                            messageId: 'removeUseless',
                            fix: function (fixer) {
                                return fixer.remove(node);
                            },
                        }],
                    });
                }
            }
        };
    }
};
