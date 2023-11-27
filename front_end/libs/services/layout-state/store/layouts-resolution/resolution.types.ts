export enum Resolution {
    AUTO = 'AUTO',
    LOW = 'LOW',
    HIGH = 'HIGH',
    CUSTOM = 'CUSTOM',
}

export interface CamerasResolution {
    [cameraId: string]: {
        resolution: Resolution;
    };
}

export interface LayoutsResolutionState {
    [layoutId: string]: {
        resolution: Resolution;
        cameras: CamerasResolution;
    };
}
