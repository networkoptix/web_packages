export interface CloudBindData {
    systemId: string;
    authKey: string;
    owner?: string;
    organizationId?: string;
}

export interface Org {
    id: string;
    state: string;
    effectiveState: string;
    ownPermissions: string[];
    name: string;
}

export enum BindType {
    account = 'account',
    org = 'org',
}
