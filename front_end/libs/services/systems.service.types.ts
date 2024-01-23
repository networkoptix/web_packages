import type { System } from './nx-cloud-api/nx-cloud-api.types';

/**
 * API response from `/systems` extended with extra properties.
 *
 * Not to be confused with `NxSystem` class.
 */
export interface NxSystemInfo extends Omit<System, 'version'> {
    isMine: boolean;
    canMerge: boolean;
    useRest: boolean;
    version: number; // Converted to number
}

export interface NxOrgSystemInfo
    extends Omit<NxSystemInfo, 'ownerAccountEmail' | 'ownerAccountId' | 'ownerFullName'> {
    organizationId: string;
}

export interface NxUserSystemInfo extends Omit<NxSystemInfo, 'organizationId'> {
    ownerAccountEmail: string;
    ownerAccountId: string;
    ownerFullName: string;
}
