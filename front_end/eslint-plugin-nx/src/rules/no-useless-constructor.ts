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

import { TSESTree } from '@typescript-eslint/utils';

import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
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
    defaultOptions: [],
    create(context) {
        return {
            'ClassBody > MethodDefinition[kind="constructor"]'(node: TSESTree.MethodDefinition) {
                // Ignore if class extends another class
                // MethodDefinition => ClassBody => ClassDeclaration
                if ((node.parent.parent as TSESTree.ClassDeclaration).superClass) {
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
                        suggest: [
                            {
                                messageId: 'removeUseless',
                                fix(fixer) {
                                    return fixer.remove(node);
                                },
                            },
                        ],
                    });
                }
            },
        };
    },
});
