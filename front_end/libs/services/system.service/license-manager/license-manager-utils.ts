import { LicenseInfo } from '@services/nx-cloud-api/cloud-services/license-server/license-server-api.types';

import { LicenseKeyInfo } from './license-manager.types';

const extractLicenseKeyDetails = ({
    state: { expirationDate, licenseState, cloudSystemId },
    params: {
        services: {
            cloudStorage: { cloudStorageSizeBytes },
        },
        orderParams: { licenseKey },
    },
}: LicenseInfo): LicenseKeyInfo => ({
    expirationDate,
    licenseState,
    cloudSystemId,
    licenseKey,
    cloudStorageSizeBytes,
});

export const mapLicenseKeyInfo = (licenses: LicenseInfo[]): LicenseKeyInfo[] =>
    licenses.map(extractLicenseKeyDetails);
