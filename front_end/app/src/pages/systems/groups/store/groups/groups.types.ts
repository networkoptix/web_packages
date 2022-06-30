export interface BaseListItem {
    type: 'group' | 'system',
    id: string,
    name: string,
    systems?: Array<SystemListItem>,
    groups?: Array<GroupListItem>,
}

export interface GroupListItem extends BaseListItem {
    type: 'group',
    id: string
    name: string
    systemsCount: number,
    systems?: Array<SystemListItem>,
    groups?: Array<GroupListItem>
    owner_account_email: string
    parent_group_id?: string
}

export interface SystemListItem extends BaseListItem, SystemsItem {
    type: 'system',
    id: string,
    group_id: string,
    // ownerFullName: string
}

export type ListItem = GroupListItem | SystemListItem;

export interface SystemsItem {
    id: string,
    name: string,
    customization: string,
    authKey: string,
    authKeyHash: string,
    ownerAccountEmail: string,
    status: string,
    cloudConnectionSubscriptionStatus: boolean,
    systemSequence: number,
    opaque: string,
    registrationTime: string,
    system2faEnabled: boolean,
    ownerFullName: string,
    accessRole: string,
    sharingPermissions: Array<Record<string, string>>,
    stateOfHealth: string,
    usageFrequency: number,
    lastLoginTime: string,
    capabilities: Record<string, string>,
    version: string,
}
