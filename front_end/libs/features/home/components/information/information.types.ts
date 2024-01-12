import type { InfoData } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export enum CPInfoType {
    URL,
    PHONE,
    EMAIL,
    CUSTOM,
}

export interface CPInfoDataEvent {
    formId: string;
    data: InfoData[];
    status: boolean;
}
