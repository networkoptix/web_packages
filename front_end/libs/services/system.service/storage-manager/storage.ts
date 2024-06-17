import { GetStorages } from '@services/system-api.types';
import { ServerManager } from '@services/system.service/server-manager/server-manager';
import { cleanId } from '@utils/general';

/**
 * TODO: Need to add better types to some of the system-api methods
 */
export type StorageResponses = [GetStorages[], any, any, any];

export enum STORAGE_TYPES {
    LOCAL = 'local',
    USB = 'usb',
    NETWORK = 'smb',
    SYSTEM_NETWORK = 'network',
    CLOUD = 'cloud'
}

export enum MODE {
    MAIN = 'main',
    BACKUP = 'backup',
    NOT_IN_USE = 'notUsed'
}

export enum STORAGE_STATUS {
    IN_USE = 'inUse',
    INACCESSIBLE = 'inaccessible',
    RESERVED = 'reserved',
    DISABLED = 'disabled',
    REINDEXING = 'reindexing',
    BEING_CHECKED = 'beingChecked'
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
 * Add properties and methods here for the current servers storages.
 * Calculated properties like hasAction and onlineMains/onlineBackups should have getters instead of imperatively calculated.
 *
 * CurrentStorageState.locations is an array of Storage's which itself has reference back to the parent on Storage.currentStorageState.
 * This will allow for checking against the parent for things like comparing freeSpace on a storage with total freeSpace on all storages.
 */
export class CurrentStorageState {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    locations: Storage[];
    vmsSpaceLoaded: boolean;
    storageInfoLoaded: boolean;
    storageStatsLoaded: boolean;
    analyticsLoaded: boolean;

    #serverManager: ServerManager;
    #hasAnalyticsData = false;
    #hasPlugins = false;
    #metadataStorageId: string;

    get hasAction() {
        return this.locations.some(location => location.hasAction);
    }

