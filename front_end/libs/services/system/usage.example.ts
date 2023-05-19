import { NxSystemBase } from './system-base';
import { NxSystemModuleBase } from './system-module';

/**
 * Some example usages and type error handling for system -> module bindings.
 */

@NxSystemModuleBase.checkStatic
export class NxLegacyModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('NxLegacyModule');

    getModuleSymbol = (): symbol => NxLegacyModule.moduleSymbol;

    supportedVersions = [0, 5.0, 5.1] as const;

    anotherMethod(): boolean {
        return true;
    }
}

@NxSystemModuleBase.checkStatic
export class NxModernModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('NxModernModule');

    getModuleSymbol = (): symbol => NxModernModule.moduleSymbol;

    supportedVersions = [5.0, 5.1, 5.2] as const;

    someMethod(): boolean {
        return true;
    }
}

@NxSystemModuleBase.checkStatic
export class NxModernColidesModule extends NxModernModule {
    staticModuleSymbol = Symbol('NxModernColidesModule');

    getModuleSymbol = (): symbol => NxModernColidesModule.moduleSymbol;

    someMethod(): boolean {
        return true;
    }

    anotherMethod(): boolean {
        return true;
    }
}

export class NxSystemLegacy extends NxSystemBase {
    version = 0 as const;
}

export class NxSystemV50 extends NxSystemBase {
    version = 5.0 as const;
}

export class NxSystemV51 extends NxSystemBase {
    version = 5.1 as const;
}

export class NxSystemV52 extends NxSystemBase {
    version = 5.2 as const;
}

export const systemWithModernModule = new NxSystemV51().with(new NxModernModule());
export const systemWithLegacyModule = new NxSystemLegacy().with(new NxLegacyModule());
export const systemWithIncompatibleModule = new NxSystemV52().with(new NxLegacyModule()); // Won't compile since NxSystemV52 doesn't support NxLegacyModule.

export const systemWithMultipleModules = new NxSystemV51()
    .with(new NxLegacyModule())
    .with(new NxModernModule()); // This is fine since mixins don't collide.

export const systemWithMixinCollisions = new NxSystemV51()
    .with(new NxLegacyModule())
    .with(new NxModernColidesModule()); // This won't compile since anotherMethod will shaddow the one from NxLegacyModule.

interface LegacySystemDefault extends NxSystemLegacy, NxLegacyModule {}

export const legacySystemFactory = (): LegacySystemDefault =>
    new NxSystemLegacy().with(new NxLegacyModule());
legacySystemFactory().anotherMethod(); // This works since we've asserted that system implements this module.

export const unknownSystemVersion: NxSystemBase = systemWithMultipleModules;
export const accessInvalid = unknownSystemVersion.someMethod; // Error: Property 'someMethod' does not exist on type 'NxSystemBase'.
if (unknownSystemVersion.implements(NxModernModule)) {
    // This works since we've asserted that system implements this module.
    // console.log(unknownSystemVersion.someMethod());
}
