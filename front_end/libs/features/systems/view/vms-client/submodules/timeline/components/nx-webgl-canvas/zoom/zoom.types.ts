export interface ZOOM_DIRECTIONS {
    in: boolean;
    out: boolean;
}

export enum ZOOM_DIRECTION {
    in,
    constantIn,
    out,
    constantOut,
    forceZoomIn,
    forceZoomOut,
}

export const ZOOM_FACTOR = 1.5;
export const CONSTANT_ZOOM_FACTOR = 1;
export const FORCE_ZOOM_FACTOR = 10;
export const ZOOM_DURATION = 300; // ms
