import { firstValueFrom } from 'rxjs';

import { SystemConfigSettings } from '@services/system-api.types/system.types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function getSystemSettingsLegacyV1(
    this: MediaserverLegacyConnection,
): Promise<SystemConfigSettings> {
    return firstValueFrom(this.get('/ec2/getSettings')).then(params => {
        return new SystemConfigSettings(params);
    });
}
