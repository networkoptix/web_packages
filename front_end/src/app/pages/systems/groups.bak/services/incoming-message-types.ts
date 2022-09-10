// NOTE: not all actions supported by the microservice are listed here,
// but only those in actual use by the service.
// See `/systems/server.py` for more details.

export type socketIncomingActionType =
    'systems' |
    'list_groups';

interface ISocketBaseIncomingMessage {
    action: socketIncomingActionType,
    data: unknown // for some reason,
    // `Record<string, unknown> | Array<Record<string, unknown>>`
    // doesn't work here
}

export interface IncomingSystemDescription {
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

export interface ISocketSystemsIncomingMessage extends ISocketBaseIncomingMessage {
    action: 'systems',
    data: Array<IncomingSystemDescription>,
}

export interface IncomingSystemMinimalDescription {
    type: 'system'
    id: string,
    group_id: string,
}

export interface IncomingGroupDescription {
    type: 'group',
    id: string,
    name: string,
    owner_account_email: string,
    parent_group_id: string,
    users: Array<unknown>, // TODO: clarify when used
    systemsCount: number,
    groups: Array<IncomingGroupDescription>,
    systems: Array<IncomingSystemMinimalDescription>,
}

export interface ISocketListGroupsIncomingMessage extends ISocketBaseIncomingMessage {
    action: 'list_groups',
    data: Array<IncomingGroupDescription>,
}

export type ISocketIncomingMessage =
    ISocketSystemsIncomingMessage |
    ISocketListGroupsIncomingMessage;
