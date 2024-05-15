import { assertResourceOfType, assertResourceParentNode } from './layout-grid.type-guards';
import { ResourceNode } from './layout-grid.types';

export const removeSystemChildren = (items: ResourceNode[]): ResourceNode[] =>
    items.map(item => {
        if (assertResourceOfType.system_cloud(item)) {
            return { ...item, children: [] };
        } else if (assertResourceParentNode(item) && item.children.length > 0) {
            return {
                ...item,
                children: removeSystemChildren(item.children) as typeof item.children,
            };
        } else {
            return item;
        }
    });
