import {
    CloudSystem,
    GroupStructureItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export type GroupMap = Map<string, GroupStructureItem>;
export type SystemMap = Map<string, CloudSystem>;
export type SystemToGroupPathMap = Map<string, string[]>;
