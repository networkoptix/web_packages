import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';

@NxSystemModuleBase.checkStatic
export class StorageManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('StorageManager');

    getModuleSymbol = (): symbol => StorageManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;
    storageManager: StorageManager;

    constructor(system: ConstructorParameters<typeof StorageManager>[0]) {
        super();
        this.storageManager = new StorageManager(system);
    }
}
