import { RibbonContext } from '@components/ribbon/ribbon.types';
import {
    CloudSystemLight,
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
    cloudSystems: CloudSystemLight[];
}

export type GroupFlatItem = Omit<GroupItem, 'children'> & { children: string[] };

export type GroupFlatMap = Record<string, GroupFlatItem>;

export type RibbonContextState = {
    showForSeconds: number;
    context?: Omit<RibbonContext, 'visibility'>;
};
