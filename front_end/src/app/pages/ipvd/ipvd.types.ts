import type { SearchParams } from '@components/search/search.component.types';
import type { Cameras } from '@services/nx-cloud-api/nx-cloud-api.types';

export type IpvdParams = SearchParams & Partial<{
    vendors: string;

    sortBy: string;
    camera: string;

    resolution: string;
    hardwareTypes: string;

    debug: string;
    beta: string;
}>;

export interface Disclaimer {
    companyName: string;
    vmsName: string;
}

export type csvData = {
        'Vendor': string,
        'Model': string,
        'Type': string,
        'Max Resolution': string,
        'Max FPS': number,
        'Codec': string,
        'Audio': string,
        '2-Way Audio': string,
        'PTZ': string,
        'Advanced PTZ': string,
        'Fisheye': string,
        'Motion': string,
        'I/O': string,
        'Analytics': string
    };

/**
 * Camera with only specific allowed parameters.
 *
 * Passed as input to CamTableComponent.
 */
export type FilteredCamera = Partial<Cameras> & {
    sortKey: Cameras['sortKey'];
};
