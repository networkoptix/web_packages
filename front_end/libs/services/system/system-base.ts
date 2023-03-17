import { Injector } from '@angular/core';

import { NxSystemModuleBase } from './system-module';
import { SystemVersion } from './system-version';
import { SupportedVersionsBase, StaticModule, SystemVersionBase } from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
interface GenericConstructor<T = {}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new(...args: any[]): T;
}

/**
 * Base class used to handle dynamic system modules.
 *
 * The NxSystembase.with method is a type safe way to add a system module to the system. It returns the system instance updated with the system module and updated types.
 *
 * The NxSystemBase.implements method is a type safe way to check if a system module is implemented by the system. This would be mostly for modules that are optional and supports specific features/capabilities.
 *
 * @example
 * import { NxSystemBase } from './system-base';
 * import { SystemVersion } from './system-version';
 *
 * class NxSystemLegacy extends NxSystemBase {
 *   readonly version = SystemVersion.legacy;
 * }
 *
 * interface LegacySystemDefault extends NxSystemLegacy, NxLegacyModule {}
 *
 * const legacySystemFactory = (): LegacySystemDefault => new NxSystemLegacy().with(new NxLegacyModule());
 *
 * const legacySystem = legacySystemFactory();
 *
 * legacySystem.legacyMethod(); // If the legacyMethod is implemented by the NxLegacyModule class, this will compile.
 *
 * legacySystem.someFeatureMethod(); // If the someFeatureMethod is not implemented by NxLegacyModule but is implemented by NxSomeFeatureModule, this will not compile.
 *
 * legacySystem.with(new NxSomeFeatureModule()); // This adds the NxSomeFeatureModule to the system instance along with registers the symbol for checking if implemented.
 *
 * if (legacySystem.implements(NxSomeFeatureModule)) {
 *   legacySystem.someFeatureMethod(); // If the someFeatureMethod is implemented by NxSomeFeatureModule, this will now compile.
 * }
 *
 */
export abstract class NxSystemBase implements SystemVersionBase {
    static INJECTOR: Injector;

    abstract readonly version: SystemVersion;
    static readonly PROXIES = new Map<SystemVersionBase, SystemVersionBase>();

    systemModules: NxSystemModuleBase[] = [];

    /**
     * This is a type safe way to add a system module to the system. It returns the system instance updated with the system module and updated types.
     *
     * This method could be chained to add multiple system modules to the system.
     *
     * This will be used mostly within system factories to create system instances with the default system modules.
     *
     * @example
     * const legacySystemFactory = (): LegacySystemDefault => new NxSystemLegacy().with(new NxLegacyModule());
     * const restSystemFactory = (): LegacySystemDefault => new NxSystemLegacy().with(new NxLegacyModule()).with(new NxRestModule());
     *
     * But could also be used for dynamically including feature modules.
     *
     * @example
     * const baseSystem = restSystemFactory();
     * const systemWithFeature = baseSystem.with(new NxSomeFeatureModule());
     * systemWithFeature.someFeatureMethod(); // If the someFeatureMethod is implemented by NxSomeFeatureModule, this will now compile.
     *
     * @param this - The system instance.
     * @param systemModule - The system module to add to the system.
     * @returns - The system instance extended with the system module.
     */
    with<U extends NxSystemModuleBase, T extends SystemVersionBase<U['supportedVersions'][number]>>(this: T, systemModule: U & Partial<{ [key in keyof Omit<T, keyof (NxSystemModuleBase & NxSystemBase & SupportedVersionsBase)>]: never }>): T & U {
        (this as unknown as NxSystemBase).systemModules.push(systemModule);

        if (!NxSystemBase.PROXIES.has(this)) {
            NxSystemBase.PROXIES.set(
                this,
                new Proxy(this, {
                    get: (target, prop) => {
                        const modules = (target as unknown as NxSystemBase).systemModules;
                        for (const module of modules) {
                            if (prop in module) {
                                return module[prop];
                            }
                        }
                        return target[prop];
                    },
                    set: (target, prop, value) => {
                        const modules = (target as unknown as NxSystemBase).systemModules;
                        for (const module of modules) {
                            if (prop in module) {
                                module[prop] = value;
                                return true;
                            }
                        }
                        target[prop] = value;
                        return true;
                    }
                })
            );
        }

        return NxSystemBase.PROXIES.get(this) as T & U;
    }

    /**
     * @param this - The system instance.
     * @param ModuleClass - The module class to check if implemented.
     * @returns - Type assertion boolean if the system module is implemented by the system.
     *
     * @example
     * const baseSystem = baseSystemFactory(); // This system instance does not implement the NxSomeFeatureModule.
     *
     * baseSystem.someFeatureMethod(); // This will not compile.
     *
     * if (baseSystem.implements(NxSomeFeatureModule)) {
     *   baseSystem.someFeatureMethod() // If the someFeatureMethod is implemented by the NxLegacyModule class, this will compile.
     * }
     */
    implements<S extends NxSystemBase = NxSystemBase, M extends NxSystemModuleBase = NxSystemModuleBase>(this: S, ModuleClass: GenericConstructor<M> & StaticModule): this is S & M {
        return ModuleClass.moduleSymbol in this;
    }
}
