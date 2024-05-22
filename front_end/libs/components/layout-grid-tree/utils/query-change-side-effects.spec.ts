import { NestedTreeControl } from '@angular/cdk/tree';
import { v4 as uuid } from 'uuid';

import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';

import { queryChangeSideEffectsFactory } from './query-change-side-effects';

function* generateNodes(count = 5): Generator<ResourceNode> {
    for (let i = 0; i < count; i++) {
        yield { details: { id: uuid() }, name: uuid(), type: ResourceType.CAMERA };
    }
}

class QuerySideEffectComponentMock {
    nodes: ResourceNode[] = [...generateNodes()];

    treeControl = {
        expand: jest.fn(),
        collapse: jest.fn(),
        collapseAll: jest.fn(),
        isExpanded: jest.fn(() => false),
        getDescendants: jest.fn(() => this.nodes),
    } as unknown as NestedTreeControl<ResourceNode, string>;
    expandNodesFromParams = jest.fn();

    queryChangeSideEffect = queryChangeSideEffectsFactory(() => this.treeControl);
}

describe('queryChangeSideEffects', () => {
    let componentRef: QuerySideEffectComponentMock;

    beforeEach(() => {
        componentRef = new QuerySideEffectComponentMock();
    });

    it('should expand nodes if query is not empty', () => {
        componentRef.queryChangeSideEffect('query', componentRef.nodes);
        expect(componentRef.treeControl.expand).toHaveBeenCalledTimes(componentRef.nodes.length);
    });
});
