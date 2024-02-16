import { NxSystemInfo } from '@services/systems.service.types';

export const normalizeSystemForLayout = ({
    status,
    stateOfHealth,
    ...system
}: NxSystemInfo): NxSystemInfo => ({
    ...system,
    stateOfHealth,
    status: stateOfHealth.replace('online', ''),
});
