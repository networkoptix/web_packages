import { NestedTreeControl } from '@angular/cdk/tree';

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

export const queryChangeSideEffectsFactory = (
    getTreeControl: () => NestedTreeControl<ResourceNode, string>,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const expanded = new Set<ResourceNode>();

    return (query: string, nodes: ResourceNode[]): void => {
        const treeControl = getTreeControl();

        const expandNode = (node?: ResourceNode): void => {
            if (!node) {
                return;
            }
            expanded.add(node);
            treeControl.expand(node);
        };

        const collapseNode = (node?: ResourceNode): void => {
            if (!node) {
                return;
            }
            expanded.delete(node);
            treeControl.collapse(node);
        };

        if (query) {
            // Expand all root nodes
            nodes.forEach(node => {
                if (!treeControl.isExpanded(node)) {
                    expandNode(node);
                }
            });

            const flattened = nodes.flatMap(node => treeControl.getDescendants(node));

            const nodeMatchesQuery = (node: ResourceNode): boolean =>
                node.name.toLowerCase().includes(query);

            const hasMatch = (node: ResourceNode): boolean =>
                treeControl.getDescendants(node).some(nodeMatchesQuery);

            flattened.forEach(node => {
                if (hasMatch(node)) {
                    if (!treeControl.isExpanded(node)) {
                        expandNode(node);
                    }
                } else if (treeControl.isExpanded(node)) {
                    collapseNode(
                        [...expanded].find(
                            expandedNode => node.details?.id === expandedNode.details?.id,
                        ),
                    );
                }
            });
        } else {
            expanded.forEach(collapseNode);
        }
    };
};
