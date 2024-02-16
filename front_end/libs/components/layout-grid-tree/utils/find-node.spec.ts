import { sample } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { ResourceNode } from '@components/layout-grid/layout-grid.types';

import { findNode } from './find-node';

const generateMockNode = (id: string, children: ResourceNode[] = []): ResourceNode =>
    ({ details: { id }, children }) as ResourceNode;

function* generateMockNodes(count: number, depth = 3): Generator<ResourceNode, void, unknown> {
    for (let i = 0; i < count; i++) {
        yield generateMockNode(uuid(), depth ? [...generateMockNodes(count, depth - 1)] : []);
    }
}

const selectRandomNode = (
    nodes: ResourceNode[],
    parent: ResourceNode = null,
): ResourceNode & { parent?: ResourceNode | undefined } => {
    const selected = sample(nodes);
    if (selected?.children?.length) {
        return selectRandomNode(selected.children, selected);
    }
    return { ...selected, parent };
};

describe('findNode', () => {
    it('should return the correct node', () => {
        const nodes = [...generateMockNodes(5)];
        const node = selectRandomNode(nodes);
        const result = findNode(nodes, node.details.id);
        expect(result).toStrictEqual(node);
    });

    it('should return the correct node with parent', () => {
        const nodes = [...generateMockNodes(3)];
        const node = selectRandomNode(nodes);
        const result = findNode(nodes, node.details.id);
        expect(result?.parent).toStrictEqual(node.parent);
    });

    it('should return undefined if the node is not found', () => {
        const nodes = [...generateMockNodes(3)];
        const result = findNode(nodes, uuid());
        expect(result).toBeUndefined();
    });
});
