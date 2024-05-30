import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { openWindowActionsFactory } from '../actions/open-window-actions-factory';

export const cameraMenuFactory = (
    createPortal: (camera: NxSystemCamera) => void,
    openWindowActions: ReturnType<typeof openWindowActionsFactory>,
): MenuItem<ResourceNodeMap[ResourceType.CAMERA]>[] =>
    [
        ...openWindowActions,
        ...((nxConfig.featureFlags.layoutsEditable &&
            nxConfig.featureFlags.layoutsDeviceSettings && [
                {
                    id: 'divider',
                    name: 'divider',
                },
                {
                    id: 'settings',
                    name: staticLang.layouts.treeActions.cameraSettings.name,
                    action: ($event, node) => createPortal(node.details),
                },
            ]) ||
            []),
    ].filter(Boolean);
