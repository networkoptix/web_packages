import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemServer } from '@services/system.service/types/servers.types';

import { openWindowActionsFactory } from '../actions/open-window-actions-factory';

export const serverMenuFactory = (
    createPortal: (server: NxSystemServer) => void,
    openWindowActions: ReturnType<typeof openWindowActionsFactory>,
): MenuItem<ResourceNodeMap[ResourceType.SERVER]>[] =>
    [
        ...openWindowActions,
        ...([] ||
            (nxConfig.featureFlags.layoutsEditable &&
                nxConfig.featureFlags.layoutsDeviceSettings && [
                    {
                        id: 'divider',
                        name: 'divider',
                    },
                    {
                        id: 'settings',
                        name: staticLang.layouts.treeActions.serverSettings.name,
                        action: ($event, node) => createPortal(node.details),
                    },
                ])),
    ].filter(Boolean);
