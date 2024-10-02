import { ServiceType } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface Row {
    id: string;
    type: string;
    subType: ServiceType;
    displayName: string;
    used: number;
    quantity: number;
    remaining: number;
    barBackground: string;
}
