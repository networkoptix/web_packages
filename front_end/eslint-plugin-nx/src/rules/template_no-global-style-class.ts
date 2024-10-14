/**
 * @fileoverview Prohibit use of Bootstrap/global styling classes
 */

import type {
    Conditional,
    Interpolation,
    LiteralMap,
    LiteralPrimitive,
    TmplAstBoundAttribute,
    TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';
import { TSESTree } from '@typescript-eslint/utils';

import bootstrapClasses from '../data/bootstrap-classes';
import nxGlobalStyleClasses from '../data/nx-global-style-classes';

import { sourceSpanToLoc, TMPL_AST_NODES } from './template-utils';
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
                const { sourceSpan, keySpan, valueSpan, value } = node;
                if (!keySpan.details) {
                    // No name yet
                } else if (keySpan.details === 'class') {
                    if (sourceSpan.start.offset === keySpan.start.offset) {
                        // class="foo {{ bar }}"
                        // Interpolation works on class without square brackets

                        // @ts-expect-error Linter parser only
                        const ast = value.ast as Interpolation;
                        // template "foo {{ bar }}" => ast.strings [ 'foo ', '' ]
                        const astStrings = ast.strings
                            .filter(Boolean)
                            .flatMap(s => s.split(' ').filter(Boolean));
                        for (const astString of astStrings) {
                            checkForbidden(astString.trim(), sourceSpanToLoc(valueSpan));
                        }
                    } else {
                        // [class]="expression"
                        // Can't get anything from this
                    }
                } else if (keySpan.details.startsWith('class.')) {
                    // [class.foo]="bool"
                    const className = keySpan.details.split('.').pop();
                    checkForbidden(className, sourceSpanToLoc(keySpan));
                } else if (keySpan.details === 'ngClass') {
                    // @ts-expect-error Linter parser only
                    const ast = value.ast;
                    if (ast.type === TMPL_AST_NODES.LiteralMap) {
                        const astMap = ast as LiteralMap;
                        for (const keyObj of astMap.keys) {
                            checkForbidden(keyObj.key, sourceSpanToLoc(valueSpan));
                        }
                    } else if (ast.type === TMPL_AST_NODES.Conditional) {
                        const astConditional = ast as Conditional;
                        if (
                            // @ts-expect-error Linter parser only
                            astConditional.trueExp.type === TMPL_AST_NODES.LiteralPrimitive
                        ) {
                            const astTrueExp = astConditional.trueExp as LiteralPrimitive;
                            if (typeof astTrueExp.value === 'string') {
                                checkForbidden(astTrueExp.value, sourceSpanToLoc(valueSpan));
                            }
                        }
                        if (
                            // @ts-expect-error Linter parser only
                            astConditional.falseExp.type === TMPL_AST_NODES.LiteralPrimitive
                        ) {
                            const astFalseExp = astConditional.falseExp as LiteralPrimitive;
                            if (typeof astFalseExp.value === 'string') {
                                checkForbidden(astFalseExp.value, sourceSpanToLoc(valueSpan));
                            }
                        }
                    }
                }
            },
        };
    },
});
