import { LayoutItem } from '@services/system-api.types';

export const ensureLayoutItemResourcePath =
    (currentSystemId: string) =>
    (item: LayoutItem): LayoutItem => ({
        ...item,
        resourcePath:
            item.resourcePath ||
            `cloud://${'systemId' in item ? item.systemId : currentSystemId}.${item.resourceId}`,
    });
