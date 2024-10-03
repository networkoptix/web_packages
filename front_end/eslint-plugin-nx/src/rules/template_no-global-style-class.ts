/**
 * @fileoverview Prohibit use of Bootstrap/global styling classes
 *
 * Rule only checks class= and [class.]= to keep things simple
 */

import type {
    TmplAstBoundAttribute,
    TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';
import { TSESTree } from '@typescript-eslint/utils';

import bootstrapClasses from '../data/bootstrap-classes';
import nxGlobalStyleClasses from '../data/nx-global-style-classes';

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
        schema: [],
        messages: {
            forbiddenBootstrap: 'Forbidden Bootstrap class {{ className }}',
            forbiddenNx: 'Forbidden global style class {{ className }}',
        },
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        function checkForbidden(className: string, loc: TSESTree.SourceLocation): void {
            if (bootstrapClasses.has(className)) {
                context.report({
                    loc,
                    messageId: 'forbiddenBootstrap',
                    data: { className },
                });
            }
            if (nxGlobalStyleClasses.has(className)) {
                context.report({
                    loc,
                    messageId: 'forbiddenNx',
                    data: { className },
                });
            }
        }

        return {
            'TextAttribute[name="class"]'(node: TmplAstTextAttribute) {
                const classes = node.value.split(' ');
                for (const className of classes) {
                    checkForbidden(className, sourceSpanToLoc(node.valueSpan));
                }
            },
            BoundAttribute(node: TmplAstBoundAttribute) {
                const { details } = node.keySpan;
                if (!details || !details.startsWith('class.')) {
                    return;
                }

                const className = details.split('.').pop();
                checkForbidden(className, sourceSpanToLoc(node.keySpan));
            },
        };
    },
});
