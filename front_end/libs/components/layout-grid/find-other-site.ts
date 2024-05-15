import { assertResourceOfType } from './layout-grid.type-guards';
import { ResourceNode, ResourceLeafNodeMap, ResourceType } from './layout-grid.types';

export const findOtherSite = (
    id: string,
    nodes: ResourceNode[],
): ResourceLeafNodeMap[ResourceType.SYSTEM] | null => {
    for (const node of nodes) {
        if (assertResourceOfType.system_cloud(node) && node.details.id === id) {
            return node;
        }
        if (node.children) {
            const found = findOtherSite(id, node.children);
            if (found) {
                return found;
            }
        }
    }
    return null;
};
