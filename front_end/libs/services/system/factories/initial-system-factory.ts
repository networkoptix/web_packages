import { Router } from '@angular/router';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxPollService } from '@services/poll.service';
import { NxSystemAPIService } from '@services/system-api.service';
import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import { NxSystemBase } from '@services/system/system-base';
import { SystemVersion } from '@services/system/system-version';
import { NxSystemsService } from '@services/systems.service';

import { CameraManagerModule } from '../modules/resource-managers/camera-manager';
import { ServerManagerModule } from '../modules/resource-managers/server-manager';
import { StorageManagerModule } from '../modules/resource-managers/storage-manager';

type NewModules = StorageManagerModule & ServerManagerModule & CameraManagerModule;

export type BaseModules = NxSystemOldModule & Partial<NewModules>;

class NxSystemV52 extends NxSystemBase {
    version: SystemVersion = 5.2 as const;
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
    5.2: NxSystemV52
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const getBaseSystem = (version: SystemVersion) => {
    const SystemClass: typeof classes[SystemVersion] = classes[version];
    return new SystemClass();
};

type SystemClasses = ReturnType<typeof getBaseSystem>;

/**
 * This is a temporary factory function to create a NxSystem instance. It will be replaced with proper factory by version instance once we start refactoring system modules.
 */
export function nxSystemFactory(
    CONFIG: IConfig,
    cloudApi: NxCloudApiService,
    systemApiService: NxSystemAPIService,
    pollService: NxPollService,
    systemsService: NxSystemsService,
    ribbonService: NxRibbonService,
    toastService: NxToastService,
    router: Router,
    locale: string,
    currentUserEmail: string,
    systemId?: string,
    serverId?: string,
    userId?: string,
    version?: number
): SystemClasses & BaseModules {
    version ||= 5.1;
    const nxSystemOld = new NxSystemOldModule(CONFIG, cloudApi, systemApiService, pollService, systemsService, ribbonService, toastService, router, locale, currentUserEmail, systemId, serverId, userId, version);
    const baseSystem = getBaseSystem(version as SystemVersion).with(nxSystemOld);

    /**
     * NxSystemOldModule needs quiet a bit of refactoring to remove some manager properties.
     *
     * The with method enforced that mixed in types don't have the same property. This is to prevent accidental overriding of properties.
     */

    /**
     * Temporarily omit the serverManager property from ServerManagerModule to allow compilation.
     */
    const withServerManager = baseSystem.with(new ServerManagerModule(baseSystem) as Omit<ServerManagerModule, 'serverManager'>);

    return withServerManager
        /**
         * Temporarily omit the cameraManager property from CameraManagerModule to allow compilation.
         */
        .with(new CameraManagerModule(withServerManager) as Omit<CameraManagerModule, 'cameraManager'>)
        .with(new StorageManagerModule(withServerManager));
}
