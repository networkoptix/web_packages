import { NxSystemModuleBase } from '@services/system/system-module';
import { AllSystemVersions } from '@services/system/system-version';
import { CameraManager } from '@services/system.service/camera-manager/camera-manager';

@NxSystemModuleBase.checkStatic
export class CameraManagerModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('CameraManager');

    getModuleSymbol = (): symbol => CameraManagerModule.moduleSymbol;

    supportedVersions = AllSystemVersions;
    cameraManager: CameraManager;

    constructor(...args: ConstructorParameters<typeof CameraManager>) {
        super();
        this.cameraManager = new CameraManager(...args);
    }
}
