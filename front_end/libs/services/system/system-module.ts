import { Injector } from '@angular/core';

import { staticImplements } from '@utils/general';

import { SystemVersion } from './system-version';
import { StaticModule, SupportedVersionsBase } from './types';

/**
 * Base class for all system system module classes. This class is used by NxSystemBase to check if a system module is compatible with a system version.
 *
 * Derived module classes should extend NxSystemModuleBase and be decorated with @NxSystemModuleBase.checkStatic decorator.
 *
 * The decorator will ensure that the derived class implements the correct static properties and methods.
 *
 * The NxSystemModuleBase abstract class ensures correct implementation of the abstract methods.
 *
 * The supportedVersions property should be a readonly tuple of supported system versions. The tuple type is required and enforced by the compiler since it's needed to derive compatible system version type.
 *
 * @example
 * import { NxSystemModuleBase } from './system-module';
 * import { SystemVersion } from './system-version';
 *
 * @NxSystemModuleBase.checkStatic
 * export class NxLegacyModule extends NxSystemModuleBase {
 *    static moduleSymbol = Symbol('NxLegacyModule');
 *    getModuleSymbol = (): symbol => NxLegacyModule.moduleSymbol;
 *    supportedVersions = [SystemVersion.legacy, SystemVersion['V5.0'], SystemVersion['V5.1']] as const;
 * }
 */
export abstract class NxSystemModuleBase implements SupportedVersionsBase {
    /**
     * The supportedVersions property should be a readonly tuple of supported system versions.
     *
     * The tuple type is required and enforced by the compiler since it's needed to derive compatible system version type.
     */
    abstract readonly supportedVersions: readonly SystemVersion[];
    /**
     * The getModuleSymbol method should return the moduleSymbol static property of the derived class.
     */
    abstract getModuleSymbol: () => symbol;

    /**
     * The checkStatic decorator ensures that the derived class implements the correct static properties and methods.
     */
    static checkStatic = staticImplements<StaticModule>();

    public injector: Injector;
}
