import { KeyTableFields } from '@common/language/language_i18n_static_types';

import { CloudStorageSize, LicenseKey, LicenseStateInfo } from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';

export enum CLOUD_STORAGE_STATES {
    LOADING = 'loading',
    DEFAULT = 'default',
    ACTIVATED = 'activated'
}

export type LicenseKeyFields = keyof KeyTableFields;

export interface LicenseKeyInfo extends Pick<LicenseStateInfo, 'expirationDate' | 'licenseState' | 'cloudSystemId'>, CloudStorageSize, LicenseKey { }

export type ProcessedLicenseKey = {
    [key in LicenseKeyFields]: string;
} & {
    sizeBytes: number
};

export interface LicenseTagInfo {
    key: string;
    info: string;
    warningText?: string;
}
