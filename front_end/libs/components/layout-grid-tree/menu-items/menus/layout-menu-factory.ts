import { BaseMenuItem } from '@components/context-menu/context-menu.types';
import { getLayoutOpenWindowActionsFactory } from '@components/layout-grid-tree/menu-items/actions/get-layout-open-window-actions-factory';

import { getFullScreenActionsFactory } from '../actions/get-full-screen-actions-factory';
import { getLayoutEditActionsFactory } from '../actions/get-layout-edit-actions-factory';
import { getLayoutLockActionsFactory } from '../actions/get-layout-lock-actions-factory';
import { getLayoutResolutionActionsFactory } from '../actions/get-layout-resolution-actions-factory';
import { getLayoutShareActionsFactory } from '../actions/get-layout-share-actions-factory';
import { getLayoutUpdateActionsFactory } from '../actions/get-layout-update-actions-factory';

export const layoutMenuFactory = ({
    getLayoutLockActions,
    getLayoutEditActions,
    getLayoutUpdateActions,
    getLayoutOpenWindowActions,
    getLayoutShareActions,
    getFullScreenActions,
    getLayoutResolutionActions,
}: {
    getLayoutLockActions: ReturnType<typeof getLayoutLockActionsFactory>;
    getLayoutEditActions: ReturnType<typeof getLayoutEditActionsFactory>;
    getLayoutUpdateActions: ReturnType<typeof getLayoutUpdateActionsFactory>;
    getLayoutOpenWindowActions: ReturnType<typeof getLayoutOpenWindowActionsFactory>;
    getLayoutShareActions: ReturnType<typeof getLayoutShareActionsFactory>;
    getFullScreenActions: ReturnType<typeof getFullScreenActionsFactory>;
    getLayoutResolutionActions: ReturnType<typeof getLayoutResolutionActionsFactory>;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({
    tree: node =>
        [
            ...getLayoutOpenWindowActions(node),
            ...getLayoutEditActions(node),
            ...getLayoutUpdateActions(node),
            ...getLayoutShareActions(node),
            ...getLayoutLockActions(node),
        ].filter(Boolean),
    scene: node =>
        [
            ...getLayoutOpenWindowActions(node),
            ...getLayoutEditActions(node).filter((menu: BaseMenuItem) => menu.id !== 'startRename'),
            ...getLayoutUpdateActions(node),
            ...getLayoutLockActions(node),
            ...getFullScreenActions(node),
            ...getLayoutResolutionActions(node),
        ].filter(Boolean),
});
