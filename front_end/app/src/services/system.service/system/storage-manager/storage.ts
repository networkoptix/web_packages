import { GetStorages }                              from '@services/system-api.types';
import { CurrentStorageState, MODE, STORAGE_TYPES } from './current-storage-state';

/**
 * TODO: Need to add better types to some of the system-api methods
 */
export type StorageResponses = [GetStorages[], any, any, any]

export enum STORAGE_STATUS {
    IN_USE='inUse',
    INACCESSIBLE='inaccessible',
    RESERVED='reserved',
    DISABLED='disabled',
    REINDEXING='reindexing',
    BEING_CHECKED='beingChecked'
}

export interface SaveStoragePayload {
    addParams: {
        name : string,
        value : string,
    },
    id : string,
    isBackup : boolean,
    parentId : string,
    spaceLimit : string,
    storageType : string,
    typeId : string,
    url : string,
    usedForWriting : boolean
}

/**
 * The StorageDataStructure class is used as both a type and as a helper class to handle initializing the Storage class with defaults and to encapsulate the data structure used by Storage.
 */
export class StorageDataStructure {
    isBackup: boolean;
    reservedSpace: number;
    serverId: string;
    storageType: STORAGE_TYPES;
    totalSpace: number;
    url : string;
    usedForWriting : boolean;
    freeSpace : number;
    isExternal : boolean;
    isOnline : boolean;
    isWritable : boolean;
    storageStatus : string;
    vmsSpace : number;
    storageId: string;
    canUpdate: boolean;
    constructor(inputs?: Partial<StorageDataStructure & {status: string}>) {
        // The status field was added to 4.3 systems but isn't really needed here
        delete inputs.status;
        const defaults: StorageDataStructure = {
            isBackup       : false,
            reservedSpace  : 0,
            serverId       : '',
            storageType    : null,
            totalSpace     : 0,
            url            : '',
            usedForWriting : false,
            freeSpace      : null,
            isExternal     : false,
            isOnline       : false,
            isWritable     : false,
            storageStatus  : '',
            vmsSpace       : 0,
            storageId      : '',
            canUpdate      : null
        };
        Object.assign(this, { ...defaults, ...inputs });
    }
}

/**
 * Storage contains methods for modifying and serializing a storage.
 *
 * In its current form this class should not maintain its own state and should instead modify StorageDataStructure.
 * One use case where we might want to maintain state in the Storage class is if we wanted to track unsaved states, but that could be done on a future refactor.
 * If we wanted to track unsaved within Storage we'll want to add a property that has an instance of StorageDataStructure. And use that structure for unsaved states.
 * This will allow easy reverting to original state.
 */
export class Storage extends StorageDataStructure {
    // Static value for storages
    #typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
    currentStorageState: CurrentStorageState;

    get hasAction() {
        return [STORAGE_TYPES.NETWORK, STORAGE_TYPES.CLOUD].includes(this.storageType);
    }

    get mode() {
        if (!this.isWritable || !this.usedForWriting) {
            return MODE.NOT_IN_USE;
        }
        return this.isBackup ? MODE.BACKUP : MODE.MAIN;
    }

    set mode(mode: MODE) {
        this.usedForWriting = mode !== MODE.NOT_IN_USE;
        this.isBackup = mode === MODE.BACKUP;
    }

    get mainOnly() {
        return this.usedForWriting &&
            this.isWritable &&
            !this.isBackup &&
            this.currentStorageState.locations.filter(({
                mode
            }) => mode === MODE.MAIN).length <= 1;
    }

    get reindexing() {
        return this.storageStatus.includes('beingRebuilt');
    }

    set status(value) {
        // Kind of a hack for 4.3
    }

    /**
     * Need to add checking for inaccessible
     */
    get status(): STORAGE_STATUS {
        if (this.storageStatus.includes(STORAGE_STATUS.INACCESSIBLE)) {
            return STORAGE_STATUS.INACCESSIBLE;
        }
        if (!this.isOnline || !this.totalSpace) {
            return STORAGE_STATUS.BEING_CHECKED;
        }

        if (
            !this.isWritable ||
            this.storageStatus.includes('tooSmall') ||
            this.storageStatus.includes('removable') ||
            this.storageId.startsWith('/') ||
            this.storageStatus.includes('system') &&
            this.totalSpace < (this.currentStorageState.freeSpace / 6)
        ) {
            return STORAGE_STATUS.RESERVED;
        }
        return STORAGE_STATUS.IN_USE;
    }

    get statusTooltip() {
        return this.status !== STORAGE_STATUS.RESERVED
            ? ''
            : this.storageStatus.includes('system')
                ? 'reservedSystemTooltip'
                : 'reservedTooSmallTooltip';
    }

    get serialized() {
        return this.canUpdate && this.#serialize();
    }

    get analyticsDbLocation() {
        return this.#analytics().analyticsDbLocation;
    }

    get canStoreAnalyticsDb() {
        return this.#analytics().canStoreAnalyticsDb;
    }

    get isSystem() {
        return this.storageStatus.includes('system');
    }

    // Helpers
    #analytics = () => this.currentStorageState.checkAnalytics(this);
    #serialize = (): SaveStoragePayload => {
        return this.canUpdate ? {
            addParams: {
                name  : 'space',
                value : this.totalSpace.toString()
            },
            id             : `{${this.storageId}}`,
            isBackup       : this.isBackup,
            parentId       : this.serverId,
            spaceLimit     : this.reservedSpace.toString(),
            storageType    : this.storageType,
            typeId         : this.#typeId,
            url            : this.url,
            usedForWriting : this.usedForWriting
        } : null;
    }

    constructor(storageDataInputs?: Partial<StorageDataStructure>) {
        super(storageDataInputs);
    }
}
