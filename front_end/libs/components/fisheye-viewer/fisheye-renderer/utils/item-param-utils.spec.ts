import {
    azimuthToXAngle,
    fovToZoom,
    polarToYAngle,
    ViewMode,
    xAngleToAzimuth,
    yAngleToPolar,
    zoomToFov,
} from './item-param-utils';

function* generateAllAngles(): Generator<number> {
    for (let i = -Math.PI / 2; i <= Math.PI / 2; i += 0.01) {
        yield i;
    }
}

function* generateAllFoVs(): Generator<number> {
    for (let i = 1; i <= 360; i += 1) {
        yield i;
    }
}

describe('xAngleToAzimuth and azimuthToXAngle', () => {
    const testWithParams = (viewMode: ViewMode): void => {
        for (const xAngle of generateAllAngles()) {
            const azimuth = xAngleToAzimuth(viewMode, xAngle);
            const xAngle2 = azimuthToXAngle(viewMode, azimuth);
            expect(xAngle2).toBeCloseTo(xAngle, 2);
        }
    };

    it('should convert wall xAngle to azimuth and back', () => {
        testWithParams('wall');
    });

    it('should convert ceiling/table xAngle to azimuth and back', () => {
        testWithParams('ceiling');
    });
});

describe('yAngleToPolar and polarToYAngle', () => {
    const testWithParams = (viewMode: ViewMode): void => {
        for (const yAngle of generateAllAngles()) {
            const maxPolarAngle = Math.PI;
            const fov = 40;
            const polar = yAngleToPolar(viewMode, yAngle, maxPolarAngle, fov);
            const yAngle2 = polarToYAngle(viewMode, polar, maxPolarAngle, fov);
            expect(yAngle2).toBeCloseTo(yAngle, 2);
        }
    };

    it('should convert wall yAngle to polar and back', () => {
        testWithParams('wall');
    });

    it('should convert ceiling/table yAngle to polar and back', () => {
        testWithParams('ceiling');
    });
});

describe('fovToZoom and zoomToFov', () => {
    it('should convert wall fov to zoom and back', () => {
        for (const fov of generateAllFoVs()) {
            const zoom = fovToZoom(fov);
            const fov2 = zoomToFov(zoom);
            expect(fov2).toBeCloseTo(fov, 2);
        }
    });
});
