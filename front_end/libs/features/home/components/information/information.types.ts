import type { InfoDataServer } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export enum CPInfoType {
    URL = 'sites',
    PHONE = 'phones',
    EMAIL = 'emails',
    CUSTOM = 'custom',
}

export interface CPInfoDataEvent {
    formId: string;
    formData: InfoDataServer[];
    status: boolean;
}

export interface ControlRow {
    data: string;
    description?: string;
}
