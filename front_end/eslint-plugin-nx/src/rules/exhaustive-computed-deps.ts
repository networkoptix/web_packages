/**
 * @fileoverview Disallow non-signal mutable properties in computed signals.
 *
 * Inspired by React's exhaustive-deps rule for useEffect hooks.
 *
 * Weaknesses:
 *
 * - Requires compliance with $$ naming convention for signals.
 *
 * - Can't detect readonly properties in parent classes
 *
 * - Can't detect quasi-readonly properties that are only ever assigned once
 *
 * @author Andrew Wu
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

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
            nonSignalInComputed:
                'Non-signal mutable properties should not be used in computed signals, as only signals will trigger recomputation',
        },
    },
    defaultOptions: [],
    create(context) {
        const reaonlyProps = new WeakMap<TSESTree.ClassBody, Set<string>>();

        return {
            ClassBody(node) {
                reaonlyProps.set(node, new Set());
                node.body.forEach(clsElem => {
                    if (clsElem.type === AST_NODE_TYPES.PropertyDefinition && clsElem.readonly) {
                        reaonlyProps.get(node).add((clsElem.key as TSESTree.Identifier).name);
                    }
                });
            },
            'ClassBody CallExpression[callee.name="computed"] MemberExpression > ThisExpression'(
                node: TSESTree.ThisExpression,
            ) {
                let classBody = node as TSESTree.Node;
                while (classBody.type !== AST_NODE_TYPES.ClassBody) {
                    classBody = classBody.parent;
                }
                const classProperty = (node.parent as TSESTree.MemberExpressionNonComputedName)
                    .property.name;
                if (reaonlyProps.get(classBody).has(classProperty)) {
                    return; // readonly prop, safe to use
                }

                let target: TSESTree.Node = node;
                while (
                    target.parent.type === AST_NODE_TYPES.MemberExpression ||
                    (target.parent.type === AST_NODE_TYPES.CallExpression &&
                        target.parent.callee === target)
                    /* Don't go up if MemberExpression is not the one being called */
                ) {
                    target = target.parent;
                    if (
                        target.type === AST_NODE_TYPES.MemberExpression &&
                        (target.property as TSESTree.Identifier).name.endsWith('$$')
                    ) {
                        return; // Signal found (but not necessarily called)
                    }
                }

                context.report({
                    node: target,
                    messageId: 'nonSignalInComputed',
                });
            },
        };
    },
});
