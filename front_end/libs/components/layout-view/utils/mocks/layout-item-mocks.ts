import { v4 as uuid } from 'uuid';

import { LayoutItem } from '@services/system-api.types/layouts.types';

const generateLayoutItem = (): LayoutItem => ({
    id: uuid(),
    flags: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    rotation: 0,
    zoomLeft: 0,
    zoomTop: 0,
    zoomRight: 0,
    zoomBottom: 0,
    zoomTargetId: uuid(),
    contrastParams: {
        blackLevel: 0,
        whiteLevel: 0,
        gamma: 0,
        enabled: false,
    },
    dewarpingParams: {
        xAngle: 0,
        yAngle: 0,
        fov: 0,
        panoFactor: 1,
        enabled: false,
    },
    displayInfo: false,
    controlPtz: false,
    displayAnalyticsObjects: false,
    displayRoi: false,
    resourceId: uuid(),
    resourcePath: uuid(),
    name: uuid(),
});

export function* generateLayoutItems(count: number): Generator<LayoutItem, void, unknown> {
    for (let i = 0; i < count; i++) {
        yield generateLayoutItem();
    }
}
