import type { IConfig } from '@services/nx-config/config-types';
import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

export interface DynamicLicense {
    [key: string]: {
        title: string;
        deactivationsAllowed
    }
}

export const getDynamicLicense = (
    instance: {
        CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes
    }
): DynamicLicense => instance.CONFIG.licenseTypes.reduce((
    licenses,
    { name, deactivationsAllowed, title }
) => ({
    ...licenses,
    [name]: {
        deactivationsAllowed,
        title: instance.LANG.license.licenseTypeTitles[title] || title
    }
}), {} as DynamicLicense);
