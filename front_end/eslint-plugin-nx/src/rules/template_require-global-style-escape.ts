/**
 * @fileoverview Require elements selected by global styling to be escaped.
 */

import type { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';

import bootstrapElements from '../data/bootstrap-elements';
import nxGlobalStyleElements from '../data/nx-global-style-elements';

import { sourceSpanToLoc } from './template-utils';
import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [
            {
                title: 'Other element enhancements',
                description: "Native element enhancements that don't follow the nx-element naming",
                type: 'array',
                items: {
                    type: 'string',
                },
            },
        ],
        messages: {
            escapeRequired: 'Element must escape global styling',
        },
        fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [[] as string[]],
    create(context, [otherEnhancements]) {
        return {
            Element$1(node: TmplAstElement) {
                const nxName = `nx-${node.name}`; // ex: <input nx-input />
                // Assuming element enhancements add escape directive to host
                if (
                    (bootstrapElements.has(node.name) || nxGlobalStyleElements.has(node.name)) &&
                    !node.attributes.some(
                        a =>
                            a.name === 'data-escape-global-style' ||
                            a.name === nxName ||
                            otherEnhancements.includes(a.name),
                    )
                ) {
                    context.report({
                        loc: sourceSpanToLoc(node.startSourceSpan),
                        messageId: 'escapeRequired',
                        fix(fixer) {
                            const {
                                startSourceSpan: { end },
                            } = node;
                            return fixer.insertTextBeforeRange(
                                [end.offset - 1, end.offset],
                                ' data-escape-global-style',
                            );
                        },
                    });
                }
            },
        };
    },
});
