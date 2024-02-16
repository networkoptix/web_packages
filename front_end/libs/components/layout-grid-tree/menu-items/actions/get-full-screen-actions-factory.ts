import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';

export const getFullScreenActionsFactory =
    (toggleLayoutFullScreen: () => void, getCurrentLayoutId: () => string) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        return node.details.id === getCurrentLayoutId()
            ? [
                  {
                      id: 'divider',
                      name: 'divider',
                  },
                  {
                      id: 'toggleFullScreen',
                      name: document.fullscreenElement
                          ? staticLang.layouts.treeActions.exitFullScreen.name
                          : staticLang.layouts.treeActions.openFullScreen.name,
                      action: () => toggleLayoutFullScreen(),
                  },
              ]
            : [];
    };
