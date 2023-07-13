import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';
import { PermissionManager } from '@services/system.service/permission-manager/permission-manager';

@NxSystemModuleBase.checkStatic
export class PermissionManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('PermissionManager');

    getModuleSymbol = (): symbol => PermissionManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;
    permissionManager: PermissionManager;

    constructor(...args: ConstructorParameters<typeof PermissionManager>) {
        super();
        this.permissionManager = new PermissionManager(...args);
    }
}
