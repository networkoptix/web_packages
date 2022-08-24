import { map, Observable } from 'rxjs';

import { LicenseInfo, LicenseState } from '@services/nx-cloud-api/license-server-api.types';
import { NxSystemsService } from '@services/systems.service';
import { bytesToString } from '@utils/bits-to-string';

import { LicenseKeyInfo, ProcessedLicenseKey } from './license-manager.types';

const extractLicenseKeyDetails = ({
    state: {
        expirationDate, licenseState, cloudSystemId
    }, params: {
        services: {
            cloudStorage: {
                cloudStorageSizeBytes
            }
        }, orderParams: {
            licenseKey
        }
    }
}: LicenseInfo): LicenseKeyInfo => ({
    expirationDate,
    licenseState,
    cloudSystemId,
    licenseKey,
    cloudStorageSizeBytes
});

export const mapLicenseKeyInfo = (licenses: LicenseInfo[]): LicenseKeyInfo[] => licenses.map(extractLicenseKeyDetails);

export const processLicenseKeys = (systemsService: NxSystemsService, translate: (string) => string, licenses: LicenseKeyInfo[], filterState: LicenseState): Observable<ProcessedLicenseKey[]> => systemsService.systemsSubject.pipe(
    map(systems => licenses
        .filter(({ licenseState }) => !filterState || licenseState === filterState)
        .map(({
            expirationDate, licenseState, cloudSystemId, licenseKey, cloudStorageSizeBytes
        }) => ({
            size: bytesToString(+cloudStorageSizeBytes),
            state: translate(licenseState),
            system: licenseState === LicenseState.ACTIVE ? systems.find(({ id }) => id === cloudSystemId)?.name || cloudSystemId : translate('Unassigned'),
            expires: new Date(expirationDate).toLocaleDateString(),
            key: licenseKey
        }))));
