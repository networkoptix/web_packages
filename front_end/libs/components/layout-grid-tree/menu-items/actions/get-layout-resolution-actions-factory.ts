import { signal } from '@angular/core';

import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';

export const getLayoutResolutionActionsFactory =
    (
        getResolution: (layoutId: string) => Promise<Resolution>,
        setLayoutResolution: ({
            layoutId,
            resolution,
        }: {
            layoutId: string;
            resolution: Resolution;
        }) => void,
    ) =>
    (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] =>
        (
            [
                {
                    id: 'divider',
                    name: 'divider',
                },
                {
                    id: 'resolution',
                    name: staticLang.layouts.treeActions.resolution.name,
                    subMenu: async (node: ResourceNodeMap[ResourceType.LAYOUT]) => {
                        const menuItems = [
                            {
                                resolution: Resolution.AUTO,
                                lang: staticLang.layouts.treeActions.resolutionAuto,
                            },
                            {
                                resolution: Resolution.LOW,
                                lang: staticLang.layouts.treeActions.resolutionLow,
                            },
                            {
                                resolution: Resolution.HIGH,
                                lang: staticLang.layouts.treeActions.resolutionHigh,
                            },
                            {
                                resolution: Resolution.CUSTOM,
                                lang: staticLang.layouts.treeActions.resolutionCustom,
                            },
                        ];

                        const layoutResolution = await getResolution(node.details.id);

                        return menuItems.reduce(
                            (menu: MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[], menuItem) => {
                                if (
                                    menuItem.resolution !== layoutResolution &&
                                    menuItem.resolution === Resolution.CUSTOM
                                ) {
                                    return menu;
                                }

                                menu.push({
                                    id: menuItem.resolution,
                                    ...menuItem.lang,
                                    checked$$: signal(menuItem.resolution === layoutResolution),
                                    action: () => {
                                        setLayoutResolution({
                                            layoutId: node.details.id,
                                            resolution: menuItem.resolution,
                                        });
                                    },
                                });
                                return menu;
                            },
                            [],
                        );
                    },
                },
            ] as MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[]
        ).filter(Boolean);
