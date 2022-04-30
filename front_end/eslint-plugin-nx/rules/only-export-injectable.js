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

'use strict';

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

const injectableDecorators = [
    'Injectable',
    'Component',
    'Pipe',
    'Directive',
];

/** @type {import('@typescript-eslint/utils').TSESLint.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [], // no options
    },
    create: function (context) {
        const nonInjectables = [];
        let injectableFile = false;

        function reportNode(node) {
            context.report({
                node,
                message: 'Files with injectables should only export the injectable.',
            });
        }

        function handleNonInjectable(node) {
            if (injectableFile) {
                reportNode(node);
            } else {
                nonInjectables.push(node);
            }
        }

        return {
            ExportNamedDeclaration: function (node) {
                // Export from another file
                if (node.declaration === null) {
                    handleNonInjectable(node);
                    return;
                }

                const { decorators } = node.declaration;
                const isInjectable = decorators && decorators.some(d =>
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
};
