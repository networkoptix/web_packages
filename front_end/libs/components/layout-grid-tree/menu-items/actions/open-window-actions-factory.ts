import staticLang from '@language_static';

export const openWindowActionsFactory = (
    openWindow: (nodeId: string, newWindow: boolean) => void,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => [
    {
        id: 'openNewTab',
        name: staticLang.layouts.treeActions.openNewTab.name,
        action: ($event, node) => openWindow(node.details.id, false),
    },
    {
        id: 'openNewWindow',
        name: staticLang.layouts.treeActions.openNewWindow.name,
        action: ($event, node) => openWindow(node.details.id, true),
    },
];
