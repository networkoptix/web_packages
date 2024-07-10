import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import { NxSystemBase } from '@services/system/system-base';
import { AllSystemVersions, SystemVersion } from '@services/system/system-version';

import { CameraManagerModule } from '../modules/resource-managers/camera-manager';
import { ServerManagerModule } from '../modules/resource-managers/server-manager';
import { StorageManagerModule } from '../modules/resource-managers/storage-manager';

type NewModules = StorageManagerModule & ServerManagerModule & CameraManagerModule;

export type BaseModules = NxSystemOldModule & Partial<NewModules>;

class NxSystemV60 extends NxSystemBase {
    version: SystemVersion = 6.0 as const;
}

class NxSystemV51 extends NxSystemBase {
    version: SystemVersion = 5.1 as const;
}

class NxSystemV50 extends NxSystemBase {
    version: SystemVersion = 5.0 as const;
}

class NxSystemLegacy extends NxSystemBase {
    version: SystemVersion = 0 as const;
}

const classes = {
    0: NxSystemLegacy,
    5.0: NxSystemV50,
    5.1: NxSystemV51,
    6.0: NxSystemV60,
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getBaseSystem = (version: SystemVersion, systemId: string) => {
    if (!AllSystemVersions.includes(version)) {
        version = 0;
    }
    const SystemClass: (typeof classes)[SystemVersion] = classes[version];
    return new SystemClass(systemId);
};

type SystemClasses = ReturnType<typeof getBaseSystem>;

/**
 * This is a temporary factory function to create a NxSystem instance. It will be replaced with proper factory by version instance once we start refactoring system modules.
 */
export function nxSystemFactory(
    currentUserEmail: string,
    systemId?: string,
    serverId?: string,
    userId?: string,
    version?: number,
    skipSettingSystem?: boolean,
): SystemClasses & BaseModules {
    const nxSystemOld = new NxSystemOldModule(
        currentUserEmail,
        systemId,
        serverId,
        userId,
        version,
        skipSettingSystem,
    );
    const baseSystem = getBaseSystem(version as SystemVersion, systemId).with(nxSystemOld);

    /**
     * NxSystemOldModule needs quiet a bit of refactoring to remove some manager properties.
     *
     * The with method enforced that mixed in types don't have the same property. This is to prevent accidental overriding of properties.
     */

    /**
     * Temporarily omit the serverManager property from ServerManagerModule to allow compilation.
     */
    const withServerManager = baseSystem.with(
        new ServerManagerModule(baseSystem) as Omit<ServerManagerModule, 'serverManager'>,
    );

    return (
        withServerManager
            /**
             * Temporarily omit the cameraManager property from CameraManagerModule to allow compilation.
             */
            .with(
                new CameraManagerModule(withServerManager) as Omit<
                    CameraManagerModule,
                    'cameraManager'
                >,
            )
            .with(new StorageManagerModule(withServerManager))
    );
}
