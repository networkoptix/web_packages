/**
 * @fileoverview Disallow exporting anything other than the injectable
 * in files with an injectable.
 *
 * Because of the way Angular builds the dependency graph, it will attempt to
 * compile all injectables from import source files even if the injectable
 * itself is not imported.
 *
 * @author Andrew Wu
 */

import { TSESTree } from '@typescript-eslint/utils';

import { createRule } from './utils';
import type { AngularDecorator } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const injectableDecorators = [
    'Injectable',
    'Component',
    'Pipe',
    'Directive',
];

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [], // no options
        messages: {
            onlyExportInjectable: 'Files with injectables should only export the injectable.'
        },
    },
    defaultOptions: [],
    create(context) {
        const nonInjectables: TSESTree.Node[] = [];
        let injectableFile = false;

        function reportNode(node: TSESTree.Node): void {
            context.report({
                node,
                messageId: 'onlyExportInjectable',
            });
        }

        function handleNonInjectable(node: TSESTree.Node): void {
            if (injectableFile) {
                reportNode(node);
            } else {
                nonInjectables.push(node);
            }
        }

        return {
            ExportNamedDeclaration(node) {
                // Export from another file
                if (node.declaration === null) {
                    handleNonInjectable(node);
                    return;
                }

                const { decorators } =
                    node.declaration as TSESTree.ClassDeclaration;
                const isInjectable = decorators?.some((d: AngularDecorator) =>
                    injectableDecorators.includes(d.expression.callee.name)
                );

                if (isInjectable) {
                    injectableFile = true;
                    nonInjectables.forEach(node => {
                        reportNode(node);
                    });
                } else {
                    handleNonInjectable(node);
                }
            },
        };
    }
});
