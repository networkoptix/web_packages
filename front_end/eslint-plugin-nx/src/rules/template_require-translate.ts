/**
 * @fileoverview Require translations for text content in templates.
 *
 * @author Andrew Wu
 */

import type {
    TmplAstElement,
    TmplAstText,
    TmplAstBoundText,
} from '@angular-eslint/bundled-angular-compiler';

import { TMPL_AST_NODES, sourceSpanToLoc } from './template-utils';
import type { WithType } from './template-utils';
import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const textRegex = /[a-zA-Z]+/;

type Text = WithType<TmplAstText, TMPL_AST_NODES.Text$3>
    | WithType<TmplAstBoundText, TMPL_AST_NODES.BoundText> & {
        value: TmplAstBoundText['value'] & {
            ast: {
                strings: string[],
            };
        }
    };
// Text around BoundText (e.g. <div>foo {{ bar }}</div>) is not separate
// $Text3 elements, but instead .value.ast.strings on the BoundText element

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            translationRequired: 'Translation required',
            untranslatedText: 'Untranslated text',
        },
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
            'Element$1'(node: TmplAstElement) {
                if (node.children.length === 0) {
                    return;
                }

                const hasTranslate = node.attributes.some(a =>
                    a.name === 'translate' && a.value === ''
                );
                if (hasTranslate) {
                    return;
                }

                const loc = sourceSpanToLoc(node.sourceSpan);

                function checkForUntranslatedText(text: Text): boolean {
                    if (
                        text.type === TMPL_AST_NODES.Text$3 &&
                        textRegex.test(text.value)
                    ) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    } else if (
                        text.type === TMPL_AST_NODES.BoundText &&
                        text.value.ast.strings.some(s => textRegex.test(s))
                    ) {
                        context.report({ loc, messageId: 'untranslatedText' });
                        return true;
                    }
                }

                if (
                    node.children.length === 1 &&
                    (node.children[0] as Text).type === TMPL_AST_NODES.Text$3
                ) {
                    const [text] = node.children as [TmplAstText];
                    if (textRegex.test(text.value)) {
                        context.report({
                            loc,
                            messageId: 'translationRequired'
                        });
                    }
                } else {
                    let reported = false;
                    for (const child of node.children) {
                        reported = checkForUntranslatedText(child as Text);
                        if (reported) {
                            break;
                        }
                        // Don't report node multiple times
                    }
                }
            }
        };
    }
});
