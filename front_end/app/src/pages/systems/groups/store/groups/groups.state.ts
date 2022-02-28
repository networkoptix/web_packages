type systemId = string;
type groupId = string;
type groupName = string;

export interface GroupsState {
    systemGroups: Record<systemId, groupId>,
    groupNames: Record<groupId, groupName>,
    groupParents: Record<groupId, groupId>,
}
