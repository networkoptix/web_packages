import { Signal } from '@angular/core';

import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';

export const getLayoutUpdateActionsFactory =
    (
        discardLayout: (layoutId: string) => void,
        saveLayout: (layoutId: string) => void,
        getDisabledSignal: (layoutId: string) => Signal<boolean>,
    ) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        const disabled$$ = getDisabledSignal(node.details.id);
        if (!node.owned || node.locked || !nxConfig.featureFlags.layoutsEditable) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            {
                id: 'save',
                name: staticLang.layouts.treeActions.saveChanges.name,
                disabled$$,
                action: () => saveLayout(node.details.id),
            },
            {
                id: 'discard',
                name: staticLang.layouts.treeActions.discardChanges.name,
                disabled$$,
                action: () => discardLayout(node.details.id),
            },
        ];
    };
