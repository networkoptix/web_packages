import type staticLang from '@common/language/language_i18n_static.json';
import { Translatable } from '@pipes/nx-translate.types';
import {
    CloudStorageSize,
    LicenseKey,
    LicenseStateInfo,
} from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';

export enum CLOUD_STORAGE_STATES {
    LOADING = 'loading',
    DEFAULT = 'default',
    ACTIVATED = 'activated'
}

export type KeyTableFieldsKey = keyof typeof staticLang.cloudStorage.keyTableFields;

export interface LicenseKeyInfo extends Pick<LicenseStateInfo, 'expirationDate' | 'licenseState' | 'cloudSystemId'>, CloudStorageSize, LicenseKey {}

export type ProcessedLicenseKey = {
    [key in Exclude<KeyTableFieldsKey, 'system'>]: string;
} & {
    sizeBytes: number;
    system: Translatable;
};

export interface LicenseTagInfo {
    key: string;
    info: Translatable;
    warningText?: string;
}

export type LicenseTranslationBaseKeys = keyof typeof staticLang.cloudStorage.fromServer;
