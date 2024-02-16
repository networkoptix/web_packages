import { v4 as uuid } from 'uuid';

import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import { LayoutResourceTree } from '@components/layout-grid/layout-grid.types';
import { LayoutItem } from '@services/system-api.types/layouts.types';
import { dirtyId } from '@utils/general';

export const createLayoutItem =
    (layoutItemLookup: LayoutResourceTree | null, systemId: string) =>
    (id: string): LayoutItem => {
        let rotation = 0;
        const resourceId = dirtyId(id);
        const unknownItem = layoutItemLookup?.[resourceId];
        const resourcePath = `cloud://${
            unknownItem && 'systemId' in unknownItem.details
                ? unknownItem.details.systemId
                : systemId
        }.${id}`;

        if (unknownItem && assertResourceOfType.camera(unknownItem)) {
            rotation = unknownItem.details.parameters?.rotation ?? 0;
        }

        return {
            bottom: 0,
            contrastParams: {
                blackLevel: 0.001,
                enabled: false,
                gamma: 1,
                whiteLevel: 0.0005,
            },
            controlPtz: false,
            dewarpingParams: {
                enabled: false,
                fov: 1.2217304763960306,
                panoFactor: 1,
                xAngle: 0,
                yAngle: 0,
            },
            name: unknownItem?.details.name,
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id: uuid(),
            left: 0,
            resourceId,
            resourcePath,
            right: 0,
            rotation,
            top: 0,
            zoomBottom: 0,
            zoomLeft: 0,
            zoomRight: 0,
            zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
            zoomTop: 0,
        };
    };
