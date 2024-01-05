import {
    GroupItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { OpenGroups } from '../../home.types';

export interface GroupsState {
    groups: GroupItem[] | null;
    currentGroupId: string;
    openGroups: OpenGroups;
    systems: SystemItem[];
}
