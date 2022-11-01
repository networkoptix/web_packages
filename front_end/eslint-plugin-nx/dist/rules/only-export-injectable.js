"use strict";
const utils_1 = require("./utils");
const injectableDecorators = [
    'Injectable',
    'Component',
    'Pipe',
    'Directive',
];
module.exports = (0, utils_1.createRule)({
    meta: {
        type: 'problem',
        schema: [],
        messages: {
            onlyExportInjectable: 'Files with injectables should only export the injectable.'
        },
    },
    defaultOptions: [],
    create(context) {
        const nonInjectables = [];
        let injectableFile = false;
        function reportNode(node) {
            context.report({
                node,
                messageId: 'onlyExportInjectable',
            });
        }
        function handleNonInjectable(node) {
            if (injectableFile) {
                reportNode(node);
            }
            else {
                nonInjectables.push(node);
            }
        }
        return {
            ExportNamedDeclaration(node) {
                if (node.declaration === null) {
                    handleNonInjectable(node);
                    return;
                }
                const { decorators } = node.declaration;
                const isInjectable = decorators?.some((d) => (0, utils_1.decoratorHasCall)(d) &&
                    injectableDecorators.includes((0, utils_1.decoratorName)(d)));
                if (isInjectable) {
                    injectableFile = true;
                    nonInjectables.forEach(node => {
                        reportNode(node);
                    });
                }
                else {
                    handleNonInjectable(node);
                }
            },
        };
    }
});
