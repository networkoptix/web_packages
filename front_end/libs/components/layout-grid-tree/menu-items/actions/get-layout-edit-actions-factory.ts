import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';

export const getLayoutEditActionsFactory =
    (
        deleteLayout: (layout: Layout) => void,
        duplicateLayout: (layout: Layout) => void,
        setEditedLayout: (layout: Layout) => void,
    ) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): [] | MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!nxConfig.featureFlags.layoutsEditable) {
            return [];
        }

        return (
            [
                {
                    id: 'divider',
                    name: 'divider',
                },
                node.owned &&
                    !node.locked && {
                        id: 'startRename',
                        name: staticLang.layouts.treeActions.rename.name,
                        action: () => setEditedLayout(node.details),
                    },
                {
                    id: 'duplicate',
                    name: staticLang.layouts.treeActions.duplicate.name,
                    action: () => duplicateLayout(node.details),
                },
                node.owned &&
                    !node.locked && {
                        id: 'delete',
                        name: staticLang.layouts.treeActions.delete.name,
                        action: () => deleteLayout(node.details),
                    },
            ] as MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[]
        ).filter(Boolean);
    };
