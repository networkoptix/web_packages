import type { Validators } from '@angular/forms';

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

export interface InfoRow {
    data: { value: string; validation?: Validators[] };
    description?: { value: string | null; validation?: Validators[] };
}

export interface SupportInformation {
    sites: InfoRow[]; /// API returns string[] but for simplicity we'll massage the data
    phones: InfoRow[];
    emails: InfoRow[];
    custom: InfoRow[];
}
