import type { LayoutItem } from '@services/system-api.types/layouts.types';

import { cleanId } from './general';

export const ensureLayoutItemResourcePath =
    (currentSystemId: string) =>
    (item: LayoutItem): LayoutItem => ({
        ...item,
        resourcePath:
            item.resourcePath ||
            `cloud://${cleanId('systemId' in item && typeof item.systemId === 'string' ? item.systemId : currentSystemId)}.${cleanId(item.resourceId)}`,
    });
