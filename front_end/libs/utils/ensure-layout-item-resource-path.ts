import type { LayoutItem } from '@services/system-api.types/layouts.types';

export const ensureLayoutItemResourcePath =
    (currentSystemId: string) =>
    (item: LayoutItem): LayoutItem => ({
        ...item,
        resourcePath:
            item.resourcePath ||
            `cloud://${'systemId' in item ? item.systemId : currentSystemId}.${item.resourceId}`,
    });
