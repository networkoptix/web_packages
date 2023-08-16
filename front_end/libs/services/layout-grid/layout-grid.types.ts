import { ResourceType } from '@components/layout-grid/layout-grid.types';

export type AddResourceType = ResourceType;

export type EditResourceType = {
    resourceType: ResourceType;
    details: Record<string, unknown>;
};

export type RemoveResourceType = EditResourceType;
