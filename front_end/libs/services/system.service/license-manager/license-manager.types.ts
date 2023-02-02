import type staticLang from '@common/language/language_i18n_static.json';
import { CloudStorageSize, LicenseKey, LicenseStateInfo } from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';

export enum CLOUD_STORAGE_STATES {
    LOADING = 'loading',
    DEFAULT = 'default',
    ACTIVATED = 'activated'
}

export interface KeyTableFields {
    size: (params?: Record<string, string | number>) => string;
    state: (params?: Record<string, string | number>) => string;
    system: (params?: Record<string, string | number>) => string;
    expires: (params?: Record<string, string | number>) => string;
    key: (params?: Record<string, string | number>) => string;
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

export type LicenseTranslationBaseKeys = keyof typeof staticLang.cloudStorage.fromServer;