    get onlineMains() {
        return this.locations.filter(this.#countMainAndBackup(true)).length;
    }

    get onlineBackups() {
        return this.locations.filter(this.#countMainAndBackup(false)).length;
    }

    get reindexing(): MODE[] {
        const reindexingLocations = this.locations.filter(({ reindexing }) => reindexing).map(({ mode }) => mode);
        const unique = new Set(reindexingLocations);
        return [...unique];
    }

    get freeSpace() {
        return this.locations.reduce((
            totalFreeSpace,
            { freeSpace, isBackup, usedForWriting }
        ) => totalFreeSpace + (!isBackup && usedForWriting ? freeSpace : 0), 0);
    }

    get serialized(): SaveStoragePayload[] {
        return this.locations.map(({ serialized }) => serialized).filter(storage => storage);
    }

    get analyticsDbTargetLocations() {
        return this.locations.filter(({ canStoreAnalyticsDb }) => canStoreAnalyticsDb);
    }

    get hasAnalyticsData() {
        return this.#hasAnalyticsData;
    }

    get hasCompatibleAnalyticsPlugins() {
        return this.#hasPlugins;
    }

    get currentAnalyticsDbLocation() {
        return this.locations.find(({ storageId }) => storageId === this.#metadataStorageId);
    }

    get beingChecked() {
        return !!this.locations.find(({ storageStatus }) => storageStatus.includes('beingChecked'));
    }

    // Storage save methods

    /**
     * Saves the serialized version of the current storage state.
     */
    saveStorages() {
        return this.#serverManager.mediaserver.updateStorages(this.serialized);
    }

    /**
     * Saves the current analyticsDb location to server.
     */
    saveAnalyticsDbLocation(metadataStorageId: string = this.currentAnalyticsDbLocation.storageId) {
        return this.#serverManager.updateResource(this.currentAnalyticsDbLocation.serverId, { metadataStorageId });
    }

    constructor(
        state: Partial<CurrentStorageState>,
        analytics: any,
        serverManager: ServerManager
    ) {
        this.#serverManager = serverManager;
        state.locations.forEach(location => {
            location.currentStorageState = this;
        });
        state.locations = state.locations.sort(this.#sortByTypeAndUrl);
        Object.assign(this, state);
        this.#parseAnalytics(analytics);
    }

    // Helpers
    #sortByTypeAndUrl = (
        { storageType: aType, url: aUrl },
        { storageType: bType, url: bUrl }
    ) => {
        const { LOCAL, USB, NETWORK, SYSTEM_NETWORK, CLOUD } = STORAGE_TYPES;
        const typeOrder = [LOCAL, USB, SYSTEM_NETWORK, NETWORK, CLOUD];
        if (aType === bType) {
            return aUrl < bUrl ? -1 : 1;
        }
        return typeOrder.indexOf(aType) - typeOrder.indexOf(bType);
    };

    #countMainAndBackup = (
        main = true
    ) => ({
        isBackup, isOnline, isWritable, usedForWriting
    }) => isBackup === !main && isOnline && isWritable && usedForWriting;

    #parseAnalytics = ({ hasAnalyticsData, hasPlugins, metadataStorageId }): void => {
        this.#metadataStorageId = cleanId(metadataStorageId || '');
        this.#hasAnalyticsData = hasAnalyticsData;
        this.#hasPlugins = hasPlugins;
    };

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    #checkCanStoreAnalytics = ({ storageType }: Storage) => [STORAGE_TYPES.LOCAL, STORAGE_TYPES.USB].includes(storageType);

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    checkAnalytics = (storage: Storage) => ({
        analyticsDbLocation: storage.storageId === this.#metadataStorageId,
        canStoreAnalyticsDb: this.#checkCanStoreAnalytics(storage)
    });
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
    urlWithCredentials: string;
    usedForWriting : boolean;
    freeSpace : number;
    isExternal : boolean;
    isOnline : boolean;
    isWritable : boolean;
    storageStatus : string;
    vmsSpace : number;
    storageId: string;
    canUpdate: boolean;
    constructor(inputs?: Partial<StorageDataStructure & { status: string }>) {
        // The status field was added to 4.3 systems but isn't really needed here
        delete inputs.status;
        const defaults: StorageDataStructure = {
            isBackup: false,
            reservedSpace: 0,
            serverId: '',
            storageType: null,
            totalSpace: 0,
            url: '',
            usedForWriting: false,
            freeSpace: null,
            isExternal: false,
            isOnline: false,
            isWritable: false,
            storageStatus: '',
            vmsSpace: 0,
            storageId: '',
            canUpdate: null,
            urlWithCredentials: ''
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
        return [STORAGE_TYPES.NETWORK, STORAGE_TYPES.CLOUD].includes(this.storageType) ||
            [STORAGE_STATUS.INACCESSIBLE, STORAGE_STATUS.BEING_CHECKED].includes(this.status);
    }

    get mode() {
        if (!this.usedForWriting) {
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
            !this.isBackup &&
            this.currentStorageState.onlineMains <= 1;
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
        if (!this.isOnline && !this.totalSpace) {
            return STORAGE_STATUS.BEING_CHECKED;
        }
        // `| !this.isWritable` added here may prevent some weird states from showing, but was also making the reserved state show as inaccessible
        if (this.storageStatus.includes(STORAGE_STATUS.INACCESSIBLE) || !this.isOnline) {
            return STORAGE_STATUS.INACCESSIBLE;
        }

        if (
            (!this.isWritable && !this.usedForWriting) ||
            this.totalSpace < 0 ||
            this.storageStatus.includes('tooSmall') ||
            (this.storageId.startsWith('/') && !this.storageStatus.includes('removable')) ||
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
                name: 'space',
                value: this.totalSpace.toString()
            },
            id: `{${this.storageId}}`,
            isBackup: this.isBackup,
            parentId: this.serverId,
            spaceLimit: this.reservedSpace.toString(),
            storageType: this.storageType,
            typeId: this.#typeId,
            url: this.urlWithCredentials,
            usedForWriting: this.usedForWriting
        } : null;
    };

    constructor(storageDataInputs?: Partial<StorageDataStructure>) {
        super(storageDataInputs);
    }
}
