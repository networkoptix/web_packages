import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';
import { UserManager } from '@services/system.service/user-manager/user-manager';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';

@NxSystemModuleBase.checkStatic
export class UserManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('UserManager');

    getModuleSymbol = (): symbol => UserManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;
    userManager: UserManager;

    constructor(version: number, ...args: ConstructorParameters<typeof UserWithGroupsManager>) {
        super();
        this.userManager =
            version > 5.1 ? new UserWithGroupsManager(...args) : new UserManager(...args);
    }
}
