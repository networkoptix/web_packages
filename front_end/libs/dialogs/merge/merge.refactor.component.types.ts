import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

export enum MergeState {
    select = 'select',
    admin = 'admin',
    primary = 'primary',
    confirm = 'confirm',
    generic = 'generic',
}

// think about typing separately for systems & auto-discovered systems
export type MergeSystem = {
    id: string; // peer have {} around id
    name: string; // on both systems/peer, but peer seems to be a server name and not system name
    stateOfHealth: string; // only on systems, not peer
    cloudSystemId?: string; // only peer
    localSystemId?: string; // peer have {} around id
    cloudOwnerId?: string; // only from /rest/system/info and moduleInfo
    protoVersion?: number; // only on peer initially, but check it before advancing to next step for systems
    isNew?: boolean; // from serverFlags on peer, but check before advancing for systems
    canMerge?: boolean; // systems and system only
    remoteAddresses?: string[]; // peer only, with on systems on check
    port?: number; // peer only, not needed for systems
    url?: string; // peer only from remoteAddresses
    isMergeable?: boolean; // only used when dryRun not available
    // systemName: string; // not on systems, only peer
    // isOnline: boolean; // only on system object (not systems || peer)
    // isAvailable: boolean; // only on system object (not systems||peer)
    // status: string; // on peer & systems (but systems is fairly useless)
};
// what's localId vs cloudId from /rest/v1/system/info?

export interface MergeDropdownItem extends DropdownItem<string> {
    help?: string;
    isMergeable?: boolean;
    status?: string;
    url?: string;
}

export interface MergeError {
    resultCode: string;
    errorText: string;
    primarySystemName: string;
    secondarySystemName: string;
    failedSystemName: string;
}

export interface MergeErrorData {
    data: MergeError;
    resultCode?: number;
}

// rest/v1/system/info
// {
//     name: string,
//     protoVersion: number,
//     localId: {string},
//     cloudId: string,
//     cloudOwnerId: {string},
//     status: compatible,
//     servers: [{id}] --> correlates with id from peer/moduleInfo
// };
