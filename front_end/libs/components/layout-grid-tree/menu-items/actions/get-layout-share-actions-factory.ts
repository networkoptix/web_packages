import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';

export const getLayoutShareActionsFactory =
    (shareLayout: (layout: Layout) => void, unshareLayout: (layout: Layout) => void) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (node.crossSystem || !node.owned || node.locked || !nxConfig.featureFlags.layoutsShare) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            node.shared
                ? {
                      id: 'unshareLayout',
                      name: staticLang.layouts.treeActions.unshareLayout.name,
                      action: () => unshareLayout(node.details),
                  }
                : {
                      id: 'shareLayout',
                      name: staticLang.layouts.treeActions.shareLayout.name,
                      action: () => shareLayout(node.details),
                  },
        ];
    };
