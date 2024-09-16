import type { OrgSystem, UserSystem } from './nx-cloud-api/nx-cloud-api.types';

export interface NxOrgSystemInfo extends Omit<OrgSystem, 'version'> {
    isMine: false;
    /** Org system merging not yet supported in v1 */
    canMerge: false;
    useRest: boolean;
    version: number; // Converted to number
    build: string;
}
export interface NxUserSystemInfo extends Omit<UserSystem, 'version'> {
    isMine: boolean;
    canMerge: boolean;
    useRest: boolean;
    version: number; // Converted to number
    build: string;
}

/**
 * API response from `/systems` extended with extra properties.
 *
 * Not to be confused with `NxSystem` class.
 */
export type NxSystemInfo = NxOrgSystemInfo | NxUserSystemInfo;
