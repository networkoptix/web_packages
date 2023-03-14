/**
 * The NxSystem class has been renamed to NxSystemOldModule and moved into the @services/system/modules folder.
 *
 * This is keep it clear how much of the old NxSystem class is left as we start breaking off modules.
 */
import { BaseModules } from '@services/system/factories/initial-system-factory';
import { NxSystemBase } from '@services/system/system-base';

/**
 * This is a temporary type alias to NxSystem. It will be replaced with proper type by version instance once we start refactoring system modules.
 *
 * This is mostly identical to the previous NxSystem class when type is used as NxSystem<false> or NxSystem. This is to keep the type compatible with existing code.
 *
 * To access the new NxSystemBase class methods, cast using NxSystem<true>.
 *
 * @example
 * const system: NxSystem = systemInstance; // This will be compatible with the old NxSystem class.
 *
 * // This allows the implement method to be used.
 * if ((system as NxSystem<true>).implements(NxSomeFeatureModule)) {
 *   // More code
 * }
 */
export type NxSystem<WithBase = false> = BaseModules & (WithBase extends true ? NxSystemBase : Partial<NxSystemBase>);
