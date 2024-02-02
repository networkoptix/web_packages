export interface TreeItem {
    id: string;
    name: string;
    level: number;
}

export type OrgTreeStatuses = Map<string, { type: 'warn' | 'error'; msg: string }>;
// Could be expanded to also include info later on
