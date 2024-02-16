import { v4 as uuid } from 'uuid';

import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';

import { queryChangeSideEffects, QuerySideEffectComponentRef } from './query-change-side-effects';

function* generateNodes(count = 5): Generator<ResourceNode> {
    for (let i = 0; i < count; i++) {
        yield { details: { id: uuid() }, name: uuid(), type: ResourceType.CAMERA };
    }
}

class QuerySideEffectComponentMock implements QuerySideEffectComponentRef {
    nodes: ResourceNode[] = [...generateNodes()];
    treeControl = {
        expand: jest.fn(),
        collapse: jest.fn(),
        collapseAll: jest.fn(),
    } as unknown as QuerySideEffectComponentRef['treeControl'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSourceInput$$ = jest.fn(
        () => this.nodes,
    ) as unknown as QuerySideEffectComponentRef['dataSourceInput$$'];
    searchType?: 'query' | 'filter';
    lastQuery: string;
    expandNodesFromParams = jest.fn();
}

describe('queryChangeSideEffects', () => {
    let componentRef: QuerySideEffectComponentMock;

    beforeEach(() => {
        componentRef = new QuerySideEffectComponentMock();
    });

    it('should expand nodes if query is not empty', () => {
        componentRef.lastQuery = uuid();
        queryChangeSideEffects(componentRef, 'query', componentRef.nodes);
        expect(componentRef.treeControl.expand).toHaveBeenCalledTimes(componentRef.nodes.length);
    });

    it('should collapse all nodes if query is empty and lastQuery is not set', () => {
        componentRef.lastQuery = 'query';
        queryChangeSideEffects(componentRef, '', []);
        expect(componentRef.treeControl.collapseAll).toHaveBeenCalledTimes(1);
    });

    it('should expand nodes from params if query is empty and lastQuery is not', () => {
        componentRef.lastQuery = 'query';
        queryChangeSideEffects(componentRef, '', []);
        expect(componentRef.expandNodesFromParams).toHaveBeenCalledTimes(1);
    });
});
