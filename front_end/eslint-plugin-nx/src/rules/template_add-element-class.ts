/**
 * @fileoverview
 */

import type { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';

import { sourceSpanToLoc } from './template-utils';
import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const elementClasses = new Map<string, string>([]);
// Modify this to make changes to codebase, but don't commit this change or the build change

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            missingClass: 'Missing element class',
        },
        fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
            Element$1(node: TmplAstElement) {
                const { name, attributes } = node;
                if (elementClasses.has(name)) {
                    const elementClass = elementClasses.get(name)!;
                    const classAttribute = attributes.find(a => a.name === 'class');
                    if (classAttribute) {
                        const { valueSpan } = classAttribute;
                        const value = context.sourceCode
                            .getText()
                            .slice(valueSpan.start.offset, valueSpan.end.offset);
                        const values = value.split(' ').filter(Boolean);
                        if (!values.includes(elementClass)) {
                            context.report({
                                messageId: 'missingClass',
                                loc: sourceSpanToLoc(node.sourceSpan),
                                fix(fixer) {
                                    return fixer.replaceTextRange(
                                        [valueSpan.start.offset, valueSpan.end.offset],
                                        `${elementClass} ${value}`,
                                    );
                                },
                            });
                        }
                    } else {
                        const { startSourceSpan } = node;
                        context.report({
                            messageId: 'missingClass',
                            loc: sourceSpanToLoc(startSourceSpan),
                            fix(fixer) {
                                return fixer.insertTextAfterRange(
                                    [
                                        startSourceSpan.start.offset,
                                        startSourceSpan.start.offset + name.length + 1,
                                    ],
                                    ` class="${elementClass}"`,
                                );
                            },
                        });
                    }
                }
            },
        };
    },
});
