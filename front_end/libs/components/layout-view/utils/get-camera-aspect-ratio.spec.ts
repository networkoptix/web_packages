import { getCameraAspectRatio } from './get-camera-aspect-ratio';

describe('getCameraAspectRatio', () => {
    it('should return the overrideAr if it is defined', () => {
        const camera = {
            parameters: {
                overrideAr: 2,
            },
            defaultRatio: 16 / 9,
        };
        expect(getCameraAspectRatio(camera)).toBe(2);
    });

    it('should return the defaultRatio if overrideAr is not defined', () => {
        const camera = {
            parameters: {},
            defaultRatio: 16 / 9,
        };
        expect(getCameraAspectRatio(camera)).toBe(16 / 9);
    });

    it('should return the fallbackAspectRatio if defaultRatio is not defined', () => {
        const camera = {
            parameters: {},
            defaultRatio: undefined,
        };
        expect(getCameraAspectRatio(camera, 4 / 3)).toBe(4 / 3);
    });
});
