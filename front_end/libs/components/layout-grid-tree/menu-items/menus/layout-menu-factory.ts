import { BaseMenuItem } from '@components/context-menu/context-menu.types';

import { getFullScreenActionsFactory } from '../actions/get-full-screen-actions-factory';
import { getLayoutEditActionsFactory } from '../actions/get-layout-edit-actions-factory';
import { getLayoutLockActionsFactory } from '../actions/get-layout-lock-actions-factory';
import { getLayoutResolutionActionsFactory } from '../actions/get-layout-resolution-actions-factory';
import { getLayoutShareActionsFactory } from '../actions/get-layout-share-actions-factory';
import { getLayoutUpdateActionsFactory } from '../actions/get-layout-update-actions-factory';
import { openWindowActionsFactory } from '../actions/open-window-actions-factory';

export const layoutMenuFactory = ({
    getLayoutLockActions,
    getLayoutEditActions,
    getLayoutUpdateActions,
    openWindowActions,
    getLayoutShareActions,
    getFullScreenActions,
    getLayoutResolutionActions,
}: {
    getLayoutLockActions: ReturnType<typeof getLayoutLockActionsFactory>;
    getLayoutEditActions: ReturnType<typeof getLayoutEditActionsFactory>;
    getLayoutUpdateActions: ReturnType<typeof getLayoutUpdateActionsFactory>;
    openWindowActions: ReturnType<typeof openWindowActionsFactory>;
    getLayoutShareActions: ReturnType<typeof getLayoutShareActionsFactory>;
    getFullScreenActions: ReturnType<typeof getFullScreenActionsFactory>;
    getLayoutResolutionActions: ReturnType<typeof getLayoutResolutionActionsFactory>;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}) => ({
    tree: node =>
        [
            ...openWindowActions,
            ...getLayoutEditActions(node),
            ...getLayoutUpdateActions(node),
            ...getLayoutLockActions(node),
            ...getLayoutShareActions(node),
        ].filter(Boolean),
    scene: node =>
        [
            ...openWindowActions,
            ...getLayoutEditActions(node).filter((menu: BaseMenuItem) => menu.id !== 'startRename'),
            ...getLayoutUpdateActions(node),
            ...getLayoutLockActions(node),
            ...getFullScreenActions(node),
            ...getLayoutResolutionActions(node),
        ].filter(Boolean),
});
