import { NxSystemModuleBase } from './system-module';
import { SystemVersion } from './system-version';
import { SupportedVersionsBase, StaticModule, SystemVersionBase } from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
interface GenericConstructor<T = {}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new(...args: any[]): T;
}

function * getProtoChain(obj: object): Generator<object> {
    let proto = Object.getPrototypeOf(obj);
    while (![null, Object.prototype].includes(proto)) {
        yield proto;
        proto = Object.getPrototypeOf(proto);
    }
}

const getBaseProto = (obj: object): object => [...getProtoChain(obj)].pop();

/**
 * Handles removing prototypes from prototype chain.
 *
 * With the way module instances are mixed in there's a possibility that the prototype chain will contain the same prototype multiple times.
 * This will remove the prototypes from the prototype chain.
 *
 * Currently we're just removing NxSystemModuleBase from the prototype chain. We'll add any more prototypes to remove as needed.
 * The reason for not getting the prototypes from the target instance directly is to be able to see what kind of conflicts we might have while we're doing the refactor.
 *
 * @param obj - object to remove prototypes from prototype chain.
 * @param prototypes - prototypes to remove from the prototype chain
 * @returns - object with removed prototypes from prototype chain.
 */
const removeCyclicPrototypes = <T extends object>(obj: T, prototypes = [NxSystemModuleBase]): T => {
    const updatedProtoChain = [...getProtoChain(obj)].filter(proto => prototypes.every(ProtoClass => proto.constructor !== ProtoClass));
    updatedProtoChain.push(Object.prototype);
    let currentProto: unknown = obj;
    for (const proto of updatedProtoChain) {
        Object.setPrototypeOf(currentProto, proto);
        currentProto = proto;
    }
    return obj;
};

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
    abstract readonly version: SystemVersion;

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
        this[systemModule.getModuleSymbol()] = true;
        Object.setPrototypeOf(getBaseProto(this), removeCyclicPrototypes(systemModule));
        return this as T & U;
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
