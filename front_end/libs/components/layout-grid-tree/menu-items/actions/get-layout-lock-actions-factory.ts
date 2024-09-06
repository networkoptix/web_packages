import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { CurrentUser } from '@services/system-user.types';

export const getLayoutLockActionsFactory =
    (
        lockLayout: (layout: Layout) => void,
        unlockLayout: (layout: Layout) => void,
        currentUser: () => CurrentUser | undefined,
    ) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!(currentUser()?.isAdmin && nxConfig.featureFlags.layoutsEditable)) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            node.locked
                ? {
                      id: 'unlockLayout',
                      name: staticLang.layouts.treeActions.unlockLayout.name,
                      action: () => unlockLayout(node.details),
                  }
                : {
                      id: 'lockLayout',
                      name: staticLang.layouts.treeActions.lockLayout.name,
                      action: () => lockLayout(node.details),
                  },
        ];
    };
