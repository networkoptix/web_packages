import { round } from 'lodash-es';
import * as THREE from 'three';

import { FisheyeCameraMount } from '@services/system.service/camera-manager/camera-manager-types';

export type ViewMode = `${FisheyeCameraMount}`;

const accountForMaxAngle = (angle: number, maxPolarAngle: number): number =>
    (angle / (Math.PI / 2)) * maxPolarAngle;

/**
 * Convert xAngle from dewarping params to azimuth.
 *
 * Inverse of xAngleFromAzimuth.
 *
 * Used to get the correct azimuth for rendering the fisheye view.
 */
export const xAngleToAzimuth = (viewMode: ViewMode, xAngle: number, precision = 3): number => {
    if (viewMode === 'wall') {
        const offset = xAngle / Math.PI;
        return round(-xAngle + offset, precision);
    }
    return round(Math.PI + xAngle, precision);
};

/**
 * Convert azimuth to xAngle from dewarping params.
 */
export const azimuthToXAngle = (viewMode: ViewMode, azimuth: number, precision = 3): number => {
    azimuth = round(azimuth, precision);

    if (viewMode === 'wall') {
        let result = round(azimuth * -(Math.PI / 2), precision);
        const interval = (result > 0 ? -1 : 1) / 10 ** (precision + 1);
        let reversed = xAngleToAzimuth(viewMode, result, precision);
        while (reversed !== azimuth) {
            result += interval;
            reversed = xAngleToAzimuth(viewMode, result, precision);
        }
        return round(result, precision);
    }
    return round(azimuth - Math.PI, precision);
};

export const yAngleToPolar = (
    viewMode: ViewMode,
    yAngle: number,
    maxPolarAngle: number,
    fov: number,
    precision = 3,
): number => {
    const fovRad = fov * THREE.MathUtils.DEG2RAD;

    if (viewMode === 'wall') {
        const calculatedAngle =
            accountForMaxAngle(yAngle, maxPolarAngle / 2) + Math.PI / 2 + fovRad / Math.PI / 2;
        return round(calculatedAngle, precision);
    }

    const fovRatio = (Math.PI / 2 - yAngle) / Math.PI / 2;
    const fovOffset = fovRad * fovRatio;
    const calculatedAngle = accountForMaxAngle(Math.PI / 2 - yAngle, maxPolarAngle);
    return round(calculatedAngle + fovOffset + fovRad / 5, precision);
};

export const polarToYAngle = (
    viewMode: ViewMode,
    polar: number,
    maxPolarAngle: number,
    fov: number,
    precision = 3,
): number => {
    polar = round(polar, precision);
    let result = viewMode === 'wall' ? polar : Math.PI / 2;
    let reversed = yAngleToPolar(viewMode, result, maxPolarAngle, fov, precision);
    const interval = (result > reversed ? -1 : 1) / 10 ** (precision + 1);

    while (reversed !== polar) {
        if (viewMode === 'wall') {
            result -= interval;
        } else {
            result += interval;
        }

        reversed = yAngleToPolar(viewMode, result, maxPolarAngle, fov, precision);
    }

    if (result < -Math.PI) {
        result = -result - Math.PI;
    }

    return round(result, precision);
};

export const fovToZoom = (fov: number): number => fov * 40;

export const zoomToFov = (zoom: number): number => zoom / 40;
