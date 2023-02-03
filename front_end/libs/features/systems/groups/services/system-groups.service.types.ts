import type {
    BaseGroupsItem,
    BaseGroupItem,
    SystemInfo,
} from '../groups.types';

export interface Connected {
    action: 'connected';
    data: Record<string, never>;
}

// From cloud_portal/systems/server.py ActionEnum
export enum WebSocketAction {
    // AGGREGATE_SYSTEMS_REQUEST = 'aggregate_systems_request',
    // AGGREGATE_REQUEST_BY_GROUP = 'aggregate_request_by_group',
    CREATE_GROUP = 'create_group',
    DELETE_GROUP = 'delete_group',
    LIST_GROUPS = 'list_groups',
    UPDATE_GROUP = 'update_group',
    MOVE_GROUP = 'move_group',
    MOVE_SYSTEM = 'move_system',
    SYSTEMS = 'systems',
    // CREATE_USER = 'create_user',
    // DELETE_USER = 'delete_user',
    // LIST_USERS = 'list_users',
    // UPDATE_USER = 'update_user',
}
// TODO: Add the rest of the actions

// Not an actual type, just collecting to avoid exporting each one
export interface IncomingData {
    create_group: {
        action: WebSocketAction.CREATE_GROUP;
        data: BaseGroupItem;
    };
    delete_group: {
        action: WebSocketAction.DELETE_GROUP;
        data: { msg: string };
    };
    list_groups: {
        action: WebSocketAction.LIST_GROUPS;
        data: BaseGroupsItem[];
    };
    update_group: {
        action: WebSocketAction.UPDATE_GROUP;
        data: never; // TODO
    };
    move_group: {
        action: WebSocketAction.MOVE_GROUP;
        data: { msg: string };
    };
    move_system: {
        action: WebSocketAction.MOVE_SYSTEM;
        data: { msg: string };
    };
    systems: {
        action: WebSocketAction.SYSTEMS;
        data: SystemInfo[];
    };
}

export interface ErrorData {
    action: WebSocketAction;
    data: {
        error: number;
        msg: string;
    };
}

// Not an actual type, just collecting to avoid exporting each one
export interface OutgoingData {
    create_group: {
        action: WebSocketAction.CREATE_GROUP;
        name: string;
        target_id: string | undefined;
    };
    delete_group: {
        action: WebSocketAction.DELETE_GROUP;
        group_id: string;
    };
    list_groups: { action: WebSocketAction.LIST_GROUPS };
    update_group: {
        action: WebSocketAction.UPDATE_GROUP;
        group_id: string;
        name: string;
    };
    move_group: {
        action: WebSocketAction.MOVE_GROUP;
        group_id: string;
        target_id: string | null;
    };
    move_system: {
        action: WebSocketAction.MOVE_SYSTEM;
        system_id: string;
        group_id: string | null;
    };
    systems: { action: WebSocketAction.SYSTEMS };
}

export type WebSocketIncoming =
    Connected |
    IncomingData[WebSocketAction] |
    ErrorData;

export type WebSocketOutgoing = OutgoingData[WebSocketAction];
