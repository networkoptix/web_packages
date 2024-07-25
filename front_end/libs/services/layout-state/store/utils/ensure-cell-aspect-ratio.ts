import { inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { Layout } from '@services/system-api.types/layouts.types';
import { SystemResourcesSelectors } from '@store/system-resources';
import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';
import { cleanId } from '@utils/general';

import { UnsavedLayoutState } from '../shared/types/layout-state.types';

export const ensureCellAspectRatio = (layout: Layout): Layout => {
    if (layout.cellAspectRatio) {
        return layout;
    }

    const cellAspectRatio = LayoutStateService.runInInjectionContext(() => {
        const { items, systemId } = layout;
        const systemIds = new Set([
            systemId,
            ...items.map(({ resourcePath }) => extractSystemAndResourceId(resourcePath).systemId),
        ]);
        const devices = new Map(
            [...systemIds]
                .flatMap(systemId =>
                    inject(Store).selectSignal(
                        SystemResourcesSelectors.selectCamerasBySystemId(systemId),
                    )(),
                )
                .map(device => {
                    const id = device.id;
                    const aspect = device.parameters.overrideAr || device.defaultRatio || 0;
                    const rotatedAspect = Boolean((device.parameters.rotation || 0) % 180);
                    return [id, rotatedAspect ? 1 / aspect : aspect] as const;
                }),
        );
        return items.map(({ resourceId }) => devices.get(cleanId(resourceId))).find(Boolean) || 0;
    });

    return {
        ...layout,
        cellAspectRatio,
    };
};

export const ensureCellAspectRatioOnUnsavedLayout = (
    layoutState: UnsavedLayoutState,
): UnsavedLayoutState => {
    if (layoutState.layout.cellAspectRatio) {
        return layoutState;
    }

    return {
        ...layoutState,
        layout: ensureCellAspectRatio(layoutState.layout),
    };
};
