import type { LayoutItem } from '@services/system-api.types/layouts.types';

import { extractSystemAndResourceId } from './extract-system-and-resources';

export const hasCrossSystemItems = (items: LayoutItem[], currentSystemId: string): boolean =>
    items
        .map(
            ({ resourcePath }) =>
                extractSystemAndResourceId(resourcePath).systemId || currentSystemId,
        )
        .some(systemId => systemId !== currentSystemId);
