import { ResourceNode } from '@components/layout-grid/layout-grid.types';

export interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>;
}

export interface Resource {
    name: string;
    id: string;
}
