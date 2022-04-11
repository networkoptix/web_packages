/**
 * @fileoverview Rule to disallow exporting anything other than the component
 * from component files.
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

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
    meta: {
        type: 'problem',
        schema: [], // no options
    },
    create: function (context) {
        return {
            ExportNamedDeclaration: function (node) {
                const { decorators } = node.declaration;
                if (!decorators) {
                    context.report({
                        node,
                        message: 'Component files should only export the component',
                    });
                } else {
                    const isComponent = decorators.some(d =>
                        d.expression.callee.name === 'Component'
                    );
                    if (!isComponent) {
                        context.report({
                            node,
                            message: 'Component files should only export the component',
                        });
                    }
                }
            },
        };
    }
};
