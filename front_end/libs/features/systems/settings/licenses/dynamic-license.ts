import type { IConfig } from '@services/nx-config/config-types';

export interface DynamicLicense {
    [key: string]: {
        title: string;
        deactivationsAllowed;
    };
}

export const getDynamicLicense = (instance: {
    CONFIG: IConfig;
    licenseTypeTitles: { [key: string]: string };
}): DynamicLicense =>
    instance.CONFIG.licenseTypes.reduce(
        (licenses, { name, deactivationsAllowed, title }) => ({
            ...licenses,
            [name]: {
                deactivationsAllowed,
                title: instance.licenseTypeTitles[title] || title,
            },
        }),
        {} as DynamicLicense,
    );
