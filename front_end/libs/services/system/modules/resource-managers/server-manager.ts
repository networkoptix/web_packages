import { ServerManager } from '@services/system.service/server-manager/server-manager';
import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';

@NxSystemModuleBase.checkStatic
export class ServerManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('ServerManager');

    getModuleSymbol = (): symbol => ServerManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;

    serverManager: ServerManager;

    constructor(...args: ConstructorParameters<typeof ServerManager>) {
        super();
        this.serverManager = new ServerManager(...args);
    }
}
