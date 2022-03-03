import { QueryParamsHandling } from '@angular/router';

export enum Auth {
    BOTH='Both',
    LOGGED_IN='Logged In',
    LOGGED_OUT='Logged Out'
}

export class MenuNode {
    public icon?: string;
    public currentRoute?: boolean;
    public accepted?: boolean;
    public draft?: boolean;
    public pending?: boolean;
    public indented?: boolean;
    // eslint-disable-next-line camelcase
    public asset_type?: any;
    public order?: number;
    public state?: 'pending' | 'draft';
    public breadcrumbs: MenuNode[];
    public queryParamsHandling: QueryParamsHandling = '';
    public htmlID?: string;

    constructor(
        public name = '',
        public url: string,
        public display_name = name,
        currentRoute = false,
        icon = '',
        public nodes: MenuNode[] = [],
        public authentication: Auth = Auth.BOTH,
        public new_window = false,
        public asset_id = null,
        public related_asset_ids = [],
        public next_item = false,
        public urlified = '',
        public subtitle = '',
        public name_raw = '',
    ) {
        this.icon = icon;
        this.currentRoute = currentRoute;
    }
}
