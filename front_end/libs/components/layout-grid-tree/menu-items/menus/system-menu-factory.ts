import { computed } from '@angular/core';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { NxSystemInfo } from '@services/systems.service.types';

export const systemMenuFactory =
    (
        checkIfSystemLayout: () => boolean,
        getSystems: () => NxSystemInfo[],
        updateRouteParams: (
            params: Parameters<LayoutStateService['paramStateHandler']['state$$']['update']>[0],
        ) => void,
    ) =>
    (node: ResourceNodeMap[ResourceType.SYSTEM]) =>
        [
            {
                id: 'connectToSystem',
                name: staticLang.layouts.treeActions.connectToSystem.name,
                tooltip: staticLang.layouts.treeActions.connectToSystem.tooltip,
                disabled$$: computed(() => {
                    const systems = getSystems();
                    const system = systems.find(({ id }) => id === node.details.id);
                    return system?.stateOfHealth !== 'online';
                }),
                action: ($event, node) => {
                    const isSystemLayout = checkIfSystemLayout();
                    updateRouteParams(({ params }) => ({
                        params: {
                            systemId: node.details.id,
                            layoutId: isSystemLayout || !params ? 'default' : params.layoutId,
                        },
                    }));
                },
            },
        ].filter(Boolean);
