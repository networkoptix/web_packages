export interface OrgTreeItem {
    id: string;
    name: string;
    level: number;
    hasChildren: boolean;
}

// Could be expanded to also include info later on
export type OrgTreeStatus = 'warn' | 'disable';
export type OrgTreeStatusValue = { status: OrgTreeStatus; msg: string };
export type OrgTreeStatusMap = Map<string, OrgTreeStatusValue>;
