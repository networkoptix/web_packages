// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { IntRange } from "./types";

/**
 * Get normalized focus value for a given element.
 *
 * @param element - HTMLVideoElement
 * @param upperBound - Focus value upper bound
 * @returns 0 | 1 | 2 | 3 | 4 | 5
 */
export const calculateElementFocus = (element: HTMLVideoElement, upperBound = 6): IntRange<0, 6> => {
    const { innerHeight, innerWidth } = window;
    const xMid = innerWidth / 2;
    const yMid = innerHeight / 2;
    const { width = xMid, height = yMid, y = yMid, x = xMid } = element?.getBoundingClientRect() || {};
    const getPositionScore = () => {
        const centerY = y + height / 2;
        const centerX = x + width / 2;
        const getDeviation = (val: number): number => 1 - Math.abs(val - 0.5);
        const relativeY = getDeviation(centerY / innerHeight);
        const relativeX = getDeviation(centerX / innerWidth);
        return relativeX + relativeY;
    }

    const getSizeScore = () => {
        const windowArea = innerHeight * innerWidth;
        const elementArea = width * height;
        return elementArea / windowArea;
    }

    upperBound = Math.min(upperBound, 20);

    const focusScore = Math.min(10 * getPositionScore() * getSizeScore(), upperBound);

    const normalizedScore = focusScore / (upperBound / 5) as IntRange<0, 6>;

    return normalizedScore
}

/**
 * Calculate normalized score for window size.
 *
 * @param baseline - number
 * @returns threshold - number
 */
export const calculateWindowFocusThreshold = (baseline: number): number => {
    const { innerHeight, innerWidth } = window;
    const area = innerHeight * innerWidth;
    const threshold = baseline * baseline
    return Math.round(100 / (area / threshold))
}

export const sanitizeUrl = (webRtcUrl: string): string => {
    const { origin, search } = new URL(webRtcUrl)
    const cameraId = new URLSearchParams(search).get('camera_id')
    return `${origin}?camera_id=${cameraId}`
}
