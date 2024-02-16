import { v4 as uuid } from 'uuid';

import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { isIoOnly } from './is-io-only';

const asCamera = (partialCamera: Partial<NxSystemCamera>): NxSystemCamera =>
    partialCamera as NxSystemCamera;

describe('isIoOnly', () => {
    it('should return false if camera has no mediaStreams and no ioSettings', () => {
        expect(isIoOnly(asCamera({ parameters: {} }))).toBe(false);
    });

    it('should return false if camera has no mediaStreams and empty ioSettings', () => {
        expect(isIoOnly(asCamera({ parameters: { ioSettings: [] } }))).toBe(false);
    });

    it('should return false if camera has mediaStreams', () => {
        expect(isIoOnly(asCamera({ parameters: { mediaStreams: { streams: [] } } }))).toBe(false);
    });

    it('should return true if camera has ioSettings', () => {
        expect(isIoOnly(asCamera({ parameters: { ioSettings: [{ id: uuid() }] } }))).toBe(true);
    });
});
