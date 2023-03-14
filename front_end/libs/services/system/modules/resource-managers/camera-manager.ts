import { CameraManager } from '@services/system.service/camera-manager/camera-manager';
import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';

@NxSystemModuleBase.checkStatic
export class CameraManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('CameraManager');

    getModuleSymbol = (): symbol => CameraManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;
    cameraManager: CameraManager;

    constructor(system: ConstructorParameters<typeof CameraManager>[0]) {
        super();
        this.cameraManager = new CameraManager(system);
    }
}
