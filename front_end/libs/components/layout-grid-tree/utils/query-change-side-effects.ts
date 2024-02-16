import { NestedTreeControl } from '@angular/cdk/tree';
import { Signal } from '@angular/core';

import { ResourceNode } from '@components/layout-grid/layout-grid.types';

export interface QuerySideEffectComponentRef {
    treeControl: NestedTreeControl<ResourceNode, string>;
    dataSourceInput$$: Signal<ResourceNode[]>;
    linkedDataSource?: ResourceNode[];
    searchType?: 'query' | 'filter';
    lastQuery: string;
    expandNodesFromParams: () => void;
}

export const queryChangeSideEffects = (
    componentRef: QuerySideEffectComponentRef,
    query: string,
    nodes: ResourceNode[],
): void => {
    if (query) {
        if (componentRef.searchType !== 'filter') {
            [...componentRef.dataSourceInput$$(), ...(componentRef.linkedDataSource || [])].forEach(
                node => componentRef.treeControl.expand(node),
            );
        } else if (!componentRef.lastQuery) {
            nodes.forEach(node => componentRef.treeControl.collapse(node));
        }
    } else if (!query && componentRef.lastQuery) {
        if (componentRef.searchType !== 'filter') {
            componentRef.treeControl.collapseAll();
        }
        componentRef.expandNodesFromParams();
    }
    componentRef.lastQuery = query;
};
