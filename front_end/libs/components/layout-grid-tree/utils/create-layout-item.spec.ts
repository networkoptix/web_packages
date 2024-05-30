import { v4 as uuid } from 'uuid';

import { LayoutResourceTree, ResourceType } from '@components/layout-grid/layout-grid.types';
import { cleanId, dirtyId } from '@utils/general';

import { createLayoutItem } from './create-layout-item';

describe('createLayoutItem', () => {
    const resourceId = dirtyId(uuid());
    const systemId = uuid();
    const resourceName = uuid();
    const rotation = Math.random() * 360;
    const layoutItemLookup = {
        [resourceId]: {
            type: ResourceType.CAMERA,
            details: {
                id: resourceId,
                name: resourceName,
                parameters: {
                    rotation,
                },
            },
        },
    } as LayoutResourceTree;

    it('should create layout item', () => {
        const layoutItem = createLayoutItem(layoutItemLookup, systemId)(resourceId);
        expect(layoutItem).toEqual({
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
            name: resourceName,
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id: expect.any(String),
            left: 0,
            resourceId,
            resourcePath: `cloud://${cleanId(systemId)}.${cleanId(resourceId)}`,
            right: 0,
            rotation,
            top: 0,
            zoomBottom: 0,
            zoomLeft: 0,
            zoomRight: 0,
            zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
            zoomTop: 0,
        });
    });
});
