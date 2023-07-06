/**
 * @fileoverview Check element contents when the translate attribute is used.
 *
 * @author Andrew Wu
 */

import type {
    TmplAstElement,
    TmplAstNode,
    TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';

import { TMPL_AST_NODES, sourceSpanToLoc } from './template-utils';
import type { WithParent, WithType } from './template-utils';
import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

interface Element extends TmplAstElement {
    children: WithType<TmplAstNode & { name: string }>[];
}

type Options = [string[]];
type MessageIds = 'noText' | 'notOnlyText';

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule<Options, MessageIds>({
    meta: {
        type: 'problem',
        schema: [
            {
                title: 'Allowed element names',
                description:
                    'Elements that are allowed to be within translated elements (i.e. contain no text)',
                type: 'array',
                items: {
                    type: 'string',
                },
            },
        ],
        messages: {
            noText: 'No text to translate',
            notOnlyText: 'Translated elements should only contain text',
        },
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [[]],
    create(context, [allowedElems]) {
        return {
            'TextAttribute[name="translate"][value=""]'(
                node: WithParent<TmplAstTextAttribute, Element>,
            ) {
                const element = node.parent;
                if (!element.children.length) {
                    context.report({
                        loc: sourceSpanToLoc(node.sourceSpan),
                        messageId: 'noText',
                    });
                } else if (
                    element.children.length > 1 ||
                    element.children[0].type !== TMPL_AST_NODES.Text$3
                ) {
                    element.children.forEach(child => {
                        if (
                            child.type !== TMPL_AST_NODES.Text$3 &&
                            !allowedElems.includes(child.name)
                        ) {
                            context.report({
                                loc: sourceSpanToLoc(child.sourceSpan),
                                messageId: 'notOnlyText',
                            });
                        }
                    });
                }
            },
        };
    },
});
