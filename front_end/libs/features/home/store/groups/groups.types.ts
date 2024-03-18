import {
    CloudSystem,
    GroupItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

// export interface GroupsState {
//     groups: GroupItem[] | null;
//     currentGroupId: string | undefined;
//     openGroups: OpenGroups | undefined;
//     systems: SystemItem[];
// }

export type Undo = () => void;

// export type MethodsWithUndo<Target extends Record<string, (...args: any[]) => unknown>> = {
//     [Key in keyof Target]: (...args: Parameters<Target[Key]>) => Undo;
// };

export interface SystemsByOrgOrGroup {
    id: string;
    systems: string[];
    cloudSystems: CloudSystem[];
}

export type GroupFlatItem = Omit<GroupItem, 'children'>;

export type GroupFlatMap = Record<string, GroupFlatItem>;
