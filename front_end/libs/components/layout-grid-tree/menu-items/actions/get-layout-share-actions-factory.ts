import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { CurrentUser } from '@services/system-user.types';

export const getLayoutShareActionsFactory =
    (shareLayout: (layout: Layout) => void, currentUser: () => CurrentUser | undefined) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        const isAdmin = currentUser()?.isAdmin;

        if (
            node.crossSystem ||
            node.shared ||
            node.locked ||
            !isAdmin ||
            !nxConfig.featureFlags.layoutsShare ||
            !nxConfig.featureFlags.layoutsEditable
        ) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            {
                id: 'shareLayout',
                name: staticLang.layouts.treeActions.shareLayout.name,
                action: () => shareLayout(node.details),
            },
        ];
    };
