export enum PackageProgress {
    STARTING,
    GENERATING,
    DOWNLOAD_READY,
    PACKAGE_ERROR
}

export enum PackageState {
    PENDING = 'pending',
    READY = 'ready',
    FAILED = 'failed'
}

export interface PackageStatus {
    state: PackageState;
    message?: string;
    errors: string[];
    current: number;
    total: number;
}
