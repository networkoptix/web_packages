import { MergedResourceNode, ResourceNode } from '@components/layout-grid/layout-grid.types';
import { cleanIdLegacy } from '@utils/general';

type FindNodeReturnType = (ResourceNode & { parent?: ResourceNode | undefined }) | undefined;

export const findNode = (
    items: ResourceNode[],
    id: string,
    parent?: FindNodeReturnType,
): FindNodeReturnType => {
    if (!items) {
        return;
    }

    for (const item of items) {
        if (cleanIdLegacy(item.details?.id) === cleanIdLegacy(id)) {
            return { ...item, parent };
        }

        if ('children' in item) {
            const child = findNode(item.children as MergedResourceNode[], id, item);
            if (child) {
                return child;
            }
        }
    }
};
