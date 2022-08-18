// NOTE: not all actions supported by the microservice are listed here,
// but only those in actual use by the service.
// See `/systems/server.py` for more details.

export type socketOutgoingActionType =
    'systems' |
    'list_groups' |
    'create_group' |
    'move_group' |
    'move_system';

interface ISocketBaseOutgoingMessage {
    action: socketOutgoingActionType,
    [_: string]: unknown;
}

export interface ISocketSystemsOutgoingMessage extends ISocketBaseOutgoingMessage {
    action: 'systems',
}

export interface ISocketListGroupsOutgoingMessage extends ISocketBaseOutgoingMessage {
    action: 'list_groups',
}

export interface ISocketCreateGroupOutgoingMessage extends ISocketBaseOutgoingMessage {
    action: 'create_group',
    group_name: string,
}

export interface ISocketMoveGroupOutgoingMessage extends ISocketBaseOutgoingMessage {
    action: 'move_group',
    group_id: string,
    target_id: string,
}

export interface ISocketMoveSystemOutgoingMessage extends ISocketBaseOutgoingMessage {
    action: 'move_system',
    system_id: string,
    group_id: string,
}

export type ISocketOutgoingMessage =
    ISocketSystemsOutgoingMessage |
    ISocketListGroupsOutgoingMessage |
    ISocketCreateGroupOutgoingMessage |
    ISocketMoveGroupOutgoingMessage |
    ISocketMoveSystemOutgoingMessage;
