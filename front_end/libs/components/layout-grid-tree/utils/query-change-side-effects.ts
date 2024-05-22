import { NestedTreeControl } from '@angular/cdk/tree';
import { uniq } from 'lodash-es';

import { ResourceNode, isResourceParentNode } from '@components/layout-grid/layout-grid.types';

export const hasItem = (items: ResourceNode[], id: string): boolean => {
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (!item.details) {
            continue;
        }

        if (item.details.id === id) {
            return true;
        } else if (
            isResourceParentNode(item) &&
            item.children.length &&
            hasItem(item.children, id)
        ) {
            return true;
        }
    }

    return false;
};

const findParentsWithResults = (
    query: string,
    nodes: ResourceNode[],
    treeControl: NestedTreeControl<ResourceNode, string>,
): ResourceNode[] => {
    const flattened = nodes.flatMap(node => treeControl.getDescendants(node));
    const matches = flattened.filter(node => node.name.toLowerCase().includes(query));
    const matchesSet = new Set(matches);
    return flattened.filter(node => {
        if (matchesSet.has(node)) {
            return true;
        }

        if (isResourceParentNode(node) && node.children.length) {
            return matches.some(match => match.details && hasItem(node.children, match.details.id));
        }

        return false;
    });
};

export const queryChangeSideEffectsFactory = (
    getTreeControl: () => NestedTreeControl<ResourceNode, string>,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const expanded: ResourceNode[] = [];
    return (query: string, nodes: ResourceNode[]): void => {
        const treeControl = getTreeControl();
        if (query) {
            // Add all root nodes to be expanded to expanded array
            nodes.forEach(node => treeControl.isExpanded(node) || expanded.push(node));
            expanded.push(...findParentsWithResults(query, nodes, treeControl));
            uniq(expanded).forEach(node => treeControl.expand(node));
        } else {
            expanded.slice(0, expanded.length).forEach(node => treeControl.collapse(node));
        }
    };
};
