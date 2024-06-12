import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystem } from '@services/system.service/system';
import { SystemResourcesTypeMap } from '@store/system-resources/system-resources.types';
import { cleanIdLegacy } from '@utils/general';

import type { createFocusLayoutFactory } from './create-focus-layout-factory';
import type { createNewLayoutFactory } from './create-new-layout-factory';

type FindSelectedLayoutParams = [NxSystem, string, Layout[], SystemResourcesTypeMap];

export const findSelectedLayoutFactory =
    (
        createNewLayout: ReturnType<typeof createNewLayoutFactory>,
        createFocusLayout: ReturnType<typeof createFocusLayoutFactory>,
    ) =>
    async ([system, layoutId, layouts, layoutItems]: FindSelectedLayoutParams): Promise<Layout> => {
        if (layoutId && system.useRest) {
            const existingLayout = layouts.find(({ id }) => cleanIdLegacy(id) === layoutId);
            const isResourceId = Object.values(layoutItems).some(items =>
                items?.some(({ id }) => id === layoutId),
            );

            // Prevent showing a layout that was accidentally saved with the same ID as a resource.
            if (existingLayout && !isResourceId) {
                return { ...existingLayout, systemId: existingLayout.systemId || system.id };
            }
        }
        const [extractedLayoutId, systemId = system.id] = layoutId.split('.').reverse();
        return layoutId
            ? createFocusLayout(systemId, extractedLayoutId).catch(() => createNewLayout(systemId))
            : createNewLayout(systemId);
    };
