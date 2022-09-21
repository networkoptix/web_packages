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
