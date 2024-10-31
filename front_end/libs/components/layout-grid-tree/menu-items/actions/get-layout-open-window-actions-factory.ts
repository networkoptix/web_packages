import { Signal } from '@angular/core';

import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { openWindowActionsFactory } from '@components/layout-grid-tree/menu-items/actions/open-window-actions-factory';

export const getLayoutOpenWindowActionsFactory =
    (
        openWindowActions: ReturnType<typeof openWindowActionsFactory>,
        getDisabledSignal: (layoutId: string) => Signal<boolean>,
    ) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        const disabled$$ = getDisabledSignal(node.details.id);

        return openWindowActions.map(action => ({ ...action, disabled$$ }));
    };
