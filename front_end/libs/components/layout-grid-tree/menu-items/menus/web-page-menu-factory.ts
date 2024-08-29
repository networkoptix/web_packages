import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { openWindowActionsFactory } from '@components/layout-grid-tree/menu-items/actions/open-window-actions-factory';

export const webPageMenuFactory =
    (openWindowActions: ReturnType<typeof openWindowActionsFactory>) =>
    (node: ResourceNodeMap[ResourceType.WEB_PAGE]) =>
        [...openWindowActions].filter(Boolean);
